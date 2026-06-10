import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  Calendar,
  BookOpen,
  Award,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  School,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { getAdminUsers, getAllAttempts, getAllTests } from "../services/api";

export const AdminStudentProfilePage = () => {
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

  const stats = useMemo(() => {
    if (!student) return null;

    const studentAttempts = attempts.filter((a) => a.user_id === student.userId);

    let totalScore = 0;
    let totalMaxMarks = 0;
    let highestPercent = 0;
    let lowestPercent = studentAttempts.length > 0 ? 100 : 0;

    studentAttempts.forEach((attempt) => {
      const test = tests.find((t) => t.id === attempt.test_id);
      const maxMarks = test?.total_marks || attempt.total_marks || 100;
      const percent = Math.round((attempt.score / maxMarks) * 100);

      totalScore += attempt.score;
      totalMaxMarks += maxMarks;

      if (percent > highestPercent) highestPercent = percent;
      if (percent < lowestPercent) lowestPercent = percent;
    });

    const avgScore = totalMaxMarks > 0 ? Math.round((totalScore / totalMaxMarks) * 100) : 0;

    return {
      attemptsCount: studentAttempts.length,
      avgScore,
      highestScore: highestPercent,
      lowestScore: lowestPercent,
    };
  }, [student, attempts, tests]);

  const formatRegistrationDate = (joinedAt?: string, uid?: string) => {
    const dateVal = joinedAt
      ? new Date(joinedAt)
      : (() => {
          const id = uid || "";
          if (id.length === 24) {
            const timestampHex = id.substring(0, 8);
            const timestampSec = parseInt(timestampHex, 16);
            if (!isNaN(timestampSec)) return new Date(timestampSec * 1000);
          }
          return null;
        })();
    if (!dateVal || isNaN(dateVal.getTime())) return "N/A";
    return dateVal.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
  };

  const isLoading = isLoadingUsers || isLoadingAttempts || isLoadingTests;

  if (isLoading) {
    return (
      <AppShell>
        <PageWrapper>
          <div className="flex h-64 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2.5 font-bold">Synchronizing profile logs...</span>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  if (!student) {
    return (
      <AppShell>
        <PageWrapper>
          <div className="rounded-xl border border-dashed border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 text-center text-slate-500">
            <p className="text-lg font-bold">Student Profile Not Found</p>
            <p className="mt-1 text-sm text-slate-400">The requested profile could not be verified.</p>
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

  const classTone: "green" | "blue" | "yellow" | "slate" = 
    student.class?.includes("9") ? "green" : 
    student.class?.includes("10") ? "blue" : 
    student.class?.includes("11") ? "yellow" : "slate";

  return (
    <AppShell>
      <PageWrapper>
        {/* Navigation Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          <Link to="/admin/students" className="hover:text-[#5f38f9] transition">
            Students
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-655 dark:text-slate-300">{student.name}</span>
        </nav>

        {/* Back Button */}
        <div className="mb-6">
          <Link to="/admin/students">
            <Button variant="secondary" className="h-9 px-4 font-bold flex items-center gap-1.5 border-slate-200 hover:bg-slate-50 rounded-lg">
              <ArrowLeft className="h-4 w-4" /> Back to List
            </Button>
          </Link>
        </div>

        {/* Grid Layout */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Identity Card */}
          <article className="md:col-span-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-md flex flex-col justify-between h-fit">
            {/* Header graphic */}
            <div className="relative h-24 bg-gradient-to-r from-[#5f38f9] to-[#7d5bfc] p-4 flex items-end justify-center">
              <div className="absolute -bottom-10 h-20 w-20 overflow-hidden rounded-full border-4 border-white dark:border-slate-900 bg-gradient-to-br from-[#ffd584] to-[#fbc564] shadow flex items-center justify-center text-4xl">
                🙂
              </div>
            </div>

            {/* Profile Info */}
            <div className="px-6 pt-12 pb-6 text-center border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                {student.name}
              </h2>
              <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-200/30">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Active Enrolled
              </span>
            </div>

            {/* Detailed Metadata fields */}
            <div className="p-6 space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-8.5 w-8.5 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-850/50 text-slate-400 shrink-0">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest">Email Address</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block truncate">{student.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8.5 w-8.5 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-850/50 text-slate-400 shrink-0">
                  <School className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest">Class Level</span>
                  <Badge tone={classTone} className="font-extrabold mt-0.5">{student.class || "Class 10"}</Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8.5 w-8.5 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-850/50 text-slate-400 shrink-0">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest">Joined Organization</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 mt-0.5 block">
                    {formatRegistrationDate(student.joined_at, student.id)}
                  </span>
                </div>
              </div>
            </div>

            {/* Button call to action */}
            <div className="p-6 pt-0">
              <Link to={`/admin/students/${student.id}/performance`} className="block w-full">
                <Button className="w-full bg-[#5f38f9] hover:bg-[#4d28d9] text-white font-bold flex items-center justify-center gap-2 rounded-lg py-2.5 transition shadow">
                  <TrendingUp className="h-4 w-4" />
                  View Detailed Performance
                </Button>
              </Link>
            </div>
          </article>

          {/* Quick Metrics stats grid */}
          <div className="md:col-span-2 grid gap-6 grid-cols-2 h-fit">
            <article className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:shadow-md col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <BookOpen className="h-5.5 w-5.5" />
                </div>
                <Badge tone="slate" className="font-bold px-2.5">Academic Logs</Badge>
              </div>
              <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total Tests Attempted</h3>
              <p className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">{stats?.attemptsCount}</p>
            </article>

            <article className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:shadow-md col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450">
                  <Award className="h-5.5 w-5.5" />
                </div>
                <Badge tone="green" className="font-bold px-2.5">Avg Score</Badge>
              </div>
              <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Average Performance</h3>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats?.avgScore}%</p>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-3">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${stats?.avgScore || 0}%` }}
                />
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:shadow-md col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <ArrowUpRight className="h-5.5 w-5.5" />
                </div>
                <Badge tone="blue" className="font-bold px-2.5">Peak Score</Badge>
              </div>
              <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Highest Score Percentage</h3>
              <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{stats?.highestScore}%</p>
            </article>

            <article className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:shadow-md col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-450">
                  <ArrowDownRight className="h-5.5 w-5.5" />
                </div>
                <Badge tone="red" className="font-bold px-2.5">Floor Score</Badge>
              </div>
              <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Lowest Score Percentage</h3>
              <p className="text-3xl font-black text-rose-600 dark:text-rose-450 mt-2">{stats?.lowestScore}%</p>
            </article>
          </div>
        </div>
      </PageWrapper>
    </AppShell>
  );
};
