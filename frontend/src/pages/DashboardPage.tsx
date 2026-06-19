import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Search, Trash2, Users, UserPlus, Sparkles, BookOpen, ClipboardList, GraduationCap, FileSpreadsheet, ChevronLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { deleteTest, getErrorMessage, getAdminUsers, registerUser, getSubjects, createSubject, bulkRegisterUsers } from "../services/api";
import { useTests } from "../hooks/useTests";
import { Test } from "../types";
import { useAuthStore } from "../store/authStore";
import { StudentDashboard } from "./StudentDashboard";
import { TeacherDashboard } from "./TeacherDashboard";

export const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);

  if (user?.role === "Student") {
    return <StudentDashboard />;
  }

  if (user?.role === "Teacher") {
    return <TeacherDashboard />;
  }

  const { data: tests = [], isLoading, error } = useTests();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Test | null>(null);

  const [activeTab, setActiveTab] = useState<"tests" | "users">("tests");

  // Admin User Directory states
  const [userSearch, setUserSearch] = useState("");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regWizardStep, setRegWizardStep] = useState<1 | 2 | 3>(1);
  const [regMethod, setRegMethod] = useState<"manual" | "csv">("manual");
  const [roleFilter, setRoleFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [subjectFormError, setSubjectFormError] = useState("");

  // Form states
  const [regRole, setRegRole] = useState<"Student" | "Teacher">("Student");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regDob, setRegDob] = useState("");
  const [regGender, setRegGender] = useState("Male");
  const [regJoinedAt, setRegJoinedAt] = useState("");
  const [regSubject, setRegSubject] = useState("");
  const [regClass, setRegClass] = useState("Class 10");
  const [formError, setFormError] = useState("");

  // Admin User CSV Import states
  const [csvText, setCsvText] = useState("");
  const [csvFileError, setCsvFileError] = useState("");
  const [csvUploadSuccess, setCsvUploadSuccess] = useState("");
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);

  const parsedPreviewUsers = useMemo(() => {
    if (!csvText.trim()) return [];
    try {
      const lines = csvText.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) return [];

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = values[index] || "";
        });
        rowObj.role = regRole; // Auto-inject role for preview
        rows.push(rowObj);
      }
      return rows;
    } catch (e) {
      return [];
    }
  }, [csvText, regRole]);

  // Fetch admin users
  const { data: adminUsers = [], isLoading: isLoadingUsers, error: errorUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: getAdminUsers,
    enabled: user?.role === "Admin",
  });

  // Fetch subjects for registration dropdown
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: getSubjects,
    enabled: user?.role === "Admin",
  });

  const queryClient = useQueryClient();

  const [currentTime, setCurrentTime] = useState(new Date().getTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().getTime());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const getTestStatus = (test: Test): "draft" | "live" | "completed" | "upcoming" => {
    if (test.status === "draft") {
      return "draft";
    }
    const start = test.start_time ? new Date(test.start_time).getTime() : 0;
    const end = test.end_time ? new Date(test.end_time).getTime() : Infinity;

    if (start && currentTime < start) {
      return "upcoming";
    }
    if (currentTime > end) {
      return "completed";
    }
    return "live";
  };

  const isTestStarted = (test: Test): boolean => {
    if (getTestStatus(test) === "upcoming") {
      return false;
    }
    if (test.status === "live") {
      return true;
    }
    if (test.status === "scheduled" && test.start_time) {
      const start = new Date(test.start_time).getTime();
      return currentTime >= start;
    }
    return false;
  };

  const filteredTests = useMemo(() => {
    const filtered = tests.filter((test) => {
      const matchesName = test.name.toLowerCase().includes(search.toLowerCase());
      const statusVal = getTestStatus(test);
      const matchesStatus = status === "all" || statusVal === status;
      return matchesName && matchesStatus;
    });

    const getTestCreationTime = (test: typeof tests[0]) => {
      if (test.created_at) {
        return new Date(test.created_at).getTime();
      }
      if (test.id && test.id.startsWith("test-")) {
        const tsStr = test.id.substring(5);
        const ts = parseInt(tsStr, 10);
        if (!isNaN(ts)) return ts;
      }
      return 0;
    };

    return filtered.sort((a, b) => {
      const timeA = getTestCreationTime(a);
      const timeB = getTestCreationTime(b);
      return timeB - timeA;
    });
  }, [tests, search, status, currentTime]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTest(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: async () => {
      setIsRegisterOpen(false);
      // Reset form
      setRegName("");
      setRegEmail("");
      setRegDob("");
      setRegGender("Male");
      setRegSubject("");
      setRegClass("Class 10");
      setRegJoinedAt("");
      setFormError("");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => {
      setFormError(getErrorMessage(err));
    }
  });

  const createSubjectMutation = useMutation({
    mutationFn: createSubject,
    onSuccess: async () => {
      setIsSubjectOpen(false);
      setNewSubjectName("");
      setSubjectFormError("");
      await queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (err: any) => {
      setSubjectFormError(getErrorMessage(err));
    }
  });

  const handleSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectFormError("");

    if (!newSubjectName.trim()) {
      setSubjectFormError("Subject name is required.");
      return;
    }

    createSubjectMutation.mutate(newSubjectName.trim());
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!regName.trim() || !regEmail.trim() || !regDob || !regGender) {
      setFormError("All fields are required.");
      return;
    }

    if (regRole === "Teacher" && !regSubject) {
      setFormError("Please select a subject for the teacher.");
      return;
    }
    if (regRole === "Student" && !regClass) {
      setFormError("Please select a class for the student.");
      return;
    }

    registerMutation.mutate({
      role: regRole,
      name: regName,
      email: regEmail,
      dob: regDob,
      gender: regGender,
      password: "abc123", // default password
      subject: regRole === "Teacher" ? regSubject : undefined,
      class: regRole === "Student" ? regClass : undefined,
      joined_at: regRole === "Student" ? (regJoinedAt ? new Date(regJoinedAt).toISOString() : undefined) : undefined
    });
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCsvFileError("");
    setCsvUploadSuccess("");
    if (!csvText.trim()) return;

    setIsUploadingCsv(true);
    try {
      const lines = csvText.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        setCsvFileError("CSV must contain a header row and at least one user row.");
        setIsUploadingCsv(false);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

      // Validate headers depending on role
      if (regRole === "Student") {
        const requiredHeaders = ["name", "email", "dob", "gender", "class"];
        const missing = requiredHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          setCsvFileError(`Invalid CSV format. Missing headers: ${missing.join(", ")}\nExpected headers: name, email, dob, gender, class`);
          setIsUploadingCsv(false);
          return;
        }
      } else {
        const requiredHeaders = ["name", "email", "dob", "gender", "subject"];
        const missing = requiredHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          setCsvFileError(`Invalid CSV format. Missing headers: ${missing.join(", ")}\nExpected headers: name, email, dob, gender, subject`);
          setIsUploadingCsv(false);
          return;
        }
      }

      const usersPayload: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = values[index] || "";
        });

        if (!rowObj.name || !rowObj.email || !rowObj.dob || !rowObj.gender) {
          continue;
        }

        if (regRole === "Student" && !rowObj.class) {
          continue;
        }
        if (regRole === "Teacher" && !rowObj.subject) {
          continue;
        }

        usersPayload.push({
          name: rowObj.name,
          email: rowObj.email,
          role: regRole,
          dob: rowObj.dob,
          gender: rowObj.gender,
          class: regRole === "Student" ? rowObj.class : "",
          subject: regRole === "Teacher" ? rowObj.subject : "",
          joined_at: rowObj.joined_at || undefined
        });
      }

      if (usersPayload.length === 0) {
        const expectedHeaders = regRole === "Student" ? "name, email, dob, gender, class" : "name, email, dob, gender, subject";
        setCsvFileError(`No valid rows found in CSV. Required headers: ${expectedHeaders}`);
        setIsUploadingCsv(false);
        return;
      }

      const response = await bulkRegisterUsers(usersPayload);
      if (response.success) {
        let msg = `Successfully registered ${response.count} ${regRole === "Student" ? "students" : "teachers"}!`;
        if (response.errors && response.errors.length > 0) {
          msg += ` (${response.errors.length} rows failed)`;
          setCsvFileError(response.errors.join("\n"));
        }
        setCsvUploadSuccess(msg);
        await queryClient.invalidateQueries({ queryKey: ["admin-users"] });

        if (!response.errors || response.errors.length === 0) {
          window.setTimeout(() => {
            setIsRegisterOpen(false);
            setCsvText("");
            setCsvUploadSuccess("");
          }, 1500);
        }
      } else {
        setCsvFileError("Failed to import users.");
      }
    } catch (err: any) {
      setCsvFileError(err.response?.data?.message || err.message || "Error during import.");
    } finally {
      setIsUploadingCsv(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return adminUsers.filter(u => {
      const searchLower = userSearch.toLowerCase();
      const matchesName = u.name?.toLowerCase().includes(searchLower) ?? false;
      const matchesEmail = u.email?.toLowerCase().includes(searchLower) ?? false;
      const matchesSearch = matchesName || matchesEmail;

      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesSubject =
        roleFilter !== "Teacher" ||
        subjectFilter === "all" ||
        u.subject === subjectFilter;
      const matchesClass =
        classFilter === "all" ||
        (u.role === "Student" && u.class === classFilter);

      return matchesSearch && matchesRole && matchesSubject && matchesClass;
    });
  }, [adminUsers, userSearch, roleFilter, subjectFilter, classFilter]);

  return (
    <AppShell>
      <PageWrapper>
        {/* Welcome Header */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-6 md:p-10 text-white shadow-2xl border border-indigo-900/40">
          {/* Glowing Decorative Background Gradients */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 -ml-20 h-60 w-60 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-400">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                <span>Parikshya Administrative Control Center</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-150 to-slate-400 bg-clip-text text-transparent">
                Control Hub & System Overview
              </h1>
              <p className="mt-3 text-sm md:text-base text-slate-400 max-w-xl leading-relaxed">
                Supervise active subjects, create test slots, register incoming student and teacher profiles, and track live session states across the platform.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 items-center">
                <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 font-bold shadow-sm">
                  Logged in as: {user?.name || "System Admin"} (Platform Administrator)
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-800" />
                <span className="text-xs text-slate-500">
                  Parikshya Administrative Engine v1.2.0
                </span>
              </div>
            </div>
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-900/80 border border-indigo-500/20 text-4xl shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
              <span className="group-hover:rotate-45 transition-transform duration-500">⚙️</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <section className="mb-8 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <article className="group flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-850 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-white dark:to-slate-900 p-6 shadow-sm hover:shadow-lg dark:hover:shadow-indigo-950/20 hover:-translate-y-1 hover:border-indigo-400 dark:hover:border-indigo-800/80 transition-all duration-300 border-t-4 border-t-indigo-500">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-350">
                <Users className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Students</p>
                <h3 className="text-2xl font-extrabold text-indigo-950 dark:text-indigo-50 mt-1 tracking-tight">
                  {adminUsers.filter(u => u.role === "Student").length}
                </h3>
              </div>
            </div>
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
              Active
            </div>
          </article>

          <article className="group flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white dark:to-slate-900 p-6 shadow-sm hover:shadow-lg dark:hover:shadow-emerald-950/20 hover:-translate-y-1 hover:border-emerald-400 dark:hover:border-emerald-800/80 transition-all duration-300 border-t-4 border-t-emerald-500">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-350">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Teachers</p>
                <h3 className="text-2xl font-extrabold text-emerald-950 dark:text-emerald-50 mt-1 tracking-tight">
                  {adminUsers.filter(u => u.role === "Teacher").length}
                </h3>
              </div>
            </div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
              Faculty
            </div>
          </article>

          <article className="group flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white dark:to-slate-900 p-6 shadow-sm hover:shadow-lg dark:hover:shadow-amber-950/20 hover:-translate-y-1 hover:border-amber-400 dark:hover:border-amber-800/80 transition-all duration-300 border-t-4 border-t-amber-500">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform duration-350">
                <BookOpen className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Subjects</p>
                <h3 className="text-2xl font-extrabold text-amber-950 dark:text-amber-50 mt-1 tracking-tight">
                  {subjects.length}
                </h3>
              </div>
            </div>
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
              Curricula
            </div>
          </article>

          <article className="group flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-white dark:to-slate-900 p-6 shadow-sm hover:shadow-lg dark:hover:shadow-purple-950/20 hover:-translate-y-1 hover:border-purple-400 dark:hover:border-purple-800/80 transition-all duration-300 border-t-4 border-t-purple-500">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500 text-white shadow-md shadow-purple-500/20 group-hover:scale-110 transition-transform duration-350">
                <ClipboardList className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Tests</p>
                <h3 className="text-2xl font-extrabold text-purple-950 dark:text-purple-50 mt-1 tracking-tight">
                  {tests.length}
                </h3>
              </div>
            </div>
            <div className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md">
              Created
            </div>
          </article>
        </section>

        {/* Tabs switcher */}
        <div className="mb-8 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-px">
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-900 shadow-inner">
            <button
              onClick={() => setActiveTab("tests")}
              className={`py-2 px-6 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === "tests"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-800/50"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border border-transparent"
                }`}
            >
              Test Configurations
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`py-2 px-6 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === "users"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-800/50"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border border-transparent"
                }`}
            >
              User Accounts
            </button>
          </div>
          
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium bg-slate-50 dark:bg-slate-900/30 px-3.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>Active Control Mode</span>
          </div>
        </div>

        {activeTab === "tests" ? (
          <>
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <ClipboardList className="h-6 w-6 text-indigo-500" />
                  Test Configurations
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Manage test slots, configure question pools, schedule active windows, and inspect live evaluation responses.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSubjectFormError("");
                    setNewSubjectName("");
                    setIsSubjectOpen(true);
                  }}
                  className="rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 transition-colors text-xs font-bold"
                  icon={<Plus className="h-4 w-4 text-indigo-500" />}
                >
                  Register Subject
                </Button>
                <Link to="/tests/create">
                  <Button 
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/10 text-white border-none font-bold transition-all hover:scale-[1.02] active:scale-[0.98] text-xs"
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Create New Test
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-4 md:grid-cols-[1fr_220px] shadow-sm">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input 
                  className="pl-10 h-12 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:border-indigo-500 focus:ring-indigo-500/20 text-sm" 
                  placeholder="Search by test name..." 
                  value={search} 
                  onChange={(event) => setSearch(event.target.value)} 
                />
              </div>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 text-sm text-slate-700 dark:text-slate-300 font-semibold outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-950 dark:text-slate-350">All Statuses</option>
                <option value="draft" className="dark:bg-slate-950 dark:text-slate-350">Draft</option>
                <option value="live" className="dark:bg-slate-950 dark:text-slate-350">Live</option>
                <option value="upcoming" className="dark:bg-slate-950 dark:text-slate-350">Upcoming</option>
                <option value="completed" className="dark:bg-slate-950 dark:text-slate-350">Completed</option>
              </select>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200/85 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm mb-12">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50/70 dark:bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
                  <tr>
                    <th className="px-6 py-4 font-bold">Test Name</th>
                    <th className="px-6 py-4 font-bold">Subject</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Created Date</th>
                    <th className="px-6 py-4 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td className="px-6 py-12 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                        <Spinner /> <span className="ml-2">Loading test configurations...</span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td className="px-6 py-12 text-center text-rose-500 dark:text-rose-400 font-semibold" colSpan={5}>
                        {getErrorMessage(error)}
                      </td>
                    </tr>
                  ) : filteredTests.length === 0 ? (
                    <tr>
                      <td className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-medium" colSpan={5}>
                        No test configurations match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTests.map((test) => {
                    const statusVal = getTestStatus(test);
                    const statusBorder = {
                      live: "border-l-4 border-l-emerald-500 hover:bg-emerald-500/[0.02] dark:hover:bg-emerald-500/[0.01]",
                      upcoming: "border-l-4 border-l-amber-500 hover:bg-amber-500/[0.02] dark:hover:bg-amber-500/[0.01]",
                      completed: "border-l-4 border-l-blue-500 hover:bg-blue-500/[0.02] dark:hover:bg-blue-500/[0.01]",
                      draft: "border-l-4 border-l-slate-400 hover:bg-slate-500/[0.02] dark:hover:bg-slate-500/[0.01]",
                    }[statusVal];

                    return (
                      <tr key={test.id} className={`transition-all duration-150 ${statusBorder}`}>
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{test.name}</td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-600 dark:text-slate-400 text-xs bg-slate-100/60 dark:bg-slate-800/50 border border-slate-200/40 dark:border-slate-700/40 rounded-md px-2.5 py-1">
                            {Array.isArray(test.subject) ? test.subject.join(", ") : test.subject}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const statusVal = getTestStatus(test);
                            if (statusVal === "completed") {
                              return (
                                <Badge tone="blue" className="px-2.5 py-1 rounded-md font-bold text-xs uppercase tracking-wider">
                                  Completed
                                </Badge>
                              );
                            }
                            if (statusVal === "live") {
                              return (
                                <Badge tone="green" className="px-2.5 py-1 rounded-md font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 w-max">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Live
                                </Badge>
                              );
                            }
                            if (statusVal === "upcoming") {
                              return (
                                <Badge tone="yellow" className="px-2.5 py-1 rounded-md font-bold text-xs uppercase tracking-wider">
                                  Upcoming
                                </Badge>
                              );
                            }
                            return (
                              <Badge tone="slate" className="px-2.5 py-1 rounded-md font-bold text-xs uppercase tracking-wider">
                                Draft
                              </Badge>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{new Date(test.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link to={`/tests/${test.id}/preview`}>
                              <Button variant="secondary" className="h-9 px-3 rounded-xl border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 font-bold text-xs bg-white dark:bg-slate-900 transition-colors">
                                View
                              </Button>
                            </Link>
 
                            {isTestStarted(test) ? (
                              <Button variant="secondary" className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-xs opacity-50 cursor-not-allowed" icon={<Pencil className="h-3.5 w-3.5" />} disabled>
                                Edit
                              </Button>
                            ) : (
                              <Link to={`/tests/${test.id}/edit`}>
                                <Button variant="secondary" className="h-9 px-3 rounded-xl border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 font-bold text-xs bg-white dark:bg-slate-900 transition-colors" icon={<Pencil className="h-3.5 w-3.5" />}>
                                  Edit
                                </Button>
                              </Link>
                            )}
 
                            {isTestStarted(test) ? (
                              <Button variant="secondary" className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-xs opacity-50 cursor-not-allowed" disabled>
                                Questions
                              </Button>
                            ) : (
                              <Link to={`/tests/${test.id}/questions`}>
                                <Button variant="secondary" className="h-9 px-3 rounded-xl border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 font-bold text-xs bg-white dark:bg-slate-900 transition-colors">
                                  Questions
                                </Button>
                              </Link>
                            )}
 
                            <Link to={`/tests/${test.id}/monitor`}>
                              <Button variant="secondary" className="h-9 px-3.5 rounded-xl font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100/40 dark:hover:bg-indigo-950/50">
                                Monitor
                              </Button>
                            </Link>
 
                            {isTestStarted(test) ? (
                              <Button variant="ghost" className="h-9 px-3 rounded-xl font-bold text-xs text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed" icon={<Trash2 className="h-3.5 w-3.5" />} disabled>
                                Delete
                              </Button>
                            ) : (
                              <Button variant="ghost" className="h-9 px-3 rounded-xl font-bold text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10" onClick={() => setDeleteTarget(test)} icon={<Trash2 className="h-3.5 w-3.5" />}>
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          <>
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <Users className="h-6 w-6 text-indigo-500" />
                  User Directory
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Supervise registered students and faculties, create single accounts, or perform bulk uploads.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setRegWizardStep(1);
                    setRegRole("Student");
                    setRegGender("Male");
                    setFormError("");
                    setIsRegisterOpen(true);
                  }}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/10 text-white border-none font-bold transition-all hover:scale-[1.02] active:scale-[0.98] text-xs"
                  icon={<UserPlus className="h-4 w-4" />}
                >
                  Register User
                </Button>
              </div>
            </div>

            <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-4 md:grid-cols-[1fr_200px_200px] shadow-sm">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  className="pl-10 h-12 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:border-indigo-500 focus:ring-indigo-500/20 text-sm"
                  placeholder="Search users by name or email..."
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                />
              </div>

              <select
                value={roleFilter}
                onChange={(event) => {
                  const val = event.target.value;
                  setRoleFilter(val);
                  if (val !== "Teacher") {
                    setSubjectFilter("all");
                  }
                }}
                className="h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 text-sm text-slate-700 dark:text-slate-300 font-semibold outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-950 dark:text-slate-350">All Roles</option>
                <option value="Student" className="dark:bg-slate-950 dark:text-slate-300">Student</option>
                <option value="Teacher" className="dark:bg-slate-950 dark:text-slate-300">Teacher</option>
              </select>

              {roleFilter === "Teacher" ? (
                <select
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  className="h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 text-sm text-slate-700 dark:text-slate-300 font-semibold outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all" className="dark:bg-slate-950 dark:text-slate-350">All Subjects</option>
                  {subjects.map((sub: any) => (
                    <option key={sub.id} value={sub.name} className="dark:bg-slate-950 dark:text-slate-350">
                      {sub.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={classFilter}
                  onChange={(event) => setClassFilter(event.target.value)}
                  className="h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 text-sm text-slate-700 dark:text-slate-300 font-semibold outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all" className="dark:bg-slate-950 dark:text-slate-350">All Classes</option>
                  <option value="Class 9" className="dark:bg-slate-950 dark:text-slate-350">Class 9</option>
                  <option value="Class 10" className="dark:bg-slate-950 dark:text-slate-350">Class 10</option>
                  <option value="Class 11" className="dark:bg-slate-950 dark:text-slate-350">Class 11</option>
                  <option value="Class 12" className="dark:bg-slate-950 dark:text-slate-350">Class 12</option>
                </select>
              )}
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200/85 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm mb-12">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50/70 dark:bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
                  <tr>
                    <th className="px-6 py-4 font-bold">Name</th>
                    <th className="px-6 py-4 font-bold">Email</th>
                    <th className="px-6 py-4 font-bold">Gender</th>
                    <th className="px-6 py-4 font-bold">Date of Birth</th>
                    <th className="px-6 py-4 font-bold">Role</th>
                    <th className="px-6 py-4 font-bold">Class / Subject</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoadingUsers ? (
                    <tr>
                      <td className="px-6 py-12 text-center text-slate-500 dark:text-slate-400" colSpan={7}>
                        <Spinner /> <span className="ml-2">Loading user directory...</span>
                      </td>
                    </tr>
                  ) : errorUsers ? (
                    <tr>
                      <td className="px-6 py-12 text-center text-rose-500 dark:text-rose-400 font-semibold" colSpan={7}>
                        {getErrorMessage(errorUsers)}
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-medium" colSpan={7}>
                        No registered users match your search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((usr) => {
                      const initials = (usr.name || "").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                      const nameSum = (usr.name || "").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                      const gradients = [
                        "from-pink-500 to-rose-500",
                        "from-purple-500 to-indigo-500",
                        "from-blue-500 to-cyan-500",
                        "from-teal-500 to-emerald-500",
                        "from-amber-500 to-orange-500"
                      ];
                      const grad = gradients[nameSum % gradients.length];
                      const roleBorder = {
                        Teacher: "border-l-4 border-l-emerald-500 hover:bg-emerald-500/[0.02] dark:hover:bg-emerald-500/[0.01]",
                        Student: "border-l-4 border-l-indigo-500 hover:bg-indigo-500/[0.02] dark:hover:bg-indigo-500/[0.01]",
                      }[usr.role as "Teacher" | "Student"] || "border-l-4 border-l-slate-400 hover:bg-slate-500/[0.02] dark:hover:bg-slate-500/[0.01]";
                      
                      return (
                        <tr key={usr.id || usr.email} className={`transition-all duration-150 ${roleBorder}`}>
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${grad} flex items-center justify-center text-white text-xs font-black shadow-xs overflow-hidden`}>
                              {usr.profilePicture ? (
                                <img src={usr.profilePicture} alt={usr.name} className="h-full w-full object-cover" />
                              ) : (
                                initials
                              )}
                            </div>
                            <span>{usr.name}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">{usr.email}</td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-semibold text-xs">{usr.gender || "Male"}</td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-xs">{usr.dob}</td>
                          <td className="px-6 py-4">
                            <Badge tone={usr.role === "Teacher" ? "blue" : "slate"} className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                              {usr.role}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                            {usr.role === "Teacher" ? (
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md text-xs border border-indigo-100 dark:border-indigo-900/40">
                                {usr.subject}
                              </span>
                            ) : usr.role === "Student" && usr.class ? (
                              <span className="font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-md text-xs border border-teal-100 dark:border-teal-900/40">
                                {usr.class}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Badge tone="green" className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max">
                              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}

        {/* Delete Test Modal */}
        <Modal
          open={Boolean(deleteTarget)}
          title="Delete test"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">Delete {deleteTarget?.name}? This action cannot be undone.</p>
          {deleteMutation.error ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{getErrorMessage(deleteMutation.error)}</p> : null}
        </Modal>

        {/* Register User Modal (Unified Wizard) */}
        <Modal
          open={isRegisterOpen}
          title={
            regWizardStep === 1
              ? "Register New User"
              : regWizardStep === 2
                ? `Choose Registration Type`
                : regMethod === "csv"
                  ? `Upload ${regRole}s via CSV`
                  : `Register ${regRole} Manually`
          }
          onClose={() => setIsRegisterOpen(false)}
          footer={
            <div className="flex justify-between items-center w-full">
              <div>
                {regWizardStep > 1 && (
                  <Button
                    variant="secondary"
                    onClick={() => setRegWizardStep((prev) => (prev - 1) as any)}
                    icon={<ChevronLeft className="h-4 w-4" />}
                  >
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsRegisterOpen(false)}>
                  Cancel
                </Button>
                {regWizardStep === 3 && (
                  regMethod === "csv" ? (
                    <Button
                      type="submit"
                      form="bulk-user-form"
                      disabled={isUploadingCsv || !csvText.trim()}
                    >
                      {isUploadingCsv ? "Importing..." : "Import Users"}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      form="register-user-form"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Registering..." : "Register User"}
                    </Button>
                  )
                )}
              </div>
            </div>
          }
        >
          {regWizardStep === 1 && (
            <div className="space-y-6 py-2">
              <div className="text-center mb-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Select the role you want to register.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setRegRole("Teacher");
                    setRegWizardStep(2);
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#6c7df7] dark:hover:border-indigo-500 hover:shadow-md dark:hover:shadow-indigo-950/20 transition group text-center h-40"
                >
                  <div className="h-12 w-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-[#6c7df7] dark:text-indigo-400 group-hover:scale-110 transition mb-3">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">Register Teacher</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Add a teacher with custom subject access</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegRole("Student");
                    setRegWizardStep(2);
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#6c7df7] dark:hover:border-indigo-500 hover:shadow-md dark:hover:shadow-indigo-950/20 transition group text-center h-40"
                >
                  <div className="h-12 w-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-[#6c7df7] dark:text-indigo-400 group-hover:scale-110 transition mb-3">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">Register Student</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Add a student mapped to a specific class</span>
                </button>
              </div>
            </div>
          )}

          {regWizardStep === 2 && (
            <div className="space-y-6 py-2">
              <div className="text-center mb-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Choose registration method for <span className="font-semibold text-indigo-600 dark:text-indigo-400">{regRole.toLowerCase()}s</span>.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setRegMethod("csv");
                    setCsvText("");
                    setCsvFileError("");
                    setCsvUploadSuccess("");
                    setRegWizardStep(3);
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#6c7df7] dark:hover:border-indigo-500 hover:shadow-md dark:hover:shadow-indigo-950/20 transition group text-center h-40"
                >
                  <div className="h-12 w-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-[#6c7df7] dark:text-indigo-400 group-hover:scale-110 transition mb-3">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">Upload via CSV</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Batch import using copy-paste or files</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegMethod("manual");
                    setFormError("");
                    setRegName("");
                    setRegEmail("");
                    setRegDob("");
                    setRegGender("Male");
                    setRegClass("");
                    setRegSubject("");
                    const localISO = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    setRegJoinedAt(localISO);
                    setRegWizardStep(3);
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#6c7df7] dark:hover:border-indigo-500 hover:shadow-md dark:hover:shadow-indigo-950/20 transition group text-center h-40"
                >
                  <div className="h-12 w-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-[#6c7df7] dark:text-indigo-400 group-hover:scale-110 transition mb-3">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">Register Manually</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Fill out a simple enrollment form</span>
                </button>
              </div>
            </div>
          )}

          {regWizardStep === 3 && regMethod === "manual" && (
            <form id="register-user-form" onSubmit={handleRegisterSubmit} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                  {formError}
                </div>
              )}

              {/* Name field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Full Name
                </label>
                <Input
                  placeholder="Enter full name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>

              {/* Email field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="e.g. user@parikshya.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              {/* DOB field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  value={regDob}
                  onChange={(e) => setRegDob(e.target.value)}
                  required
                />
              </div>

              {/* Gender field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Gender
                </label>
                <select
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value)}
                  required
                  className="w-full h-12 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-[#6c7df7] focus:ring-1 focus:ring-[#6c7df7]"
                >
                  <option value="Male" className="dark:bg-slate-900 dark:text-slate-300">Male</option>
                  <option value="Female" className="dark:bg-slate-900 dark:text-slate-300">Female</option>
                </select>
              </div>

              {/* Class field (Student only) */}
              {regRole === "Student" && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Student Class
                    </label>
                    <select
                      value={regClass}
                      onChange={(e) => setRegClass(e.target.value)}
                      required
                      className="w-full h-12 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-[#6c7df7] focus:ring-1 focus:ring-[#6c7df7]"
                    >
                      <option value="" className="dark:bg-slate-900 dark:text-slate-300">Select Class</option>
                      <option value="Class 9" className="dark:bg-slate-900 dark:text-slate-300">Class 9</option>
                      <option value="Class 10" className="dark:bg-slate-900 dark:text-slate-300">Class 10</option>
                      <option value="Class 11" className="dark:bg-slate-900 dark:text-slate-300">Class 11</option>
                      <option value="Class 12" className="dark:bg-slate-900 dark:text-slate-300">Class 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Joined Organization Date & Time
                    </label>
                    <Input
                      type="datetime-local"
                      value={regJoinedAt}
                      onChange={(e) => setRegJoinedAt(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {/* Subject field (Teacher only) */}
              {regRole === "Teacher" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Assigned Subject
                  </label>
                  <select
                    value={regSubject}
                    onChange={(e) => setRegSubject(e.target.value)}
                    required
                    className="w-full h-12 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-[#6c7df7] focus:ring-1 focus:ring-[#6c7df7]"
                  >
                    <option value="" className="dark:bg-slate-900 dark:text-slate-300">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.name} className="dark:bg-slate-900 dark:text-slate-300">
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </form>
          )}

          {regWizardStep === 3 && regMethod === "csv" && (
            <form id="bulk-user-form" onSubmit={handleBulkImportSubmit} className="space-y-4">
              {csvFileError && (
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-400 max-h-36 overflow-y-auto whitespace-pre-line font-mono">
                  {csvFileError}
                </div>
              )}

              {csvUploadSuccess && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-3.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {csvUploadSuccess}
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                  Upload a `.csv` file or paste raw comma-separated values. Default password for all imported users is <strong className="text-indigo-600 dark:text-indigo-400">abc123</strong>.
                </p>

                {/* Template reference */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 rounded-lg text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-4 select-all">
                  {regRole === "Student" ? (
                    <>
                      Name,Email,Dob,Gender,Class
                      <br />
                      Kunal Raj,kunal@student.com,2005-04-12,Male,Class 10
                    </>
                  ) : (
                    <>
                      Name,Email,Dob,Gender,Subject
                      <br />
                      Sita Sharma,sita@teacher.com,1988-11-23,Female,Mathematics
                    </>
                  )}
                </div>

                {/* File selector */}
                <div className="relative mb-4 flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 dark:border-slate-800 dark:hover:border-indigo-900 bg-white/40 dark:bg-slate-900/40 transition">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const text = event.target?.result as string;
                        setCsvText(text);
                      };
                      reader.readAsText(file);
                    }}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Select CSV File Upload
                  </span>
                  <span className="mt-1 text-[10px] text-slate-400">
                    accepts raw .csv spreadsheets
                  </span>
                </div>

                {/* Textarea for CSV */}
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Or Paste CSV Text
                </label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={
                    regRole === "Student"
                      ? "Name,Email,Dob,Gender,Class..."
                      : "Name,Email,Dob,Gender,Subject..."
                  }
                  rows={5}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-xs text-slate-800 dark:text-slate-200 font-mono outline-none focus:border-[#6c7df7] focus:ring-1 focus:ring-[#6c7df7] resize-none"
                />
              </div>

              {/* Preview table */}
              {parsedPreviewUsers.length > 0 && (
                <div className="mt-4">
                  <span className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-2">
                    CSV Preview ({parsedPreviewUsers.length} Users):
                  </span>
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950/60 sticky top-0 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Gender</th>
                          {regRole === "Student" ? (
                            <th className="px-3 py-2">Class</th>
                          ) : (
                            <th className="px-3 py-2">Subject</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                        {parsedPreviewUsers.map((pUsr: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                              {pUsr.name}
                            </td>
                            <td className="px-3 py-2 truncate max-w-[140px]">{pUsr.email}</td>
                            <td className="px-3 py-2">{pUsr.gender}</td>
                            {regRole === "Student" ? (
                              <td className="px-3 py-2 truncate max-w-[100px]">{pUsr.class}</td>
                            ) : (
                              <td className="px-3 py-2 truncate max-w-[100px]">{pUsr.subject}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </form>
          )}
        </Modal>

        {/* Register Subject Modal */}
        <Modal
          open={isSubjectOpen}
          title="Register New Subject"
          onClose={() => setIsSubjectOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsSubjectOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="register-subject-form"
                disabled={createSubjectMutation.isPending}
              >
                {createSubjectMutation.isPending ? "Registering..." : "Register Subject"}
              </Button>
            </>
          }
        >
          <form id="register-subject-form" onSubmit={handleSubjectSubmit} className="space-y-4">
            {subjectFormError && (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                {subjectFormError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Subject Name
              </label>
              <Input
                placeholder="Enter subject name (e.g. Biology)"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                required
              />
            </div>
          </form>
        </Modal>
      </PageWrapper>
    </AppShell>
  );
};
