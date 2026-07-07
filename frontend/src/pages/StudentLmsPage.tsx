import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  FolderOpen,
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  Layers3,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Youtube,
  Code,
  Maximize2,
  Minimize2,
  FileWarning,
  Printer,
  Moon,
  Sun,
  LayoutGrid,
  List
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";
import { MarkdownPreview } from "../components/ui/MarkdownPreview";
import { getMaterialsApi, getMyOrganization, getPrograms } from "../services/api";
import { useSubjects } from "../hooks/useTests";
import { useAuthStore } from "../store/authStore";
import { LmsMaterial } from "../types";

// ==========================================
// UTILS & HELPER FUNCTIONS
// ==========================================

const getSubjectTheme = (subjectStr: string) => {
  const sub = (subjectStr || "").toLowerCase();
  if (sub.includes("math") || sub.includes("dsa") || sub.includes("alg")) {
    return {
      gradient: "from-indigo-500/5 to-purple-500/5 dark:from-indigo-950/20 dark:to-purple-950/10",
      accent: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
      border: "border-indigo-100 dark:border-indigo-900/30",
      borderLine: "border-indigo-100/50 dark:border-indigo-950/20",
      badgeTone: "blue" as const,
    };
  }
  if (sub.includes("science") || sub.includes("dbms") || sub.includes("network") || sub.includes("system")) {
    return {
      gradient: "from-emerald-500/5 to-teal-500/5 dark:from-emerald-950/20 dark:to-teal-950/10",
      accent: "text-emerald-650 dark:text-emerald-400 bg-emerald-500/10",
      border: "border-emerald-100 dark:border-emerald-900/30",
      borderLine: "border-emerald-100/50 dark:border-emerald-950/20",
      badgeTone: "green" as const,
    };
  }
  if (sub.includes("code") || sub.includes("java") || sub.includes("python") || sub.includes("web")) {
    return {
      gradient: "from-amber-500/5 to-orange-500/5 dark:from-amber-950/20 dark:to-orange-950/10",
      accent: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
      border: "border-amber-100 dark:border-amber-900/30",
      borderLine: "border-amber-100/50 dark:border-amber-950/20",
      badgeTone: "yellow" as const,
    };
  }
  return {
    gradient: "from-slate-500/5 to-slate-650/5 dark:from-slate-900/10 dark:to-slate-800/5",
    accent: "text-slate-600 dark:text-slate-400 bg-slate-550/10",
    border: "border-slate-200/50 dark:border-slate-800",
    borderLine: "border-slate-100 dark:border-slate-800/80",
    badgeTone: "slate" as const,
  };
};

const getMaterialIcon = (type: LmsMaterial["resource_type"]) => {
  if (type === "video") return Youtube;
  if (type === "link") return Link2;
  if (type === "html") return Code;
  return FileText;
};

const getButtonClass = (tone: string) => {
  switch (tone) {
    case "blue":
      return "bg-indigo-600 hover:bg-indigo-750 text-white border-none";
    case "purple":
      return "bg-purple-600 hover:bg-purple-750 text-white border-none";
    case "green":
      return "bg-emerald-650 hover:bg-emerald-750 text-white border-none";
    case "yellow":
      return "bg-amber-600 hover:bg-amber-750 text-white border-none";
    case "rose":
      return "bg-rose-600 hover:bg-rose-750 text-white border-none";
    default:
      return "bg-indigo-600 hover:bg-indigo-750 text-white border-none";
  }
};

// ==========================================
// 1. STUDENT LMS HOME PAGE
// ==========================================

