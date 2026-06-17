import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Calendar,
  Sparkles,
  School,
  GraduationCap,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Spinner } from "../components/ui/Spinner";
import { getAdminUsers, getAllAttempts, getAllTests } from "../services/api";

export const AdminStudentsPage = () => {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");

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

  const students = useMemo(() => {
    return users.filter((u) => u.role === "Student");
  }, [users]);

  // Aggregate stats per student
  const studentsWithStats = useMemo(() => {
    return students.map((student) => {
      const studentAttempts = attempts.filter((a) => a.user_id === student.userId && tests.some((t) => t.id === a.test_id));
      
      let totalScore = 0;
      let totalMaxMarks = 0;

      studentAttempts.forEach((attempt) => {
        const test = tests.find((t) => t.id === attempt.test_id);
        const maxMarks = test?.total_marks || attempt.total_marks || 100;
        totalScore += attempt.score;
        totalMaxMarks += maxMarks;
      });

      const avgScore = totalMaxMarks > 0 ? Math.round((totalScore / totalMaxMarks) * 100) : null;

      return {
        ...student,
        attemptsCount: studentAttempts.length,
        avgScore,
      };
    });
  }, [students, attempts, tests]);

  // Overall analytics cards
  const overallStats = useMemo(() => {
    if (studentsWithStats.length === 0) {
      return {
        totalStudents: 0,
        totalClasses: 0,
        systemAverage: 0,
        topStudent: "N/A",
      };
    }

    const totalStudents = students.length;
    const uniqueClasses = new Set(students.map((s) => s.class).filter(Boolean)).size;

    let grandScore = 0;
    let grandMaxMarks = 0;
    attempts.forEach((attempt) => {
      const test = tests.find((t) => t.id === attempt.test_id);
      if (!test) return; // Ignore attempts of deleted tests!
      const max = test.total_marks || attempt.total_marks || 100;
      grandScore += attempt.score;
      grandMaxMarks += max;
    });
    const systemAverage = grandMaxMarks > 0 ? Math.round((grandScore / grandMaxMarks) * 100) : 0;

    let topStudentName = "N/A";
    let maxAvg = -1;
    studentsWithStats.forEach((s) => {
      if (s.avgScore !== null && s.avgScore > maxAvg) {
        maxAvg = s.avgScore;
        topStudentName = s.name || "N/A";
      }
    });

    return {
      totalStudents,
      totalClasses: uniqueClasses,
      systemAverage,
      topStudent: topStudentName,
    };
  }, [students, studentsWithStats, attempts, tests]);

  // Unique classes for filtering
  const classesList = useMemo(() => {
    const list = new Set<string>();
    students.forEach((s) => {
      if (s.class) list.add(s.class);
    });
    return Array.from(list).sort();
  }, [students]);

  // Filter students based on search query and class selection
  const filteredStudents = useMemo(() => {
    return studentsWithStats.filter((s) => {
      const matchesSearch =
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase());

      const matchesClass = classFilter === "all" || s.class === classFilter;

      return matchesSearch && matchesClass;
    });
  }, [studentsWithStats, search, classFilter]);

  const formatRegistrationDate = (joinedAt?: string, studentId?: string) => {
    const dateVal = joinedAt
      ? new Date(joinedAt)
      : (() => {
          const id = studentId || "";
          if (id.length === 24) {
            const timestampHex = id.substring(0, 8);
            const timestampSec = parseInt(timestampHex, 16);
            if (!isNaN(timestampSec)) return new Date(timestampSec * 1000);
          }
          return null;
        })();
    if (!dateVal || isNaN(dateVal.getTime())) return "N/A";
    return dateVal.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
  };

  const isLoading = isLoadingUsers || isLoadingAttempts || isLoadingTests;

  return (
    <AppShell>
      <PageWrapper>
        {/* Page Header */}
        <header className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#5f38f9] via-[#7d5bfc] to-[#3a90f3] p-6 text-white shadow-xl md:p-8 animate-fade-in">
          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-100">
                <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                Administrative Panel
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                Students Management
              </h1>
              <p className="mt-2 text-sm text-indigo-50/90 max-w-2xl leading-relaxed">
                Monitor student enrollments, inspect class performance trends, and analyze historical academic attempts with detailed student scorecard profiles.
              </p>
            </div>
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-4xl shadow-inner border border-white/10">
              🎓
            </div>
          </div>
          <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute -top-8 -left-8 h-42 w-42 rounded-full bg-white/5" />
        </header>

        {/* Aggregated Quick Statistics Overview */}
        {!isLoading && (
          <section className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
            <article className="flex items-center gap-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Students</h4>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{overallStats.totalStudents}</p>
              </div>
            </article>

            <article className="flex items-center gap-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <School className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Classes</h4>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{overallStats.totalClasses}</p>
              </div>
            </article>

            <article className="flex items-center gap-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Average Performance</h4>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-450 mt-1">{overallStats.systemAverage}%</p>
              </div>
            </article>

            <article className="flex items-center gap-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-650 dark:text-amber-400">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Top Performing</h4>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 truncate pr-2" title={overallStats.topStudent}>
                  {overallStats.topStudent}
                </p>
              </div>
            </article>
          </section>
        )}

        {/* Filter Toolbar */}
        <section className="mb-6 grid gap-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm md:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-550" />
            <Input
              className="pl-10 h-11 border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-lg text-sm"
              placeholder="Search students by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="h-11 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium"
          >
            <option value="all">All Classes</option>
            {classesList.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </section>

        {/* Students Table */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2.5 font-bold">Synchronizing enrollment records...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 text-center text-slate-500">
            <p className="text-lg font-bold dark:text-slate-300">No students matching criteria</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-550">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-850/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Student Details</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Registration Date</th>
                    <th className="px-6 py-4 text-center">Tests Attempted</th>
                    <th className="px-6 py-4 text-center">Average Score</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredStudents.map((student) => {
                    const avgScore = student.avgScore;
                    // Dynamically map class levels to custom HSL pill configurations
                    const classTone: "green" | "blue" | "yellow" | "slate" = 
                      student.class?.includes("9") ? "green" : 
                      student.class?.includes("10") ? "blue" : 
                      student.class?.includes("11") ? "yellow" : "slate";

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 transition-all duration-150 group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-black shadow-sm group-hover:scale-105 transition duration-200">
                              {student.name?.charAt(0).toUpperCase() || "S"}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                                {student.name}
                              </div>
                              <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold truncate mt-0.5">
                                {student.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge tone={classTone} className="font-bold py-1 px-2.5 rounded-full">
                            {student.class || "Class 10"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatRegistrationDate(student.joined_at, student.id)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-850 px-2.5 py-1 rounded-md text-xs font-bold text-slate-600 dark:text-slate-300">
                            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                            {student.attemptsCount}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {avgScore !== null ? (
                            <div className="flex flex-col items-center gap-1.5 max-w-[100px] mx-auto">
                              <span
                                className={`text-xs font-extrabold ${
                                  avgScore >= 75
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : avgScore >= 50
                                    ? "text-amber-650 dark:text-amber-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {avgScore}%
                              </span>
                              <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner border border-slate-200/20">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    avgScore >= 75
                                      ? "bg-emerald-500"
                                      : avgScore >= 50
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                  style={{ width: `${avgScore}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-xs font-semibold text-slate-400 dark:text-slate-550">
                              No Attempts
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2.5">
                            <Link to={`/admin/students/${student.id}`}>
                              <Button
                                variant="secondary"
                                className="h-8.5 text-xs font-bold px-3 border-slate-200 hover:border-slate-300 dark:border-slate-800 hover:bg-slate-50 rounded-lg"
                              >
                                View Profile
                              </Button>
                            </Link>
                            <Link to={`/admin/students/${student.id}/performance`}>
                              <Button className="h-8.5 text-xs font-bold px-3 bg-[#5f38f9] hover:bg-[#4d28d9] text-white flex items-center gap-1.5 shadow-sm rounded-lg hover:shadow transition">
                                <TrendingUp className="h-3.5 w-3.5" />
                                Performance
                              </Button>
                            </Link>
                          </div>
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
