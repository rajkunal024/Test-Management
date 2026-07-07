import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  UserPlus, 
  BookOpen, 
  Calendar, 
  School, 
  GraduationCap, 
  Upload, 
  CheckCircle,
  FileText,
  AlertCircle,
  Bookmark,
  Edit2,
  Trash2,
  Plus
} from "lucide-react";
import { 
  registerUser, 
  updateUser,
  deleteUser,
  bulkRegisterUsers, 
  createSubject, 
  getSubjects,
  updateSubject,
  deleteSubject,
  createClass, 
  getClasses, 
  createSession, 
  getSessions, 
  setCurrentSessionApi,
  createProgram, 
  getPrograms, 
  updateProgram,
  deleteProgram,
  createSemester,
  getSemesters,
  updateSemester,
  deleteSemester,
  getMyOrganization, 
  getAdminUsers,
  getErrorMessage 
} from "../services/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { AppShell } from "../components/layout/AppShell";
import { DynamicLogo } from "../components/layout/DynamicLogo";
import { PageWrapper } from "../components/layout/PageWrapper";

export const AdminRegisterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"students" | "teachers" | "subjects" | "classes" | "programs" | "sessions" | "semesters">("students");
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  // Fetch Organization profile to determine School vs College features
  const { data: orgData } = useQuery({
    queryKey: ["myOrganization"],
    queryFn: getMyOrganization
  });

  const isSchool = orgData?.orgType !== "College";

  // Fetch existing subjects, sessions, classes, and programs for select boxes
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: getSubjects });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: getClasses, enabled: isSchool });
  const { data: sessions = [] } = useQuery({ queryKey: ["sessions"], queryFn: getSessions });
  const { data: programs = [] } = useQuery({ queryKey: ["programs"], queryFn: getPrograms, enabled: !isSchool });
  const { data: semesters = [] } = useQuery({ queryKey: ["semesters"], queryFn: getSemesters, enabled: !isSchool });
  const { data: registeredUsers = [] } = useQuery({ queryKey: ["admin-users"], queryFn: getAdminUsers });

  useEffect(() => {
    setShowCreatePanel(false);
    if (activeTab === "students") setRegRole("Student");
    if (activeTab === "teachers") setRegRole("Teacher");
  }, [activeTab]);

  // ----------------------------------------------------
  // Tab 1: User Registration States & Logic
  // ----------------------------------------------------
  const [regWizardStep, setRegWizardStep] = useState<1 | 2>(1); // 1: Choose mode/role, 2: Form
  const [regRole, setRegRole] = useState<"Student" | "Teacher">("Student");
  const [regMethod, setRegMethod] = useState<"manual" | "csv">("manual");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regDob, setRegDob] = useState("");
  const [regGender, setRegGender] = useState("Male");
  const [regJoinedAt, setRegJoinedAt] = useState("");
  const [regSubject, setRegSubject] = useState("");
  const [regSubjects, setRegSubjects] = useState<string[]>([]);
  const [regClass, setRegClass] = useState("");
  const [regSession, setRegSession] = useState("");
  const [regProgram, setRegProgram] = useState("");
  const [regPrograms, setRegPrograms] = useState<string[]>([]);
  const [regSemester, setRegSemester] = useState(1);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: (payload: any) => {
      if (editingUserId) {
        return updateUser(editingUserId, payload);
      }
      return registerUser(payload);
    },
    onSuccess: () => {
      setFormSuccess(editingUserId ? `Successfully updated ${regRole}!` : `Successfully registered ${regRole}!`);
      setRegName("");
      setRegEmail("");
      setRegDob("");
      setRegGender("Male");
      setRegJoinedAt("");
      setRegSubject("");
      setRegSubjects([]);
      setRegClass("");
      setRegSession("");
      setRegProgram("");
      setRegPrograms([]);
      setRegSemester(1);
      setEditingUserId(null);
      setFormError("");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => {
      setFormError(getErrorMessage(err));
    }
  });

  const semesterOptions = useMemo(() => {
    if (semesters.length > 0) {
      const parsed = semesters.map((s: any) => {
        const num = parseInt(s.name.replace(/\D/g, ""), 10) || 1;
        return { label: s.name, value: String(num), num };
      });
      parsed.sort((a, b) => a.num - b.num);
      return parsed;
    }
    return Array.from({ length: 10 }, (_, i) => ({ label: `Semester ${i + 1}`, value: String(i + 1) }));
  }, [semesters]);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regDob.trim() || !regGender) {
      setFormError("Please fill all required student/teacher info fields.");
      return;
    }
    registerMutation.mutate({
      role: regRole,
      name: regName,
      email: regEmail,
      dob: regDob,
      gender: regGender,
      joined_at: regJoinedAt || undefined,
      subject: regRole === "Teacher" ? (isSchool ? regSubject : regSubjects.join(", ")) : undefined,
      subjects: regRole === "Teacher" ? (isSchool ? (regSubject ? [regSubject] : []) : regSubjects) : undefined,
      class: regRole === "Student" && isSchool ? regClass : undefined,
      session: regRole === "Student" ? regSession : undefined,
      program_id: !isSchool ? regProgram : undefined,
      program_ids: !isSchool && regProgram ? [regProgram] : undefined,
      semester: regRole === "Student" && !isSchool ? regSemester : undefined
    });
  };

  // CSV States
  const [csvText, setCsvText] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);

  const parsedCsvRows = useMemo(() => {
    if (!csvText.trim()) return [];
    try {
      const lines = csvText.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) return [];
      const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
        const rowObj: any = {};
        headers.forEach((header, idx) => {
          rowObj[header] = values[idx] || "";
        });
        rows.push(rowObj);
      }
      return rows;
    } catch {
      return [];
    }
  }, [csvText]);

  const handleCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedCsvRows.length === 0) {
      setCsvError("No valid rows found to import.");
      return;
    }
    setIsUploadingCsv(true);
    setCsvError("");
    setCsvSuccess("");

    try {
      const usersPayload = parsedCsvRows.map(row => ({
        role: regRole,
        name: row.name || "",
        email: row.email || "",
        dob: row.dob || "",
        gender: row.gender || "Male",
        subject: regRole === "Teacher" ? (row.subject || "") : undefined,
        class: regRole === "Student" && isSchool ? (row.class || "") : undefined,
        session: regRole === "Student" ? (row.session || "") : undefined,
        program_id: !isSchool ? (row.program_id || "") : undefined,
        semester: regRole === "Student" && !isSchool ? Number(row.semester || 1) : undefined
      }));

      const res = await bulkRegisterUsers(usersPayload);
      if (res.success) {
        setCsvSuccess(`Successfully registered ${res.count} ${regRole}s via CSV!`);
        setCsvText("");
        setRegWizardStep(1);
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      } else {
        setCsvError(res.errors ? res.errors.join("; ") : "Import failed");
      }
    } catch (err) {
      setCsvError(getErrorMessage(err));
    } finally {
      setIsUploadingCsv(false);
    }
  };

  // ----------------------------------------------------
  // Tab 2: Subject Registration States & Logic
  // ----------------------------------------------------
  const [subjName, setSubjName] = useState("");
  const [subjPrograms, setSubjPrograms] = useState<string[]>([]);
  const [subjSems, setSubjSems] = useState<Record<string, number>>({});
  const [subjError, setSubjError] = useState("");
  const [subjSuccess, setSubjSuccess] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);

  const subjectMutation = useMutation<any, Error, string | { name: string; program_id?: string; program_ids?: string[]; program_semesters?: { program_id: string; semester: number }[] }>({
    mutationFn: (payload) => {
      const data = typeof payload === "string" ? { name: payload } : payload;
      if (editingSubjectId) {
        return updateSubject(editingSubjectId, data);
      }
      return createSubject(data);
    },
    onSuccess: () => {
      setSubjSuccess(editingSubjectId ? "Subject updated successfully!" : "Subject registered successfully!");
      setSubjName("");
      setSubjPrograms([]);
      setSubjSems({});
      setEditingSubjectId(null);
      setSubjError("");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (err) => {
      setSubjError(getErrorMessage(err));
    }
  });

  const deleteSubjMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      setSubjSuccess("Subject deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (err) => {
      setSubjError(getErrorMessage(err));
    }
  });

  const handleSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjName.trim()) {
      setSubjError("Subject name is required");
      return;
    }
    const program_semesters = subjPrograms.map(progId => ({
      program_id: progId,
      semester: subjSems[progId] || 1
    }));
    subjectMutation.mutate({
      name: subjName,
      program_ids: !isSchool ? subjPrograms : [],
      program_semesters: !isSchool ? program_semesters : []
    });
  };

  // ----------------------------------------------------
  // Tab 3: Class Registration States & Logic
  // ----------------------------------------------------
  const [clsName, setClsName] = useState("");
  const [clsOrder, setClsOrder] = useState("");
  const [clsError, setClsError] = useState("");
  const [clsSuccess, setClsSuccess] = useState("");

  const classMutation = useMutation({
    mutationFn: createClass,
    onSuccess: () => {
      setClsSuccess("Class registered successfully!");
      setClsName("");
      setClsOrder("");
      setClsError("");
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (err) => {
      setClsError(getErrorMessage(err));
    }
  });

  const handleClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clsName.trim() || !clsOrder) {
      setClsError("Class name and order are required");
      return;
    }
    classMutation.mutate({
      name: clsName,
      numericOrder: Number(clsOrder)
    });
  };

  // ----------------------------------------------------
  // Tab 4: Program Registration States & Logic
  // ----------------------------------------------------
  const [progName, setProgName] = useState("");
  const [progCode, setProgCode] = useState("");
  const [progSems, setProgSems] = useState(10);
  const [progError, setProgError] = useState("");
  const [progSuccess, setProgSuccess] = useState("");
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);

  const programMutation = useMutation({
    mutationFn: (payload: { name: string; code: string; totalSemesters: number }) => {
      if (editingProgramId) {
        return updateProgram(editingProgramId, payload);
      }
      return createProgram(payload);
    },
    onSuccess: () => {
      setProgSuccess(editingProgramId ? "Program updated successfully!" : "Program registered successfully!");
      setProgName("");
      setProgCode("");
      setProgSems(10);
      setEditingProgramId(null);
      setProgError("");
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: (err) => {
      setProgError(getErrorMessage(err));
    }
  });

  const deleteProgMutation = useMutation({
    mutationFn: deleteProgram,
    onSuccess: () => {
      setProgSuccess("Program deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: (err) => {
      setProgError(getErrorMessage(err));
    }
  });

  const handleProgramSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progName.trim() || !progCode.trim()) {
      setProgError("Program name and code are required");
      return;
    }
    programMutation.mutate({
      name: progName,
      code: progCode,
      totalSemesters: Number(progSems)
    });
  };

  // ----------------------------------------------------
  // Semester Registration States & Logic
  // ----------------------------------------------------
  const [semName, setSemName] = useState("");
  const [semError, setSemError] = useState("");
  const [semSuccess, setSemSuccess] = useState("");
  const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);

  const semesterMutation = useMutation({
    mutationFn: (payload: { name: string }) => {
      if (editingSemesterId) {
        return updateSemester(editingSemesterId, payload);
      }
      return createSemester(payload);
    },
    onSuccess: () => {
      setSemSuccess(editingSemesterId ? "Semester updated successfully!" : "Semester created successfully!");
      setSemName("");
      setEditingSemesterId(null);
      setSemError("");
      queryClient.invalidateQueries({ queryKey: ["semesters"] });
    },
    onError: (err) => {
      setSemError(getErrorMessage(err));
    }
  });

  const deleteSemMutation = useMutation({
    mutationFn: deleteSemester,
    onSuccess: () => {
      setSemSuccess("Semester deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["semesters"] });
    },
    onError: (err) => {
      setSemError(getErrorMessage(err));
    }
  });

  const handleSemesterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semName.trim()) {
      setSemError("Semester name is required");
      return;
    }
    semesterMutation.mutate({
      name: semName.trim()
    });
  };

  // ----------------------------------------------------
  // Tab 5: Session Registration States & Logic
  // ----------------------------------------------------
  const [sessName, setSessName] = useState("");
  const [sessCurrent, setSessCurrent] = useState(false);
  const [sessError, setSessError] = useState("");
  const [sessSuccess, setSessSuccess] = useState("");

  const sessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      setSessSuccess("Session registered successfully!");
      setSessName("");
      setSessCurrent(false);
      setSessError("");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (err) => {
      setSessError(getErrorMessage(err));
    }
  });

  const setSessionCurrentMutation = useMutation({
    mutationFn: setCurrentSessionApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (err) => {
      alert(getErrorMessage(err));
    }
  });

  const handleSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessName.trim()) {
      setSessError("Session name is required");
      return;
    }
    sessionMutation.mutate({
      name: sessName,
      isCurrent: sessCurrent
    });
  };

  return (
    <AppShell>
      <PageWrapper>
    <div className="admin-registration-page">
      {/* Dynamic Heading with Branding Context */}
      <div className="admin-registration-hero mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="admin-registration-kicker">Academic operations</span>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Registration center
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
            Setup classrooms, subjects, sessions, or onboard new academic staff and candidates.
          </p>
        </div>
        <div className="admin-registration-org">
          {orgData?.logo ? (
            <DynamicLogo src={orgData.logo} alt={orgData.name || "Organization"} />
          ) : (
            <span className="admin-registration-org-fallback">
              {(orgData?.name || "O").charAt(0).toUpperCase()}
            </span>
          )}
          <div><b>{orgData?.name || "Organization"}</b><small>{orgData?.orgType ?? "School"} workspace</small></div>
        </div>
      </div>

      <div className="admin-registration-layout grid gap-8 lg:grid-cols-[250px_1fr]">
        {/* Sidebar Nav Tabs inside registration page */}
        <aside className="admin-registration-tabs space-y-1">
          <button
            onClick={() => { setActiveTab("students"); setFormError(""); setFormSuccess(""); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all uppercase tracking-wide ${
              activeTab === "students"
                ? "bg-[#4B52DC] text-white shadow-lg shadow-indigo-600/10"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60"
            }`}
          >
            <UserPlus className="h-4.5 w-4.5" />
            Students
          </button>

          <button
            onClick={() => { setActiveTab("teachers"); setFormError(""); setFormSuccess(""); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all uppercase tracking-wide ${
              activeTab === "teachers"
                ? "bg-[#4B52DC] text-white shadow-lg shadow-indigo-600/10"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60"
            }`}
          >
            <BookOpen className="h-4.5 w-4.5" />
            Teachers
          </button>
          
          {isSchool ? (
            <button
              onClick={() => { setActiveTab("classes"); setClsError(""); setClsSuccess(""); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all uppercase tracking-wide ${
                activeTab === "classes"
                  ? "bg-[#4B52DC] text-white shadow-lg shadow-indigo-600/10"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60"
              }`}
            >
              <School className="h-4.5 w-4.5" />
              Classes
            </button>
          ) : (
            <>
              <button
                onClick={() => { setActiveTab("programs"); setProgError(""); setProgSuccess(""); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all uppercase tracking-wide ${
                  activeTab === "programs"
                    ? "bg-[#4B52DC] text-white shadow-lg shadow-indigo-600/10"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60"
                }`}
              >
                <GraduationCap className="h-4.5 w-4.5" />
                Programs
              </button>

              <button
                onClick={() => { setActiveTab("semesters"); setSemError(""); setSemSuccess(""); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all uppercase tracking-wide ${
                  activeTab === "semesters"
                    ? "bg-[#4B52DC] text-white shadow-lg shadow-indigo-600/10"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60"
                }`}
              >
                <Bookmark className="h-4.5 w-4.5" />
                Semesters
              </button>
            </>
          )}

          <button
            onClick={() => { setActiveTab("subjects"); setSubjError(""); setSubjSuccess(""); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all uppercase tracking-wide ${
              activeTab === "subjects"
                ? "bg-[#4B52DC] text-white shadow-lg shadow-indigo-600/10"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60"
            }`}
          >
            <BookOpen className="h-4.5 w-4.5" />
            Subjects
          </button>

          <button
            onClick={() => { setActiveTab("sessions"); setSessError(""); setSessSuccess(""); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all uppercase tracking-wide ${
              activeTab === "sessions"
                ? "bg-[#4B52DC] text-white shadow-lg shadow-indigo-600/10"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60"
            }`}
          >
            <Calendar className="h-4.5 w-4.5" />
            Sessions
          </button>
        </aside>

        {/* Dynamic Details Panel */}
        <main className="admin-registration-panel rounded-2xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/40 shadow-sm">
          <div className="registration-inventory-header">
            <div>
              <span>Registered records</span>
              <h2>
                {activeTab === "students" && "Students"}
                {activeTab === "teachers" && "Teachers"}
                {activeTab === "subjects" && "Subjects"}
                {activeTab === "classes" && "Classes"}
                {activeTab === "programs" && "Programs"}
                {activeTab === "sessions" && "Academic sessions"}
              </h2>
            </div>
            <Button
              onClick={() => {
                setShowCreatePanel((value) => !value);
                if (!showCreatePanel && (activeTab === "students" || activeTab === "teachers")) setRegWizardStep(1);
              }}
              icon={showCreatePanel ? undefined : <UserPlus className="h-4 w-4"/>}
              variant={showCreatePanel ? "secondary" : undefined}
            >
              {showCreatePanel ? "View registered" : "Add new"}
            </Button>
          </div>

          {!showCreatePanel ? (
            <div className="registration-inventory">
              {(activeTab === "students" || activeTab === "teachers") && (
                registeredUsers.filter((item) => item.role === (activeTab === "students" ? "Student" : "Teacher")).length > 0
                ? (
                  <div className="registration-people-table-wrap">
                    <table className="registration-people-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Gender</th>
                          <th>Date of birth</th>
                          <th>{activeTab === "students" ? "Class" : "Subject"}</th>
                          <th>Status</th>
                          <th className="w-20 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registeredUsers
                          .filter((item) => item.role === (activeTab === "students" ? "Student" : "Teacher"))
                          .map((item) => (
                            <tr key={item.id || item.email}>
                              <td>
                                <div className="registration-person-name">
                                  <div className="registration-inventory-avatar">
                                    {item.profilePicture ? <img src={item.profilePicture} alt=""/> : (item.name || "U").charAt(0).toUpperCase()}
                                  </div>
                                  <b>{item.name}</b>
                                </div>
                              </td>
                              <td>{item.email}</td>
                              <td>{item.gender || "—"}</td>
                              <td>{item.dob || "—"}</td>
                              <td>
                                <span className="registration-assignment">
                                  {activeTab === "teachers" ? (
                                    isSchool ? (item.subject || "—") : (item.subjects && item.subjects.length > 0 ? item.subjects.join(", ") : (item.subject || "—"))
                                  ) : (
                                    isSchool ? (item.class || "—") : (item.program_id ? `${programs.find(p => p.id === item.program_id)?.name || item.program_id} (Sem ${item.semester || 1})` : "—")
                                  )}
                                </span>
                              </td>
                              <td><span className="registration-active-status"><i/>Active</span></td>
                              <td>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      const userIdKey = (item.userId || item.email) ?? "";
                                      setEditingUserId(userIdKey);
                                      setRegName(item.name || "");
                                      setRegEmail(item.email || "");
                                      setRegDob(item.dob || "");
                                      setRegGender(item.gender || "Male");
                                      setRegJoinedAt(item.joined_at ? new Date(item.joined_at).toISOString().split("T")[0] : "");
                                      setRegRole((item.role === "Teacher" ? "Teacher" : "Student") as "Student" | "Teacher");
                                      if (item.role === "Teacher") {
                                        setRegSubject(item.subject || "");
                                        setRegSubjects(item.subjects || []);
                                        setRegProgram(item.program_id || (item.program_ids && item.program_ids.length > 0 ? item.program_ids[0] : ""));
                                      } else {
                                        setRegClass(item.class || "");
                                        setRegSession(item.session || "");
                                        setRegProgram(item.program_id || "");
                                        setRegSemester(item.semester || 1);
                                      }
                                      setRegMethod("manual");
                                      setRegWizardStep(2);
                                      setShowCreatePanel(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-[#4B52DC] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Edit user"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const userIdKey = (item.userId || item.email) ?? "";
                                      if (confirm(`Are you sure you want to delete ${item.name || "this user"}?`)) {
                                        try {
                                          await deleteUser(userIdKey);
                                          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                                        } catch (err) {
                                          alert("Error deleting user: " + getErrorMessage(err));
                                        }
                                      }
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                    title="Delete user"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )
                : <div className="registration-inventory-empty">No {activeTab} have been registered yet.</div>
              )}

              {activeTab === "subjects" && (
                subjects.length > 0 ? subjects.map((item) => (
                  <article key={item.id} className="registration-inventory-row compact">
                    <div className="registration-inventory-icon"><BookOpen className="h-4 w-4"/></div>
                    <div className="registration-inventory-primary">
                      <b>{item.name}</b>
                      {!isSchool && (item.program_semesters?.length || item.program_ids?.length) ? (
                        <span className="text-[10px] text-[#4B52DC] font-semibold mt-0.5 block">
                          Linked to: {
                            item.program_semesters && item.program_semesters.length > 0
                              ? item.program_semesters.map((ps: any) => {
                                  const progName = programs.find(p => p.id === ps.program_id)?.name || ps.program_id;
                                  return `${progName} (Semester ${ps.semester})`;
                                }).join(", ")
                              : item.program_ids && item.program_ids.length > 0
                                ? item.program_ids.map((pid: string) => programs.find(p => p.id === pid)?.name || pid).join(", ")
                                : "—"
                          }
                        </span>
                      ) : (
                        <span>Available for assessment setup</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubjectId(item.id);
                          setSubjName(item.name);
                          const linkedProgs = item.program_semesters 
                            ? item.program_semesters.map((ps: any) => ps.program_id) 
                            : (item.program_ids || []);
                          setSubjPrograms(linkedProgs);
                          const semsObj: Record<string, number> = {};
                          item.program_semesters?.forEach((ps: any) => {
                            semsObj[ps.program_id] = ps.semester;
                          });
                          setSubjSems(semsObj);
                          setShowCreatePanel(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this subject?")) {
                            deleteSubjMutation.mutate(item.id);
                          }
                        }}
                        disabled={deleteSubjMutation.isPending}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                )) : <div className="registration-inventory-empty">No subjects have been registered yet.</div>
              )}

              {activeTab === "classes" && (
                classes.length > 0 ? classes.map((item: any) => (
                  <article key={item.id} className="registration-inventory-row compact">
                    <div className="registration-inventory-icon"><School className="h-4 w-4"/></div>
                    <div className="registration-inventory-primary"><b>{item.name}</b><span>Order {item.numericOrder ?? "—"}</span></div>
                  </article>
                )) : <div className="registration-inventory-empty">No classes have been registered yet.</div>
              )}

              {activeTab === "programs" && (
                programs.length > 0 ? programs.map((item: any) => (
                  <article key={item.id} className="registration-inventory-row compact">
                    <div className="registration-inventory-icon"><GraduationCap className="h-4 w-4"/></div>
                    <div className="registration-inventory-primary"><b>{item.name}</b><span>{item.code || "Program"}</span></div>
                    
                    <div className="flex items-center gap-3">
                      <span className="registration-inventory-meta">{item.totalSemesters || "—"} semesters</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProgramId(item.id);
                          setProgName(item.name);
                          setProgCode(item.code);
                          setProgSems(item.totalSemesters);
                          setShowCreatePanel(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this program?")) {
                            deleteProgMutation.mutate(item.id);
                          }
                        }}
                        disabled={deleteProgMutation.isPending}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                )) : <div className="registration-inventory-empty">No programs have been registered yet.</div>
              )}

              {activeTab === "semesters" && (
                semesters.length > 0 ? semesters.map((item: any) => (
                  <article key={item.id} className="registration-inventory-row compact">
                    <div className="registration-inventory-icon"><Bookmark className="h-4 w-4"/></div>
                    <div className="registration-inventory-primary">
                      <b>{item.name}</b>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSemesterId(item.id);
                          setSemName(item.name);
                          setShowCreatePanel(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this semester?")) {
                            deleteSemMutation.mutate(item.id);
                          }
                        }}
                        disabled={deleteSemMutation.isPending}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                )) : <div className="registration-inventory-empty">No semesters have been registered yet.</div>
              )}

              {activeTab === "sessions" && (
                sessions.length > 0 ? sessions.map((item: any) => (
                  <article key={item.id} className="registration-inventory-row compact">
                    <div className="registration-inventory-icon"><Calendar className="h-4 w-4"/></div>
                    <div className="registration-inventory-primary"><b>{item.name}</b><span>Academic session</span></div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`registration-session-status ${item.isCurrent ? "current" : ""}`}>
                        {item.isCurrent ? "Current" : "Registered"}
                      </span>
                      {!item.isCurrent && (
                        <button
                          type="button"
                          onClick={() => setSessionCurrentMutation.mutate(item.id)}
                          disabled={setSessionCurrentMutation.isPending}
                          className="px-2 py-1 text-[10px] font-bold text-indigo-650 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/80 rounded-md border border-indigo-200/50 dark:border-indigo-900/40 transition-all cursor-pointer"
                        >
                          {setSessionCurrentMutation.isPending && setSessionCurrentMutation.variables === item.id ? "Setting..." : "Make Current"}
                        </button>
                      )}
                    </div>
                  </article>
                )) : <div className="registration-inventory-empty">No academic sessions have been registered yet.</div>
              )}
            </div>
          ) : (
          <>
          
          {/* Tab 1: User Register Tab */}
          {(activeTab === "students" || activeTab === "teachers") && (
            <div>
              {regWizardStep === 1 ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-black uppercase text-slate-800 dark:text-white">Onboard New Account</h2>
                    <p className="text-xs text-slate-500 mt-1">Onboard teachers or students manually or import lists from spreadsheet files.</p>
                  </div>
                  
                  <div className="grid md:grid-cols-1 gap-4">
                    {activeTab === "teachers" && (
                    <div className="border border-slate-200 dark:border-slate-800 p-6 rounded-2xl bg-white/40 dark:bg-slate-900/20 hover:border-[#4B52DC] transition-all flex flex-col justify-between">
                      <div>
                        <span className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl inline-block text-[#4B52DC]">
                          <UserPlus className="h-6 w-6" />
                        </span>
                        <h3 className="font-extrabold text-slate-800 dark:text-white mt-4 uppercase text-sm">Register Faculty</h3>
                        <p className="text-xs text-slate-500 mt-1">Create single or bulk teacher profiles with access to subjects and question banks.</p>
                      </div>
                      <div className="flex gap-2 mt-6">
                        <Button onClick={() => { setRegRole("Teacher"); setRegMethod("manual"); setRegWizardStep(2); }}>Register Manually</Button>
                        <Button variant="secondary" onClick={() => { setRegRole("Teacher"); setRegMethod("csv"); setRegWizardStep(2); }}>Upload CSV</Button>
                      </div>
                    </div>
                    )}

                    {activeTab === "students" && (
                    <div className="border border-slate-200 dark:border-slate-800 p-6 rounded-2xl bg-white/40 dark:bg-slate-900/20 hover:border-[#4B52DC] transition-all flex flex-col justify-between">
                      <div>
                        <span className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl inline-block text-[#4B52DC]">
                          <UserPlus className="h-6 w-6" />
                        </span>
                        <h3 className="font-extrabold text-slate-800 dark:text-white mt-4 uppercase text-sm">Register Student</h3>
                        <p className="text-xs text-slate-500 mt-1">Add student directories linked to specific classes or college semester paths.</p>
                      </div>
                      <div className="flex gap-2 mt-6">
                        <Button onClick={() => { setRegRole("Student"); setRegMethod("manual"); setRegWizardStep(2); }}>Register Manually</Button>
                        <Button variant="secondary" onClick={() => { setRegRole("Student"); setRegMethod("csv"); setRegWizardStep(2); }}>Upload CSV</Button>
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              ) : regMethod === "manual" ? (
                <form onSubmit={handleRegisterSubmit} className="admin-registration-form space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <h2 className="text-lg font-black uppercase text-slate-800 dark:text-white">
                      {editingUserId ? "Edit" : "Register"} {regRole} Manually
                    </h2>
                    {editingUserId ? (
                      <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => {
                        setEditingUserId(null);
                        setRegName("");
                        setRegEmail("");
                        setRegDob("");
                        setRegGender("Male");
                        setRegJoinedAt("");
                        setRegSubject("");
                        setRegSubjects([]);
                        setRegClass("");
                        setRegSession("");
                        setRegProgram("");
                        setRegPrograms([]);
                        setRegSemester(1);
                        setFormError("");
                        setFormSuccess("");
                        setShowCreatePanel(false);
                      }}>
                        Cancel Edit
                      </Button>
                    ) : (
                      <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => setRegWizardStep(1)}>Change Role/Method</Button>
                    )}
                  </div>

                  {formError && (
                    <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-semibold text-emerald-600 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Name" placeholder="Enter Full Name" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                    <Input label="Email" type="email" placeholder="Enter Email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                    <Input label="Date of Birth" type="date" value={regDob} onChange={(e) => setRegDob(e.target.value)} required />
                    <Select 
                      label="Gender" 
                      options={[{ label: "Male", value: "Male" }, { label: "Female", value: "Female" }]} 
                      value={regGender} 
                      onChange={(e) => setRegGender(e.target.value)} 
                    />
                    <Input label="Joining Date (Optional)" type="date" value={regJoinedAt} onChange={(e) => setRegJoinedAt(e.target.value)} />
                    
                    {regRole === "Teacher" ? (
                      <>
                        {!isSchool && (
                          <Select
                            label="Target Program"
                            options={[{ label: "Select Program", value: "" }, ...programs.map(p => ({ label: p.name, value: p.id }))]}
                            value={regProgram}
                            onChange={(e) => setRegProgram(e.target.value)}
                            required
                          />
                        )}
                        {isSchool ? (
                          <Select
                            label="Assigned Subject"
                            options={[
                              { label: "Select Subject", value: "" },
                              ...subjects
                                .filter(s => !regProgram || s.program_ids?.includes(regProgram) || s.program_semesters?.some((ps: any) => ps.program_id === regProgram))
                                .map(s => ({ label: s.name, value: s.name }))
                            ]}
                            value={regSubject}
                            onChange={(e) => setRegSubject(e.target.value)}
                            required
                          />
                        ) : (
                          <div className="md:col-span-2 space-y-2">
                            <label className="block text-xs font-extrabold uppercase text-slate-750 dark:text-slate-355 tracking-wider">
                              Assigned Subjects (Select Multiple)
                            </label>
                            <div className="grid grid-cols-2 gap-2 border border-slate-200 dark:border-slate-800/85 p-4 rounded-xl bg-white/50 dark:bg-slate-900/20 max-h-40 overflow-y-auto">
                              {(() => {
                                const availableSubjects = subjects.filter(s => !regProgram || s.program_ids?.includes(regProgram) || s.program_semesters?.some((ps: any) => ps.program_id === regProgram));
                                if (availableSubjects.length === 0) {
                                  return <span className="col-span-2 text-xs text-slate-400 font-medium">No subjects found for this program</span>;
                                }
                                return availableSubjects.map((s) => {
                                  const isChecked = regSubjects.includes(s.name);
                                  return (
                                    <label key={s.id} className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          setRegSubjects(prev =>
                                            prev.includes(s.name)
                                              ? prev.filter(name => name !== s.name)
                                              : [...prev, s.name]
                                          );
                                        }}
                                        className="rounded border-slate-300 dark:border-slate-855 text-[#4B52DC] focus:ring-indigo-500"
                                      />
                                      <span>{s.name}</span>
                                    </label>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <Select
                          label="Academic Session"
                          options={[{ label: "Select Session", value: "" }, ...sessions.map(s => ({ label: s.name, value: s.name }))]}
                          value={regSession}
                          onChange={(e) => setRegSession(e.target.value)}
                          required
                        />
                        {isSchool ? (
                          <Select
                            label="Target Class"
                            options={[{ label: "Select Class", value: "" }, ...classes.map(c => ({ label: c.name, value: c.name }))]}
                            value={regClass}
                            onChange={(e) => setRegClass(e.target.value)}
                            required
                          />
                        ) : (
                          <>
                            <Select
                              label="Target Program"
                              options={[{ label: "Select Program", value: "" }, ...programs.map(p => ({ label: p.name, value: p.id }))]}
                              value={regProgram}
                              onChange={(e) => setRegProgram(e.target.value)}
                              required
                            />
                            <Select
                              label="Semester"
                              options={[{ label: "Select Semester", value: "" }, ...semesterOptions]}
                              value={String(regSemester)}
                              onChange={(e) => setRegSemester(Number(e.target.value))}
                              required
                            />
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? "Creating Account..." : `Onboard ${regRole}`}
                    </Button>
                    <Button variant="secondary" type="button" onClick={() => setRegWizardStep(1)}>Cancel</Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCsvSubmit} className="admin-registration-form space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <h2 className="text-lg font-black uppercase text-slate-800 dark:text-white">Import {regRole}s via CSV</h2>
                    <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => setRegWizardStep(1)}>Change Role/Method</Button>
                  </div>

                  {csvError && (
                    <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{csvError}</span>
                    </div>
                  )}

                  {csvSuccess && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-semibold text-emerald-600 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>{csvSuccess}</span>
                    </div>
                  )}

                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/10">
                    <h4 className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FileText className="h-4 w-4" /> CSV Column Headers Required:
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono leading-relaxed">
                      {regRole === "Teacher" 
                        ? "name, email, dob, gender, subject, program_id" 
                        : isSchool 
                          ? "name, email, dob, gender, session, class"
                          : "name, email, dob, gender, session, program_id, semester"}
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-350">
                      Paste CSV Content Below
                    </span>
                    <textarea
                      rows={8}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm font-mono text-slate-800 dark:text-slate-250 outline-none transition focus:border-primary-500"
                      placeholder="name,email,dob,gender,...\nJane Doe,jane@school.com,2008-05-12,Female,..."
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                    />
                  </label>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isUploadingCsv || parsedCsvRows.length === 0}>
                      {isUploadingCsv ? "Importing Bulk Records..." : `Import ${parsedCsvRows.length} Records`}
                    </Button>
                    <Button variant="secondary" type="button" onClick={() => setRegWizardStep(1)}>Cancel</Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Tab 2: Subject Register Tab */}
          {activeTab === "subjects" && (
            <form onSubmit={handleSubjectSubmit} className="admin-registration-form space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black uppercase text-slate-800 dark:text-white">
                    {editingSubjectId ? "Edit Subject" : "Register Subject"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Configure study subjects inside the testing directory.</p>
                </div>
                {editingSubjectId && (
                  <Button variant="secondary" onClick={() => {
                    setEditingSubjectId(null);
                    setSubjName("");
                    setSubjPrograms([]);
                    setSubjSems({});
                    setSubjError("");
                    setSubjSuccess("");
                  }}>
                    Cancel Edit
                  </Button>
                )}
              </div>

              {subjError && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{subjError}</span>
                </div>
              )}

              {subjSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-semibold text-emerald-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{subjSuccess}</span>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Subject Name" placeholder="E.g., Mathematics, physics" value={subjName} onChange={(e) => setSubjName(e.target.value)} required />
                {!isSchool && (
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-xs font-extrabold uppercase text-slate-750 dark:text-slate-350 tracking-wider">
                      Link to Programs (Select Multiple)
                    </label>
                    <div className="space-y-3 border border-slate-200 dark:border-slate-800/85 p-4 rounded-xl bg-white/50 dark:bg-slate-900/20 max-h-56 overflow-y-auto">
                      {programs.map((p: any) => {
                        const isChecked = subjPrograms.includes(p.id);
                        return (
                          <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/50 pb-2 last:border-b-0 last:pb-0">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSubjPrograms(prev => prev.filter(id => id !== p.id));
                                    setSubjSems(prev => {
                                      const copy = { ...prev };
                                      delete copy[p.id];
                                      return copy;
                                    });
                                  } else {
                                    setSubjPrograms(prev => [...prev, p.id]);
                                    setSubjSems(prev => ({ ...prev, [p.id]: 1 }));
                                  }
                                }}
                                className="rounded border-slate-300 dark:border-slate-850 text-[#4B52DC] focus:ring-indigo-500"
                              />
                              <span>{p.name}</span>
                            </label>
                            
                            {isChecked && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase">Semester:</span>
                                <select
                                  value={subjSems[p.id] || 1}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setSubjSems(prev => ({ ...prev, [p.id]: val }));
                                  }}
                                  className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-2 py-1 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-slate-750 dark:text-slate-200"
                                >
                                  {Array.from({ length: p.totalSemesters || 10 }, (_, idx) => (
                                    <option key={idx + 1} value={idx + 1}>Semester {idx + 1}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={subjectMutation.isPending}>
                  {subjectMutation.isPending ? "Saving..." : (editingSubjectId ? "Update Subject" : "Register Subject")}
                </Button>
              </div>
            </form>
          )}

          {/* Tab 3: Class Register Tab */}
          {activeTab === "classes" && isSchool && (
            <form onSubmit={handleClassSubmit} className="admin-registration-form space-y-6">
              <div>
                <h2 className="text-lg font-black uppercase text-slate-800 dark:text-white">Register Class</h2>
                <p className="text-xs text-slate-500 mt-1">Configure standard classroom levels for the school.</p>
              </div>

              {clsError && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{clsError}</span>
                </div>
              )}

              {clsSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-semibold text-emerald-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{clsSuccess}</span>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Class Name" placeholder="E.g., Class 10, Class 9" value={clsName} onChange={(e) => setClsName(e.target.value)} required />
                <Input label="Numeric Order" type="number" placeholder="E.g., 10, 9" value={clsOrder} onChange={(e) => setClsOrder(e.target.value)} required />
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={classMutation.isPending}>
                  {classMutation.isPending ? "Registering..." : "Register Class"}
                </Button>
              </div>
            </form>
          )}

          {/* Tab 4: Program Register Tab */}
          {activeTab === "programs" && !isSchool && (
            <form onSubmit={handleProgramSubmit} className="admin-registration-form space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div>
                  <h2 className="text-lg font-black uppercase text-slate-800 dark:text-white">
                    {editingProgramId ? "Edit Program" : "Register Program"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Create course cohorts, degrees, or departments for the college.</p>
                </div>
                {editingProgramId && (
                  <Button variant="secondary" onClick={() => {
                    setEditingProgramId(null);
                    setProgName("");
                    setProgCode("");
                    setProgSems(8);
                    setProgError("");
                    setProgSuccess("");
                  }}>
                    Cancel Edit
                  </Button>
                )}
              </div>

              {progError && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{progError}</span>
                </div>
              )}

              {progSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-semibold text-emerald-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{progSuccess}</span>
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-4">
                <Input label="Program Name" placeholder="E.g., Bachelor of Computer Science" value={progName} onChange={(e) => setProgName(e.target.value)} required />
                <Input label="Program Code" placeholder="E.g., BTECH-CS" value={progCode} onChange={(e) => setProgCode(e.target.value)} required />
                <Input label="Total Semesters" type="number" min="1" max="10" value={progSems} onChange={(e) => setProgSems(Number(e.target.value))} required />
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={programMutation.isPending}>
                  {programMutation.isPending ? "Saving..." : (editingProgramId ? "Update Program" : "Register Program")}
                </Button>
              </div>
            </form>
          )}

          {/* Tab: Semesters Register Tab (College Mode Only) */}
          {activeTab === "semesters" && !isSchool && (
            <form onSubmit={handleSemesterSubmit} className="admin-registration-form space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div>
                  <h2 className="text-lg font-black uppercase text-slate-800 dark:text-white">
                    {editingSemesterId ? "Edit Semester" : "Register Semester"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Create semesters and link them to programs.</p>
                </div>
                {editingSemesterId && (
                  <Button variant="secondary" onClick={() => {
                    setEditingSemesterId(null);
                    setSemName("");
                    setSemError("");
                    setSemSuccess("");
                  }}>
                    Cancel Edit
                  </Button>
                )}
              </div>

              {semError && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{semError}</span>
                </div>
              )}

              {semSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-semibold text-emerald-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{semSuccess}</span>
                </div>
              )}

              <div className="max-w-md">
                <Input 
                  label="Semester Name" 
                  placeholder="E.g., Semester 1, Semester 2" 
                  value={semName} 
                  onChange={(e) => setSemName(e.target.value)} 
                  required 
                />
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={semesterMutation.isPending}>
                  {semesterMutation.isPending ? "Saving..." : (editingSemesterId ? "Update Semester" : "Create Semester")}
                </Button>
              </div>
            </form>
          )}

          {/* Tab 5: Session Register Tab */}
          {activeTab === "sessions" && (
            <form onSubmit={handleSessionSubmit} className="admin-registration-form space-y-6">
              <div>
                <h2 className="text-lg font-black uppercase text-slate-800 dark:text-white">Register Academic Session</h2>
                <p className="text-xs text-slate-500 mt-1">Define active academic calendar years.</p>
              </div>

              {sessError && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{sessError}</span>
                </div>
              )}

              {sessSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-semibold text-emerald-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{sessSuccess}</span>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 items-end">
                <Input label="Session Name" placeholder="E.g., 2026-2027" value={sessName} onChange={(e) => setSessName(e.target.value)} required />
                
                <label className="flex items-center gap-2 h-12 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sessCurrent}
                    onChange={(e) => setSessCurrent(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-300 text-[#4B52DC] focus:ring-[#4B52DC]"
                  />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Set as Current Active Session
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={sessionMutation.isPending}>
                  {sessionMutation.isPending ? "Registering..." : "Register Session"}
                </Button>
              </div>
            </form>
          )}

          </>
          )}
        </main>
      </div>
    </div>
      </PageWrapper>
    </AppShell>
  );
};