export const StudentLmsPage = () => {
  const user = useAuthStore((state) => state.user);
  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    return (localStorage.getItem("parikshya_student_lms_view_mode") as "card" | "list") || "card";
  });

  const handleSetViewMode = (mode: "card" | "list") => {
    setViewMode(mode);
    localStorage.setItem("parikshya_student_lms_view_mode", mode);
  };
  const { data: allSubjects = [] } = useSubjects();
  const { data: orgData } = useQuery({
    queryKey: ["myOrganization"],
    queryFn: getMyOrganization,
    enabled: Boolean(user),
  });

  const { data: materials = [], isLoading: isLoadingMaterials } = useQuery({
    queryKey: ["lmsMaterials", user?.program_id, user?.semester],
    queryFn: () => getMaterialsApi({ program_id: user?.program_id || "", semester: user?.semester || undefined }),
    enabled: Boolean(user && orgData?.orgType === "College"),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: getPrograms,
    enabled: Boolean(user && orgData?.orgType === "College"),
  });

  const currentProgramCode = useMemo(() => {
    if (!user?.program_id) return "Program not assigned";
    const program = programs.find((item) => item.id === user.program_id);
    return program?.code || user.program_id;
  }, [programs, user?.program_id]);

  const collegeCohortSubjects = useMemo(() => {
    if (orgData?.orgType !== "College" || !user?.program_id || !user?.semester) return [];
    return allSubjects.filter((sub) => {
      if (!sub.program_semesters) return false;
      return sub.program_semesters.some(
        (ps: any) => ps.program_id === user.program_id && Number(ps.semester) === Number(user.semester)
      );
    });
  }, [allSubjects, user, orgData]);

  return (
    <AppShell>
      <PageWrapper>
        <div className="space-y-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-slate-950 p-6 md:p-8 shadow-xl shadow-slate-200/60 dark:shadow-black/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(99,102,241,.35),transparent_34%),radial-gradient(circle_at_90%_5%,rgba(20,184,166,.28),transparent_30%),linear-gradient(135deg,rgba(15,23,42,.96),rgba(30,41,59,.92))]" />
            <div className="absolute -bottom-24 right-8 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="relative z-10 grid gap-7 lg:grid-cols-[1fr_320px] lg:items-end">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-indigo-100 backdrop-blur">
                  <FolderOpen className="h-4 w-4" />
                  LMS Study Portal
                </div>
                <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-white md:text-5xl">
                  Your semester learning library, organized by subject.
                </h1>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-300">
                  Access notes, videos, reference links, and study documents uploaded for your current program and semester.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Current cohort</p>
                <div className="mt-4 grid gap-3">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-white">
                    <GraduationCap className="h-5 w-5 text-teal-300" />
                    <span className="text-sm font-extrabold">{currentProgramCode}</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-white">
                    <CalendarDays className="h-5 w-5 text-indigo-300" />
                    <span className="text-sm font-extrabold">Semester {user?.semester || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {isLoadingMaterials ? (
            <div className="flex h-56 items-center justify-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-500">
              <Spinner /> <span className="ml-2 font-bold">Loading study materials...</span>
            </div>
          ) : collegeCohortSubjects.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center bg-white/70 dark:bg-slate-900/50">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-550">
                <Layers3 className="h-7 w-7" />
              </div>
              <p className="text-base font-black text-slate-800 dark:text-slate-100">No registered subjects found</p>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">There are no subjects assigned to your program and semester currently.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Subjects</p>
                  <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{collegeCohortSubjects.length}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Resources</p>
                  <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{materials.length}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Latest upload</p>
                  <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">
                    {materials[0]?.created_at ? new Date(materials[0].created_at).toLocaleDateString([], { dateStyle: "medium" }) : "No uploads yet"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Your Subjects</h2>
                  <p className="text-xs font-semibold text-slate-550 dark:text-slate-400">Select a subject to view its study materials</p>
                </div>
                <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-950/60 border border-slate-205 dark:border-slate-800/40">
                  <button
                    type="button"
                    onClick={() => handleSetViewMode("card")}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                      viewMode === "card"
                        ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    }`}
                    title="Card View"
                  >
                    <LayoutGrid className="h-4.5 w-4.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetViewMode("list")}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                      viewMode === "list"
                        ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    }`}
                    title="List View"
                  >
                    <List className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {viewMode === "card" ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {collegeCohortSubjects.map((subject) => {
                    const subjectMaterials = materials.filter((m) => m.subject_id === subject.id);
                    const theme = getSubjectTheme(subject.name);
                    const readmeCount = subjectMaterials.filter((m) => m.resource_type === "readme").length;
                    const externalCount = subjectMaterials.length - readmeCount;

                    return (
                      <Link
                        key={subject.id}
                        to={`/lms/subjects/${encodeURIComponent(subject.id)}`}
                        className={`group overflow-hidden rounded-[1.75rem] border ${theme.border} bg-white dark:bg-slate-900 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 dark:hover:shadow-black/20`}
                      >
                        <div className={`border-b ${theme.borderLine} bg-gradient-to-br ${theme.gradient} p-5`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${theme.accent}`}>
                              <BookOpenCheck className="h-7 w-7" />
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm transition group-hover:bg-slate-950 group-hover:text-white dark:bg-slate-950 dark:group-hover:bg-white dark:group-hover:text-slate-950">
                              <ArrowRight className="h-5 w-5" />
                            </div>
                          </div>
                          <h3 className="mt-6 text-2xl font-black leading-tight text-slate-900 dark:text-white">{subject.name}</h3>
                          <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Subject Code: {subject.id.toUpperCase()}
                          </span>
                        </div>

                        <div className="space-y-5 p-5">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-950/40">
                              <p className="text-2xl font-black text-slate-900 dark:text-white">{subjectMaterials.length}</p>
                              <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Topics</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-950/40">
                              <p className="text-2xl font-black text-slate-900 dark:text-white">{readmeCount}</p>
                              <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Readme</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-950/40">
                              <p className="text-2xl font-black text-slate-900 dark:text-white">{externalCount}</p>
                              <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Files</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <Badge tone={theme.badgeTone} className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                              Semester {user?.semester}
                            </Badge>
                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">Open subject</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="overflow-x-auto p-5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
                          <th className="pb-3 pl-3">Subject</th>
                          <th className="pb-3">Subject Code</th>
                          <th className="pb-3">Audience</th>
                          <th className="pb-3 text-right pr-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-105 dark:divide-slate-800/50">
                        {collegeCohortSubjects.map((subject) => {
                          const subjectMaterials = materials.filter((m) => m.subject_id === subject.id);
                          const theme = getSubjectTheme(subject.name);
                          const readmeCount = subjectMaterials.filter((m) => m.resource_type === "readme").length;
                          const externalCount = subjectMaterials.length - readmeCount;
                          const btnClass = getButtonClass(theme.badgeTone);

                          return (
                            <tr key={subject.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                              <td className="py-4 pl-3">
                                <div className="flex items-center gap-3.5">
                                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.accent}`}>
                                    <BookOpenCheck className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[280px]">
                                        {subject.name}
                                      </h4>
                                      <Badge tone={theme.badgeTone} className="rounded-full text-[8px] font-black uppercase tracking-wider scale-90 origin-left">
                                        Subject
                                      </Badge>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 truncate max-w-[340px]">
                                      {subjectMaterials.length} topics • {readmeCount} readme • {externalCount} files
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                <code className="px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-950 text-[10px] font-mono text-slate-650 dark:text-slate-350 uppercase font-bold border border-slate-200/50 dark:border-slate-800/80">
                                  {subject.id}
                                </code>
                              </td>
                              <td className="py-4 text-xs font-bold text-slate-500">
                                <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] text-slate-655 dark:text-slate-300 font-extrabold uppercase">
                                  {currentProgramCode} · Sem {user?.semester || 1}
                                </span>
                              </td>
                              <td className="py-4 text-right pr-3">
                                <div className="flex items-center justify-end gap-2">
                                  <Link to={`/lms/subjects/${encodeURIComponent(subject.id)}`}>
                                    <Button className={`h-8 rounded-xl text-[10px] font-bold px-3.5 flex items-center gap-1.5 shadow-sm border-none ${btnClass}`}>
                                      <BookOpenCheck className="h-3.5 w-3.5" /> Open Subject
                                    </Button>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PageWrapper>
    </AppShell>
  );
};

// ==========================================
// 2. STUDENT LMS SUBJECT DETAIL PAGE
// ==========================================

export const StudentLmsSubjectPage = () => {
  const { subjectId = "" } = useParams<{ subjectId: string }>();
  const decodedSubjectId = decodeURIComponent(subjectId);
  const user = useAuthStore((state) => state.user);
  const { data: allSubjects = [] } = useSubjects();
  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    return (localStorage.getItem("parikshya_student_lms_view_mode") as "card" | "list") || "card";
  });

  const handleSetViewMode = (mode: "card" | "list") => {
    setViewMode(mode);
    localStorage.setItem("parikshya_student_lms_view_mode", mode);
  };

  const { data: orgData } = useQuery({
    queryKey: ["myOrganization"],
    queryFn: getMyOrganization,
    enabled: Boolean(user),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: getPrograms,
    enabled: Boolean(user && orgData?.orgType === "College"),
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["lmsMaterials", user?.program_id, user?.semester, decodedSubjectId],
    queryFn: () => getMaterialsApi({
      program_id: user?.program_id || "",
      semester: user?.semester || undefined,
      subject_id: decodedSubjectId,
    }),
    enabled: Boolean(user && orgData?.orgType === "College" && decodedSubjectId),
  });

  const subject = useMemo(() => allSubjects.find((item) => item.id === decodedSubjectId), [allSubjects, decodedSubjectId]);
  const currentProgramCode = useMemo(() => {
    if (!user?.program_id) return "Program not assigned";
    return programs.find((item) => item.id === user.program_id)?.code || user.program_id;
  }, [programs, user?.program_id]);

  const readmeCount = materials.filter((item) => item.resource_type === "readme").length;

  return (
    <AppShell>
      <PageWrapper>
        <div className="space-y-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 p-6 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:shadow-black/20 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(99,102,241,.34),transparent_32%),radial-gradient(circle_at_85%_12%,rgba(245,158,11,.24),transparent_30%),linear-gradient(135deg,rgba(15,23,42,.98),rgba(30,41,59,.94))]" />
            <div className="relative z-10">
              <Link to="/lms" className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/15">
                <ArrowLeft className="h-4 w-4" />
                Back to subjects
              </Link>
              <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end">
                <div>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-amber-200 backdrop-blur">
                    <BookOpenCheck className="h-8 w-8" />
                  </div>
                  <h1 className="text-3xl font-black leading-tight tracking-tight text-white md:text-5xl">
                    {subject?.name || "Subject materials"}
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-300">
                    Choose a topic below. README topics open as a full-page preview here; files and links open externally.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                  <div className="rounded-2xl bg-white/10 p-3 text-center">
                    <p className="text-2xl font-black text-white">{materials.length}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-300">Topics</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3 text-center">
                    <p className="text-2xl font-black text-white">{readmeCount}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-300">Readme</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3 text-center">
                    <p className="text-sm font-black text-white">{currentProgramCode}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-300">Program</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {isLoading ? (
            <div className="flex h-56 items-center justify-center rounded-3xl border border-slate-200 bg-white/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/70">
              <Spinner /> <span className="ml-2 font-bold">Loading topics...</span>
            </div>
          ) : materials.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-550 dark:bg-slate-800">
                <Layers3 className="h-7 w-7" />
              </div>
              <p className="text-base font-black text-slate-800 dark:text-slate-100">No topics uploaded yet</p>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Your teacher has not published resources for this subject.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Study Resources</h2>
                  <p className="text-xs font-semibold text-slate-550 dark:text-slate-400">Access study materials, documents, and reference links</p>
                </div>
                <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-950/60 border border-slate-205 dark:border-slate-800/40">
                  <button
                    type="button"
                    onClick={() => handleSetViewMode("card")}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                      viewMode === "card"
                        ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    }`}
                    title="Card View"
                  >
                    <LayoutGrid className="h-4.5 w-4.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetViewMode("list")}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                      viewMode === "list"
                        ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    }`}
                    title="List View"
                  >
                    <List className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {viewMode === "card" ? (
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {materials.map((mat) => {
                    const Icon = getMaterialIcon(mat.resource_type);
                    const isReadme = mat.resource_type === "readme";
                    const isHtml = mat.resource_type === "html";
                    const isPdf = mat.resource_type === "document" && mat.file_url?.toLowerCase().split('?')[0].endsWith('.pdf');
                    return (
                      <article
                        key={mat.id}
                        className="flex min-h-[230px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700 dark:hover:shadow-black/20"
                      >
                        <div>
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                              mat.resource_type === "video"
                                ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
                                : isReadme
                                  ? "bg-amber-100 text-amber-650 dark:bg-amber-950/40 dark:text-amber-300"
                                : isHtml
                                  ? "bg-teal-100 text-teal-650 dark:bg-teal-950/40 dark:text-teal-300"
                                : mat.resource_type === "document"
                                  ? "bg-emerald-100 text-emerald-650 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-indigo-100 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-305"
                            }`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <Badge tone="slate" className="rounded-full text-[9px] font-black uppercase tracking-wider">
                              {mat.resource_type === "readme" ? "README.md file" : mat.resource_type === "html" ? "HTML Article" : mat.resource_type}
                            </Badge>
                          </div>
                          <h2 className="text-lg font-black leading-tight text-slate-900 line-clamp-2 dark:text-white">{mat.title}</h2>
                          {mat.description && (
                            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 line-clamp-3 dark:text-slate-400">{mat.description}</p>
                          )}
                        </div>

                        <div className="mt-5 border-t border-slate-200/70 pt-4 dark:border-slate-800">
                          <p className="mb-3 text-[10px] font-bold text-slate-400">
                            By {mat.uploaded_by_name} · {new Date(mat.created_at).toLocaleDateString([], { dateStyle: "medium" })}
                          </p>
                          {isReadme ? (
                            <Link to={`/lms/subjects/${encodeURIComponent(decodedSubjectId)}/readme/${encodeURIComponent(mat.id)}`}>
                              <Button className="h-10 w-full rounded-2xl text-[11px] font-black shadow-sm flex items-center justify-center gap-2">
                                <FileText className="h-3.5 w-3.5" />
                                Open Preview Page
                              </Button>
                            </Link>
                          ) : isHtml ? (
                            <Link to={`/lms/subjects/${encodeURIComponent(decodedSubjectId)}/html/${encodeURIComponent(mat.id)}`}>
                              <Button className="h-10 w-full rounded-2xl text-[11px] font-black shadow-sm flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-black border-none">
                                <Code className="h-3.5 w-3.5" />
                                Preview HTML Article
                              </Button>
                            </Link>
                          ) : isPdf ? (
                            <div className="flex gap-2 w-full">
                              <Link to={`/lms/subjects/${encodeURIComponent(decodedSubjectId)}/pdf/${encodeURIComponent(mat.id)}`} className="flex-1">
                                <Button className="h-10 w-full rounded-2xl text-[11px] font-black shadow-sm flex items-center justify-center gap-2">
                                  <FileText className="h-3.5 w-3.5" />
                                  Preview PDF
                                </Button>
                              </Link>
                              <a href={mat.file_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="secondary" className="h-10 rounded-2xl px-3 flex items-center justify-center shadow-sm" title="Download File">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </a>
                            </div>
                          ) : (
                            <a href={mat.file_url} target="_blank" rel="noopener noreferrer">
                              <Button className="h-10 w-full rounded-2xl text-[11px] font-black shadow-sm flex items-center justify-center gap-2">
                                {mat.resource_type === "document" ? <Download className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                                {mat.resource_type === "document" ? "Get File" : "Visit Link"}
                              </Button>
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </section>
              ) : (
                <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="overflow-x-auto p-5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
                          <th className="pb-3 pl-3">Resource</th>
                          <th className="pb-3">Subject</th>
                          <th className="pb-3">Audience</th>
                          <th className="pb-3 text-right pr-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {materials.map((mat) => {
                          const isDoc = mat.resource_type === "document";
                          const isVideo = mat.resource_type === "video";
                          const isReadme = mat.resource_type === "readme";
                          const isHtml = mat.resource_type === "html";
                          const isPdf = isDoc && mat.file_url?.toLowerCase().split('?')[0].endsWith('.pdf');
                          
                          let ResourceIcon = FileText;
                          if (isVideo) ResourceIcon = Youtube;
                          else if (isReadme) ResourceIcon = FileText;
                          else if (isHtml) ResourceIcon = Code;
                          else if (mat.resource_type === "link") ResourceIcon = Link2;

                          return (
                            <tr key={mat.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                              <td className="py-4 pl-3">
                                <div className="flex items-center gap-3.5">
                                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                    isVideo
                                      ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
                                      : isReadme
                                        ? "bg-amber-100 text-amber-650 dark:bg-amber-950/40 dark:text-amber-300"
                                      : isHtml
                                        ? "bg-teal-100 text-teal-650 dark:bg-teal-950/40 dark:text-teal-300"
                                      : isDoc
                                        ? "bg-emerald-100 text-emerald-650 dark:bg-emerald-950/40 dark:text-emerald-300"
                                        : "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"
                                  }`}>
                                    <ResourceIcon className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[280px]">
                                        {mat.title}
                                      </h4>
                                      <Badge tone="slate" className="rounded-full text-[8px] font-black uppercase tracking-wider scale-90 origin-left">
                                        {mat.resource_type === "readme" ? "README.md file" : mat.resource_type === "html" ? "HTML Article" : mat.resource_type}
                                      </Badge>
                                    </div>
                                    {mat.description && (
                                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 truncate max-w-[340px]">
                                        {mat.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {subject?.name || mat.subject_id}
                              </td>
                              <td className="py-4 text-xs font-bold text-slate-500">
                                <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] text-slate-655 dark:text-slate-300 font-extrabold uppercase">
                                  {currentProgramCode} · Sem {user?.semester || 1}
                                </span>
                              </td>
                              <td className="py-4 text-right pr-3">
                                <div className="flex items-center justify-end gap-2">
                                  {isReadme ? (
                                    <Link to={`/lms/subjects/${encodeURIComponent(decodedSubjectId)}/readme/${encodeURIComponent(mat.id)}`}>
                                      <Button className="h-8 rounded-xl text-[10px] font-bold px-3.5 flex items-center gap-1.5 shadow-sm border-none bg-indigo-600 hover:bg-indigo-750 text-white">
                                        <FileText className="h-3.5 w-3.5" /> Preview
                                      </Button>
                                    </Link>
                                  ) : isHtml ? (
                                    <Link to={`/lms/subjects/${encodeURIComponent(decodedSubjectId)}/html/${encodeURIComponent(mat.id)}`}>
                                      <Button className="h-8 rounded-xl text-[10px] font-bold px-3.5 flex items-center gap-1.5 shadow-sm border-none bg-teal-500 hover:bg-teal-600 text-black">
                                        <Code className="h-3.5 w-3.5" /> Preview
                                      </Button>
                                    </Link>
                                  ) : isPdf ? (
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <Link to={`/lms/subjects/${encodeURIComponent(decodedSubjectId)}/pdf/${encodeURIComponent(mat.id)}`}>
                                        <Button className="h-8 rounded-xl text-[10px] font-bold px-3.5 flex items-center gap-1.5 shadow-sm border-none bg-emerald-650 hover:bg-emerald-750 text-white">
                                          <FileText className="h-3.5 w-3.5" /> Preview
                                        </Button>
                                      </Link>
                                      <a href={mat.file_url} target="_blank" rel="noopener noreferrer">
                                        <Button variant="secondary" className="h-8 w-8 rounded-xl p-0 flex items-center justify-center shadow-sm" title="Download File">
                                          <Download className="h-3.5 w-3.5" />
                                        </Button>
                                      </a>
                                    </div>
                                  ) : (
                                    <a href={mat.file_url} target="_blank" rel="noopener noreferrer">
                                      <Button className="h-8 rounded-xl text-[10px] font-black px-3.5 flex items-center gap-1.5 shadow-sm border-none bg-indigo-650 hover:bg-indigo-750 text-white">
                                        {mat.resource_type === "document" ? <Download className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                                        {mat.resource_type === "document" ? "Get File" : "Visit Link"}
                                      </Button>
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PageWrapper>
    </AppShell>
  );
};

// ==========================================
// 3. STUDENT LMS README.MD PREVIEW PAGE
// ==========================================

export const StudentLmsReadmePreviewPage = () => {
  const { subjectId = "", materialId = "" } = useParams<{ subjectId: string; materialId: string }>();
  const decodedSubjectId = decodeURIComponent(subjectId);
  const decodedMaterialId = decodeURIComponent(materialId);
  const user = useAuthStore((state) => state.user);
  const { data: allSubjects = [] } = useSubjects();
  const [isFullScreen, setIsFullScreen] = useState(false);

  const { data: orgData } = useQuery({
    queryKey: ["myOrganization"],
    queryFn: getMyOrganization,
    enabled: Boolean(user),
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["lmsMaterials", user?.program_id, user?.semester, decodedSubjectId],
    queryFn: () => getMaterialsApi({
      program_id: user?.role === "Teacher" ? undefined : (user?.program_id || undefined),
      semester: user?.role === "Teacher" ? undefined : (user?.semester || undefined),
      subject_id: decodedSubjectId,
    }),
    enabled: Boolean(user && orgData?.orgType === "College" && decodedSubjectId),
  });

  const subject = useMemo(() => allSubjects.find((item) => item.id === decodedSubjectId), [allSubjects, decodedSubjectId]);
  const material = useMemo(() => materials.find((item) => item.id === decodedMaterialId), [materials, decodedMaterialId]);

  const closeUrl = useMemo(() => {
    return user?.role === "Teacher"
      ? "/dashboard?tab=lms"
      : `/lms/subjects/${encodeURIComponent(decodedSubjectId)}`;
  }, [user, decodedSubjectId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 transition-colors duration-200">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link
            to={closeUrl}
            className="inline-flex w-max items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {user?.role === "Teacher" ? "Back to Dashboard" : "Back to topics"}
          </Link>
        </div>

        {isLoading ? (
          <div className="flex h-56 items-center justify-center rounded-3xl border border-slate-200 bg-white/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/70">
            <Spinner /> <span className="ml-2 font-bold">Loading README preview...</span>
          </div>
        ) : !material || material.resource_type !== "readme" ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-base font-black text-slate-800 dark:text-slate-100">README topic not found</p>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">The selected material could not be opened for preview.</p>
          </div>
        ) : (
          <div className={isFullScreen ? "w-full" : "grid gap-6 lg:grid-cols-[280px_1fr]"}>
            {!isFullScreen && (
              <aside className="hidden lg:flex flex-col gap-3 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 self-start sticky top-6 shadow-sm">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Resources</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate">{subject?.name || "Subject"}</p>
                </div>
                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[600px] pr-1">
                  {materials.map((mat) => {
                    const isR = mat.resource_type === "readme";
                    const isH = mat.resource_type === "html";
                    const isP = mat.resource_type === "document" && mat.file_url?.toLowerCase().split('?')[0].endsWith('.pdf');
                    const isActive = mat.id === decodedMaterialId;
                    
                    let targetLink = "";
                    if (isR) targetLink = `/lms/subjects/${encodeURIComponent(decodedSubjectId)}/readme/${encodeURIComponent(mat.id)}`;
                    else if (isH) targetLink = `/lms/subjects/${encodeURIComponent(decodedSubjectId)}/html/${encodeURIComponent(mat.id)}`;
                    else if (isP) targetLink = `/lms/subjects/${encodeURIComponent(decodedSubjectId)}/pdf/${encodeURIComponent(mat.id)}`;

                    let Icon = FileText;
                    if (mat.resource_type === "video") Icon = Youtube;
                    else if (isH) Icon = Code;
                    else if (mat.resource_type === "link") Icon = Link2;

                    const itemContent = (
                      <div className={`flex items-center gap-2.5 rounded-2xl p-3 text-xs font-black transition-all ${
                        isActive
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-l-4 border-indigo-500"
                          : "text-slate-650 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-350 dark:hover:bg-slate-850 dark:hover:text-slate-100"
                      }`}>
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          isActive
                            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="truncate flex-1 text-left">{mat.title}</span>
                      </div>
                    );

                    if (targetLink) {
                      return (
                        <Link key={mat.id} to={targetLink}>
                          {itemContent}
                        </Link>
                      );
                    }

                    return (
                      <a key={mat.id} href={mat.file_url} target="_blank" rel="noopener noreferrer">
                        {itemContent}
                      </a>
                    );
                  })}
                </div>
              </aside>
            )}

            <div className="min-w-0">
              <section className={isFullScreen
                ? "fixed inset-0 z-[100] bg-[#1c1c1b] overflow-y-auto flex flex-col p-6 md:p-12 animate-fade-in text-white"
                : "overflow-hidden rounded-[2rem] border border-[#2b2b2a] bg-[#1c1c1b] text-white shadow-2xl flex flex-col min-h-[600px] animate-fade-in"
              }>
                <div className="flex flex-col gap-4 border-b border-white/10 bg-[#282827] p-6 md:flex-row md:items-center md:justify-between rounded-t-[1.75rem]">
                  <div>
                    <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                      <FileText className="h-3.5 w-3.5" />
                      README.md file preview
                    </span>
                    <h1 className="text-2xl font-black md:text-3xl">{material.title}</h1>
                    <p className="mt-1 text-xs font-semibold text-zinc-450">
                      {subject?.name || "Subject"} · By {material.uploaded_by_name} · {new Date(material.created_at).toLocaleDateString([], { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-xl flex items-center gap-1.5 h-10 px-4 border border-white/10 bg-white/5 hover:bg-white/10 text-white"
                      onClick={() => setIsFullScreen(!isFullScreen)}
                    >
                      {isFullScreen ? (
                        <>
                          <Minimize2 className="h-4 w-4" /> Exit Full Screen
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-4 w-4" /> Full Screen
                        </>
                      )}
                    </Button>
                    <Link to={closeUrl}>
                      <Button type="button" variant="secondary" className="rounded-xl h-10 px-5 text-sm font-bold shadow-sm">
                        Close Preview
                      </Button>
                    </Link>
                  </div>
                </div>

                {material.description && (
                  <div className="border-b border-white/10 bg-[#282827] px-6 py-3.5 text-sm font-semibold text-zinc-300">
                    {material.description}
                  </div>
                )}

                <div className="p-8 md:p-12 flex-1">
                  <div className="mx-auto max-w-5xl">
                    <MarkdownPreview content={material.readme_content || ""} variant="reader" isHtml={false} />
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 4. STUDENT LMS PDF PREVIEW PAGE
// ==========================================

export const StudentLmsPdfPreviewPage = () => {
  const { subjectId = "", materialId = "" } = useParams<{ subjectId: string; materialId: string }>();
  const decodedSubjectId = decodeURIComponent(subjectId);
  const decodedMaterialId = decodeURIComponent(materialId);
  const user = useAuthStore((state) => state.user);
  const { data: allSubjects = [] } = useSubjects();

  const { data: orgData } = useQuery({
    queryKey: ["myOrganization"],
    queryFn: getMyOrganization,
    enabled: Boolean(user),
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["lmsMaterials", user?.program_id, user?.semester, decodedSubjectId],
    queryFn: () => getMaterialsApi({
      program_id: user?.role === "Teacher" ? undefined : (user?.program_id || undefined),
      semester: user?.role === "Teacher" ? undefined : (user?.semester || undefined),
      subject_id: decodedSubjectId,
    }),
    enabled: Boolean(user && orgData?.orgType === "College" && decodedSubjectId),
  });

  const subject = useMemo(() => allSubjects.find((item) => item.id === decodedSubjectId), [allSubjects, decodedSubjectId]);
  const material = useMemo(() => materials.find((item) => item.id === decodedMaterialId), [materials, decodedMaterialId]);

  const closeUrl = useMemo(() => {
    return user?.role === "Teacher"
      ? "/dashboard?tab=lms"
      : `/lms/subjects/${encodeURIComponent(decodedSubjectId)}`;
  }, [user, decodedSubjectId]);

  const isPdf = useMemo(() => {
    if (!material?.file_url) return false;
    return material.file_url.toLowerCase().split('?')[0].endsWith('.pdf');
  }, [material]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 transition-colors duration-200">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link
            to={closeUrl}
            className="inline-flex w-max items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {user?.role === "Teacher" ? "Back to Dashboard" : "Back to topics"}
          </Link>
        </div>

        {isLoading ? (
          <div className="flex h-56 items-center justify-center rounded-3xl border border-slate-200 bg-white/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/70">
            <Spinner /> <span className="ml-2 font-bold">Loading PDF Document...</span>
          </div>
        ) : !material || material.resource_type !== "document" ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-base font-black text-slate-800 dark:text-slate-100">PDF not found</p>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">The selected document could not be loaded.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="hidden lg:flex flex-col gap-3 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 self-start sticky top-6 shadow-sm">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Resources</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate">{subject?.name || "Subject"}</p>
              </div>
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[600px] pr-1">
                {materials.map((mat) => {
                  const isR = mat.resource_type === "readme";
                  const isH = mat.resource_type === "html";
                  const isP = mat.resource_type === "document" && mat.file_url?.toLowerCase().split('?')[0].endsWith('.pdf');
                  const isActive = mat.id === decodedMaterialId;
                  
                  let targetLink = "";
                  if (isR) targetLink = `/lms/subjects/${encodeURIComponent(decodedSubjectId)}/readme/${encodeURIComponent(mat.id)}`;
                  else if (isH) targetLink = `/lms/subjects/${encodeURIComponent(decodedSubjectId)}/html/${encodeURIComponent(mat.id)}`;
                  else if (isP) targetLink = `/lms/subjects/${encodeURIComponent(decodedSubjectId)}/pdf/${encodeURIComponent(mat.id)}`;

                  let Icon = FileText;
                  if (mat.resource_type === "video") Icon = Youtube;
                  else if (isH) Icon = Code;
                  else if (mat.resource_type === "link") Icon = Link2;

                  const itemContent = (
                    <div className={`flex items-center gap-2.5 rounded-2xl p-3 text-xs font-black transition-all ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-l-4 border-indigo-500"
                        : "text-slate-655 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-350 dark:hover:bg-slate-850 dark:hover:text-slate-100"
                    }`}>
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        isActive
                          ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="truncate flex-1 text-left">{mat.title}</span>
                    </div>
                  );

                  if (targetLink) {
                    return (
                      <Link key={mat.id} to={targetLink}>
                        {itemContent}
                      </Link>
                    );
                  }

                  return (
                    <a key={mat.id} href={mat.file_url} target="_blank" rel="noopener noreferrer">
                      {itemContent}
                    </a>
                  );
                })}
              </div>
            </aside>

            <div className="min-w-0">
              <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 flex flex-col min-h-[600px] animate-fade-in">
                <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 p-6 md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:bg-slate-955/40 rounded-t-[1.75rem]">
                  <div>
                    <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/40 dark:text-emerald-300">
                      <FileText className="h-3.5 w-3.5" />
                      PDF Document Preview
                    </span>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white md:text-3xl">{material.title}</h1>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {subject?.name || "Subject"} · Published By {material.uploaded_by_name} · {new Date(material.created_at).toLocaleDateString([], { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                      <Button className="rounded-xl flex items-center gap-1.5 h-10 px-4 text-xs font-bold shadow-md">
                        <Download className="h-4 w-4" /> Download Original
                      </Button>
                    </a>
                    <Link to={closeUrl}>
                      <Button type="button" variant="secondary" className="rounded-xl h-10 px-5 text-sm font-bold shadow-sm">
                        Close Preview
                      </Button>
                    </Link>
                  </div>
                </div>

                {material.description && (
                  <div className="border-b border-slate-200 bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-800 px-6 py-3.5 text-sm font-semibold text-slate-500 dark:text-slate-455">
                    {material.description}
                  </div>
                )}

                <div className="flex-1 min-h-[500px] bg-slate-100 dark:bg-slate-950">
                  {isPdf ? (
                    <iframe
                      src={`${material.file_url}#toolbar=0&navpanes=0`}
                      title={material.title}
                      className="w-full h-[600px] border-none"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center h-[400px]">
                      <FileWarning className="w-12 h-12 text-amber-500 mb-4" />
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200 mb-2">No Inline Viewer Available</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                        Only PDF documents support direct inline previews. Please download this file to view it.
                      </p>
                      <a href={material.file_url} target="_blank" rel="noopener noreferrer" className="inline-block">
                        <Button className="rounded-2xl text-xs font-black shadow-md flex items-center gap-2 px-6">
                          <Download className="w-4 h-4" /> Download File
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 5. STUDENT LMS HTML ARTICLE PREVIEW PAGE
// ==========================================

export const StudentLmsHtmlPreviewPage = () => {
  const { subjectId = "", materialId = "" } = useParams<{ subjectId: string; materialId: string }>();
  const decodedSubjectId = decodeURIComponent(subjectId);
  const decodedMaterialId = decodeURIComponent(materialId);
  const user = useAuthStore((state) => state.user);
  const { data: allSubjects = [] } = useSubjects();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [readComfortMode, setReadComfortMode] = useState<"dark" | "sepia" | "light">("light");

  const { data: orgData } = useQuery({
    queryKey: ["myOrganization"],
    queryFn: getMyOrganization,
    enabled: Boolean(user),
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["lmsMaterials", user?.program_id, user?.semester, decodedSubjectId],
    queryFn: () => getMaterialsApi({
      program_id: user?.role === "Teacher" ? undefined : (user?.program_id || undefined),
      semester: user?.role === "Teacher" ? undefined : (user?.semester || undefined),
      subject_id: decodedSubjectId,
    }),
    enabled: Boolean(user && orgData?.orgType === "College" && decodedSubjectId),
  });

  const subject = useMemo(() => allSubjects.find((item) => item.id === decodedSubjectId), [allSubjects, decodedSubjectId]);
  const material = useMemo(() => materials.find((item) => item.id === decodedMaterialId), [materials, decodedMaterialId]);

  const closeUrl = useMemo(() => {
    return user?.role === "Teacher"
      ? "/dashboard?tab=lms"
      : `/lms/subjects/${encodeURIComponent(decodedSubjectId)}`;
  }, [user, decodedSubjectId]);

  const comfortBgClass = useMemo(() => {
    if (readComfortMode === "light") return "bg-white text-zinc-900 border-zinc-200";
    if (readComfortMode === "sepia") return "bg-[#f4ecd8] text-[#5b4636] border-[#e4dcc8]";
    return "bg-[#0c1315] text-zinc-200 border-zinc-900";
  }, [readComfortMode]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 transition-colors duration-200">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
          <Link
            to={closeUrl}
            className="inline-flex w-max items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {user?.role === "Teacher" ? "Back to Dashboard" : "Back to topics"}
          </Link>
        </div>

        {isLoading ? (
          <div className="flex h-56 items-center justify-center rounded-3xl border border-slate-200 bg-white/70 text-slate-550 dark:border-slate-800 dark:bg-slate-900/70">
            <Spinner /> <span className="ml-2 font-bold">Loading HTML Article...</span>
          </div>
        ) : !material || material.resource_type !== "html" ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-base font-black text-slate-800 dark:text-slate-100">HTML Article not found</p>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">The selected article could not be loaded.</p>
          </div>
        ) : (
          <div className={isFullScreen ? "w-full" : "grid gap-6 lg:grid-cols-[280px_1fr]"}>
            {!isFullScreen && (
              <aside className="hidden lg:flex flex-col gap-3 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 self-start sticky top-6 shadow-sm print:hidden">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Resources</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate">{subject?.name || "Subject"}</p>
                </div>
                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[600px] pr-1">
                  {materials.map((mat) => {
                    const isR = mat.resource_type === "readme";
                    const isH = mat.resource_type === "html";
                    const isP = mat.resource_type === "document" && mat.file_url?.toLowerCase().split('?')[0].endsWith('.pdf');
                    const isActive = mat.id === decodedMaterialId;
                    
                    let targetLink = "";
                    if (isR) targetLink = `/lms/subjects/${encodeURIComponent(decodedSubjectId)}/readme/${encodeURIComponent(mat.id)}`;
                    else if (isH) targetLink = `/lms/subjects/${encodeURIComponent(decodedSubjectId)}/html/${encodeURIComponent(mat.id)}`;
                    else if (isP) targetLink = `/lms/subjects/${encodeURIComponent(decodedSubjectId)}/pdf/${encodeURIComponent(mat.id)}`;

                    let Icon = FileText;
                    if (mat.resource_type === "video") Icon = Youtube;
                    else if (isH) Icon = Code;
                    else if (mat.resource_type === "link") Icon = Link2;

                    const itemContent = (
                      <div className={`flex items-center gap-2.5 rounded-2xl p-3 text-xs font-black transition-all ${
                        isActive
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-l-4 border-indigo-500"
                          : "text-slate-655 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-350 dark:hover:bg-slate-850 dark:hover:text-slate-100"
                      }`}>
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          isActive
                            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="truncate flex-1 text-left">{mat.title}</span>
                      </div>
                    );

                    if (targetLink) {
                      return (
                        <Link key={mat.id} to={targetLink}>
                          {itemContent}
                        </Link>
                      );
                    }

                    return (
                      <a key={mat.id} href={mat.file_url} target="_blank" rel="noopener noreferrer">
                        {itemContent}
                      </a>
                    );
                  })}
                </div>
              </aside>
            )}

            <div className="min-w-0">
              <section className={isFullScreen 
                ? `fixed inset-0 z-[100] overflow-y-auto flex flex-col p-6 md:p-12 animate-fade-in ${comfortBgClass}`
                : `overflow-hidden rounded-[2rem] border shadow-2xl animate-fade-in flex flex-col min-h-[600px] ${comfortBgClass}`
              }>
                {/* Reader Header */}
                <div className="flex flex-col gap-4 border-b border-current/15 bg-black/5 p-6 md:flex-row md:items-center md:justify-between rounded-t-[1.75rem] print:hidden">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-teal-500/10 border border-teal-500/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-teal-600">
                      <Code className="h-3.5 w-3.5" />
                      HTML Article Reader
                    </div>
                    <h1 className="text-2xl font-black md:text-3xl">{material.title}</h1>
                    <p className="mt-1 text-xs font-semibold opacity-70">
                      {subject?.name || "Subject"} · By {material.uploaded_by_name} · {new Date(material.created_at).toLocaleDateString([], { dateStyle: "medium" })}
                    </p>
                  </div>
                  
                  {/* Control Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {/* Comfort Mode Toggle */}
                    <div className="flex items-center rounded-xl bg-black/5 p-1 border border-current/10">
                      <button
                        onClick={() => setReadComfortMode("dark")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 ${readComfortMode === "dark" ? "bg-zinc-800 text-white" : "opacity-60 hover:opacity-100"}`}
                        title="Dark Mode"
                      >
                        <Moon className="h-3.5 w-3.5" /> Dark
                      </button>
                      <button
                        onClick={() => setReadComfortMode("sepia")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 ${readComfortMode === "sepia" ? "bg-amber-100 text-amber-900" : "opacity-60 hover:opacity-100"}`}
                        title="Sepia Comfort Mode"
                      >
                        Sepia
                      </button>
                      <button
                        onClick={() => setReadComfortMode("light")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 ${readComfortMode === "light" ? "bg-white text-zinc-900 shadow-sm border border-zinc-200" : "opacity-60 hover:opacity-100"}`}
                        title="Light Mode"
                      >
                        <Sun className="h-3.5 w-3.5" /> Light
                      </button>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-xl flex items-center gap-1.5 h-9 px-3 border border-current/10 bg-black/5 hover:bg-black/10 text-current"
                      onClick={handlePrint}
                      title="Print Article"
                    >
                      <Printer className="h-4 w-4" /> Print
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-xl flex items-center gap-1.5 h-9 px-3 border border-current/10 bg-black/5 hover:bg-black/10 text-current"
                      onClick={() => setIsFullScreen(!isFullScreen)}
                    >
                      {isFullScreen ? (
                        <>
                          <Minimize2 className="h-4 w-4" /> Normal View
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-4 w-4" /> Full Screen
                        </>
                      )}
                    </Button>

                    <Link to={closeUrl}>
                      <Button type="button" variant="secondary" className="rounded-xl h-9 px-4 text-sm font-bold shadow-sm">
                        Close Reader
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Print-only header */}
                <div className="hidden print:block border-b border-slate-300 pb-4 mb-6">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Parikshya LMS Portal</span>
                  <h1 className="text-3xl font-black text-slate-900 mt-1">{material.title}</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Subject: {subject?.name || "Subject"} · Published By: {material.uploaded_by_name} · Date: {new Date(material.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Description summary */}
                {material.description && (
                  <div className="border-b border-current/10 bg-black/5 px-6 py-3.5 text-sm font-semibold opacity-85 print:hidden">
                    {material.description}
                  </div>
                )}

                {/* Article Content container */}
                <div className="py-8 px-[40px] flex-1 overflow-y-auto">
                  <div className="w-full max-w-none">
                    <MarkdownPreview
                      content={material.html_content || ""}
                      variant={readComfortMode === "light" ? "light" : readComfortMode === "sepia" ? "sepia" : "reader"}
                      isHtml={true}
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
