import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  Clock,
  Search,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  BookOpenCheck,
  Calendar,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Timer,
  Lock,
  UserCheck,
  Variable,
  Signal,
  Compass,
  FileText,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Spinner } from "../components/ui/Spinner";
import { getAllAttempts, getMyOrganization } from "../services/api";
import { useTests } from "../hooks/useTests";
import { useAuthStore } from "../store/authStore";

const getSubjectTheme = (subjectStr: string) => {
  const sub = (subjectStr || "").toLowerCase();
  if (sub.includes("math")) {
    return {
      gradient: "from-indigo-500/5 to-purple-500/5 dark:from-indigo-950/20 dark:to-purple-950/10",
      borderHover: "hover:border-indigo-500/40",
      glow: "bg-indigo-500/5 group-hover:bg-indigo-500/10",
      textAccent: "text-indigo-650 dark:text-indigo-400",
      badgeTone: "blue" as const,
      borderLine: "border-indigo-100/30 dark:border-indigo-900/30"
    };
  }
  if (sub.includes("phys") || sub.includes("blue")) {
    return {
      gradient: "from-blue-500/5 to-cyan-500/5 dark:from-blue-950/20 dark:to-cyan-950/10",
      borderHover: "hover:border-blue-500/40",
      glow: "bg-blue-500/5 group-hover:bg-blue-500/10",
      textAccent: "text-blue-650 dark:text-blue-400",
      badgeTone: "blue" as const,
      borderLine: "border-blue-100/30 dark:border-blue-900/30"
    };
  }
  if (sub.includes("chem") || sub.includes("bio") || sub.includes("science") || sub.includes("green")) {
    return {
      gradient: "from-emerald-500/5 to-teal-500/5 dark:from-emerald-950/20 dark:to-teal-950/10",
      borderHover: "hover:border-emerald-500/40",
      glow: "bg-emerald-500/5 group-hover:bg-emerald-500/10",
      textAccent: "text-emerald-650 dark:text-emerald-400",
      badgeTone: "green" as const,
      borderLine: "border-emerald-100/30 dark:border-emerald-900/30"
    };
  }
  if (sub.includes("eng") || sub.includes("yellow") || sub.includes("orange")) {
    return {
      gradient: "from-amber-500/5 to-orange-500/5 dark:from-amber-950/20 dark:to-orange-950/10",
      borderHover: "hover:border-amber-500/40",
      glow: "bg-amber-500/5 group-hover:bg-amber-500/10",
      textAccent: "text-amber-650 dark:text-amber-450",
      badgeTone: "yellow" as const,
      borderLine: "border-amber-100/30 dark:border-amber-900/30"
    };
  }
  // Default slate/violet theme
  return {
    gradient: "from-slate-500/5 to-violet-500/5 dark:from-slate-900/20 dark:to-violet-950/10",
    borderHover: "hover:border-violet-500/40",
    glow: "bg-violet-500/5 group-hover:bg-violet-500/10",
    textAccent: "text-violet-650 dark:text-violet-400",
    badgeTone: "slate" as const,
    borderLine: "border-slate-100/30 dark:border-slate-800/30"
  };
};

const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
};

