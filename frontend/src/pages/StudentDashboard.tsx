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
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Spinner } from "../components/ui/Spinner";
import { getAllAttempts } from "../services/api";
import { useTests } from "../hooks/useTests";
import { useAuthStore } from "../store/authStore";

export const StudentDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const { data: tests = [], isLoading: isLoadingTests } = useTests();
  const { data: attempts = [], isLoading: isLoadingAttempts } = useQuery({
    queryKey: ["attempts"],
    queryFn: getAllAttempts,
  });

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [currentTime, setCurrentTime] = useState(new Date().getTime());
  const [activeTab, setActiveTab] = useState<"exams" | "results">("exams");

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

      return matchesSearch && matchesSubject;
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
  }, [liveTests, search, subjectFilter]);

  // Calculate student statistics
  const stats = useMemo(() => {
    const studentAttempts = attempts.filter(a => a.user_id === user?.userId);
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
  }, [attempts, liveTests, user]);

  const isLoading = isLoadingTests || isLoadingAttempts;

  // Format datetime
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
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
                Welcome back, {user?.name || "Student"}!
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
          <article className="relative flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md p-5 shadow-md transition-all duration-300 hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/5 hover:-translate-y-1 hover:border-indigo-500/35 group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-5 -mt-5 transition-all group-hover:bg-indigo-500/10" />
            <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30 group-hover:scale-110 group-hover:rotate-3 transition duration-300">
              <BookOpen className="h-6.5 w-6.5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Available Tests</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tight">{stats.available}</h3>
            </div>
          </article>

          <article className="relative flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md p-5 shadow-md transition-all duration-300 hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/5 hover:-translate-y-1 hover:border-emerald-500/35 group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-5 -mt-5 transition-all group-hover:bg-emerald-500/10" />
            <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-650 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30 group-hover:scale-110 group-hover:rotate-3 transition duration-300">
              <CheckCircle2 className="h-6.5 w-6.5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Tests Attempted</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tight">{stats.attempted}</h3>
            </div>
          </article>

          <article className="relative flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md p-5 shadow-md transition-all duration-300 hover:shadow-amber-500/10 dark:hover:shadow-amber-500/5 hover:-translate-y-1 hover:border-amber-500/35 group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-5 -mt-5 transition-all group-hover:bg-amber-500/10" />
            <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-955/40 text-amber-650 dark:text-amber-450 border border-amber-100/50 dark:border-amber-900/30 group-hover:scale-110 group-hover:rotate-3 transition duration-300">
              <Award className="h-6.5 w-6.5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Avg Performance</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tight">{stats.accuracy}%</h3>
            </div>
          </article>
        </section>

        {/* Tab switcher */}
        <div className="mb-8 flex p-1 bg-slate-100/80 dark:bg-slate-905 rounded-2xl max-w-sm border border-slate-200/30 dark:border-slate-800/40 shadow-inner backdrop-blur-sm" id="exams-list-section">
          <button
            onClick={() => setActiveTab("exams")}
            className={`flex-1 py-3 px-5 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === "exams"
                ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-md font-extrabold scale-[1.02]"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:scale-[0.98]"
              }`}
          >
            Available Exams
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`flex-1 py-3 px-5 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === "results"
                ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-md font-extrabold scale-[1.02]"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:scale-[0.98]"
              }`}
          >
            My Test Results
          </button>
        </div>

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
              Active Exams & Time Slots
            </h2>

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
              <div className="grid gap-6 md:grid-cols-2">
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
                  // Start test button is enabled starting 1 minute before start time
                  const canEnterPrep = test.questions && test.questions.length > 0 && currentTime >= (startTime - 60000) && !isEnded;

                  const subjectsName = Array.isArray(test.subject) ? test.subject.join(", ") : test.subject;

                  return (
                    <article
                      key={test.id}
                      className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/30 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-500/30 dark:hover:shadow-slate-950/80 transition-all duration-300 group overflow-hidden"
                    >
                      {/* Gradient glow behind the card */}
                      <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -ml-10 -mt-10 group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
                      
                      <div>
                        <div className="mb-4.5 flex flex-wrap items-center gap-2 relative z-10">
                          <Badge tone="blue" className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md">{subjectsName}</Badge>
                          <Badge tone={difficultyColor} className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md">{test.difficulty}</Badge>
                          <Badge tone="slate" className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md">{test.type.replace("_", " ")}</Badge>

                          {/* Slot Status Badge */}
                          {isUpcoming ? (
                            <Badge tone="blue" className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md">Upcoming</Badge>
                          ) : isEnded ? (
                            <Badge tone="red" className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md">Ended</Badge>
                          ) : (
                            <Badge tone="green" className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md animate-pulse">Slot Active</Badge>
                          )}
                        </div>

                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={test.name}>
                          {test.name}
                        </h3>

                        {/* Time Slot Details */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-bold mb-4">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>Slot: {formatDateTime(test.start_time)} - {formatDateTime(test.end_time)}</span>
                        </div>

                        <div className="mb-5 grid grid-cols-3 gap-2 text-xs text-slate-500 dark:text-slate-400 border-y border-slate-100 dark:border-slate-800/50 py-3.5 mt-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl px-2.5">
                          <div className="flex flex-col items-center">
                            <span className="font-black text-slate-800 dark:text-slate-200 text-sm">{test.total_questions}</span>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">Questions</span>
                          </div>
                          <div className="flex flex-col items-center border-x border-slate-100 dark:border-slate-800/50">
                            <span className="font-black text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {test.total_time}m
                            </span>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">Duration</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="font-black text-slate-800 dark:text-slate-200 text-sm">{test.total_marks}</span>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">Marks</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-slate-800/80 border-dashed gap-4 relative z-10">
                        <div>
                          {attempt ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              {test.results_shared
                                ? `Score: ${attempt.score}/${test.total_marks}`
                                : "Completed"}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-bold bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-800/40">
                              {isUpcoming ? "Starts soon" : isEnded ? "Time ended" : "Not attempted"}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          {attempt ? (
                            test.results_shared ? (
                              <Link to={`/tests/${test.id}/result`}>
                                <Button variant="secondary" className="h-9.5 text-xs font-bold px-4 rounded-xl border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:text-indigo-650 dark:hover:text-indigo-400 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300">
                                  View Scorecard
                                </Button>
                              </Link>
                            ) : (
                              <Button disabled variant="secondary" className="h-9.5 text-xs font-bold px-4 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/40 cursor-not-allowed rounded-xl border-slate-200 dark:border-slate-800">
                                Results Pending
                              </Button>
                            )
                          ) : (
                            canEnterPrep ? (
                              <Link to={`/tests/${test.id}/attempt`}>
                                <Button className="h-9.5 text-xs font-extrabold px-4 flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-[#6c7df7] hover:scale-[1.05] active:scale-[0.98] transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 rounded-xl text-white border-none">
                                  Start Exam
                                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </Button>
                              </Link>
                            ) : (
                              <Button disabled className="h-9.5 text-xs font-bold px-4 bg-slate-50 dark:bg-slate-905 text-slate-350 dark:text-slate-650 border-slate-100 dark:border-slate-850 rounded-xl cursor-not-allowed">
                                {isUpcoming ? "Upcoming" : isEnded ? "Closed" : "No Questions"}
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
              Completed Test Performance
            </h2>
            {attempts.filter(a => a.user_id === user?.userId).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-350 dark:border-slate-850 bg-white/50 dark:bg-slate-900/20 py-16 text-center text-slate-500 dark:text-slate-400 backdrop-blur-sm">
                <p className="text-lg font-bold dark:text-slate-350">No results found</p>
                <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">You haven't completed any exams yet. Go attempt active tests!</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {(() => {
                  const studentAttempts = attempts.filter((a) => {
                    if (a.user_id !== user?.userId) return false;
                    const test = tests.find((t) => t.id === a.test_id);
                    if (test && test.start_time) {
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

                  const sortedAttempts = [...studentAttempts].sort((a, b) => {
                    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
                  });

                  return sortedAttempts.map((attempt) => {
                    const test = tests.find((t) => t.id === attempt.test_id);
                    const totalMarks = test?.total_marks ?? attempt.total_marks ?? attempt.score;
                    const subjectsName = test ? (Array.isArray(test.subject) ? test.subject.join(", ") : test.subject) : "General";
                    const formattedDate = new Date(attempt.submitted_at).toLocaleDateString([], {
                      dateStyle: "medium",
                    });

                    return (
                      <article
                        key={attempt.id}
                        className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/85 bg-white/80 dark:bg-slate-900/30 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-500/30 dark:hover:shadow-slate-950/80 transition-all duration-300 group overflow-hidden"
                      >
                        {/* Gradient glow behind the card */}
                        <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -ml-10 -mt-10 group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />

                        <div>
                          <div className="mb-4 flex flex-wrap items-center gap-2 relative z-10">
                            <Badge tone="blue" className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md">{subjectsName}</Badge>
                            <Badge tone="green" className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md">Attempt Completed</Badge>
                          </div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight line-clamp-1 group-hover:text-[#6c7df7] transition-colors" title={attempt.test_name || test?.name}>
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
                          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-4 mt-2 relative z-10">
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
                  });
                })()}
              </div>
            )}
          </div>
        )}
      </PageWrapper>
    </AppShell>
  );
};
