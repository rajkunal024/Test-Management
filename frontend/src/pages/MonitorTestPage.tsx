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
  TrendingUp,
  Trophy,
  ShieldCheck,
  BarChart3,
  Zap,
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

  const { data: test, isLoading: isLoadingTest } = useTest(id);
  const { data: allAttempts = [], isLoading: isLoadingAttempts } = useQuery({
    queryKey: ["attempts"],
    queryFn: getAllAttempts,
  });

  const [toast, setToast] = useState("");
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);

  const testAttempts = useMemo(() => {
    const filtered = allAttempts.filter((att) => att.test_id === id);
    const sorted = [...filtered].sort((a, b) => b.score - a.score);
    let currentRank = 1;
    return sorted.map((attempt, index) => {
      if (index > 0 && attempt.score < sorted[index - 1].score) {
        currentRank = index + 1;
      }
      return { ...attempt, rank: currentRank };
    });
  }, [allAttempts, id]);

  const stats = useMemo(() => {
    if (testAttempts.length === 0 || !test) return { total: 0, avg: 0, high: 0, passRate: 0 };
    const scores = testAttempts.map((a) => a.score);
    const high = Math.max(...scores);
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    const avg = Math.round(sum / testAttempts.length);
    const passing = testAttempts.filter(a => a.score >= (test.total_marks * 0.4)).length;
    const passRate = Math.round((passing / testAttempts.length) * 100);
    return { total: testAttempts.length, avg, high, passRate };
  }, [testAttempts, test]);

  const timeSlotStatus = useMemo(() => {
    if (!test?.start_time || !test?.end_time) return "Active";
    const now = new Date().getTime();
    const start = new Date(test.start_time).getTime();
    const end = new Date(test.end_time).getTime();
    if (now < start) return "Upcoming";
    if (now > end) return "Ended";
    return "Active";
  }, [test]);

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
          <div className="flex h-96 items-center justify-center">
            <div className="text-center space-y-3">
              <Spinner />
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading monitor interface...</p>
            </div>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  };

  const statusColors = {
    "Active": "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900/40",
    "Upcoming": "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900/40",
    "Ended": "text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800/50 dark:border-slate-700",
  };

  return (
    <AppShell>
      <PageWrapper>
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </Link>
        </div>

        {/* Hero Banner */}
        <section className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/20">
          {/* Background effects */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              {/* Status badges */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${statusColors[timeSlotStatus as keyof typeof statusColors]}`}>
                  {timeSlotStatus === "Active" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  Slot: {timeSlotStatus}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  test.results_shared
                    ? "text-emerald-400 bg-emerald-950/40 border-emerald-900/40"
                    : "text-amber-400 bg-amber-950/40 border-amber-900/40"
                }`}>
                  {test.results_shared ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {test.results_shared ? "Results Declared" : "Pending Declaration"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border text-blue-400 bg-blue-950/40 border-blue-900/40">
                  {Array.isArray(test.subject) ? test.subject.join(", ") : test.subject}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight mb-2">
                {test.name}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-400 mt-4 max-w-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>Start: <span className="text-slate-300 font-semibold">{formatDateTime(test.start_time)}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>End: <span className="text-slate-300 font-semibold">{formatDateTime(test.end_time)}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>Scoring: <span className="text-emerald-400 font-semibold">+{test.correct_marks}</span> / <span className="text-rose-400 font-semibold">{test.wrong_marks}</span> · Total <span className="text-slate-300 font-semibold">{test.total_marks}</span></span>
                </div>
              </div>
            </div>

            {/* Share Results Action */}
            <div className="shrink-0 flex flex-col items-start lg:items-end gap-3">
              <Button
                disabled={test.results_shared || testAttempts.length === 0 || shareMutation.isPending || timeSlotStatus !== "Ended"}
                onClick={() => {
                  if (confirm("Confirm sharing results? This will release grades and test copies to all students.")) {
                    shareMutation.mutate();
                  }
                }}
                className="h-11 px-5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-none shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                icon={<Send className="h-4 w-4" />}
                title={timeSlotStatus !== "Ended" ? "Results can only be shared after the test has ended" : ""}
              >
                {shareMutation.isPending ? "Declaring..." : test.results_shared ? "Results Shared" : "Share Results"}
              </Button>
              {test.results_shared ? (
                <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Questions archived successfully
                </p>
              ) : timeSlotStatus !== "Ended" ? (
                <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Available after test ends
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Attempts",
              value: stats.total,
              suffix: "",
              icon: Users,
              color: "indigo",
              bg: "from-indigo-500 to-indigo-600",
            },
            {
              label: "Highest Score",
              value: stats.high,
              suffix: `/${test.total_marks}`,
              icon: Trophy,
              color: "amber",
              bg: "from-amber-500 to-orange-500",
            },
            {
              label: "Average Score",
              value: stats.avg,
              suffix: `/${test.total_marks}`,
              icon: BarChart3,
              color: "blue",
              bg: "from-blue-500 to-cyan-500",
            },
            {
              label: "Pass Rate",
              value: stats.passRate,
              suffix: "%",
              icon: TrendingUp,
              color: "emerald",
              bg: "from-emerald-500 to-teal-500",
            },
          ].map(({ label, value, suffix, icon: Icon, bg }) => (
            <article key={label} className="relative rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 p-4 sm:p-5 shadow-sm overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className={`absolute top-0 right-0 h-20 w-20 rounded-bl-[48px] bg-gradient-to-br ${bg} opacity-8 pointer-events-none`} />
              <div className={`inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br ${bg} text-white shadow-md mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                {value}<span className="text-sm font-bold text-slate-400 dark:text-slate-500 ml-0.5">{suffix}</span>
              </p>
            </article>
          ))}
        </section>

        {/* Leaderboard */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </span>
            Student Submissions
          </h2>
          {testAttempts.length > 0 && (
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              {testAttempts.length} {testAttempts.length === 1 ? "student" : "students"}
            </span>
          )}
        </div>

        {testAttempts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 py-20 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-4">
              <Users className="h-8 w-8" />
            </div>
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">No submissions yet</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 max-w-xs mx-auto">Student attempts will appear here when they submit the test.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-950/50 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-4">Rank</th>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Submitted At</th>
                    <th className="px-5 py-4">Score</th>
                    <th className="px-5 py-4">Time Spent</th>
                    <th className="px-5 py-4">Tab Switches</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {testAttempts.map((attempt) => {
                    const m = Math.floor(attempt.time_spent / 60);
                    const s = attempt.time_spent % 60;
                    const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
                    const rankVal = attempt.rank ?? 1;
                    const pct = test.total_marks > 0 ? Math.round((attempt.score / test.total_marks) * 100) : 0;

                    return (
                      <tr key={attempt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-5 py-3.5 font-bold">
                          {rankVal === 1 && (
                            <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm shadow-amber-500/30">
                              🏆 1st
                            </span>
                          )}
                          {rankVal === 2 && (
                            <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              🥈 2nd
                            </span>
                          )}
                          {rankVal === 3 && (
                            <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-extrabold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                              🥉 3rd
                            </span>
                          )}
                          {rankVal > 3 && (
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                              #{rankVal}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {attempt.user_id?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs font-mono">{attempt.user_id}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 px-2 py-0.5 rounded-full uppercase tracking-wide">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Submitted
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {new Date(attempt.submitted_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-1">
                            <span className={`text-sm font-extrabold ${pct >= 75 ? "text-emerald-600 dark:text-emerald-400" : pct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                              {attempt.score} <span className="text-xs font-normal text-slate-400">/ {test.total_marks}</span>
                            </span>
                            <div className="w-16 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono font-semibold">{timeStr}</td>
                        <td className="px-5 py-3.5">
                          {attempt.tab_switches && attempt.tab_switches > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 px-2 py-0.5 rounded-full uppercase tracking-wide">
                              <XCircle className="h-3 w-3" /> {attempt.tab_switches}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 px-2 py-0.5 rounded-full uppercase tracking-wide">
                              <ShieldCheck className="h-3 w-3" /> Clean
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedAttempt(attempt)}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/40 transition-colors cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Copy
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View Copy Modal */}
        <Modal
          open={Boolean(selectedAttempt)}
          title={`Exam Answer Sheet — ${selectedAttempt?.user_id}`}
          onClose={() => setSelectedAttempt(null)}
          footer={
            <Button variant="secondary" onClick={() => setSelectedAttempt(null)}>
              Close
            </Button>
          }
        >
          {selectedAttempt && (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
              {/* Summary Strip */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                {[
                  { label: "Student ID", value: selectedAttempt.user_id, color: "text-slate-800 dark:text-slate-200" },
                  { label: "Marks Scored", value: `${selectedAttempt.score} / ${test.total_marks}`, color: "text-indigo-600 dark:text-indigo-400" },
                  { label: "Correct", value: selectedAttempt.correct_answers, color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Wrong", value: selectedAttempt.wrong_answers, color: "text-rose-500 dark:text-rose-400" },
                  { label: "Tab Switches", value: selectedAttempt.tab_switches ?? 0, color: (selectedAttempt.tab_switches ?? 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase tracking-wider font-bold mb-1">{label}</span>
                    <span className={`text-sm font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Answer Sheet Copy
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
                    return <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">Answer sheet not available yet.</p>;
                  }

                  return filteredQuestions.map((item: any, idx: number) => {
                    const correctParts = (item.correct_option || "").split(",").map((o: string) => o.trim()).filter(Boolean).sort();
                    const selectedParts = (item.selected_option || "").split(",").map((o: string) => o.trim()).filter(Boolean).sort();
                    const isCorrect = correctParts.length > 0 &&
                      selectedParts.length === correctParts.length &&
                      selectedParts.every((val: string, index: number) => val === correctParts[index]);
                    const isUnattempted = !item.selected_option;

                    const cardStyle = isCorrect
                      ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/10"
                      : !isUnattempted
                        ? "border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/10"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50";

                    const statusBadge = isCorrect
                      ? <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">Correct</span>
                      : isUnattempted
                        ? <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Skipped</span>
                        : <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">Incorrect</span>;

                    return (
                      <div key={item.id || idx} className={`p-4 border rounded-xl ${cardStyle}`}>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/60 mb-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Q{idx + 1}</span>
                          {statusBadge}
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-relaxed mb-3">{item.question}</p>
                        {(item.image_url || item.media_url) && (
                          <div className="mt-2 mb-3 flex justify-start">
                            <img
                              src={item.image_url || item.media_url}
                              alt="Question"
                              loading="lazy"
                              className="max-h-48 w-auto max-w-full rounded-lg border border-slate-200 dark:border-slate-700 object-contain shadow-sm"
                            />
                          </div>
                        )}
                        <div className="grid gap-1.5 md:grid-cols-2">
                          {["option1", "option2", "option3", "option4"].map((optKey, oIdx) => {
                            const optText = item[optKey];
                            const isSelected = item.selected_option?.split(",").map((o: string) => o.trim()).includes(optKey);
                            const isCorrectOpt = item.correct_option?.split(",").map((o: string) => o.trim()).includes(optKey);
                            let optStyle = "border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/40";
                            if (isSelected && isCorrectOpt) optStyle = "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300";
                            else if (isSelected && !isCorrectOpt) optStyle = "border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300";
                            else if (!isSelected && isCorrectOpt) optStyle = "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400";
                            return (
                              <div key={optKey} className={`p-2.5 border rounded-lg text-xs font-semibold ${optStyle}`}>
                                <span className="font-black mr-1.5">{String.fromCharCode(65 + oIdx)}.</span> {optText}
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

        {toast ? <Toast onClose={() => setToast("")}>{toast}</Toast> : null}
      </PageWrapper>
    </AppShell>
  );
};
