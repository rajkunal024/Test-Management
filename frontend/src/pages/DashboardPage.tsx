import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Search, Trash2, Users, UserPlus, Sparkles, BookOpen, ClipboardList } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { deleteTest, getErrorMessage, getAdminUsers, registerUser, getSubjects, createSubject } from "../services/api";
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
  const [regPassword, setRegPassword] = useState("");
  const [regSubject, setRegSubject] = useState("");
  const [regClass, setRegClass] = useState("Class 10");
  const [formError, setFormError] = useState("");

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

  const getTestStatus = (test: Test): "draft" | "live" | "completed" => {
    if (test.status === "live" && test.end_time) {
      const end = new Date(test.end_time).getTime();
      if (currentTime > end) {
        return "completed";
      }
    }
    return (test.status ?? "draft") as "draft" | "live" | "completed";
  };

  const isTestStarted = (test: Test): boolean => {
    if (test.status !== "live" || !test.start_time) {
      return false;
    }
    const start = new Date(test.start_time).getTime();
    return currentTime >= start;
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

    const timestamps = filtered.map((t) => getTestCreationTime(t));
    const maxTime = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    return filtered.sort((a, b) => {
      const timeA = getTestCreationTime(a);
      const timeB = getTestCreationTime(b);

      const isA_Newest = timeA === maxTime && maxTime > 0;
      const isB_Newest = timeB === maxTime && maxTime > 0;

      if (isA_Newest && !isB_Newest) return -1;
      if (!isA_Newest && isB_Newest) return 1;

      return timeA - timeB;
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
      setRegPassword("");
      setRegSubject("");
      setRegClass("Class 10");
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

    if (!regName.trim() || !regEmail.trim() || !regDob || !regPassword) {
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
      password: regPassword,
      subject: regRole === "Teacher" ? regSubject : undefined,
      class: regRole === "Student" ? regClass : undefined
    });
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
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-[#6c7df7] to-[#8d9cfc] p-6 text-white shadow-lg md:p-8">
          <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-150">
                <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                Parikshya Administrative Control Center
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                Control Hub & System Overview
              </h1>
              <p className="mt-2 text-sm text-indigo-100 max-w-xl">
                Supervise active subjects, create test slots, register incoming student and teacher profiles, and track live session states across the platform.
              </p>
              <p className="mt-4 text-xs text-[#6c7df7] bg-white/95 rounded-full px-4 py-1.5 inline-block font-bold shadow-sm dark:bg-slate-900/90 dark:text-indigo-400">
                Logged in as: {user?.name || "System Admin"} (Platform Administrator)
              </p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-4xl border border-white/20 shadow-inner">
              ⚙️
            </div>
          </div>
          <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -top-8 -left-8 h-40 w-40 rounded-full bg-white/5 pointer-events-none" />
        </div>

        {/* Stats Grid */}
        <section className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <article className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Students</p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {adminUsers.filter(u => u.role === "Student").length}
              </h3>
            </div>
          </article>
          
          <article className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Teachers</p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {adminUsers.filter(u => u.role === "Teacher").length}
              </h3>
            </div>
          </article>

          <article className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subjects</p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {subjects.length}
              </h3>
            </div>
          </article>

          <article className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tests Created</p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {tests.length}
              </h3>
            </div>
          </article>
        </section>

        {/* Tabs switcher */}
        <div className="mb-6 flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("tests")}
            className={`pb-3 px-5 text-sm font-bold border-b-2 transition-colors ${activeTab === "tests"
              ? "border-[#6c7df7] dark:border-indigo-500 text-[#6c7df7] dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
          >
            Test Configurations
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-3 px-5 text-sm font-bold border-b-2 transition-colors ${activeTab === "users"
              ? "border-[#6c7df7] dark:border-indigo-500 text-[#6c7df7] dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
          >
            User Accounts
          </button>
        </div>

        {activeTab === "tests" ? (
          <>
            <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Dashboard</p>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Test Management</h1>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSubjectFormError("");
                    setNewSubjectName("");
                    setIsSubjectOpen(true);
                  }}
                  icon={<Plus className="h-4 w-4" />}
                >
                  Register New Subject
                </Button>
                <Link to="/tests/create">
                  <Button icon={<Plus className="h-4 w-4" />}>Create New Test</Button>
                </Link>
              </div>
            </div>

            <div className="mb-5 grid gap-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input className="pl-10" placeholder="Search by test name" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-12 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-[#6c7df7] focus:ring-1 focus:ring-[#6c7df7]"
              >
                <option value="all" className="dark:bg-slate-900 dark:text-slate-300">All Status</option>
                <option value="draft" className="dark:bg-slate-900 dark:text-slate-300">Draft</option>
                <option value="live" className="dark:bg-slate-900 dark:text-slate-300">Live</option>
                <option value="completed" className="dark:bg-slate-900 dark:text-slate-300">Completed</option>
              </select>
            </div>

            <section className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/40 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-4">Test Name</th>
                    <th className="px-5 py-4">Subject</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Created Date</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td className="px-5 py-12 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                        <Spinner /> <span className="ml-2">Loading tests...</span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td className="px-5 py-12 text-center text-rose-500 dark:text-rose-400" colSpan={5}>
                        {getErrorMessage(error)}
                      </td>
                    </tr>
                  ) : filteredTests.length === 0 ? (
                    <tr>
                      <td className="px-5 py-12 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                        No tests found.
                      </td>
                    </tr>
                  ) : (
                    filteredTests.map((test) => (
                      <tr key={test.id}>
                        <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-100">{test.name}</td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                          {Array.isArray(test.subject) ? test.subject.join(", ") : test.subject}
                        </td>
                        <td className="px-5 py-4">
                          {(() => {
                            const statusVal = getTestStatus(test);
                            if (statusVal === "completed") {
                              return <Badge tone="blue">Completed</Badge>;
                            }
                            return (
                              <Badge tone={statusVal === "live" ? "green" : "yellow"}>
                                {statusVal}
                              </Badge>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{new Date(test.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link to={`/tests/${test.id}/preview`}>
                              <Button variant="secondary" className="h-9 px-3">
                                View
                              </Button>
                            </Link>

                            {isTestStarted(test) ? (
                              <Button variant="secondary" className="h-9 px-3 opacity-50 cursor-not-allowed" icon={<Pencil className="h-4 w-4" />} disabled>
                                Edit
                              </Button>
                            ) : (
                              <Link to={`/tests/${test.id}/edit`}>
                                <Button variant="secondary" className="h-9 px-3" icon={<Pencil className="h-4 w-4" />}>
                                  Edit
                                </Button>
                              </Link>
                            )}

                            {isTestStarted(test) ? (
                              <Button variant="secondary" className="h-9 px-3 opacity-50 cursor-not-allowed" disabled>
                                Manage Questions
                              </Button>
                            ) : (
                              <Link to={`/tests/${test.id}/questions`}>
                                <Button variant="secondary" className="h-9 px-3">
                                  Manage Questions
                                </Button>
                              </Link>
                            )}

                            <Link to={`/tests/${test.id}/monitor`}>
                              <Button variant="secondary" className="h-9 px-3 text-[#6c7df7] dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 border-[#6c7df7]/20 dark:border-indigo-900/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50">
                                Monitor
                              </Button>
                            </Link>

                            {isTestStarted(test) ? (
                              <Button variant="ghost" className="h-9 px-3 text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed" icon={<Trash2 className="h-4 w-4" />} disabled>
                                Delete
                              </Button>
                            ) : (
                              <Button variant="ghost" className="h-9 px-3 text-rose-600 dark:text-rose-450 hover:bg-rose-500/10" onClick={() => setDeleteTarget(test)} icon={<Trash2 className="h-4 w-4" />}>
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          <>
            <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Dashboard</p>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">User Directory</h1>
              </div>
              <Button
                onClick={() => {
                  setRegRole("Student");
                  setFormError("");
                  setIsRegisterOpen(true);
                }}
                icon={<UserPlus className="h-4 w-4" />}
              >
                Register New User
              </Button>
            </div>

            <div className="mb-5 grid gap-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:grid-cols-[1fr_200px_200px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  className="pl-10"
                  placeholder="Search users by name or email"
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
                className="h-12 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-[#6c7df7] focus:ring-1 focus:ring-[#6c7df7]"
              >
                <option value="all" className="dark:bg-slate-900 dark:text-slate-300">All Roles</option>
                <option value="Student" className="dark:bg-slate-900 dark:text-slate-300">Student</option>
                <option value="Teacher" className="dark:bg-slate-900 dark:text-slate-300">Teacher</option>
              </select>

              {roleFilter === "Teacher" ? (
                <select
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  className="h-12 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-[#6c7df7] focus:ring-1 focus:ring-[#6c7df7]"
                >
                  <option value="all" className="dark:bg-slate-900 dark:text-slate-300">All Subjects</option>
                  {subjects.map((sub: any) => (
                    <option key={sub.id} value={sub.name} className="dark:bg-slate-900 dark:text-slate-300">
                      {sub.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={classFilter}
                  onChange={(event) => setClassFilter(event.target.value)}
                  className="h-12 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-[#6c7df7] focus:ring-1 focus:ring-[#6c7df7]"
                >
                  <option value="all" className="dark:bg-slate-900 dark:text-slate-300">All Classes</option>
                  <option value="Class 9" className="dark:bg-slate-900 dark:text-slate-300">Class 9</option>
                  <option value="Class 10" className="dark:bg-slate-900 dark:text-slate-300">Class 10</option>
                  <option value="Class 11" className="dark:bg-slate-900 dark:text-slate-300">Class 11</option>
                  <option value="Class 12" className="dark:bg-slate-900 dark:text-slate-300">Class 12</option>
                </select>
              )}
            </div>

            <section className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/40 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Date of Birth</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Class / Subject</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoadingUsers ? (
                    <tr>
                      <td className="px-5 py-12 text-center text-slate-500 dark:text-slate-400" colSpan={6}>
                        <Spinner /> <span className="ml-2">Loading user directory...</span>
                      </td>
                    </tr>
                  ) : errorUsers ? (
                    <tr>
                      <td className="px-5 py-12 text-center text-rose-500 dark:text-rose-450" colSpan={6}>
                        {getErrorMessage(errorUsers)}
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td className="px-5 py-12 text-center text-slate-500 dark:text-slate-400" colSpan={6}>
                        No users registered yet.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((usr) => (
                      <tr key={usr.id || usr.email}>
                        <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-100">{usr.name}</td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-450 font-medium">{usr.email}</td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{usr.dob}</td>
                        <td className="px-5 py-4">
                          <Badge tone={usr.role === "Teacher" ? "blue" : "slate"}>
                            {usr.role}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400 font-medium">
                          {usr.role === "Teacher" ? (
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md text-xs border border-indigo-100 dark:border-indigo-900/40">
                              {usr.subject}
                            </span>
                          ) : usr.role === "Student" && usr.class ? (
                            <span className="font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-md text-xs border border-teal-100 dark:border-teal-900/40">
                              {usr.class}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-650">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <Badge tone="green">Active</Badge>
                        </td>
                      </tr>
                    ))
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
          {deleteMutation.error ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-450">{getErrorMessage(deleteMutation.error)}</p> : null}
        </Modal>

        {/* Register User Modal */}
        <Modal
          open={isRegisterOpen}
          title="Register Student or Teacher"
          onClose={() => setIsRegisterOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsRegisterOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="register-user-form"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Registering..." : "Register User"}
              </Button>
            </>
          }
        >
          <form id="register-user-form" onSubmit={handleRegisterSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                {formError}
              </div>
            )}

            {/* Role switch */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Account Role
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setRegRole("Student")}
                  className={`flex-1 py-3 text-center rounded-lg border font-bold text-sm transition ${regRole === "Student"
                    ? "border-[#6c7df7] dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 text-[#6c7df7] dark:text-indigo-400"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole("Teacher")}
                  className={`flex-1 py-3 text-center rounded-lg border font-bold text-sm transition ${regRole === "Teacher"
                    ? "border-[#6c7df7] dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 text-[#6c7df7] dark:text-indigo-400"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                >
                  Teacher
                </button>
              </div>
            </div>

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

            {/* Password field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Password
              </label>
              <Input
                type="password"
                placeholder="Set password (min 6 characters)"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>

            {/* Class field (Student only) */}
            {regRole === "Student" && (
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
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-450">
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
