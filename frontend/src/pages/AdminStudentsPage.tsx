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
  ChevronDown,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Spinner } from "../components/ui/Spinner";
import { getAdminUsers, getAllAttempts, getAllTests, getSubjects, getPrograms } from "../services/api";

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

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: getSubjects,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: getPrograms,
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
        {/* ── ADMIN COMMAND CENTER HERO ── */}
        <div className="admin-hero mb-6 p-6 sm:p-8">
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-48 w-48 rounded-full" style={{background:'radial-gradient(circle,rgba(6,182,212,0.12) 0%,transparent 70%)'}} />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex-1 min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-full px-3 py-1.5 border" style={{background:'rgba(99,102,241,0.12)',borderColor:'rgba(99,102,241,0.3)',color:'#a5b4fc'}}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                PARIKSHYA · STUDENT RECORDS
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Students Management<br />
                <span style={{background:'linear-gradient(90deg,#a5b4fc,#67e8f9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}} className="text-xl sm:text-2xl font-black">Enrollment & Performance Hub</span>
              </h1>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed max-w-lg" style={{color:'rgba(203,213,225,0.7)'}}>
                Monitor enrollments, inspect performance trends, and analyze test attempts with detailed scorecards.
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-2xl flex flex-col items-center justify-center" style={{background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.25)'}}>
                <Users className="h-7 w-7" style={{color:'#818cf8'}} />
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full" style={{background:'rgba(99,102,241,0.15)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.25)'}}>{overallStats.totalStudents} enrolled</span>
            </div>
          </div>
        </div>

        {/* ── COMMAND CENTER STATS ── */}
        {!isLoading && (
          <section className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Students', value: overallStats.totalStudents, icon: Users, accent: '#6366f1', glow: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.2)', tag: 'Enrolled' },
              { label: 'Active Classes', value: overallStats.totalClasses, icon: School, accent: '#06b6d4', glow: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.2)', tag: 'Sections' },
              { label: 'Avg Score', value: `${overallStats.systemAverage}%`, icon: TrendingUp, accent: '#10b981', glow: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)', tag: 'Platform' },
              { label: 'Top Performer', value: overallStats.topStudent, icon: GraduationCap, accent: '#f59e0b', glow: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)', tag: 'Best' },
            ].map(({ label, value, icon: Icon, accent, glow, border, tag }) => (
              <article key={label} className="admin-stat-card p-4 sm:p-5 flex flex-col gap-3">
                <div className="card-accent-bar" style={{background:`linear-gradient(90deg,${accent},transparent)`}} />
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{background:glow,border:`1px solid ${border}`}}>
                    <Icon className="h-5 w-5" style={{color:accent}} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider rounded-full px-2 py-1" style={{background:glow,color:accent,border:`1px solid ${border}`}}>{tag}</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{color:accent}}>{label}</p>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 truncate" title={String(value)}>{value}</p>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ── Filter toolbar ── */}
        <div className="admin-section-card mb-4">
          <div className="p-4 flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input type="text" className="admin-search" placeholder="Search students by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="relative shrink-0">
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="admin-select">
                <option value="all">All Classes</option>
                {classesList.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Students Table */}
        {isLoading ? (
          <div className="admin-section-card p-12 text-center">
            <Spinner />
            <p className="text-sm text-slate-500 font-semibold mt-3">Synchronizing enrollment records...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="admin-section-card p-16 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-4" style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.15)'}}>
              <Users className="h-7 w-7" style={{color:'#6366f1'}} />
            </div>
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">No students matching criteria</p>
            <p className="mt-1 text-sm text-slate-400">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="admin-section-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm admin-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class / Program</th>
                    <th>Registered</th>
                    <th className="text-center">Attempts</th>
                    <th className="text-center">Avg Score</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const avgScore = student.avgScore;
                    const classTone: "green" | "blue" | "yellow" | "slate" =
                      student.class?.includes("9") ? "green" :
                      student.class?.includes("10") ? "blue" :
                      student.class?.includes("11") ? "yellow" : "slate";

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-black shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                              {student.profilePicture ? (
                                <img src={student.profilePicture} alt={student.name} className="h-full w-full object-cover" />
                              ) : (
                                student.name?.charAt(0).toUpperCase() || "S"
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 dark:text-slate-100 leading-tight truncate text-sm">{student.name}</div>
                              <div className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {student.program_id && student.semester ? (
                            (() => {
                              const progCode = programs.find(p => p.id === student.program_id)?.code || student.program_id;
                              return <Badge tone="blue" className="font-bold py-1 px-2.5 rounded-full uppercase">{progCode} · Sem {student.semester}</Badge>;
                            })()
                          ) : (
                            <Badge tone={classTone} className="font-bold py-1 px-2.5 rounded-full">{student.class || "Class 10"}</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatRegistrationDate(student.joined_at, student.id)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
                            <BookOpen className="h-3 w-3" /> {student.attemptsCount}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {avgScore !== null ? (
                            <div className="flex flex-col items-center gap-1.5 max-w-[90px] mx-auto">
                              <span className={`text-xs font-extrabold ${
                                avgScore >= 75 ? "text-emerald-600 dark:text-emerald-400" :
                                avgScore >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                              }`}>{avgScore}%</span>
                              <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div className={`h-full rounded-full ${
                                  avgScore >= 75 ? "bg-emerald-500" : avgScore >= 50 ? "bg-amber-500" : "bg-rose-500"
                                }`} style={{ width: `${avgScore}%` }} />
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500">—</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <Link to={`/admin/students/${student.id}`}>
                              <button className="h-8 px-3 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                                Profile
                              </button>
                            </Link>
                            <Link to={`/admin/students/${student.id}/performance`}>
                              <button className="h-8 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer">
                                <TrendingUp className="h-3.5 w-3.5" /> Performance
                              </button>
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
