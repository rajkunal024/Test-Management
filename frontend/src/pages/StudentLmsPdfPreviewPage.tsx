import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Download, Maximize2, Minimize2 } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { getMaterialsApi, getMyOrganization } from "../services/api";
import { useSubjects } from "../hooks/useTests";
import { useAuthStore } from "../store/authStore";

export const StudentLmsPdfPreviewPage = () => {
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

  const isPdf = useMemo(() => {
    if (!material?.file_url) return false;
    return material.file_url.toLowerCase().split('?')[0].endsWith('.pdf');
  }, [material]);

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
              <Spinner /> <span className="ml-2 font-bold">Loading PDF preview...</span>
            </div>
          ) : !material || material.resource_type !== "document" ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
              <p className="text-base font-black text-slate-800 dark:text-slate-100">Document topic not found</p>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">The selected material could not be opened for preview.</p>
            </div>
          ) : (
            <section className={isFullScreen 
              ? "fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col p-6 animate-fade-in"
              : "overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl animate-fade-in"
            }>
              <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5 md:flex-row md:items-center md:justify-between rounded-t-[1.75rem]">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">
                    <FileText className="h-3.5 w-3.5" />
                    PDF Document preview
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white md:text-3xl">{material.title}</h1>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {subject?.name || "Subject"} · By {material.uploaded_by_name} · {new Date(material.created_at).toLocaleDateString([], { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-2xl flex items-center gap-1.5 h-10 px-4"
                    onClick={() => setIsFullScreen(!isFullScreen)}
                  >
                    {isFullScreen ? (
                      <>
                        <Minimize2 className="h-4 w-4 text-slate-500" /> Exit Full Screen
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-4 w-4 text-slate-500" /> Full Screen
                      </>
                    )}
                  </Button>
                  <a href={material.file_url} download target="_blank" rel="noopener noreferrer">
                    <Button type="button" className="rounded-2xl text-[11px] font-black shadow-sm flex items-center gap-1.5 h-10 px-4">
                      <Download className="h-3.5 w-3.5" />
                      Download File
                    </Button>
                  </a>
                  {!isFullScreen && (
                    <Link to={closeUrl}>
                      <Button type="button" variant="secondary" className="rounded-2xl h-10 px-4">
                        Close Preview
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {material.description && !isFullScreen && (
                <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-350">
                  {material.description}
                </div>
              )}

              <div className={isFullScreen ? "flex-1 w-full p-2" : "p-6 dark:bg-slate-950/10"}>
                {isPdf ? (
                  <div className={isFullScreen 
                    ? "relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950" 
                    : "relative w-full h-[70vh] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950"
                  }>
                    <iframe
                      src={`${material.file_url}#toolbar=1`}
                      className="w-full h-full border-none"
                      title={material.title}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-950/20">
                    <p className="text-base font-black text-slate-800 dark:text-slate-100">Direct Preview Unsupported</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6">
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
          )}
        </div>
      </PageWrapper>
    </AppShell>
  );
};
