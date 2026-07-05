import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Maximize2, Minimize2 } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Button } from "../components/ui/Button";
import { MarkdownPreview } from "../components/ui/MarkdownPreview";
import { Spinner } from "../components/ui/Spinner";
import { getMaterialsApi, getMyOrganization } from "../services/api";
import { useSubjects } from "../hooks/useTests";
import { useAuthStore } from "../store/authStore";

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
    <AppShell>
      <PageWrapper>
        <div className="space-y-6">
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
            <section className={isFullScreen 
              ? "fixed inset-0 z-[100] bg-[#2b2b2a] overflow-y-auto flex flex-col p-6 md:p-12 animate-fade-in"
              : "overflow-hidden rounded-[2rem] border border-slate-800 bg-[#2b2b2a] shadow-2xl animate-fade-in"
            }>
              <div className="flex flex-col gap-4 border-b border-white/10 bg-[#242423] p-5 md:flex-row md:items-center md:justify-between rounded-t-[1.75rem]">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                    <FileText className="h-3.5 w-3.5" />
                    Markdown Note preview
                  </div>
                  <h1 className="text-2xl font-black text-white md:text-3xl">{material.title}</h1>
                  <p className="mt-1 text-xs font-semibold text-zinc-400">
                    {subject?.name || "Subject"} · By {material.uploaded_by_name} · {new Date(material.created_at).toLocaleDateString([], { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-2xl flex items-center gap-1.5 h-10 px-4 text-white hover:text-white border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10"
                    onClick={() => setIsFullScreen(!isFullScreen)}
                  >
                    {isFullScreen ? (
                      <>
                        <Minimize2 className="h-4 w-4 text-white" /> Exit Full Screen
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-4 w-4 text-white" /> Full Screen
                      </>
                    )}
                  </Button>
                  <Link to={closeUrl}>
                    <Button type="button" variant="ghost" className="rounded-2xl h-10 px-4 text-white hover:text-white border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10">
                      Close Preview
                    </Button>
                  </Link>
                </div>
              </div>

              {material.description && (
                <div className="border-b border-white/10 bg-[#282827] px-5 py-3 text-sm font-semibold text-zinc-300">
                  {material.description}
                </div>
              )}

              <div className="p-8 md:p-12 flex-1">
                <div className="mx-auto max-w-5xl">
                  <MarkdownPreview content={material.readme_content || ""} variant="reader" />
                </div>
              </div>
            </section>
          )}
        </div>
      </PageWrapper>
    </AppShell>
  );
};
