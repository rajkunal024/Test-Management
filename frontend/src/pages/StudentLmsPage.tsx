import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FolderOpen,
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  Layers3,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { getMyOrganization, getMaterialsApi, getPrograms } from "../services/api";
import { useSubjects } from "../hooks/useTests";
import { useAuthStore } from "../store/authStore";

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

export const StudentLmsPage = () => {
  const user = useAuthStore((state) => state.user);
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
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500">
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
            </div>
          )}
        </div>
      </PageWrapper>
    </AppShell>
  );
};