export const StudentDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const { data: tests = [], isLoading: isLoadingTests } = useTests();
  const { data: attempts = [], isLoading: isLoadingAttempts } = useQuery({
    queryKey: ["attempts"],
    queryFn: getAllAttempts,
  });
  const { data: orgData } = useQuery({
    queryKey: ["myOrganization"],
    queryFn: getMyOrganization,
    enabled: Boolean(user),
  });

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [currentTime, setCurrentTime] = useState(new Date().getTime());
  const [activeTab, setActiveTab] = useState<"exams" | "results">("exams");

  // Calendar state management
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [hoveredExams, setHoveredExams] = useState<any[]>([]);
  const [hoveredDateText, setHoveredDateText] = useState<string | null>(null);
  const [hoveredDatePosition, setHoveredDatePosition] = useState<{ x: number; y: number } | null>(null);

  // Generate days in the calendar grid (42 days for prev, current and next padding)
  const calendarData = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const totalDaysPrev = new Date(year, month, 0).getDate();

    const cells: { day: number; date: Date; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = totalDaysPrev - i;
      cells.push({
        day: dayNum,
        date: new Date(year, month - 1, dayNum),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      cells.push({
        day: i,
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month padding (to make exactly 6 rows of 7 days = 42 cells)
    const remainingCells = 42 - cells.length;
    for (let i = 1; i <= remainingCells; i++) {
      cells.push({
        day: i,
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return cells;
  }, [currentCalendarDate]);

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
  };

  const getExamsForDate = (cellDate: Date) => {
    return liveTests.filter((test) => {
      if (!test.start_time) return false;
      const testDate = new Date(test.start_time);
      return (
        testDate.getDate() === cellDate.getDate() &&
        testDate.getMonth() === cellDate.getMonth() &&
        testDate.getFullYear() === cellDate.getFullYear()
      );
    });
  };

  // Keep time ticking to auto-lock/unlock slot buttons (every 1 second for precision)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Only show live tests for students matching their class and who joined before test start time
  const liveTests = useMemo(() => {
    return tests.filter((t) => {
      if (t.status !== "live" || t.class !== user?.class) {
        return false;
      }
      if (t.start_time) {
        const testStart = new Date(t.start_time).getTime();
        const parsedIdTime = (() => {
          const id = user?.id || "";
          if (id.length === 24) {
            const timestampHex = id.substring(0, 8);
            const timestampSec = parseInt(timestampHex, 16);
            if (!isNaN(timestampSec)) return timestampSec * 1000;
          }
          return 0;
        })();
        const studentJoined = user?.joined_at
          ? (parsedIdTime ? Math.min(new Date(user.joined_at).getTime(), parsedIdTime) : new Date(user.joined_at).getTime())
          : parsedIdTime;
        return testStart >= studentJoined;
      }
      return true;
    });
  }, [tests, user]);

  // Filter available subjects dynamically (supports both string and string[])
  const subjects = useMemo(() => {
    const subs = new Set<string>();
    liveTests.forEach((t) => {
      if (Array.isArray(t.subject)) {
        t.subject.forEach((s) => subs.add(s));
      } else if (t.subject) {
        subs.add(t.subject);
      }
    });
    return Array.from(subs);
  }, [liveTests]);

  // Find the latest attempt for each test
  const testAttemptsMap = useMemo(() => {
    const map: Record<string, typeof attempts[0]> = {};
    attempts.forEach((attempt) => {
      // Filter attempts belonging to this student only (safety check)
      if (attempt.user_id === user?.userId) {
        if (!map[attempt.test_id] || new Date(attempt.submitted_at) > new Date(map[attempt.test_id].submitted_at)) {
          map[attempt.test_id] = attempt;
        }
      }
    });
    return map;
  }, [attempts, user]);

  // Filter and sort tests based on user search, subject selection, and attempt status
  const filteredTests = useMemo(() => {
    const filtered = liveTests.filter((test) => {
      const matchesSearch = test.name.toLowerCase().includes(search.toLowerCase());

      let matchesSubject = subjectFilter === "all";
      if (!matchesSubject && test.subject) {
        if (Array.isArray(test.subject)) {
          matchesSubject = test.subject.includes(subjectFilter);
        } else {
          matchesSubject = test.subject === subjectFilter;
        }
      }

      let matchesCalendarDate = true;
      if (selectedCalendarDate && test.start_time) {
        matchesCalendarDate = isSameDay(new Date(test.start_time), selectedCalendarDate);
      }

      return matchesSearch && matchesSubject && matchesCalendarDate;
    });

    const getTestCreationTime = (test: typeof liveTests[0]) => {
      if (test.created_at) {
        return new Date(test.created_at).getTime();
      }
      if (test.id && test.id.startsWith("test-")) {
        const tsStr = test.id.substring(5);
        const ts = parseInt(tsStr, 10);
        if (!isNaN(ts)) return ts;
      }
      return 0;
    };

    return filtered.sort((a, b) => {
      const timeA = getTestCreationTime(a);
      const timeB = getTestCreationTime(b);
      return timeB - timeA;
    });
  }, [liveTests, search, subjectFilter, selectedCalendarDate]);

  // Calculate student statistics
  const stats = useMemo(() => {
    const studentAttempts = attempts.filter(a => a.user_id === user?.userId && tests.some((t) => t.id === a.test_id));
    const testAttempts = new Set(studentAttempts.map(a => a.test_id));
    const uniqueAttemptedCount = testAttempts.size;

    let totalScore = 0;
    let totalMaxMarks = 0;

    studentAttempts.forEach((attempt) => {
      const test = liveTests.find((t) => t.id === attempt.test_id);
      // Only average scores for tests that have had their results released
      if (test && test.results_shared) {
        totalScore += attempt.score;
        totalMaxMarks += test.total_marks;
      }
    });

    const averageAccuracy = uniqueAttemptedCount > 0 && totalMaxMarks > 0
      ? Math.round((totalScore / totalMaxMarks) * 100)
      : 0;

    return {
      attempted: uniqueAttemptedCount,
      accuracy: averageAccuracy,
      available: liveTests.length,
    };
  }, [attempts, liveTests, tests, user]);

  const isLoading = isLoadingTests || isLoadingAttempts;

  // Format datetime
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  };

  const formatHrsMinsSecs = (ms: number) => {
    if (ms <= 0) return "00:00";
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  return (
    <AppShell>
      <PageWrapper>
        {/* Welcome Header */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-6 text-white shadow-2xl md:p-8 border border-white/10">
          {/* Glowing background meshes */}
          <div className="absolute top-[-30%] left-[-10%] w-[50%] h-[80%] rounded-full bg-indigo-500/20 blur-[90px] pointer-events-none" />
          <div className="absolute bottom-[-30%] right-[-10%] w-[55%] h-[80%] rounded-full bg-[#6c7df7]/20 blur-[100px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 w-36 h-36 rounded-full bg-purple-500/15 blur-[60px] animate-pulse pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-300">
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                Parikshya Student Workspace
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
                {orgData?.brandingBannerText || `Welcome back, ${user?.name || "Student"}!`}
              </h1>
              <p className="mt-3 text-sm text-slate-400 max-w-xl leading-relaxed font-medium">
                Elevate your exam preparation. Monitor scheduled slots, attempt mock tests under live security, and trace detailed analytics.
              </p>
              <div className="mt-6 flex flex-wrap gap-3.5">
                <Link
                  to="/analytics"
                  className="inline-flex items-center gap-2 px-5.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-[#6c7df7] text-white hover:scale-[1.03] active:scale-[0.98] hover:shadow-lg hover:shadow-indigo-500/25 text-xs font-bold transition-all duration-300"
                >
                  <TrendingUp className="h-4 w-4" /> View Performance Charts
                </Link>
                <button
                  onClick={() => {
                    const el = document.getElementById("exams-list-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-1.5 px-5.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                >
                  Browse Exams
                </button>
              </div>
            </div>
            
            {/* Visual Profile Avatar Card */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl self-start md:self-center shrink-0 w-full md:w-auto transition-all duration-300 hover:border-white/30 hover:bg-white/15 group">
              <div className="relative flex h-18 w-18 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-orange-500 text-4xl shadow-inner border-2 border-white/30 group-hover:scale-105 transition-transform duration-300">
                🎓
                <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 opacity-20 blur-sm -z-10 animate-pulse" />
              </div>
              <span className="mt-3 text-[10px] font-black tracking-widest uppercase text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 rounded-full px-3 py-1">
                {user?.class || "Class 10"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <section className="mb-8 grid gap-5 sm:grid-cols-3">
          <article className="relative flex items-center gap-4 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-950/20 dark:to-purple-950/10 backdrop-blur-md p-5 shadow-md transition-all duration-300 hover:shadow-indigo-500/15 hover:-translate-y-1 hover:border-indigo-500/50 group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-5 -mt-5 transition-all group-hover:bg-indigo-500/10" />
            <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-indigo-500/10 dark:bg-indigo-950/70 text-indigo-650 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40 group-hover:scale-110 group-hover:rotate-3 transition duration-300 shadow-sm">
              <BookOpen className="h-6.5 w-6.5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Available Tests</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tight">{stats.available}</h3>
            </div>
          </article>

          <article className="relative flex items-center gap-4 rounded-2xl border border-emerald-100/60 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-950/20 dark:to-teal-950/10 backdrop-blur-md p-5 shadow-md transition-all duration-300 hover:shadow-emerald-500/15 hover:-translate-y-1 hover:border-emerald-500/50 group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-5 -mt-5 transition-all group-hover:bg-emerald-500/10" />
            <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-950/70 text-emerald-650 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40 group-hover:scale-110 group-hover:rotate-3 transition duration-300 shadow-sm">
              <CheckCircle2 className="h-6.5 w-6.5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Tests Attempted</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tight">{stats.attempted}</h3>
            </div>
          </article>

          <article className="relative flex items-center gap-4 rounded-2xl border border-amber-100/60 dark:border-amber-900/40 bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-950/20 dark:to-orange-950/10 backdrop-blur-md p-5 shadow-md transition-all duration-300 hover:shadow-amber-500/15 hover:-translate-y-1 hover:border-amber-500/50 group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-5 -mt-5 transition-all group-hover:bg-amber-500/10" />
            <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-955/50 text-amber-650 dark:text-amber-450 border border-amber-200/50 dark:border-amber-800/40 group-hover:scale-110 group-hover:rotate-3 transition duration-300 shadow-sm">
              <Award className="h-6.5 w-6.5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Avg Performance</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tight">{stats.accuracy}%</h3>
            </div>
          </article>
        </section>

        {/* Tab switcher */}
        <div className="mb-8 flex p-1 bg-slate-100/80 dark:bg-slate-900 rounded-2xl max-w-sm border border-slate-200/30 dark:border-slate-800/40 shadow-inner backdrop-blur-sm" id="exams-list-section">
          <button
            onClick={() => setActiveTab("exams")}
            className={`flex-1 py-3 px-5 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === "exams"
                ? "bg-gradient-to-r from-indigo-600 to-[#6c7df7] text-white shadow-lg font-black scale-[1.02]"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:scale-[0.98]"
              }`}
          >
            Available Exams
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`flex-1 py-3 px-5 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === "results"
                ? "bg-gradient-to-r from-indigo-600 to-[#6c7df7] text-white shadow-lg font-black scale-[1.02]"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:scale-[0.98]"
              }`}
          >
            My Test Results
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px] items-start dashboard-grid-layout">
          {/* Left panel: Catalog/Results tabs */}
          <div className="space-y-6 dashboard-main-content">
            {activeTab === "exams" && (
          <>
            {/* Filter Controls */}
            <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md p-4 shadow-sm md:grid-cols-[1fr_240px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  className="pl-10 h-11 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 dark:bg-slate-950 dark:border-slate-800"
                  placeholder="Search by test name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 cursor-pointer font-semibold shadow-sm transition-all"
              >
                <option value="all" className="dark:bg-slate-950 dark:text-slate-300">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub} value={sub} className="dark:bg-slate-950 dark:text-slate-300">
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Test Catalog */}
            <h2 className="mb-5 text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BookOpenCheck className="h-5 w-5 text-indigo-500" />
              {selectedCalendarDate ? (
                <span>Exams for {selectedCalendarDate.toLocaleDateString([], { dateStyle: "medium" })}</span>
              ) : (
                <span>Active Exams & Time Slots</span>
              )}
            </h2>

            {selectedCalendarDate && (
              <div className="mb-6 flex items-center justify-between p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-950/35 bg-indigo-50/30 dark:bg-indigo-950/10 text-xs font-bold text-indigo-650 dark:text-indigo-400 animate-fade-in">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-550 animate-pulse" />
                  Filtering by date: {selectedCalendarDate.toLocaleDateString([], { dateStyle: "long" })}
                </span>
                <button
                  onClick={() => setSelectedCalendarDate(null)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900 transition-colors uppercase text-[9px] font-black tracking-wider"
                >
                  Clear Date Filter
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="flex h-64 items-center justify-center text-slate-500 dark:text-slate-400">
                <Spinner /> <span className="ml-2 font-semibold">Loading exams catalogue...</span>
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/20 py-16 text-center text-slate-500 dark:text-slate-400 backdrop-blur-sm">
                <p className="text-lg font-bold dark:text-slate-300">No tests found</p>
                <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Try adjusting your filters or search term.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 dashboard-cards-grid">
                {filteredTests.map((test) => {
                  const attempt = testAttemptsMap[test.id];
                  const diffLower = (test.difficulty || "").toLowerCase().trim();
                  const difficultyColor =
                    diffLower === "easy" ? "green" :
                      diffLower === "medium" ? "yellow" :
                        (diffLower === "hard" || diffLower === "difficult" ? "red" : "slate");
                  const startTime = test.start_time ? new Date(test.start_time).getTime() : 0;
                  const endTime = test.end_time ? new Date(test.end_time).getTime() : Infinity;
                  const isUpcoming = currentTime < startTime;
                  const isEnded = currentTime > endTime;
                  const isSlotActive = !isUpcoming && !isEnded;
                  const lateLimit = Number(test.lateEntryTime ?? 0);
                  const hasLocalAnswers = localStorage.getItem(`attempt_answers_${test.id}_${user?.userId}`) !== null;
                  const hasSubmittedAttempt = attempt && attempt.status === "submitted";
                  const hasDraftAttempt = attempt && attempt.status === "draft";
                  const hasStartedExam = hasLocalAnswers || hasDraftAttempt;
                  const isLateToStart = !hasSubmittedAttempt && !hasStartedExam && currentTime > (startTime + lateLimit * 60 * 1000);
                  // Start test button is enabled starting 1 minute before start time
                  const canEnterPrep = test.questions && test.questions.length > 0 && currentTime >= (startTime - 60000) && !isEnded && !isLateToStart;

                  const subjectsName = Array.isArray(test.subject) ? test.subject.join(", ") : test.subject;
                  const theme = getSubjectTheme(subjectsName);

                  // Helpers for custom styled pills with Lucide icons
                  const getSubjectBadge = (subj: string) => {
                    const s = (subj || "").toLowerCase();
                    if (s.includes("math")) {
                      return {
                        bg: "bg-purple-50 dark:bg-purple-955/20 border-purple-100 dark:border-purple-900/30 text-purple-700 dark:text-purple-300",
                        icon: <Variable className="h-3.5 w-3.5" />
                      };
                    }
                    if (s.includes("phys") || s.includes("sci")) {
                      return {
                        bg: "bg-amber-50 dark:bg-amber-955/20 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-300",
                        icon: <TrendingUp className="h-3.5 w-3.5" />
                      };
                    }
                    return {
                      bg: "bg-blue-50 dark:bg-blue-955/20 border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300",
                      icon: <BookOpen className="h-3.5 w-3.5" />
                    };
                  };

                  const getDifficultyBadge = (diff: string) => {
                    return {
                      bg: "bg-amber-50 dark:bg-amber-955/20 border-amber-105 dark:border-amber-900/30 text-amber-700 dark:text-amber-300",
                      icon: <Signal className="h-3.5 w-3.5" />
                    };
                  };

                  const getTypeBadge = (t: string) => {
                    return {
                      bg: "bg-blue-50 dark:bg-blue-955/20 border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300",
                      icon: <Compass className="h-3.5 w-3.5" />
                    };
                  };

                  const getSlotStatusBadge = () => {
                    if (isUpcoming) {
                      return (
                        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 w-fit">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          Upcoming
                        </div>
                      );
                    }
                    if (isEnded) {
                      return (
                        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-955/10 text-rose-750 dark:text-rose-305 w-fit">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          Ended
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 w-fit">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Slot Active
                      </div>
                    );
                  };

                  const sb = getSubjectBadge(subjectsName);
                  const db = getDifficultyBadge(test.difficulty);
                  const tb = getTypeBadge(test.type);

                  return (
                    <article
                      key={test.id}
                      className="relative flex flex-col justify-between rounded-3xl border border-slate-200/80 dark:border-slate-805 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden"
                    >
                      <div>
                        {/* Badges row */}
                        <div className="mb-4.5 flex flex-wrap items-center gap-2.5 relative z-10">
                          <span className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${sb.bg}`}>
                            {sb.icon}
                            {subjectsName}
                          </span>
                          <span className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold capitalize ${db.bg}`}>
                            {db.icon}
                            {test.difficulty}
                          </span>
                          <span className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold capitalize ${tb.bg}`}>
                            {tb.icon}
                            {test.type.replace("_", " ")}
                          </span>
                        </div>

                        {/* Slot Active Badge Row */}
                        <div className="mb-4 relative z-10">
                          {getSlotStatusBadge()}
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-black text-slate-850 dark:text-slate-100 mb-2 tracking-tight line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={test.name}>
                          {test.name}
                        </h3>

                        {/* Time Slot Details */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-bold mb-5">
                          <Calendar className="h-4 w-4 text-indigo-500" />
                          <span>Slot: {formatDateTime(test.start_time)} - {formatDateTime(test.end_time)}</span>
                        </div>

                        {/* Statistics Grid */}
                        <div className="mb-4 grid grid-cols-2 border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 rounded-2xl p-4 relative z-10">
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-full mb-2">
                              <FileText className="h-5 w-5" />
                            </div>
                            <span className="font-extrabold text-slate-850 dark:text-slate-200 text-2xl tracking-tight">{test.total_questions}</span>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">QUESTIONS</span>
                          </div>
                          <div className="w-px h-16 bg-slate-100 dark:bg-slate-800/80 self-center absolute left-1/2 -translate-x-1/2" />
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-955/40 text-blue-600 dark:text-blue-400 rounded-full mb-2">
                              <Award className="h-5 w-5" />
                            </div>
                            <span className="font-extrabold text-slate-850 dark:text-slate-200 text-2xl tracking-tight">{test.total_marks}</span>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">MARKS</span>
                          </div>
                        </div>

                        {/* Duration and Late Entry Details */}
                        <div className="mb-4 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 space-y-3.5 bg-white/40 dark:bg-slate-900/10 relative z-10 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold">
                              <div className="p-1.5 bg-blue-50 dark:bg-blue-955/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                <Clock className="h-3.5 w-3.5" />
                              </div>
                              <span>Duration</span>
                            </div>
                            <span className="text-slate-850 dark:text-slate-200 font-extrabold">{test.total_time} Minutes</span>
                          </div>
                          <div className="h-px bg-slate-100 dark:bg-slate-800/60" />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold">
                              <div className="p-1.5 bg-purple-50 dark:bg-purple-955/30 text-purple-600 dark:text-purple-400 rounded-lg">
                                <UserCheck className="h-3.5 w-3.5" />
                              </div>
                              <span>Late Entry</span>
                            </div>
                            <span className="text-slate-850 dark:text-slate-200 font-extrabold">{test.lateEntryTime ?? 0} Minutes</span>
                          </div>
                        </div>
                      </div>

                      {/* Late Entry Countdown Timer */}
                      {(() => {
                        const limitMins = Number(test.lateEntryTime ?? 0);
                        if (limitMins <= 0) return null;
                        if (hasSubmittedAttempt || hasStartedExam) return null;

                        const cutoffTime = startTime + limitMins * 60 * 1000;
                        const hasEndedCutoff = currentTime >= cutoffTime;

                        const themeColors = hasEndedCutoff
                          ? {
                              border: "border-rose-100 dark:border-rose-950/40",
                              bg: "bg-rose-50/50 dark:bg-rose-955/5",
                              iconBg: "bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
                              label: "text-rose-500 dark:text-rose-400",
                              val: "text-rose-600 dark:text-rose-405",
                            }
                          : {
                              border: "border-amber-100 dark:border-amber-900/30",
                              bg: "bg-amber-50/50 dark:bg-amber-955/5",
                              iconBg: "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
                              label: "text-amber-600 dark:text-amber-400",
                              val: "text-amber-700 dark:text-amber-300 animate-pulse",
                            };

                        return (
                          <div className={`flex items-center gap-3.5 p-3.5 rounded-2xl border ${themeColors.border} ${themeColors.bg} mb-4 relative z-10 font-bold`}>
                            <div className={`p-2.5 rounded-full shrink-0 ${themeColors.iconBg}`}>
                              <Timer className="h-5 w-5 animate-pulse" />
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${themeColors.label}`}>
                                Late Entry Ends In
                              </span>
                              <span className={`text-base font-black tracking-tight tabular-nums ${themeColors.val}`}>
                                {hasEndedCutoff ? 'Late Entry Closed' : formatHrsMinsSecs(cutoffTime - currentTime)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-slate-800/80 border-dashed gap-4 relative z-10">
                        <div>
                          {hasSubmittedAttempt ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              {test.results_shared
                                ? `Score: ${attempt.score}/${test.total_marks}`
                                : "Completed"}
                            </div>
                          ) : (
                            <div className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl border ${
                              hasStartedExam 
                                ? "text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-955/20 border-amber-100 dark:border-amber-900/30 animate-pulse"
                                : "text-slate-450 dark:text-slate-500 bg-white dark:bg-slate-900/30 border-slate-205 dark:border-slate-800"
                            }`}>
                              {!hasStartedExam && <Lock className="h-4 w-4 shrink-0 text-slate-400" />}
                              <span>
                                {hasStartedExam ? "In Progress" : isUpcoming ? "Starts soon" : isEnded ? "Time ended" : isLateToStart ? "Late Entry Closed" : "Not attempted"}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          {hasSubmittedAttempt ? (
                            test.results_shared ? (
                              <Link to={`/tests/${test.id}/result`}>
                                <Button variant="secondary" className="h-11 text-xs font-extrabold px-5 rounded-xl border-slate-205 dark:border-slate-800 hover:border-indigo-500 hover:text-indigo-650 dark:hover:text-indigo-400 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300">
                                  View Scorecard
                                </Button>
                              </Link>
                            ) : (
                              <Button disabled variant="secondary" className="h-11 text-xs font-bold px-5 text-slate-400 dark:text-slate-550 bg-slate-50 dark:bg-slate-900/40 cursor-not-allowed rounded-xl border-slate-205 dark:border-slate-800">
                                Waiting for Results
                              </Button>
                            )
                          ) : (
                            canEnterPrep || hasDraftAttempt ? (
                              <Link to={`/tests/${test.id}/attempt`}>
                                <Button className="h-11 text-xs font-extrabold px-5 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 rounded-xl text-white border-none">
                                  {hasStartedExam ? "Resume Test" : "Start Test"}
                                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </Button>
                              </Link>
                            ) : (
                              <Button disabled className="h-11 text-xs font-extrabold px-5 bg-indigo-600/90 dark:bg-indigo-700/80 text-white border-none rounded-xl cursor-not-allowed flex items-center gap-1.5 shadow-sm">
                                <Lock className="h-4 w-4" />
                                {isUpcoming ? "Starts In" : isEnded ? "Closed" : isLateToStart ? "Late Entry Closed" : "No Questions"}
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "results" && (
          <div className="space-y-4">
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-5">
              <Award className="h-5 w-5 text-indigo-500" />
              {selectedCalendarDate ? (
                <span>Results for {selectedCalendarDate.toLocaleDateString([], { dateStyle: "medium" })}</span>
              ) : (
                <span>Completed Test Performance</span>
              )}
            </h2>

            {selectedCalendarDate && (
              <div className="mb-6 flex items-center justify-between p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-950/35 bg-indigo-50/30 dark:bg-indigo-950/10 text-xs font-bold text-indigo-650 dark:text-indigo-400 animate-fade-in">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-550 animate-pulse" />
                  Filtering by date: {selectedCalendarDate.toLocaleDateString([], { dateStyle: "long" })}
                </span>
                <button
                  onClick={() => setSelectedCalendarDate(null)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900 transition-colors uppercase text-[9px] font-black tracking-wider"
                >
                  Clear Date Filter
                </button>
              </div>
            )}

            {(() => {
              const studentAttempts = attempts.filter((a) => {
                if (a.user_id !== user?.userId) return false;
                const test = tests.find((t) => t.id === a.test_id);
                if (!test) return false;

                // Match search
                const testName = (a.test_name || test.name || "").toLowerCase();
                const matchesSearch = testName.includes(search.toLowerCase());

                // Match subject
                let matchesSubject = subjectFilter === "all";
                if (!matchesSubject && test.subject) {
                  if (Array.isArray(test.subject)) {
                    matchesSubject = test.subject.includes(subjectFilter);
                  } else {
                    matchesSubject = test.subject === subjectFilter;
                  }
                }

                // Match selected calendar date (using attempt submitted_at time)
                let matchesCalendarDate = true;
                if (selectedCalendarDate && a.submitted_at) {
                  matchesCalendarDate = isSameDay(new Date(a.submitted_at), selectedCalendarDate);
                }

                if (!matchesSearch || !matchesSubject || !matchesCalendarDate) return false;

                if (test.start_time) {
                  const testStart = new Date(test.start_time).getTime();
                  const parsedIdTime = (() => {
                    const id = user?.id || "";
                    if (id.length === 24) {
                      const timestampHex = id.substring(0, 8);
                      const timestampSec = parseInt(timestampHex, 16);
                      if (!isNaN(timestampSec)) return timestampSec * 1000;
                    }
                    return 0;
                  })();
                  const studentJoined = user?.joined_at
                    ? (parsedIdTime ? Math.min(new Date(user.joined_at).getTime(), parsedIdTime) : new Date(user.joined_at).getTime())
                    : parsedIdTime;
                  return testStart >= studentJoined;
                }
                return true;
              });

              if (studentAttempts.length === 0) {
                return (
                  <div className="rounded-2xl border border-dashed border-slate-350 dark:border-slate-850 bg-white/50 dark:bg-slate-900/20 py-16 text-center text-slate-500 dark:text-slate-400 backdrop-blur-sm">
                    <p className="text-lg font-bold dark:text-slate-350">No results found</p>
                    <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">You haven't completed any exams yet. Go attempt active tests!</p>
                  </div>
                );
              }

              const sortedAttempts = [...studentAttempts].sort((a, b) => {
                return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
              });

              return (
                <div className="grid gap-6 md:grid-cols-2 dashboard-cards-grid">
                  {sortedAttempts.map((attempt) => {
                    const test = tests.find((t) => t.id === attempt.test_id);
                    const totalMarks = test?.total_marks ?? attempt.total_marks ?? attempt.score;
                    const subjectsName = test ? (Array.isArray(test.subject) ? test.subject.join(", ") : test.subject) : "General";
                    const formattedDate = new Date(attempt.submitted_at).toLocaleDateString([], {
                      dateStyle: "medium",
                    });

                    const theme = getSubjectTheme(subjectsName);

                    const diffLower = test ? (test.difficulty || "").toLowerCase().trim() : "";
                    const difficultyColor =
                      diffLower === "easy" ? "green" :
                        diffLower === "medium" ? "yellow" :
                          (diffLower === "hard" || diffLower === "difficult" ? "red" : "slate");

                    return (
                      <article
                        key={attempt.id}
                        className={`relative flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/85 bg-gradient-to-br ${theme.gradient} bg-white/70 dark:bg-slate-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 ${theme.borderHover} dark:hover:shadow-slate-950/80 transition-all duration-300 group overflow-hidden`}
                      >
                        {/* Gradient glow behind the card */}
                        <div className={`absolute top-0 left-0 w-32 h-32 ${theme.glow} rounded-full blur-3xl -ml-10 -mt-10 transition-colors pointer-events-none`} />

                        <div>
                          <div className="mb-4 flex flex-wrap items-center gap-2 relative z-10">
                            <Badge tone={theme.badgeTone} className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md">{subjectsName}</Badge>
                            {test && (
                              <Badge tone={difficultyColor} className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md">{test.difficulty}</Badge>
                            )}
                            <Badge tone="green" className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md">Attempt Completed</Badge>
                          </div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight line-clamp-1 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors" title={attempt.test_name || test?.name}>
                            {attempt.test_name || test?.name || "Exam Attempt"}
                          </h3>
                          <div className="text-xs text-slate-400 dark:text-slate-500 space-y-1.5 mb-5 font-bold">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span>Submitted: <span className="font-extrabold text-slate-700 dark:text-slate-350">{formattedDate}</span></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span>Duration: <span className="font-extrabold text-slate-700 dark:text-slate-350">{Math.floor(attempt.time_spent / 60)}m {attempt.time_spent % 60}s</span></span>
                            </div>
                          </div>
                          <div className={`flex items-center justify-between border-t ${theme.borderLine} pt-4 mt-2 relative z-10`}>
                            <div>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-black tracking-wider">Marks Scored</span>
                              <span className="text-lg font-black text-indigo-650 dark:text-indigo-400">
                                {test?.results_shared ? `${attempt.score} / ${totalMarks}` : "Pending"}
                              </span>
                            </div>
                            {test?.results_shared ? (
                              <Link to={`/tests/${attempt.test_id}/result`}>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9.5 px-4 font-bold rounded-xl hover:scale-[1.03] active:scale-[0.98] transition-all border-none">
                                  View Scorecard
                                </Button>
                              </Link>
                            ) : (
                              <Button disabled variant="secondary" className="text-slate-400 dark:text-slate-500 text-xs h-9.5 px-4 cursor-not-allowed rounded-xl">
                                Results Pending
                              </Button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
          </div>

          {/* Right panel: custom calendar */}
          <aside className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md p-5 shadow-sm sticky top-[88px] relative z-10 dashboard-calendar-sidebar">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-500" />
                Exam Calendar
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 min-w-[70px] text-center tracking-wider">
                  {currentCalendarDate.toLocaleString([], { month: "short", year: "numeric" })}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 mb-2.5" />

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarData.map((cell, idx) => {
                const dayExams = getExamsForDate(cell.date);
                const hasExams = dayExams.length > 0;
                const isTodayStr = new Date().toDateString() === cell.date.toDateString();
                const isSelected = selectedCalendarDate && isSameDay(selectedCalendarDate, cell.date);

                let cellClass = "aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition-all relative cursor-pointer active:scale-95 select-none";
                let textClass = "font-bold";

                if (isSelected) {
                  cellClass += " bg-gradient-to-br from-indigo-600 to-[#6c7df7] shadow-lg shadow-indigo-500/25 scale-105 ring-2 ring-indigo-450 dark:ring-indigo-600 z-10";
                  textClass = "text-white font-black";
                } else if (isTodayStr) {
                  cellClass += " border-2 border-indigo-550 dark:border-indigo-400 bg-indigo-550/5 dark:bg-indigo-500/10";
                  textClass = "text-indigo-600 dark:text-indigo-400 font-black";
                } else if (hasExams) {
                  cellClass += " bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-150/20 dark:border-indigo-900/25 hover:bg-indigo-550/15 dark:hover:bg-indigo-500/25";
                  textClass = cell.isCurrentMonth ? "text-slate-800 dark:text-slate-200" : "text-slate-350 dark:text-slate-650";
                } else {
                  cellClass += " hover:bg-slate-50 dark:hover:bg-slate-800/30";
                  textClass = cell.isCurrentMonth ? "text-slate-600 dark:text-slate-450" : "text-slate-300 dark:text-slate-700";
                }

                const getDotColor = (exam: any) => {
                  const subjectName = Array.isArray(exam.subject) ? exam.subject.join(", ") : exam.subject;
                  const theme = getSubjectTheme(subjectName);
                  switch (theme.badgeTone) {
                    case "blue":
                      return "bg-blue-500 dark:bg-blue-400";
                    case "green":
                      return "bg-emerald-500 dark:bg-emerald-400";
                    case "yellow":
                      return "bg-amber-500 dark:bg-amber-400";
                    case "slate":
                      return "bg-violet-500 dark:bg-violet-400";
                    default:
                      return "bg-indigo-500 dark:bg-indigo-400";
                  }
                };

                return (
                  <div
                    key={idx}
                    className={cellClass}
                    onClick={() => {
                      setSelectedCalendarDate(isSelected ? null : cell.date);
                    }}
                    onMouseEnter={(e) => {
                      if (hasExams) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredExams(dayExams);
                        setHoveredDateText(cell.date.toLocaleDateString([], { dateStyle: "medium" }));
                        setHoveredDatePosition({
                          x: rect.left + window.scrollX + rect.width / 2,
                          y: rect.top + window.scrollY - 8
                        });
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredExams([]);
                      setHoveredDateText(null);
                      setHoveredDatePosition(null);
                    }}
                  >
                    <span className={textClass}>{cell.day}</span>
                    {hasExams && (
                      <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full animate-pulse ${
                        isSelected ? "bg-white animate-none" : getDotColor(dayExams[0])
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend & Details */}
            <div className="mt-4 pt-3 border-t border-slate-150 dark:border-slate-800/80 flex items-center justify-between text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span>Exam Scheduled</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full border border-indigo-500 bg-indigo-550/5 dark:bg-indigo-500/10" />
                <span>Today</span>
              </div>
            </div>

            {selectedCalendarDate && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <span>Exams on this date</span>
                  <button 
                    onClick={() => setSelectedCalendarDate(null)}
                    className="text-indigo-500 hover:text-indigo-650 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline cursor-pointer font-bold text-[9px]"
                  >
                    Clear Filter
                  </button>
                </div>
                {getExamsForDate(selectedCalendarDate).length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {getExamsForDate(selectedCalendarDate).map((exam, index) => {
                      const theme = getSubjectTheme(Array.isArray(exam.subject) ? exam.subject.join(", ") : exam.subject);
                      const startTime = exam.start_time ? new Date(exam.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                      const subjectName = Array.isArray(exam.subject) ? exam.subject.join(", ") : exam.subject;
                      return (
                        <div 
                          key={exam.id || index} 
                          className="p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-500/40 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                              {exam.name}
                            </span>
                            <Badge tone={theme.badgeTone} className="font-extrabold text-[8px] px-1.5 py-0.5 rounded-md shrink-0">
                              {subjectName}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-505 dark:text-slate-400 font-bold mt-1.5">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {exam.total_time}m
                            </span>
                            {startTime && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                {startTime}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-[10px] font-bold text-slate-400 dark:text-slate-550">
                    No exams scheduled for this date.
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </PageWrapper>
      {/* Floating Hover Details Popover */}
      {hoveredExams.length > 0 && hoveredDatePosition && (
        <div
          className="absolute z-50 w-72 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md p-4 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-200 animate-fade-in"
          style={{
            left: `${hoveredDatePosition.x}px`,
            top: `${hoveredDatePosition.y}px`
          }}
        >
          <div className="mb-2.5 pb-1.5 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
            <span>Scheduled Exam Details</span>
            <span className="text-indigo-500 dark:text-indigo-400">{hoveredDateText}</span>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {hoveredExams.map((exam, index) => {
              const theme = getSubjectTheme(Array.isArray(exam.subject) ? exam.subject.join(", ") : exam.subject);
              const startTime = exam.start_time ? new Date(exam.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
              const endTime = exam.end_time ? new Date(exam.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
              const subjectName = Array.isArray(exam.subject) ? exam.subject.join(", ") : exam.subject;
              return (
                <div key={exam.id || index} className="space-y-1">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 line-clamp-1">
                    {exam.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={theme.badgeTone} className="font-extrabold text-[9px] px-1.5 py-0.5 rounded-md">
                      {subjectName}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold pt-1.5">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>{exam.total_time} mins</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="h-3 w-3 text-slate-400" />
                      <span>{exam.total_marks} Marks</span>
                    </div>
                    {startTime && (
                      <div className="flex items-center gap-1 col-span-2">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>Time: {startTime} - {endTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-950 border-r border-b border-slate-200/80 dark:border-slate-800 rotate-45 pointer-events-none" />
        </div>
      )}
    </AppShell>
  );
};
