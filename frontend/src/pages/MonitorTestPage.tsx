import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  ArrowLeft,
  Users,
  Award,
  Calendar,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { useTest } from "../hooks/useTests";
import { getAllAttempts, shareTestResults } from "../services/api";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { Modal } from "../components/ui/Modal";
import { Toast } from "../components/ui/Toast";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Attempt } from "../types";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export const MonitorTestPage = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && user.role !== "Admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Queries
  const { data: test, isLoading: isLoadingTest } = useTest(id);
  const { data: allAttempts = [], isLoading: isLoadingAttempts } = useQuery({
    queryKey: ["attempts"],
    queryFn: getAllAttempts,
  });

  // States
  const [toast, setToast] = useState("");
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);

  // Filter attempts for this test
  const testAttempts = useMemo(() => {
    return allAttempts.filter((att) => att.test_id === id);
  }, [allAttempts, id]);

  // Statistics
  const stats = useMemo(() => {
    if (testAttempts.length === 0 || !test) {
      return { total: 0, avg: 0, high: 0 };
    }
    const scores = testAttempts.map((a) => a.score);
    const high = Math.max(...scores);
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    const avg = Math.round(sum / testAttempts.length);
    return { total: testAttempts.length, avg, high };
  }, [testAttempts, test]);

  // Determine time slot status
  const timeSlotStatus = useMemo(() => {
    if (!test?.start_time || !test?.end_time) return "Active";
    const now = new Date().getTime();
    const start = new Date(test.start_time).getTime();
    const end = new Date(test.end_time).getTime();

    if (now < start) return "Upcoming";
    if (now > end) return "Ended";
    return "Active";
  }, [test]);

  // Mutation to release/share results
  const shareMutation = useMutation({
    mutationFn: () => shareTestResults(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tests", id] });
      setToast("Results declared and shared with all students!");
      window.setTimeout(() => setToast(""), 2000);
    },
    onError: (err) => {
      alert("Error sharing results. Please try again.");
      console.error(err);
    },
  });

  const isLoading = isLoadingTest || isLoadingAttempts;

  if (isLoading || !test) {
    return (
      <AppShell>
        <PageWrapper>
          <div className="flex h-96 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2">Loading monitor interface...</span>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  // Format datetime for view
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  };

  return (
    <AppShell>
      <PageWrapper>
        {/* Back Link */}
        <div className="mb-6">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-bold text-[#6c7df7] hover:underline uppercase">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>

        {/* Test Summary Banner */}
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="blue">{Array.isArray(test.subject) ? test.subject.join(", ") : test.subject}</Badge>
              <Badge tone={test.results_shared ? "green" : "yellow"}>
                {test.results_shared ? "Results Declared" : "Awaiting Results Declaration"}
              </Badge>
              <Badge tone={timeSlotStatus === "Active" ? "green" : timeSlotStatus === "Upcoming" ? "blue" : "slate"}>
                Slot: {timeSlotStatus}
              </Badge>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">{test.name}</h1>
            
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 max-w-lg">
              <span>Time Slot Window:</span>
              <span className="font-semibold text-slate-700">
                {formatDateTime(test.start_time)} to {formatDateTime(test.end_time)}
              </span>
              <span>Marks:</span>
              <span className="font-semibold text-slate-700">+{test.correct_marks} / {test.wrong_marks} (Total: {test.total_marks} Marks)</span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-2">
            <Button
              disabled={test.results_shared || testAttempts.length === 0 || shareMutation.isPending || timeSlotStatus !== "Ended"}
              onClick={() => {
                if (confirm("Confirm sharing results? This will release grades and test copies, and delete the questions from the main bank.")) {
                  shareMutation.mutate();
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-5 flex items-center gap-2"
              icon={<Send className="h-4 w-4" />}
              title={timeSlotStatus !== "Ended" ? "Results can only be shared after the test has ended" : ""}
            >
              {shareMutation.isPending ? "Declaring..." : test.results_shared ? "Results Shared" : "Share Results"}
            </Button>
            {test.results_shared ? (
              <p className="text-[10px] text-center text-emerald-600 font-semibold flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Questions successfully archived
              </p>
            ) : (
              timeSlotStatus !== "Ended" && (
                <p className="text-[10px] text-center text-amber-600 font-medium">
                  Available after test slot ends
                </p>
              )
            )}
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-8 grid gap-4 grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Attempts</p>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats.total} submissions</h3>
              </div>
            </div>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">High Score</p>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats.high} / {test.total_marks}</h3>
              </div>
            </div>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Average Score</p>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats.avg} / {test.total_marks}</h3>
              </div>
            </div>
          </article>
        </section>

        {/* Student Submissions List */}
        <h2 className="mb-4 text-base font-bold text-slate-800 flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-500" />
          Student Attempts
        </h2>

        {testAttempts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
            <p className="text-base font-bold text-slate-700">No submissions yet</p>
            <p className="mt-1 text-sm text-slate-400">Students attempts will appear here when they submit the test.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Student ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted At</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Time Spent</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {testAttempts.map((attempt) => {
                  const m = Math.floor(attempt.time_spent / 60);
                  const s = attempt.time_spent % 60;
                  const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;

                  return (
                    <tr key={attempt.id} className="hover:bg-slate-50/40">
                      <td className="px-6 py-4 font-bold text-slate-700">{attempt.user_id}</td>
                      <td className="px-6 py-4">
                        <Badge tone="green">Submitted</Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(attempt.submitted_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {attempt.score} / {test.total_marks}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{timeStr}</td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="secondary"
                          className="h-8 px-2.5 text-xs inline-flex items-center gap-1.5"
                          onClick={() => setSelectedAttempt(attempt)}
                          icon={<Eye className="h-3.5 w-3.5" />}
                        >
                          View Copy
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* View Copy Modal */}
        <Modal
          open={Boolean(selectedAttempt)}
          title={`Exam Answer Sheet - ${selectedAttempt?.user_id}`}
          onClose={() => setSelectedAttempt(null)}
          footer={
            <Button variant="secondary" onClick={() => setSelectedAttempt(null)}>
              Close
            </Button>
          }
        >
          {selectedAttempt && (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-lg text-sm font-semibold">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Student ID</span>
                  <span className="text-slate-800">{selectedAttempt.user_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Marks Scored</span>
                  <span className="text-indigo-600">{selectedAttempt.score} / {test.total_marks}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Correct Answers</span>
                  <span className="text-emerald-600">{selectedAttempt.correct_answers}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Wrong Answers</span>
                  <span className="text-rose-500">{selectedAttempt.wrong_answers}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                  <FileText className="h-4.5 w-4.5 text-slate-400" />
                  Answered Questions Copy
                </h3>
                {(() => {
                  const baseQuestions = selectedAttempt.test_copy || [];
                  let filteredQuestions = baseQuestions;
                  if (test && baseQuestions.length > 0) {
                    const seedRandom = (seedStr: string) => {
                      let h = 2166136261 >>> 0;
                      for (let i = 0; i < seedStr.length; i++) {
                        h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
                      }
                      let seed = h >>> 0;

                      return () => {
                        let z = (seed += 0x6d2b79f5 | 0);
                        z = Math.imul(z ^ (z >>> 15), z | 1);
                        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
                        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
                      };
                    };

                    const getDeterministicSubset = <T,>(array: T[], count: number, seed: string): T[] => {
                      if (array.length <= count) return array;
                      const temp = [...array];
                      const rand = seedRandom(seed);
                      const result: T[] = [];
                      for (let i = 0; i < count; i++) {
                        const idx = Math.floor(rand() * temp.length);
                        result.push(temp.splice(idx, 1)[0]);
                      }
                      return result;
                    };

                    const sortedQuestions = [...baseQuestions].sort((a: any, b: any) => (a.id || "").localeCompare(b.id || ""));
                    const seed = `${selectedAttempt.user_id}-${test.id}`;
                    filteredQuestions = getDeterministicSubset(sortedQuestions, test.total_questions, seed);
                  }

                  if (filteredQuestions.length === 0) {
                    return <p className="text-xs text-slate-400">Answer sheet copy not archived. Results might not be declared yet.</p>;
                  }

                  return filteredQuestions.map((item: any, idx: number) => {
                    const isCorrect = item.selected_option === item.correct_option;
                    const isUnattempted = !item.selected_option;

                    let statusBorder = "border-slate-200";
                    let statusBadge = <Badge tone="slate">Unattempted</Badge>;

                    if (isCorrect) {
                      statusBorder = "border-emerald-200 bg-emerald-50/10";
                      statusBadge = <Badge tone="green">Correct</Badge>;
                    } else if (!isUnattempted) {
                      statusBorder = "border-rose-200 bg-rose-50/10";
                      statusBadge = <Badge tone="red">Incorrect</Badge>;
                    }

                    return (
                      <div key={item.id || idx} className={`p-4 border rounded-lg ${statusBorder}`}>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-3 text-xs font-bold text-slate-400">
                          <span>QUESTION {idx + 1}</span>
                          {statusBadge}
                        </div>
                        <p className="font-bold text-slate-800 text-sm leading-relaxed mb-4">{item.question}</p>
                        
                        <div className="grid gap-2 text-xs md:grid-cols-2">
                          {["option1", "option2", "option3", "option4"].map((optKey, oIdx) => {
                            const optText = item[optKey];
                            const isSelected = item.selected_option === optKey;
                            const isCorrectOpt = item.correct_option === optKey;

                            let optStyle = "border-slate-100 text-slate-500 bg-white";
                            if (isSelected) {
                              optStyle = isCorrect 
                                ? "border-emerald-400 bg-emerald-50 text-emerald-800" 
                                : "border-rose-400 bg-rose-50 text-rose-800";
                            } else if (isCorrectOpt) {
                              optStyle = "border-emerald-300 bg-emerald-50/20 text-emerald-700";
                            }

                            return (
                              <div key={optKey} className={`p-2.5 border rounded font-semibold ${optStyle}`}>
                                {String.fromCharCode(65 + oIdx)}. {optText}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </Modal>

        {toast ? <Toast>{toast}</Toast> : null}
      </PageWrapper>
    </AppShell>
  );
};
