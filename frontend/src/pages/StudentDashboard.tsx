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

  // Keep time ticking to auto-lock/unlock slot buttons
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().getTime());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Only show live tests for students matching their class
  const liveTests = useMemo(() => {
    return tests.filter((t) => t.status === "live" && t.class === user?.class);
  }, [tests, user?.class]);

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
      const attemptA = testAttemptsMap[a.id] !== undefined;
      const attemptB = testAttemptsMap[b.id] !== undefined;

      // Unattempted tests come before attempted ones
      if (!attemptA && attemptB) return -1;
      if (attemptA && !attemptB) return 1;

      const timeA = getTestCreationTime(a);
      const timeB = b ? getTestCreationTime(b) : 0; // standard type safety

      if (!attemptA && !attemptB) {
        // Both unattempted: descending order (newest first)
        return timeB - timeA;
      } else {
        // Both attempted: ascending order (older first)
        return timeA - timeB;
      }
    });
  }, [liveTests, search, subjectFilter, testAttemptsMap]);

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
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-[#6c7df7] to-[#8d9cfc] p-6 text-white shadow-lg md:p-8">
          <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-100">
                <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                Parikshya Student Portal
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Welcome back, {user?.name || "Student"}!
              </h1>
              <p className="mt-2 text-sm text-indigo-100 max-w-xl">
                Boost your exam prep! Test your knowledge on live topics, track your detailed progress, and review your performance analysis instantly.
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  to="/analytics"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-indigo-600 hover:bg-slate-50 text-xs font-bold shadow-sm transition"
                >
                  <TrendingUp className="h-4 w-4 text-indigo-500" /> View Analytics & Charts
                </Link>
              </div>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-4xl">
              🙂
            </div>
          </div>
          <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute -top-8 -left-8 h-42 w-42 rounded-full bg-white/5" />
        </div>

        {/* Stats Grid */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <article className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Available Tests</p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.available}</h3>
            </div>
          </article>
          
          <article className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tests Attempted</p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.attempted}</h3>
            </div>
          </article>

          <article className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Average Performance</p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.accuracy}%</h3>
            </div>
          </article>
        </section>

        {/* Tab switcher */}
        <div className="mb-6 flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("exams")}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-all duration-200 ${
              activeTab === "exams"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            Available Exams
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-all duration-200 ${
              activeTab === "results"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            My Test Results
          </button>
        </div>

        {activeTab === "exams" && (
          <>
            {/* Filter Controls */}
            <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm md:grid-cols-[1fr_240px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  className="pl-10 h-11"
                  placeholder="Search by test name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="h-11 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all" className="dark:bg-slate-900 dark:text-slate-300">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub} value={sub} className="dark:bg-slate-900 dark:text-slate-300">
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Test Catalog */}
            <h2 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BookOpenCheck className="h-5 w-5 text-indigo-500" />
              Active Exams & Time Slots
            </h2>

            {isLoading ? (
              <div className="flex h-64 items-center justify-center text-slate-500 dark:text-slate-400">
                <Spinner /> <span className="ml-2">Loading exams catalogue...</span>
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 text-center text-slate-500 dark:text-slate-400">
                <p className="text-lg font-medium dark:text-slate-300">No tests found</p>
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

                  // Check slots
                  const startTime = test.start_time ? new Date(test.start_time).getTime() : 0;
                  const endTime = test.end_time ? new Date(test.end_time).getTime() : Infinity;
                  const isUpcoming = currentTime < startTime;
                  const isEnded = currentTime > endTime;
                  const isSlotActive = !isUpcoming && !isEnded;

                  const subjectsName = Array.isArray(test.subject) ? test.subject.join(", ") : test.subject;

                  return (
                    <article
                      key={test.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-slate-950/40 duration-200"
                    >
                      <div>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge tone="blue">{subjectsName}</Badge>
                          <Badge tone={difficultyColor}>{test.difficulty}</Badge>
                          <Badge tone="slate">{test.type.replace("_", " ")}</Badge>
                          
                          {/* Slot Badge */}
                          {isUpcoming ? (
                            <Badge tone="blue">Upcoming</Badge>
                          ) : isEnded ? (
                            <Badge tone="red">Ended</Badge>
                          ) : (
                            <Badge tone="green">Slot Active</Badge>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 line-clamp-1">{test.name}</h3>

                        {/* Time Slot Details */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-semibold mb-3">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>Slot: {formatDateTime(test.start_time)} - {formatDateTime(test.end_time)}</span>
                        </div>

                        <div className="mb-5 grid grid-cols-3 gap-2 text-xs text-slate-500 dark:text-slate-400 border-y border-slate-100 dark:border-slate-800 py-3 mt-4">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-slate-700 dark:text-slate-350">{test.total_questions}</span>
                            <span>Questions</span>
                          </div>
                          <div className="flex flex-col items-center border-x border-slate-100 dark:border-slate-800">
                            <span className="font-semibold text-slate-700 dark:text-slate-350 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {test.total_time}m
                            </span>
                            <span>Duration</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-slate-700 dark:text-slate-350">{test.total_marks}</span>
                            <span>Marks</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 border-dashed gap-4">
                        <div>
                          {attempt ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" />
                              {test.results_shared 
                                ? `Attempted (Score: ${attempt.score}/${test.total_marks})` 
                                : "Attempted (Results Pending)"}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {isUpcoming ? "Test starts soon" : isEnded ? "Test time ended" : "Not attempted yet"}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {attempt ? (
                            test.results_shared ? (
                              <Link to={`/tests/${test.id}/result`}>
                                <Button variant="secondary" className="h-9 text-xs px-3.5">
                                  View Scorecard
                                </Button>
                              </Link>
                            ) : (
                              <Button disabled variant="secondary" className="h-9 text-xs px-3.5 text-slate-400 dark:text-slate-555 cursor-not-allowed">
                                Results Pending
                              </Button>
                            )
                          ) : (
                            isSlotActive && test.questions && test.questions.length > 0 ? (
                              <Link to={`/tests/${test.id}/attempt`}>
                                <Button className="h-9 text-xs px-4 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                                  Start Test
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            ) : (
                              <Button disabled className="h-9 text-xs px-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-transparent">
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
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-indigo-500" />
              Completed Test Performance
            </h2>
            {attempts.filter(a => a.user_id === user?.userId).length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-850 bg-white dark:bg-slate-900 py-16 text-center text-slate-500 dark:text-slate-400">
                <p className="text-lg font-medium dark:text-slate-350">No results found</p>
                <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">You haven't completed any exams yet. Go attempt active tests!</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {(() => {
                  const studentAttempts = attempts.filter((a) => a.user_id === user?.userId);

                  const getTestCreationTime = (testId: string) => {
                    const test = tests.find((t) => t.id === testId);
                    if (!test) return 0;
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

                  const timestamps = studentAttempts.map((a) => getTestCreationTime(a.test_id));
                  const maxTime = timestamps.length > 0 ? Math.max(...timestamps) : 0;

                  const sortedAttempts = [...studentAttempts].sort((a, b) => {
                    const timeA = getTestCreationTime(a.test_id);
                    const timeB = getTestCreationTime(b.test_id);

                    const isA_Newest = timeA === maxTime && maxTime > 0;
                    const isB_Newest = timeB === maxTime && maxTime > 0;

                    if (isA_Newest && !isB_Newest) return -1;
                    if (!isA_Newest && isB_Newest) return 1;

                    return timeA - timeB;
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
                        className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:shadow-md duration-200"
                      >
                        <div>
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge tone="blue">{subjectsName}</Badge>
                            <Badge tone="green">Attempt Completed</Badge>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{attempt.test_name || test?.name || "Exam Attempt"}</h3>
                          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mb-4">
                            <div>Submitted on: <span className="font-semibold text-slate-700 dark:text-slate-350">{formattedDate}</span></div>
                            <div>Time Spent: <span className="font-semibold text-slate-700 dark:text-slate-350">{Math.floor(attempt.time_spent / 60)}m {attempt.time_spent % 60}s</span></div>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                            <div>
                              <span className="text-xs text-slate-400 dark:text-slate-500 block uppercase font-bold">Marks Scored</span>
                              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                                {test?.results_shared ? `${attempt.score} / ${totalMarks}` : "Pending"}
                              </span>
                            </div>
                            {test?.results_shared ? (
                              <Link to={`/tests/${attempt.test_id}/result`}>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4">
                                  View Scorecard & Responses
                                </Button>
                              </Link>
                            ) : (
                              <Button disabled variant="secondary" className="text-slate-400 dark:text-slate-500 text-xs h-9 px-4 cursor-not-allowed">
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
