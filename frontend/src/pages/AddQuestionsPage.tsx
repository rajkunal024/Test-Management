import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  Sparkles,
  Clock,
  ClipboardList,
  GraduationCap,
  Award,
  FileQuestion,
  Check,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { Toast } from "../components/ui/Toast";
import {
  fetchBulkQuestions,
  getAllQuestions,
  updateTest,
} from "../services/api";
import { useTest, useSubTopics, useTopics, useSubjects } from "../hooks/useTests";
import { Question } from "../types";
import { useAuthStore } from "../store/authStore";

export const AddQuestionsPage = () => {
  const user = useAuthStore((state) => state.user);
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && user.role !== "Admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // States
  const [toast, setToast] = useState("");
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>([]);
  const [selectedSubjectTab, setSelectedSubjectTab] = useState<string>("");

  // Queries
  const { data: test, isLoading: isLoadingTest } = useTest(id);
  const { data: subjects = [] } = useSubjects();

  useEffect(() => {
    if (test) {
      const now = new Date().getTime();
      const start = test.start_time ? new Date(test.start_time).getTime() : 0;
      const hasStarted = (test.status === "live" || test.status === "scheduled") && (!start || now >= start);
      if (hasStarted) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [test, navigate]);

  // Fetch topics based on test subject IDs
  const testSubjectIds = useMemo(() => {
    if (!test) return [];
    if (test.subject_ids && test.subject_ids.length > 0) return test.subject_ids;
    if (test.subject_id) return [test.subject_id];
    return [];
  }, [test]);

  const { data: topics = [] } = useQuery({
    queryKey: ["topics", testSubjectIds],
    queryFn: async () => {
      const results = await Promise.all(
        testSubjectIds.map(subId => {
          // Import dynamic fetch to prevent duplicate loading
          const fetchTopics = queryClient.getQueryData(["topics", subId]);
          if (fetchTopics) return fetchTopics as any[];
          // If not in cache, we just fetch it
          return queryClient.fetchQuery({
            queryKey: ["topics", subId],
            queryFn: async () => {
              const res = await fetch(`/api/topics/subject/${subId}`);
              const json = await res.json();
              return json.data || [];
            }
          });
        })
      );
      return results.flat();
    },
    enabled: testSubjectIds.length > 0,
  });

  const selectedTopicIds = useMemo(() => topics.map((t) => t.id), [topics]);
  const { data: subTopics = [] } = useSubTopics(selectedTopicIds);

  // Fetch questions currently in the test
  const { data: testQuestions = [], isLoading: isLoadingTestQuestions } = useQuery({
    queryKey: ["questions", id, test?.questions],
    queryFn: () => fetchBulkQuestions(test?.questions ?? []),
    enabled: Boolean(test?.questions?.length),
  });

  // Calculate dynamic test difficulty in real time based on selected questions
  const computedDifficulty = useMemo(() => {
    if (!testQuestions || testQuestions.length === 0) {
      return test?.difficulty || "medium";
    }
    const total = testQuestions.length;
    let easyCount = 0;
    let mediumCount = 0;
    let hardCount = 0;

    for (const q of testQuestions) {
      const diff = (q.difficulty || "").toLowerCase().trim();
      if (diff === "easy") {
        easyCount++;
      } else if (diff === "medium") {
        mediumCount++;
      } else if (diff === "hard" || diff === "difficult") {
        hardCount++;
      }
    }

    if (hardCount > 0.5 * total) {
      return "hard";
    }
    if (hardCount > 0) {
      return "medium";
    }
    if (mediumCount > 0.5 * total) {
      return "medium";
    }
    if (easyCount > 0.5 * total) {
      return "easy";
    }
    return "medium";
  }, [testQuestions, test?.difficulty]);

  // Fetch all questions in the global pool
  const { data: globalPool = [], isLoading: isLoadingPool } = useQuery({
    queryKey: ["questions"],
    queryFn: getAllQuestions,
  });

  // Filter global pool to only show questions matching test's selected topics and class, which are not already linked
  const availablePoolQuestions = useMemo(() => {
    const linkedIds = new Set(test?.questions ?? []);
    const testTopics = test?.topics ?? [];
    return globalPool.filter((q) => {
      const belongsToSelectedTopics = q.topic_id && testTopics.includes(q.topic_id);
      const matchesClass = q.class === test?.class;
      const notLinked = !linkedIds.has(q.id ?? "");
      return belongsToSelectedTopics && matchesClass && notLinked;
    });
  }, [globalPool, test?.questions, test?.topics, test?.class]);

  const testSubjects = useMemo(() => {
    if (!test) return [];
    if (Array.isArray(test.subject)) return test.subject;
    if (typeof test.subject === "string") return [test.subject];
    return [];
  }, [test]);

  useEffect(() => {
    if (testSubjects.length > 0 && !selectedSubjectTab) {
      setSelectedSubjectTab(testSubjects[0]);
    }
  }, [testSubjects, selectedSubjectTab]);

  const getQuestionSubjectName = (q: Question) => {
    const topic = topics.find((t) => t.id === q.topic_id);
    if (!topic) return "General";
    const subId = topic.subject_id;
    const sub = subjects.find((s) => s.id === subId);
    return sub ? sub.name : "General";
  };

  const filteredPoolQuestions = useMemo(() => {
    if (!selectedSubjectTab) return availablePoolQuestions;
    return availablePoolQuestions.filter((q) => {
      const qSubName = getQuestionSubjectName(q);
      return qSubName.toLowerCase().trim() === selectedSubjectTab.toLowerCase().trim();
    });
  }, [availablePoolQuestions, selectedSubjectTab, topics, subjects]);

  // Mutations
  const updateTestMutation = useMutation({
    mutationFn: (nextQIds: string[]) => updateTest(id, { questions: nextQIds }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tests", id] });
      setToast("Test questions updated successfully");
      setSelectedPoolIds([]);
      window.setTimeout(() => setToast(""), 1800);
    },
  });

  // Actions
  const handleAddToTest = (questionIdsToAdd: string[]) => {
    if (!test) return;
    const nextQIds = Array.from(new Set([...(test.questions || []), ...questionIdsToAdd]));
    updateTestMutation.mutate(nextQIds);
  };

  const handleRemoveFromTest = (questionIdToRemove: string) => {
    if (!test) return;
    const nextQIds = (test.questions || []).filter((qid) => qid !== questionIdToRemove);
    updateTestMutation.mutate(nextQIds);
  };

  const handleToggleSelectPool = (qid: string) => {
    setSelectedPoolIds((prev) =>
      prev.includes(qid) ? prev.filter((id) => id !== qid) : [...prev, qid]
    );
  };



  const isLoading = isLoadingTest || isLoadingPool || isLoadingTestQuestions;

  if (isLoading || !test) {
    return (
      <AppShell compactRail>
        <PageWrapper compact>
          <div className="flex h-96 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2">Loading question manager...</span>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  const subjectsName = Array.isArray(test.subject) ? test.subject.join(", ") : test.subject;

  return (
    <AppShell compactRail>
      <PageWrapper compact>
        {/* Header Links */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <Link to="/dashboard" className="hover:text-primary-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-700" />
            <span className="text-slate-805 dark:text-slate-200">Question Manager</span>
          </div>
          <Link to={`/tests/${id}/preview`}>
            <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/10 text-white border-none font-bold transition-all hover:scale-[1.02] active:scale-[0.98] text-xs px-5 py-2 flex items-center gap-1.5">
              Preview & Publish
            </Button>
          </Link>
        </div>

        {/* Test Summary Card */}
        <section className="relative overflow-hidden mb-8 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 shadow-md text-white border border-slate-800/80">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue" className="bg-blue-500/15 border-blue-450/20 text-blue-300 font-bold">{subjectsName}</Badge>
                <Badge tone="slate" className="bg-slate-500/15 border-slate-450/20 text-slate-300 font-bold uppercase tracking-wider text-[10px]">{test.type.replace("_", " ")}</Badge>
                <Badge tone={
                  computedDifficulty === "easy" ? "green" :
                    computedDifficulty === "medium" ? "yellow" :
                      (computedDifficulty === "hard" || computedDifficulty === "difficult") ? "red" : "slate"
                } className="font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5">
                  {computedDifficulty}
                </Badge>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent flex items-center gap-2.5">
                <GraduationCap className="h-6 w-6 text-indigo-400" />
                {test.name}
              </h1>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-300/85">
                <span className="flex items-center gap-1.5 bg-slate-800/40 border border-slate-700/50 px-2.5 py-1 rounded-lg">
                  <Clock className="h-3.5 w-3.5 text-indigo-455" /> {test.total_time} Minutes Duration
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/40 border border-slate-700/50 px-2.5 py-1 rounded-lg">
                  <ClipboardList className="h-3.5 w-3.5 text-indigo-455" /> {test.total_questions} Questions Target
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/40 border border-slate-700/50 px-2.5 py-1 rounded-lg">
                  <Award className="h-3.5 w-3.5 text-indigo-455" /> {test.total_marks} Marks Pool
                </span>
              </div>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 shadow-inner md:mr-2 flex-shrink-0">
              <FileQuestion className="h-6 w-6" />
            </div>
          </div>
        </section>

        {/* Manager Layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left Column: Manage Linked Questions */}
          <main className="space-y-6">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 shadow-sm">
              <h2 className="text-base font-extrabold text-slate-850 dark:text-slate-105 tracking-tight mb-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Linked Test Questions ({testQuestions.length})
                </span>
                <span className="text-xs text-slate-400 font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200/65 dark:border-slate-850 px-2.5 py-1 rounded-lg">
                  Target: {test.total_questions} Qs
                </span>
              </h2>

              {testQuestions.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-250 dark:border-slate-800 py-16 text-center text-slate-400 dark:text-slate-500 text-sm bg-white/40 dark:bg-slate-955/20 shadow-inner flex flex-col items-center justify-center space-y-3">
                  <div className="p-3.5 bg-slate-55 dark:bg-slate-900 text-slate-400 dark:text-slate-500 rounded-full border border-slate-200 dark:border-slate-800">
                    <FileQuestion className="h-6 w-6" />
                  </div>
                  <div className="max-w-xs space-y-1">
                    <p className="font-bold text-slate-700 dark:text-slate-350">No questions linked yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Link questions from the global pool on the right panel to build your test</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[62vh] overflow-y-auto pr-2 scrollbar-thin">
                  {testQuestions.map((q, index) => (
                    <article
                      key={q.id ?? index}
                      className="flex items-start justify-between gap-4 rounded-xl border border-slate-150 dark:border-slate-800/60 bg-white/50 dark:bg-slate-955/30 p-4 hover:border-slate-250 dark:hover:border-slate-700/80 transition-all hover:shadow-sm"
                    >
                      <div className="min-w-0 space-y-1.5">
                        <p className="text-sm font-bold text-slate-805 dark:text-slate-200 leading-snug line-clamp-3">
                          <span className="text-indigo-500 dark:text-indigo-400 font-black mr-1.5">{index + 1}.</span>
                          {q.question}
                        </p>
                        {(q.image_url || q.media_url) && (
                          <div className="mt-1.5 mb-1 flex justify-start">
                            <img
                              src={q.image_url || q.media_url}
                              alt="Question Graphic"
                              loading="lazy"
                              className="max-h-24 w-auto max-w-full rounded-md border border-slate-200 object-contain shadow-sm bg-white aspect-auto"
                            />
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-450 font-bold bg-emerald-50 dark:bg-emerald-955/30 border border-emerald-100 dark:border-emerald-900/50 px-2 py-0.5 rounded-lg">
                            <Check className="h-3.5 w-3.5" /> Answer: {q.correct_option?.replace("option", "Option ")}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                            Topic: {q.topic_name || "General"}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        className="h-9 w-9 rounded-xl text-rose-500 dark:text-rose-450 hover:bg-rose-55 dark:hover:bg-rose-955/40 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/40 flex items-center justify-center shrink-0 transition-colors"
                        onClick={() => handleRemoveFromTest(q.id ?? "")}
                        icon={<Trash2 className="h-4 w-4" />}
                        title="Remove question"
                      />
                    </article>
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* Right Column: Source Question Bank (Global Pool) */}
          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 shadow-sm flex flex-col min-h-[480px]">
              <div className="flex-1 flex flex-col">
                <h3 className="text-sm font-extrabold text-slate-808 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <FolderPlus className="h-5 w-5 text-indigo-500" />
                  Available Pool Questions ({availablePoolQuestions.length})
                </h3>

                {/* Subject Filter Tabs */}
                {testSubjects.length > 1 && (
                  <div className="flex flex-wrap gap-1 mb-4 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-150/80 dark:border-slate-800/60 shrink-0">
                    {testSubjects.map((subName) => (
                      <button
                        key={subName}
                        type="button"
                        onClick={() => setSelectedSubjectTab(subName)}
                        className={`flex-1 min-w-[70px] py-1.5 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                          selectedSubjectTab === subName
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        }`}
                      >
                        {subName}
                      </button>
                    ))}
                  </div>
                )}

                {availablePoolQuestions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-950/30 border border-slate-155 dark:border-slate-800 rounded-xl space-y-2">
                    <FileQuestion className="h-6 w-6 text-slate-350" />
                    <p className="text-xs text-slate-455 dark:text-slate-500 font-semibold max-w-[200px]">
                      No pool questions available for subjects: {subjectsName}. Let teachers create them.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3.5 px-2 border-b border-slate-100 dark:border-slate-800/60 pb-2.5 shrink-0">
                      <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-650 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedPoolIds.length === filteredPoolQuestions.length && filteredPoolQuestions.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPoolIds(filteredPoolQuestions.map((q) => q.id ?? "").filter(Boolean));
                            } else {
                              setSelectedPoolIds([]);
                            }
                          }}
                          className="h-4 w-4 rounded text-indigo-650 focus:ring-indigo-500/20 accent-indigo-600 cursor-pointer border-slate-300 dark:border-slate-700"
                        />
                        <span>Select All ({filteredPoolQuestions.length})</span>
                      </label>
                      {selectedPoolIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedPoolIds([])}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    {filteredPoolQuestions.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-950/30 border border-slate-155 dark:border-slate-800 rounded-xl space-y-2 my-4">
                        <FileQuestion className="h-6 w-6 text-slate-350" />
                        <p className="text-xs text-slate-455 dark:text-slate-500 font-semibold max-w-[200px]">
                          No available questions in pool for subject: {selectedSubjectTab}.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3.5 max-h-[46vh] overflow-y-auto pr-1.5 scrollbar-thin">
                        {filteredPoolQuestions.map((q) => {
                          const isSelected = selectedPoolIds.includes(q.id ?? "");
                          return (
                            <label
                              key={q.id}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-955/30 transition-all ${isSelected
                                  ? "border-indigo-400 dark:border-indigo-850 bg-indigo-50/30 dark:bg-indigo-950/10 ring-2 ring-indigo-500/10"
                                  : "border-slate-155 dark:border-slate-800/60 bg-white/50 dark:bg-slate-955/20"
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                className="h-4.5 w-4.5 rounded text-indigo-650 focus:ring-indigo-500/20 accent-indigo-600 cursor-pointer mt-0.5 border-slate-300 dark:border-slate-700"
                                onChange={() => handleToggleSelectPool(q.id ?? "")}
                              />
                              <div className="min-w-0 space-y-1.5 flex-1">
                                <p className="font-bold text-slate-755 dark:text-slate-200 leading-snug line-clamp-3">{q.question}</p>
                                {(q.image_url || q.media_url) && (
                                  <div className="mt-1.5 mb-1 flex justify-start">
                                    <img
                                      src={q.image_url || q.media_url}
                                      alt="Question Graphic"
                                      loading="lazy"
                                      className="max-h-20 w-auto max-w-full rounded-md border border-slate-200 object-contain shadow-sm bg-white aspect-auto"
                                    />
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <Badge tone={
                                    (q.difficulty || "").toLowerCase().trim() === "easy" ? "green" :
                                      (q.difficulty || "").toLowerCase().trim() === "medium" ? "yellow" :
                                        (((q.difficulty || "").toLowerCase().trim() === "hard" || (q.difficulty || "").toLowerCase().trim() === "difficult") ? "red" : "slate")
                                  } className="px-2 py-0.5 font-bold uppercase tracking-wide text-[9px]">
                                    {q.difficulty}
                                  </Badge>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate max-w-[120px]">
                                    {q.topic_name || "General"}
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      disabled={selectedPoolIds.length === 0 || updateTestMutation.isPending}
                      onClick={() => handleAddToTest(selectedPoolIds)}
                      className="mt-5 w-full text-xs font-bold h-10 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/10 text-white border-none rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:scale-100"
                      icon={<Plus className="h-4 w-4" />}
                    >
                      Add Selected ({selectedPoolIds.length}) to Test
                    </Button>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>

        {toast ? <Toast>{toast}</Toast> : null}
      </PageWrapper>
    </AppShell>
  );
};
