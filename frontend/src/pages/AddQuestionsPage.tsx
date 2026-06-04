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
import { useTest, useSubTopics, useTopics } from "../hooks/useTests";
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

  // Queries
  const { data: test, isLoading: isLoadingTest } = useTest(id);

  useEffect(() => {
    if (test) {
      const now = new Date().getTime();
      const start = test.start_time ? new Date(test.start_time).getTime() : 0;
      if (test.status === "live" && start && now >= start) {
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

  // Fetch all questions in the global pool
  const { data: globalPool = [], isLoading: isLoadingPool } = useQuery({
    queryKey: ["questions"],
    queryFn: getAllQuestions,
  });

  // Filter global pool to only show questions matching test's selected topics, which are not already linked
  const availablePoolQuestions = useMemo(() => {
    const linkedIds = new Set(test?.questions ?? []);
    const testTopics = test?.topics ?? [];
    return globalPool.filter((q) => {
      const belongsToSelectedTopics = q.topic_id && testTopics.includes(q.topic_id);
      const notLinked = !linkedIds.has(q.id ?? "");
      return belongsToSelectedTopics && notLinked;
    });
  }, [globalPool, test?.questions, test?.topics]);

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
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-bold text-[#6c7df7] hover:underline uppercase">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <Link to={`/tests/${id}/preview`}>
            <Button className="h-9 px-4 text-xs font-semibold">Preview & Publish</Button>
          </Link>
        </div>

        {/* Test Summary Card */}
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="blue">{subjectsName}</Badge>
            <Badge tone="slate">{test.type.replace("_", " ")}</Badge>
            <Badge tone={
              (test.difficulty || "").toLowerCase().trim() === "easy" ? "green" : 
              (test.difficulty || "").toLowerCase().trim() === "medium" ? "yellow" : 
              (((test.difficulty || "").toLowerCase().trim() === "hard" || (test.difficulty || "").toLowerCase().trim() === "difficult") ? "red" : "slate")
            }>{test.difficulty}</Badge>
          </div>
          <h1 className="text-lg font-bold text-slate-800 mb-2">📚 {test.name}</h1>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>⌚ {test.total_time} Mins</span>
            <span>□ {test.total_questions} Questions Target</span>
            <span>♙ {test.total_marks} Marks</span>
          </div>
        </section>

        {/* Manager Layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left Column: Manage Linked Questions */}
          <main className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
                <span>Linked Test Questions ({testQuestions.length})</span>
                <span className="text-xs text-slate-400 font-semibold">Target: {test.total_questions} Qs</span>
              </h2>

              {testQuestions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-slate-400 text-sm">
                  No questions linked to this test yet. Link questions from the global pool on the right side.
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {testQuestions.map((q, index) => (
                    <article
                      key={q.id ?? index}
                      className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 p-4 hover:border-slate-200 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                          {index + 1}. {q.question}
                        </p>
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Correct: {q.correct_option.replace("option", "Option ")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        className="h-8 px-2 text-rose-600 hover:bg-rose-50 flex items-center justify-center shrink-0"
                        onClick={() => handleRemoveFromTest(q.id ?? "")}
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        title="Remove from test"
                      />
                    </article>
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* Right Column: Source Question Bank (Global Pool) */}
          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
              <div className="flex-1 flex flex-col">
                <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <FolderPlus className="h-4 w-4 text-slate-400" />
                  Available Pool Questions ({availablePoolQuestions.length})
                </h3>

                {availablePoolQuestions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center bg-slate-50 rounded">
                    No pool questions available for subjects: {subjectsName}. Let teachers create them.
                  </p>
                ) : (
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                      {availablePoolQuestions.map((q) => {
                        const isSelected = selectedPoolIds.includes(q.id ?? "");
                        return (
                          <label
                            key={q.id}
                            className={`flex items-start gap-3 p-2.5 rounded border text-xs cursor-pointer hover:bg-slate-50/50 transition ${
                              isSelected ? "border-indigo-400 bg-indigo-50/30" : "border-slate-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              className="h-4.5 w-4.5 rounded text-indigo-600 mt-0.5"
                              onChange={() => handleToggleSelectPool(q.id ?? "")}
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-700 line-clamp-2">{q.question}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block">Difficulty: {q.difficulty}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <Button
                      disabled={selectedPoolIds.length === 0 || updateTestMutation.isPending}
                      onClick={() => handleAddToTest(selectedPoolIds)}
                      className="mt-4 w-full text-xs font-bold h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
                      icon={<Plus className="h-3.5 w-3.5" />}
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
