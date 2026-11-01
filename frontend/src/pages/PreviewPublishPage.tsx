import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Pencil,
  BookOpen,
  Award,
  Tag,
  Layers,
  Timer,
  BarChart2,
  Zap,
  ArrowRight,
  Eye,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { Toast } from "../components/ui/Toast";
import { fetchBulkQuestions, getErrorMessage, publishTest } from "../services/api";
import { useSubTopics, useTest, useTopics } from "../hooks/useTests";
import { useAuthStore } from "../store/authStore";

const getTodayDateString = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const PreviewPublishPage = () => {
  const user = useAuthStore((state) => state.user);
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: test, isLoading } = useTest(id);

  useEffect(() => {
    if (user && user.role !== "Admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const { data: topics = [] } = useTopics(test?.subject_id ?? "");
  const selectedTopicIds = useMemo(() => (test?.topics ?? []).filter(Boolean), [test?.topics]);
  const { data: subTopics = [] } = useSubTopics(selectedTopicIds);

  const topicNames = useMemo(() => {
    return (test?.topics ?? []).map(topicId => topics.find(t => t.id === topicId)?.name ?? topicId);
  }, [test?.topics, topics]);

  const subTopicNames = useMemo(() => {
    return (test?.sub_topics ?? []).map(subTopicId => subTopics.find(st => st.id === subTopicId)?.name ?? subTopicId);
  }, [test?.sub_topics, subTopics]);

  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["questions", id, test?.questions],
    queryFn: () => fetchBulkQuestions(test?.questions ?? []),
    enabled: Boolean(test?.questions?.length),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishTest(id),
    onSuccess: () => {
      setConfirmOpen(false);
      setToast("Test published successfully!");
      window.setTimeout(() => navigate("/dashboard"), 2000);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  useEffect(() => {
    if (test) {
      const now = new Date().getTime();
      const start = test.start_time ? new Date(test.start_time).getTime() : 0;
      const isLive = (test.status === "live" || test.status === "scheduled") && (!start || now >= start);
      if (isLive) setToast("This test is already live");
    }
  }, [test]);

  const difficultyInfo = {
    easy: { badge: "green", label: "Easy", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40" },
    medium: { badge: "yellow", label: "Medium", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40" },
    hard: { badge: "red", label: "Hard", color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40" },
    difficult: { badge: "red", label: "Difficult", color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40" },
  };
  const diffKey = (test?.difficulty || "").toLowerCase().trim() as keyof typeof difficultyInfo;
  const diff = difficultyInfo[diffKey] || { badge: "slate", label: test?.difficulty || "", color: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700" };

  if (isLoading || !test) {
    return (
      <AppShell compactRail>
        <PageWrapper compact>
          <div className="flex h-96 items-center justify-center">
            <div className="text-center space-y-3">
              <Spinner />
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading preview...</p>
            </div>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  return (
    <AppShell compactRail>
      <PageWrapper compact>
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
          <span>Test Creation</span>
          <ArrowRight className="h-3 w-3" />
          <span className="text-slate-600 dark:text-slate-300">Preview & Publish</span>
        </div>

        {/* Hero */}
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white border border-indigo-500/20 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 h-60 w-60 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-12 -mb-12 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                All {test.total_questions} questions ready
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">{test.name}</h1>
              <p className="mt-1.5 text-sm text-slate-400 max-w-lg">Review the test configuration below, then publish when ready.</p>
            </div>
            <div className="shrink-0 flex gap-2">
              <Link to={`/tests/${id}/questions`}>
                <button className="h-10 px-4 rounded-xl text-xs font-bold border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Edit Questions
                </button>
              </Link>
              <button
                onClick={() => setConfirmOpen(true)}
                className="h-10 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" /> Publish Test
              </button>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="relative z-10 mt-6 grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { icon: Timer, label: "Duration", value: `${test.total_time} min` },
              { icon: BookOpen, label: "Questions", value: test.total_questions },
              { icon: Award, label: "Total Marks", value: test.total_marks },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <Icon className="h-4 w-4 text-indigo-300 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-extrabold text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Details Card */}
        <section className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Test Configuration</h2>
            </div>
            <Link to={`/tests/${id}/edit`} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Subject</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{test.subject}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Difficulty</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold border px-2.5 py-1 rounded-full ${diff.color}`}>
                  <BarChart2 className="h-3 w-3" /> {diff.label}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Scoring</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <span className="text-emerald-600 dark:text-emerald-400">+{test.correct_marks}</span> correct / <span className="text-rose-500 dark:text-rose-400">{test.wrong_marks}</span> wrong
                </p>
              </div>
            </div>

            {topicNames.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="h-3 w-3" /> Topics
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {topicNames.map((name) => (
                    <span key={name} className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">{name}</span>
                  ))}
                </div>
              </div>
            )}
            {subTopicNames.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="h-3 w-3" /> Sub-Topics
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {subTopicNames.map((name) => (
                    <span key={name} className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">{name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Questions Preview */}
        <section className="mb-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
                <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Questions Preview</h2>
            </div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              {questions.length} questions
            </span>
          </div>
          <div className="p-6">
            {isLoadingQuestions ? (
              <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
                <Spinner /> <span className="text-sm">Loading questions...</span>
              </div>
            ) : questions.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No saved questions found for this test.</p>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <article key={question.id ?? `${question.question}-${index}`} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-indigo-200 dark:hover:border-indigo-900/40 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-black">
                        {index + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">{question.question}</h3>
                    </div>
                    {(question.image_url || question.media_url) && (
                      <div className="mt-2 mb-3 flex justify-start">
                        <img
                          src={question.image_url || question.media_url}
                          alt="Question"
                          loading="lazy"
                          className="max-h-48 w-auto max-w-full rounded-lg border border-slate-200 dark:border-slate-700 object-contain shadow-sm"
                        />
                      </div>
                    )}
                    <div className="grid gap-2 md:grid-cols-2 mt-3">
                      {(["option1", "option2", "option3", "option4"] as const).map((option, oIdx) => {
                        const isCorrect = question.correct_option === option;
                        return (
                          <div
                            key={option}
                            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold flex items-center gap-2 ${
                              isCorrect
                                ? "border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                                : "border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30"
                            }`}
                          >
                            <span className={`h-4.5 w-4.5 shrink-0 flex items-center justify-center rounded-full text-[9px] font-black ${
                              isCorrect ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                            }`}>
                              {isCorrect ? <CheckCircle2 className="h-3 w-3" /> : String.fromCharCode(65 + oIdx)}
                            </span>
                            {question[option]}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pb-8">
          <Button variant="secondary" onClick={() => navigate("/dashboard")}>Cancel</Button>
          <Button
            icon={<Clock className="h-4 w-4" />}
            onClick={() => setConfirmOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-none shadow-lg shadow-indigo-500/20"
          >
            Publish Test
          </Button>
        </div>

        {/* Confirm Modal */}
        <Modal
          open={confirmOpen}
          title="Publish Test"
          onClose={() => setConfirmOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button
                disabled={publishMutation.isPending}
                onClick={() => publishMutation.mutate()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-none"
              >
                {publishMutation.isPending ? "Publishing..." : "Confirm & Publish"}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              You are about to publish <strong className="text-slate-800 dark:text-slate-200">{test.name}</strong>. Learners will be able to access it according to the configured availability window.
            </p>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs font-semibold text-amber-700 dark:text-amber-400">
              ⚠️ Once published, question edits may be restricted. Make sure you've reviewed everything.
            </div>
            {error && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
          </div>
        </Modal>

        {toast ? <Toast onClose={() => setToast("")}>{toast}</Toast> : null}
      </PageWrapper>
    </AppShell>
  );
};
