import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Bookmark,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { getAdminUsers, getAllAttempts, getAllTests } from "../services/api";

export const AdminStudentPerformancePage = () => {
  const { studentId = "" } = useParams();

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: getAdminUsers,
  });

  const { data: attempts = [], isLoading: isLoadingAttempts } = useQuery({
    queryKey: ["attempts"],
    queryFn: getAllAttempts,
  });

  const { data: tests = [], isLoading: isLoadingTests } = useQuery({
    queryKey: ["tests"],
    queryFn: getAllTests,
  });

  const student = useMemo(() => {
    return users.find((u) => u.id === studentId && u.role === "Student");
  }, [users, studentId]);

  // Find all attempts of the student
  const studentAttempts = useMemo(() => {
    if (!student) return [];
    const filtered = attempts.filter((a) => a.user_id === student.userId);
    // Sort attempts by submission date descending (LIFO)
    return [...filtered].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  }, [student, attempts]);

  // Compute rank in a test
  const getStudentRankInTest = (testId: string, studentUserId: string) => {
    const testAttempts = attempts.filter((a) => a.test_id === testId);
    const sorted = [...testAttempts].sort((a, b) => b.score - a.score);
    let rank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].score < sorted[i - 1].score) {
        rank = i + 1;
      }
      if (sorted[i].user_id === studentUserId) {
        return rank;
      }
    }
    return 1;
  };

  // Aggregated summaries
  const summaries = useMemo(() => {
    if (studentAttempts.length === 0) {
      return {
        avgScore: 0,
        highestScore: 0,
        lowestScore: 0,
        attempted: 0,
        passed: 0,
        failed: 0,
      };
    }

    let totalScore = 0;
    let totalMaxMarks = 0;
    let highestPercent = 0;
    let lowestPercent = 100;
    let passedCount = 0;
    let failedCount = 0;

    studentAttempts.forEach((attempt) => {
      const test = tests.find((t) => t.id === attempt.test_id);
      const maxMarks = test?.total_marks || attempt.total_marks || 100;
      const percent = Math.round((attempt.score / maxMarks) * 100);

      totalScore += attempt.score;
      totalMaxMarks += maxMarks;

      if (percent > highestPercent) highestPercent = percent;
      if (percent < lowestPercent) lowestPercent = percent;

      if (percent >= 50) {
        passedCount++;
      } else {
        failedCount++;
      }
    });

    const avgScore = totalMaxMarks > 0 ? Math.round((totalScore / totalMaxMarks) * 100) : 0;

    return {
      avgScore,
      highestScore: highestPercent,
      lowestScore: lowestPercent,
      attempted: studentAttempts.length,
      passed: passedCount,
      failed: failedCount,
    };
  }, [studentAttempts, tests]);

  const formatTimeSpent = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const isLoading = isLoadingUsers || isLoadingAttempts || isLoadingTests;

  if (isLoading) {
    return (
      <AppShell>
        <PageWrapper>
          <div className="flex h-64 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2.5 font-bold">Generating performance dashboard...</span>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  if (!student) {
    return (
      <AppShell>
        <PageWrapper>
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 text-center text-slate-500">
            <p className="text-lg font-bold">Performance Summary Not Found</p>
            <p className="mt-1 text-sm text-slate-400">The requested performance portfolio could not be verified.</p>
            <Link to="/admin/students" className="mt-4 inline-block">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Students
              </Button>
            </Link>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageWrapper>
        {/* Navigation Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          <Link to="/admin/students" className="hover:text-[#5f38f9] transition">
            Students
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/admin/students/${student.id}`} className="hover:text-[#5f38f9] transition">
            {student.name}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-655 dark:text-slate-350">Performance Log</span>
        </nav>

        {/* Back button and profile details */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/admin/students/${student.id}`}>
              <Button variant="secondary" className="h-9 px-4 font-bold flex items-center gap-1.5 border-slate-200 hover:bg-slate-50 rounded-lg">
                <ArrowLeft className="h-4 w-4" /> Back to Profile
              </Button>
            </Link>
            <div>
              <h2 className="text-xl font-extrabold text-slate-850 dark:text-slate-100 leading-tight">
                Academic Performance Log
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-550 mt-1 font-semibold">
                Complete exam scorecards for <span className="font-bold text-slate-700 dark:text-slate-300">{student.name}</span> ({student.class || "Class 10"})
              </p>
            </div>
          </div>
        </div>

        {/* Summaries overview row */}
        <section className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-6">
          <article className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md border-l-4 border-l-indigo-500">
            <h4 className="text-slate-450 dark:text-slate-500 text-[9px] font-bold uppercase tracking-widest">Average Score</h4>
            <p className="text-2xl font-black text-slate-850 dark:text-slate-100 mt-1.5">{summaries.avgScore}%</p>
          </article>

          <article className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md border-l-4 border-l-emerald-500">
            <h4 className="text-slate-450 dark:text-slate-500 text-[9px] font-bold uppercase tracking-widest">Highest Score</h4>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-450 mt-1.5">{summaries.highestScore}%</p>
          </article>

          <article className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md border-l-4 border-l-rose-500">
            <h4 className="text-slate-450 dark:text-slate-500 text-[9px] font-bold uppercase tracking-widest">Lowest Score</h4>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-450 mt-1.5">{summaries.lowestScore}%</p>
          </article>

          <article className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md border-l-4 border-l-blue-500">
            <h4 className="text-slate-450 dark:text-slate-500 text-[9px] font-bold uppercase tracking-widest">Attempted</h4>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1.5">{summaries.attempted}</p>
          </article>

          <article className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md border-l-4 border-l-emerald-400">
            <h4 className="text-slate-450 dark:text-slate-500 text-[9px] font-bold uppercase tracking-widest">Tests Passed</h4>
            <p className="text-2xl font-black text-emerald-500 mt-1.5">{summaries.passed}</p>
          </article>

          <article className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md border-l-4 border-l-rose-400">
            <h4 className="text-slate-450 dark:text-slate-500 text-[9px] font-bold uppercase tracking-widest">Tests Failed</h4>
            <p className="text-2xl font-black text-rose-500 mt-1.5">{summaries.failed}</p>
          </article>
        </section>

        {/* Analytics listing header */}
        <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
          Test-by-Test Performance Analytics
        </h3>

        {studentAttempts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 text-center text-slate-500">
            <p className="text-lg font-bold dark:text-slate-300">No exam attempts logged</p>
            <p className="mt-1 text-sm text-slate-400">This student has not attempted any published tests yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-850/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Test Name</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Attempt Date</th>
                    <th className="px-6 py-4 text-center">Score</th>
                    <th className="px-6 py-4 text-center">Percentage</th>
                    <th className="px-6 py-4 text-center">Class Rank</th>
                    <th className="px-6 py-4 text-center">Duration</th>
                    <th className="px-6 py-4 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {studentAttempts.map((attempt) => {
                    const test = tests.find((t) => t.id === attempt.test_id);
                    const totalMarks = test?.total_marks || attempt.total_marks || 100;
                    const percent = Math.round((attempt.score / totalMarks) * 100);
                    const rank = getStudentRankInTest(attempt.test_id, student.userId || "");
                    const subject = test ? (Array.isArray(test.subject) ? test.subject.join(", ") : test.subject) : "General";
                    const isPassed = percent >= 50;

                    // Map specific subjects to custom badges
                    const subLower = subject.toLowerCase();
                    const subTone: "blue" | "green" | "yellow" | "slate" = 
                      subLower.includes("physics") ? "blue" : 
                      subLower.includes("math") ? "blue" : 
                      subLower.includes("chem") || subLower.includes("science") ? "green" : 
                      subLower.includes("eng") ? "yellow" : "slate";

                    return (
                      <tr
                        key={attempt.id}
                        className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 transition-all duration-150 group"
                      >
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">
                          {attempt.test_name || test?.name || "Exam Attempt"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge tone={subTone} className="font-bold">
                            {subject}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(attempt.submitted_at).toLocaleDateString([], {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-350">
                          {attempt.score} / {totalMarks}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`text-xs font-black ${
                                isPassed
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {percent}%
                            </span>
                            <div className="w-12 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isPassed ? "bg-emerald-500" : "bg-rose-500"}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/30 px-2 py-0.5 rounded text-xs font-bold text-indigo-750 dark:text-indigo-400">
                            Rank {rank}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400 font-semibold text-xs">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {formatTimeSpent(attempt.time_spent)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isPassed ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1 rounded-full border border-emerald-200/20">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-600 dark:text-rose-450 bg-rose-50 dark:bg-rose-950/20 px-3 py-1 rounded-full border border-rose-200/20">
                              <XCircle className="h-3.5 w-3.5" />
                              Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PageWrapper>
    </AppShell>
  );
};
