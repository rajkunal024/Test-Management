import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpenCheck,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Layers3,
  Youtube,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { getMaterialsApi, getMyOrganization, getPrograms } from "../services/api";
import { useSubjects } from "../hooks/useTests";
import { useAuthStore } from "../store/authStore";
import { LmsMaterial } from "../types";

const getMaterialIcon = (type: LmsMaterial["resource_type"]) => {
  if (type === "video") return Youtube;
  if (type === "link") return Link2;
  return FileText;
};

export const StudentLmsSubjectPage = () => {
  const { subjectId = "" } = useParams<{ subjectId: string }>();
  const decodedSubjectId = decodeURIComponent(subjectId);
  const user = useAuthStore((state) => state.user);
  const { data: allSubjects = [] } = useSubjects();

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
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800">
                <Layers3 className="h-7 w-7" />
              </div>
              <p className="text-base font-black text-slate-800 dark:text-slate-100">No topics uploaded yet</p>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Your teacher has not published resources for this subject.</p>
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {materials.map((mat) => {
                  const Icon = getMaterialIcon(mat.resource_type);
                  const isReadme = mat.resource_type === "readme";
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
                                : mat.resource_type === "document"
                                  ? "bg-emerald-100 text-emerald-650 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"
                          }`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <Badge tone="slate" className="rounded-full text-[9px] font-black uppercase tracking-wider">
                            {mat.resource_type === "readme" ? "Markdown Note" : mat.resource_type}
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
            </>
          )}
        </div>
      </PageWrapper>
    </AppShell>
  );
};
