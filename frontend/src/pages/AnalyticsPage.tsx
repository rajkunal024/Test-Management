import { useMemo, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Activity,
  Award,
  Clock,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  Sparkles,
  Filter,
  Trophy,
  Zap,
  Target,
  Lightbulb,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { getAllAttempts, getAllTests } from "../services/api";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Spinner } from "../components/ui/Spinner";
import { useAuthStore } from "../store/authStore";

export const AnalyticsPage = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // Filters State
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [timePeriod, setTimePeriod] = useState<string>("All"); // "All" | "5" | "10"
  const [showTargetLine, setShowTargetLine] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    name: string;
    score: number;
    testName: string;
    correct: number;
    wrong: number;
  } | null>(null);

  useEffect(() => {
    if (user && user.role !== "Student") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Fetch Attempts
  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["attempts"],
    queryFn: getAllAttempts,
    enabled: Boolean(user?.userId),
  });

  // Fetch Tests
  const { data: tests = [] } = useQuery({
    queryKey: ["tests"],
    queryFn: getAllTests,
    enabled: Boolean(user?.userId),
  });

  // Compile calculations & filter dynamic data
  const stats = useMemo(() => {
    // 1. Get base attempts that belong to this student and class
    const baseAttempts = attempts.filter((att) => {
      if (att.user_id !== user?.userId) return false;
      if (user?.class) {
        const testObj = tests.find((t) => t.id === att.test_id);
        if (testObj && testObj.class !== user.class) {
          return false;
        }
      }
      return true;
    });

    // Extract unique subjects attempted by the student dynamically
    const subjectList = new Set<string>();
    baseAttempts.forEach((att) => {
      const testObj = tests.find((t) => t.id === att.test_id);
      let sub = "General";
      if (testObj && testObj.subject) {
        if (Array.isArray(testObj.subject)) {
          sub = testObj.subject[0] || "General";
        } else {
          sub = String(testObj.subject);
        }
      } else {
        const rawSub = att.test_name?.split(" ")[0] || "General";
        sub = rawSub.charAt(0).toUpperCase() + rawSub.slice(1).toLowerCase();
      }
      subjectList.add(sub);
    });
    const uniqueSubjects = Array.from(subjectList);

    if (baseAttempts.length === 0) {
      return {
        total: 0,
        avgScore: 0,
        highScore: 0,
        totalTime: 0,
        correct: 0,
        wrong: 0,
        unattempted: 0,
        subjectData: [] as { subject: string; score: number }[],
        trendData: [] as { name: string; score: number; testName: string; correct: number; wrong: number }[],
        marksLostData: {
          secured: 0,
          lostIncorrect: 0,
          lostUnattempted: 0,
          securedP: 0,
          incorrectP: 0,
          unattemptedP: 0,
        },
        radarChartData: {
          axes: [] as { x: number; y: number; name: string; score: number }[],
          scorePointsStr: "",
          scorePointSingle: { x: 200, y: 100 },
        },
        uniqueSubjects,
        trendComparison: 0,
      };
    }

    // Apply Filter: Subject
    let filteredAttempts = [...baseAttempts];
    if (selectedSubject !== "All") {
      filteredAttempts = filteredAttempts.filter((att) => {
        const testObj = tests.find((t) => t.id === att.test_id);
        let sub = "General";
        if (testObj && testObj.subject) {
          if (Array.isArray(testObj.subject)) {
            sub = testObj.subject[0] || "General";
          } else {
            sub = String(testObj.subject);
          }
        } else {
          const rawSub = att.test_name?.split(" ")[0] || "General";
          sub = rawSub.charAt(0).toUpperCase() + rawSub.slice(1).toLowerCase();
        }
        return sub === selectedSubject;
      });
    }

    // Chronological sorting for trendline progression
    filteredAttempts.sort((a, b) => new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime());

    // Apply Filter: Time range period
    if (timePeriod !== "All") {
      const limit = parseInt(timePeriod, 10);
      if (filteredAttempts.length > limit) {
        filteredAttempts = filteredAttempts.slice(-limit);
      }
    }

    if (filteredAttempts.length === 0) {
      return {
        total: 0,
        avgScore: 0,
        highScore: 0,
        totalTime: 0,
        correct: 0,
        wrong: 0,
        unattempted: 0,
        subjectData: [] as { subject: string; score: number }[],
        trendData: [] as { name: string; score: number; testName: string; correct: number; wrong: number }[],
        marksLostData: {
          secured: 0,
          lostIncorrect: 0,
          lostUnattempted: 0,
          securedP: 0,
          incorrectP: 0,
          unattemptedP: 0,
        },
        radarChartData: {
          axes: [] as { x: number; y: number; name: string; score: number }[],
          scorePointsStr: "",
          scorePointSingle: { x: 200, y: 100 },
        },
        uniqueSubjects,
        trendComparison: 0,
      };
    }

    // Totals
    const total = filteredAttempts.length;
    let sumScorePercent = 0;
    let maxScorePercent = 0;
    let sumTime = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnattempted = 0;

    // Marks Lost Accumulators
    let totalSecured = 0;
    let totalLostIncorrect = 0;
    let totalLostUnattempted = 0;

    const subjectMap: Record<string, { sum: number; count: number }> = {};

    filteredAttempts.forEach((att) => {
      const testObj = tests.find((t) => t.id === att.test_id);
      const totalMarks = testObj?.total_marks || att.total_marks || 100;
      // score percent includes negative marking
      const percent = Math.max(0, Math.round(((att.score || 0) / totalMarks) * 100));

      const correct = att.correct_answers || 0;
      const wrong = att.wrong_answers || 0;
      const unattempted = att.unattempted || 0;

      sumScorePercent += percent;
      maxScorePercent = Math.max(maxScorePercent, percent);
      sumTime += att.time_spent || 0;
      totalCorrect += correct;
      totalWrong += wrong;
      totalUnattempted += unattempted;

      // Grouping: average performance per subject
      let sub = "General";
      if (testObj && testObj.subject) {
        if (Array.isArray(testObj.subject)) {
          sub = testObj.subject[0] || "General";
        } else {
          sub = String(testObj.subject);
        }
      } else {
        const rawSub = att.test_name?.split(" ")[0] || "General";
        sub = rawSub.charAt(0).toUpperCase() + rawSub.slice(1).toLowerCase();
      }

      if (!subjectMap[sub]) {
        subjectMap[sub] = { sum: 0, count: 0 };
      }
      subjectMap[sub].sum += percent;
      subjectMap[sub].count += 1;

      // Calculate Marks Lost for this attempt
      const correctMarks = testObj?.correct_marks ?? 4;
      const wrongMarks = testObj?.wrong_marks ?? -1;
      const unattemptMarks = testObj?.unattempt_marks ?? 0;

      const secured = att.score || 0;
      totalSecured += secured;

      const incorrectLoss = wrong * correctMarks + wrong * Math.abs(wrongMarks);
      totalLostIncorrect += incorrectLoss;

      const unattemptedLoss = unattempted * correctMarks + unattempted * Math.abs(unattemptMarks);
      totalLostUnattempted += unattemptedLoss;
    });

    // Subject breakdown list
    const subjectData = Object.entries(subjectMap).map(([sub, data]) => ({
      subject: sub,
      score: Math.round(data.sum / data.count),
    }));

    // Gaze / Attempt timelines (Score Trend)
    const trendData = filteredAttempts.map((att, idx) => {
      const testObj = tests.find((t) => t.id === att.test_id);
      const totalMarks = testObj?.total_marks || att.total_marks || 100;
      return {
        name: `T-${idx + 1}`,
        score: Math.max(0, Math.round(((att.score || 0) / totalMarks) * 100)),
        testName: att.test_name || testObj?.name || `Attempt ${idx + 1}`,
        correct: att.correct_answers || 0,
        wrong: att.wrong_answers || 0,
      };
    });

    const marksSum = totalSecured + totalLostIncorrect + totalLostUnattempted || 1;
    const securedPercent = (totalSecured / marksSum) * 100;
    const incorrectPercent = (totalLostIncorrect / marksSum) * 100;
    const unattemptedPercent = (totalLostUnattempted / marksSum) * 100;

    const marksLostData = {
      secured: totalSecured,
      lostIncorrect: totalLostIncorrect,
      lostUnattempted: totalLostUnattempted,
      securedP: securedPercent,
      incorrectP: incorrectPercent,
      unattemptedP: unattemptedPercent,
    };

    // Compute Radar Chart data - use only actual subjects attempted in current filtered set
    const radarSubjects = [...subjectData];
    const radarCenter = { x: 200, y: 100 };
    const maxRadius = 70;
    const numAxes = radarSubjects.length;

    // Outer grid points (axes lines and labels)
    const axesPoints = radarSubjects.map((s, idx) => {
      const angle = numAxes > 1
        ? (2 * Math.PI * idx) / numAxes - Math.PI / 2
        : -Math.PI / 2;
      const x = radarCenter.x + maxRadius * Math.cos(angle);
      const y = radarCenter.y + maxRadius * Math.sin(angle);
      return { x, y, name: s.subject, score: s.score };
    });

    // Score points string
    const scorePointsStr = radarSubjects.map((s, idx) => {
      const angle = numAxes > 1
        ? (2 * Math.PI * idx) / numAxes - Math.PI / 2
        : -Math.PI / 2;
      const r = maxRadius * (s.score / 100);
      const x = radarCenter.x + r * Math.cos(angle);
      const y = radarCenter.y + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");

    // Single score point coordinates (useful for N = 1)
    let scorePointSingle = { x: 200, y: 100 };
    if (numAxes === 1 && radarSubjects[0]) {
      const r = maxRadius * (radarSubjects[0].score / 100);
      scorePointSingle = { x: 200, y: 100 - r };
    }

    const radarChartData = {
      axes: axesPoints,
      scorePointsStr,
      scorePointSingle,
    };

    // Calculate trend percentage comparison (last test vs previous test in this set)
    let trendComparison = 0;
    if (filteredAttempts.length > 1) {
      const last = filteredAttempts[filteredAttempts.length - 1];
      const prev = filteredAttempts[filteredAttempts.length - 2];
      const lastTest = tests.find((t) => t.id === last.test_id);
      const prevTest = tests.find((t) => t.id === prev.test_id);
      const lastMax = lastTest?.total_marks || last.total_marks || 100;
      const prevMax = prevTest?.total_marks || prev.total_marks || 100;
      const lastP = Math.max(0, Math.round(((last.score || 0) / lastMax) * 100));
      const prevP = Math.max(0, Math.round(((prev.score || 0) / prevMax) * 100));
      trendComparison = lastP - prevP;
    }

    return {
      total,
      avgScore: Math.round(sumScorePercent / total),
      highScore: maxScorePercent,
      totalTime: Math.round(sumTime / 60), // in minutes
      correct: totalCorrect,
      wrong: totalWrong,
      unattempted: totalUnattempted,
      subjectData,
      trendData,
      marksLostData,
      radarChartData,
      uniqueSubjects,
      trendComparison,
    };
  }, [attempts, tests, user, selectedSubject, timePeriod]);

  // Gamified achievements calculation
  const achievements = useMemo(() => {
    const accuracyVal = stats.correct / (stats.correct + stats.wrong || 1);
    const avgAttemptTime = stats.total > 0 ? stats.totalTime / stats.total : 0;
    const marksTotalSum = stats.marksLostData.secured + stats.marksLostData.lostIncorrect + stats.marksLostData.lostUnattempted || 1;
    const penaltyRatio = stats.marksLostData.lostIncorrect / marksTotalSum;

    return [
      {
        id: "bullseye",
        title: "Bullseye",
        description: "Achieve an overall correctness accuracy above 80%",
        icon: "🎯",
        unlocked: accuracyVal >= 0.8 && stats.total > 0,
      },
      {
        id: "scholar",
        title: "Test Scholar",
        description: "Attempt 5 or more tests overall",
        icon: "📚",
        unlocked: stats.total >= 5,
      },
      {
        id: "speedster",
        title: "Pacing Expert",
        description: "Maintain an average test duration under 25 minutes",
        icon: "⚡",
        unlocked: avgAttemptTime <= 25 && stats.total > 0,
      },
      {
        id: "guard",
        title: "Penalty Shield",
        description: "Keep wrong answer mark loss below 15% of your total marks",
        icon: "🛡️",
        unlocked: penaltyRatio < 0.15 && stats.total > 0,
      },
    ];
  }, [stats]);

  // Dynamic learning insights based on current metrics
  const coachInsights = useMemo(() => {
    if (stats.total === 0) return null;

    const insights = [];

    // Strength insight
    if (stats.subjectData.length > 0) {
      const best = [...stats.subjectData].sort((a, b) => b.score - a.score)[0];
      if (best && best.score >= 70) {
        insights.push({
          title: `Peak Performance in ${best.subject}`,
          text: `You're leading in ${best.subject} with an outstanding ${best.score}% average. Keep this standard high.`,
          icon: Trophy,
          badgeColor: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        });
      }
    }

    // Weakness insight
    if (stats.subjectData.length > 0) {
      const worst = [...stats.subjectData].sort((a, b) => a.score - b.score)[0];
      if (worst && worst.score < 70) {
        insights.push({
          title: `${worst.subject} Needs Support`,
          text: `Your average in ${worst.subject} is currently at ${worst.score}%. Practice more target test sets to raise this benchmark.`,
          icon: Target,
          badgeColor: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
        });
      }
    }

    // Penalty check
    const marksTotalSum = stats.marksLostData.secured + stats.marksLostData.lostIncorrect + stats.marksLostData.lostUnattempted || 1;
    const penaltyPercent = (stats.marksLostData.lostIncorrect / marksTotalSum) * 100;
    
    if (penaltyPercent >= 20) {
      insights.push({
        title: "High Negative Marking Penalty",
        text: `You have lost ${Math.round(penaltyPercent)}% of available marks due to incorrect answers. Be careful with guesses!`,
        icon: AlertTriangle,
        badgeColor: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
      });
    }

    // Default encouragement
    if (insights.length < 3) {
      insights.push({
        title: "Pace & Balance",
        text: "Make sure to allocate study blocks of at least 45 minutes spaced regularly across the week for solid memory retrieval.",
        icon: Lightbulb,
        badgeColor: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
      });
    }

    return insights;
  }, [stats]);

  if (isLoading) {
    return (
      <AppShell>
        <PageWrapper>
          <div className="flex h-96 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2">Loading performance reports...</span>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageWrapper>
        {/* Glow ambient effects in background */}
        <div className="absolute top-[15%] left-[5%] h-[380px] w-[380px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-[50%] right-[5%] h-[420px] w-[420px] rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-3xl pointer-events-none -z-10" />

        {/* Back Link */}
        <div className="mb-6 relative z-10">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>

        {/* Premium Banner Header */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl md:p-8 border border-indigo-950/40">
          <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-400">
                <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
                Performance Portal
              </div>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl bg-gradient-to-r from-white via-indigo-200 to-indigo-100 bg-clip-text text-transparent">
                Analytics & Insights
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl font-medium">
                Analyze your exam history, subject benchmarks, accuracy rates, and total score breakdowns through visual models.
              </p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/10 backdrop-blur-md text-4xl border border-indigo-500/20 shadow-inner">
              📊
            </div>
          </div>
          {/* Glowing gradients in corners */}
          <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -top-8 -left-8 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
        </div>

        {attempts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md py-20 text-center text-slate-500 dark:text-slate-400 shadow-xl">
            <TrendingUp className="h-16 w-16 text-slate-350 dark:text-slate-700 mx-auto mb-4 animate-bounce" />
            <p className="text-lg font-bold text-slate-700 dark:text-slate-200">No attempt data available yet</p>
            <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
              Complete at least one test to generate analytical graphs, insights, and achievements.
            </p>
          </div>
        ) : (
          <>
            {/* Interactive Filters Panel */}
            <div className="mb-8 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-md flex flex-wrap gap-4 items-center justify-between z-10 relative">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <Filter className="h-4 w-4 text-indigo-500" />
                Analyze Filter:
              </div>

              {/* Subject Tabs Selector */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <button
                  onClick={() => setSelectedSubject("All")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    selectedSubject === "All"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  All Subjects
                </button>
                {stats.uniqueSubjects.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                      selectedSubject === sub
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {/* Time Range Selector & Target Toggle */}
              <div className="flex items-center gap-3.5 flex-wrap">
                {/* Time Range */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/20">
                  {["All", "5", "10"].map((period) => (
                    <button
                      key={period}
                      onClick={() => setTimePeriod(period)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide transition-all ${
                        timePeriod === period
                          ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      {period === "All" ? "All History" : `Last ${period}`}
                    </button>
                  ))}
                </div>

                {/* Target Line Toggle */}
                <button
                  onClick={() => setShowTargetLine(!showTargetLine)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border transition-all ${
                    showTargetLine
                      ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {showTargetLine ? "Goal Line: ON" : "Goal Line: OFF"}
                </button>
              </div>
            </div>

            {stats.total === 0 ? (
              <div className="rounded-3xl border border-slate-200/50 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md py-16 text-center text-slate-500 shadow-lg mb-8">
                <Calendar className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No matching test attempts found</p>
                <p className="mt-1 text-xs text-slate-400">Try adjusting your filters above to broaden your analytics view.</p>
              </div>
            ) : (
              <>
                {/* KPI Cards Grid */}
                <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-4 mb-8">
                  {/* Total Attempts */}
                  <div className="group relative overflow-hidden rounded-2xl border border-white/20 dark:border-slate-800/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-5 shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-indigo-500/5 hover:border-indigo-400/40">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 transition-transform group-hover:scale-110 duration-300 shadow-md">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Exams Taken</span>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{stats.total} <span className="text-xs font-bold text-slate-400 dark:text-slate-500">tests</span></h3>
                      </div>
                    </div>
                    <div className="mt-3.5 pt-2 border-t border-slate-100/50 dark:border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                      <span>Consistency:</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {stats.total >= 5 ? "Consistent" : stats.total >= 3 ? "Regular" : "Novice"}
                      </span>
                    </div>
                  </div>

                  {/* Avg Score */}
                  <div className="group relative overflow-hidden rounded-2xl border border-white/20 dark:border-slate-800/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-5 shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-emerald-500/5 hover:border-emerald-400/40">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110 duration-300 shadow-md">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Average Score</span>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{stats.avgScore}%</h3>
                      </div>
                    </div>
                    <div className="mt-3.5 pt-2 border-t border-slate-100/50 dark:border-slate-800/40 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 dark:text-slate-500">Trend Status:</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full ${
                        stats.trendComparison > 0 
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" 
                          : stats.trendComparison < 0 
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400" 
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {stats.trendComparison > 0 ? `+${stats.trendComparison}% ↑` : stats.trendComparison < 0 ? `${stats.trendComparison}% ↓` : "Steady"}
                      </span>
                    </div>
                  </div>

                  {/* High Score */}
                  <div className="group relative overflow-hidden rounded-2xl border border-white/20 dark:border-slate-800/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-5 shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-amber-500/5 hover:border-amber-400/40">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition-transform group-hover:scale-110 duration-300 shadow-md">
                        <Award className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Highest Score</span>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{stats.highScore}%</h3>
                      </div>
                    </div>
                    <div className="mt-3.5 pt-2 border-t border-slate-100/50 dark:border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                      <span>vs Average:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full">
                        +{stats.highScore - stats.avgScore}% difference
                      </span>
                    </div>
                  </div>

                  {/* Time Spent */}
                  <div className="group relative overflow-hidden rounded-2xl border border-white/20 dark:border-slate-800/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-5 shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-rose-500/5 hover:border-rose-400/40">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-transform group-hover:scale-110 duration-300 shadow-md">
                        <Clock className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Time</span>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{stats.totalTime} <span className="text-xs font-bold text-slate-400 dark:text-slate-500">mins</span></h3>
                      </div>
                    </div>
                    <div className="mt-3.5 pt-2 border-t border-slate-100/50 dark:border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                      <span>Intensity:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full">
                        {stats.totalTime > 120 ? "Intense" : stats.totalTime > 45 ? "Sustained" : "Brief"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Graphs Layout Grid */}
                <div className="grid gap-6 md:grid-cols-2 mb-8 relative z-10">
                  
                  {/* Score Trend (SVG Line Chart) */}
                  <div className="relative rounded-3xl border border-white/20 dark:border-slate-800/30 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl flex flex-col transition-all hover:shadow-2xl hover:border-indigo-400/30 duration-300">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-500" />
                        Performance timeline
                      </h3>
                      {selectedSubject !== "All" && (
                        <span className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 px-2.5 py-1 rounded-full">
                          {selectedSubject}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-h-[200px] flex items-center justify-center relative">
                      <svg viewBox="0 0 400 200" className="w-full h-full overflow-visible">
                        {/* Grid Lines */}
                        {[0, 25, 50, 75, 100].map((val, idx) => {
                          const y = 160 - (val * 130) / 100;
                          return (
                            <g key={idx}>
                              <line x1="40" y1={y} x2="380" y2={y} stroke="rgba(226, 232, 240, 0.4)" strokeWidth="1" strokeDasharray="4 4" className="dark:stroke-slate-800/50" />
                              <text x="15" y={y + 3} className="text-[8px] font-bold fill-slate-400 dark:fill-slate-500">{val}%</text>
                            </g>
                          );
                        })}

                        {/* Dashed Target / Goal Line */}
                        {showTargetLine && (
                          <g>
                            <line
                              x1="40"
                              y1="56"
                              x2="380"
                              y2="56"
                              stroke="#10b981"
                              strokeWidth="1.2"
                              strokeDasharray="4 4"
                              opacity="0.85"
                              filter="url(#glowGreen)"
                            />
                            <text x="340" y="51" className="text-[7px] font-black fill-emerald-500 tracking-wider dark:fill-emerald-400">
                              GOAL: 80%
                            </text>
                          </g>
                        )}

                        {/* Render Area & Line Path */}
                        {(() => {
                          const points = stats.trendData.map((d, i) => {
                            const step = stats.trendData.length > 1 ? (340 / (stats.trendData.length - 1)) : 340;
                            const x = 40 + i * step;
                            const y = 160 - (d.score * 130) / 100;
                            return { x, y };
                          });

                          if (points.length === 0) return null;

                          let pathD = `M ${points[0].x} ${points[0].y}`;
                          points.forEach((p, idx) => {
                            if (idx > 0) pathD += ` L ${p.x} ${p.y}`;
                          });

                          const areaD = `${pathD} L ${points[points.length - 1].x} 160 L ${points[0].x} 160 Z`;

                          return (
                            <>
                              {/* Shaded Area under path */}
                              <path d={areaD} fill="url(#trendAreaGrad)" />
                              {/* Glowing Line Path */}
                              <path d={pathD} fill="none" stroke="url(#neonTrendLineGrad)" strokeWidth="2.5" filter="url(#glowNeon)" />

                              {/* Interactive Nodes */}
                              {points.map((p, idx) => {
                                const d = stats.trendData[idx];
                                return (
                                  <g 
                                    key={idx} 
                                    className="cursor-pointer"
                                    onMouseEnter={() => setHoveredPoint({ ...d, x: p.x, y: p.y })}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                  >
                                    <circle cx={p.x} cy={p.y} r="7" fill="rgba(99, 102, 241, 0.2)" className="opacity-0 hover:opacity-100 transition-opacity duration-200" />
                                    <circle cx={p.x} cy={p.y} r="4.5" fill="#a855f7" stroke="#ffffff" strokeWidth="1.8" />
                                    <text x={p.x} y="182" className="text-[7.5px] font-extrabold fill-slate-400 dark:fill-slate-500 text-anchor-middle" textAnchor="middle">
                                      {d.name}
                                    </text>
                                  </g>
                                );
                              })}
                            </>
                          );
                        })()}

                        {/* Defs / Filters */}
                        <defs>
                          <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="neonTrendLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="50%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                          <filter id="glowNeon" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2.2" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                          <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="1.2" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                      </svg>

                      {/* Interactive HTML Tooltip Absolute Placement */}
                      {hoveredPoint && (
                        <div 
                          className="absolute z-20 bg-slate-900/95 text-white dark:bg-slate-950/95 border border-indigo-500/30 rounded-xl p-2.5 shadow-2xl backdrop-blur-md text-[10px] pointer-events-none flex flex-col gap-1 w-44"
                          style={{
                            left: `${(hoveredPoint.x / 400) * 100}%`,
                            top: `${(hoveredPoint.y / 200) * 100 - 8}%`,
                            transform: 'translate(-50%, -100%)',
                          }}
                        >
                          <div className="font-bold border-b border-white/10 pb-1 text-indigo-300 truncate">
                            {hoveredPoint.testName}
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-slate-400">Score Rating:</span>
                            <span className="font-black text-emerald-400">{hoveredPoint.score}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Correct Qs:</span>
                            <span className="font-bold text-emerald-400">{hoveredPoint.correct}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Wrong Qs:</span>
                            <span className="font-bold text-rose-400">{hoveredPoint.wrong}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subject Breakdown (SVG Bar Chart) */}
                  <div className="rounded-3xl border border-white/20 dark:border-slate-800/30 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl flex flex-col transition-all hover:shadow-2xl hover:border-indigo-400/30 duration-300">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 tracking-tight flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-purple-500" />
                      Subject benchmarking
                    </h3>
                    
                    <div className="flex-1 min-h-[200px] flex items-center justify-center">
                      <svg viewBox="0 0 400 200" className="w-full h-full overflow-visible">
                        {/* Y Grid Lines */}
                        {[0, 50, 100].map((val, idx) => {
                          const y = 160 - (val * 130) / 100;
                          return (
                            <g key={idx}>
                              <line x1="40" y1={y} x2="380" y2={y} stroke="rgba(226, 232, 240, 0.4)" strokeWidth="1" className="dark:stroke-slate-800/50" />
                              <text x="15" y={y + 3} className="text-[8px] font-bold fill-slate-400 dark:fill-slate-500">{val}%</text>
                            </g>
                          );
                        })}

                        {/* Render Glowing Columns */}
                        {(() => {
                          const data = stats.subjectData.length > 0 ? stats.subjectData : [{ subject: "General", score: stats.avgScore }];
                          const barWidth = Math.min(32, 160 / data.length);
                          const totalBarSpace = 340 / data.length;

                          return data.map((d, i) => {
                            const hBar = (d.score * 130) / 100;
                            const x = 40 + i * totalBarSpace + (totalBarSpace - barWidth) / 2;
                            const y = 160 - hBar;

                            return (
                              <g key={i} className="group cursor-pointer">
                                {/* Faint 100% boundary background track */}
                                <rect
                                  x={x}
                                  y={30}
                                  width={barWidth}
                                  height={130}
                                  rx="6"
                                  fill="rgba(148, 163, 184, 0.08)"
                                  className="dark:fill-slate-800/20"
                                />
                                {/* Main score bar column */}
                                <rect
                                  x={x}
                                  y={y}
                                  width={barWidth}
                                  height={hBar}
                                  rx="6"
                                  fill={`url(#barGrad-${i % 4})`}
                                  className="transition-all duration-300 origin-bottom hover:scale-y-[1.02]"
                                  filter="url(#columnGlow)"
                                />
                                {/* Score Indicator above bar */}
                                <text 
                                  x={x + barWidth / 2} 
                                  y={y - 7} 
                                  className="text-[8px] font-black fill-indigo-650 dark:fill-indigo-400 transition-transform text-anchor-middle group-hover:-translate-y-0.5 duration-200" 
                                  textAnchor="middle"
                                >
                                  {d.score}%
                                </text>
                                {/* Bottom label */}
                                <text 
                                  x={x + barWidth / 2} 
                                  y="178" 
                                  className="text-[8px] font-extrabold fill-slate-400 dark:fill-slate-500 text-anchor-middle transition-colors group-hover:fill-indigo-500" 
                                  textAnchor="middle"
                                >
                                  {d.subject}
                                </text>
                              </g>
                            );
                          });
                        })()}

                        {/* Column Gradients defs */}
                        <defs>
                          <linearGradient id="barGrad-0" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#4f46e5" />
                          </linearGradient>
                          <linearGradient id="barGrad-1" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                          <linearGradient id="barGrad-2" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#fb7185" />
                            <stop offset="100%" stopColor="#e11d48" />
                          </linearGradient>
                          <linearGradient id="barGrad-3" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#d97706" />
                          </linearGradient>
                          <filter id="columnGlow" x="-10%" y="-10%" width="120%" height="120%">
                            <feGaussianBlur stdDeviation="1.5" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                      </svg>
                    </div>
                  </div>

                  {/* Accuracy Ratio (SVG Donut Chart) */}
                  <div className="rounded-3xl border border-white/20 dark:border-slate-800/30 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl flex flex-col transition-all hover:shadow-2xl hover:border-indigo-400/30 duration-300">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 tracking-tight flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-500" />
                      Accuracy breakdown
                    </h3>
                    
                    <div className="flex-1 min-h-[200px] flex flex-col sm:flex-row items-center justify-around gap-6">
                      {/* Donut Circle */}
                      <div className="relative h-36 w-36 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 overflow-visible">
                          {/* Background Track */}
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" className="dark:stroke-slate-800" />

                          {/* Segments */}
                          {(() => {
                            const total = stats.correct + stats.wrong + stats.unattempted || 1;
                            const correctP = (stats.correct / total) * 100;
                            const wrongP = (stats.wrong / total) * 100;

                            const correctStroke = `${correctP} ${100 - correctP}`;
                            const wrongStroke = `${wrongP} ${100 - wrongP}`;
                            const wrongOffset = 100 - correctP;

                            return (
                              <>
                                {/* Correct Segment */}
                                {correctP > 0 && (
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="15.915"
                                    fill="none"
                                    stroke="url(#correctGrad)"
                                    strokeWidth="3.2"
                                    strokeLinecap="round"
                                    strokeDasharray={correctStroke}
                                    strokeDashoffset="0"
                                    filter="url(#donutRingShadow)"
                                  />
                                )}
                                {/* Incorrect Segment */}
                                {wrongP > 0 && (
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="15.915"
                                    fill="none"
                                    stroke="url(#wrongGrad)"
                                    strokeWidth="3.2"
                                    strokeLinecap="round"
                                    strokeDasharray={wrongStroke}
                                    strokeDashoffset={wrongOffset}
                                    filter="url(#donutRingShadow)"
                                  />
                                )}
                              </>
                            );
                          })()}
                        </svg>

                        {/* Center Display Badge */}
                        <div className="absolute flex flex-col items-center">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Accuracy</span>
                          <span className="text-2xl font-black bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent mt-0.5">
                            {Math.round((stats.correct / (stats.correct + stats.wrong || 1)) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Legends */}
                      <div className="flex flex-col gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 w-full max-w-[140px]">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md" /> Correct
                          </span>
                          <span className="font-black text-slate-800 dark:text-white">{stats.correct}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-md bg-gradient-to-br from-rose-400 to-red-500 shadow-md" /> Incorrect
                          </span>
                          <span className="font-black text-slate-800 dark:text-white">{stats.wrong}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-md bg-slate-300 dark:bg-slate-700 shadow-sm" /> Unattempted
                          </span>
                          <span className="font-black text-slate-800 dark:text-white">{stats.unattempted}</span>
                        </div>
                      </div>
                    </div>

                    {/* Donut Gradients and Shadows */}
                    <svg className="w-0 h-0 absolute">
                      <defs>
                        <linearGradient id="correctGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="wrongGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f87171" />
                          <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                        <filter id="donutRingShadow" x="-10%" y="-10%" width="120%" height="120%">
                          <feDropShadow dx="0" dy="1.2" stdDeviation="1" floodOpacity="0.12" />
                        </filter>
                      </defs>
                    </svg>
                  </div>

                  {/* Marks Lost Analysis (SVG Donut Chart) */}
                  <div className="rounded-3xl border border-white/20 dark:border-slate-800/30 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl flex flex-col transition-all hover:shadow-2xl hover:border-indigo-400/30 duration-300">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 tracking-tight flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                      Marks leak analysis
                    </h3>
                    
                    <div className="flex-1 min-h-[200px] flex flex-col sm:flex-row items-center justify-around gap-6">
                      {/* Donut Circle */}
                      <div className="relative h-36 w-36 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 overflow-visible">
                          {/* Background Track */}
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" className="dark:stroke-slate-800" />

                          {/* Donut Sectors */}
                          {(() => {
                            const p1 = stats.marksLostData.securedP;
                            const p2 = stats.marksLostData.incorrectP;
                            const p3 = stats.marksLostData.unattemptedP;

                            const s1 = `${p1} ${100 - p1}`;
                            const s2 = `${p2} ${100 - p2}`;
                            const s3 = `${p3} ${100 - p3}`;

                            const o2 = 100 - p1;
                            const o3 = 100 - p1 - p2;

                            return (
                              <>
                                {/* Secured Segment */}
                                {p1 > 0 && (
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="15.915"
                                    fill="none"
                                    stroke="url(#securedGrad)"
                                    strokeWidth="3.2"
                                    strokeLinecap="round"
                                    strokeDasharray={s1}
                                    strokeDashoffset="0"
                                    filter="url(#donutRingShadow)"
                                  />
                                )}
                                {/* Incorrect Penalty Segment */}
                                {p2 > 0 && (
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="15.915"
                                    fill="none"
                                    stroke="url(#incorrectLossGradRing)"
                                    strokeWidth="3.2"
                                    strokeLinecap="round"
                                    strokeDasharray={s2}
                                    strokeDashoffset={o2}
                                    filter="url(#donutRingShadow)"
                                  />
                                )}
                                {/* Skip Loss Segment */}
                                {p3 > 0 && (
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="15.915"
                                    fill="none"
                                    stroke="url(#unattemptedLossGradRing)"
                                    strokeWidth="3.2"
                                    strokeLinecap="round"
                                    strokeDasharray={s3}
                                    strokeDashoffset={o3}
                                    filter="url(#donutRingShadow)"
                                  />
                                )}
                              </>
                            );
                          })()}
                        </svg>

                        {/* Center Display Badge */}
                        <div className="absolute flex flex-col items-center">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Lost Marks</span>
                          <span className="text-2xl font-black bg-gradient-to-r from-rose-500 to-red-500 bg-clip-text text-transparent mt-0.5">
                            {Math.round(stats.marksLostData.lostIncorrect + stats.marksLostData.lostUnattempted)}
                          </span>
                        </div>
                      </div>

                      {/* Legends */}
                      <div className="flex flex-col gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 w-full max-w-[140px]">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-md bg-gradient-to-br from-indigo-400 to-indigo-500 shadow-md" /> Secured
                          </span>
                          <span className="font-black text-slate-800 dark:text-white">{Math.round(stats.marksLostData.secured)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-md bg-gradient-to-br from-rose-400 to-red-500 shadow-md" /> Penalty
                          </span>
                          <span className="font-black text-slate-800 dark:text-white">{Math.round(stats.marksLostData.lostIncorrect)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-md bg-gradient-to-br from-amber-400 to-amber-500 shadow-md" /> Skip Loss
                          </span>
                          <span className="font-black text-slate-800 dark:text-white">{Math.round(stats.marksLostData.lostUnattempted)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gradients */}
                    <svg className="w-0 h-0 absolute">
                      <defs>
                        <linearGradient id="securedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                        <linearGradient id="incorrectLossGradRing" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f43f5e" />
                          <stop offset="100%" stopColor="#be123c" />
                        </linearGradient>
                        <linearGradient id="unattemptedLossGradRing" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24" />
                          <stop offset="100%" stopColor="#b45309" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  {/* Subject Comparison Radar Chart */}
                  <div className="rounded-3xl border border-white/20 dark:border-slate-800/30 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl flex flex-col md:col-span-2 transition-all hover:shadow-2xl hover:border-indigo-400/30 duration-300">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 tracking-tight flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500 animate-pulse" />
                      Multilateral subject radar
                    </h3>
                    
                    <div className="flex-1 min-h-[220px] flex items-center justify-center">
                      <svg viewBox="0 0 400 220" className="w-full max-w-[420px] h-full overflow-visible">
                        {/* Level Guide Grid lines */}
                        {[25, 50, 75, 100].map((val, idx) => {
                          const y = 100 - (70 * val) / 100;
                          return (
                            <text
                              key={idx}
                              x="204"
                              y={y + 3}
                              className="text-[6.5px] font-extrabold fill-slate-400 dark:fill-slate-500 opacity-60"
                            >
                              {val}%
                            </text>
                          );
                        })}

                        {/* Concentric grid circular levels */}
                        {[0.25, 0.5, 0.75, 1.0].map((level, idx) => (
                          <circle
                            key={idx}
                            cx="200"
                            cy="100"
                            r={70 * level}
                            fill="none"
                            stroke="rgba(148, 163, 184, 0.25)"
                            strokeWidth="0.8"
                            strokeDasharray="4 4"
                            className="dark:stroke-slate-800/60"
                          />
                        ))}

                        {/* Outer axis border lines */}
                        {stats.radarChartData.axes.map((axis, idx) => (
                          <line
                            key={idx}
                            x1="200"
                            y1="100"
                            x2={axis.x}
                            y2={axis.y}
                            stroke="rgba(148, 163, 184, 0.25)"
                            strokeWidth="0.8"
                            className="dark:stroke-slate-800/60"
                          />
                        ))}

                        {/* Area Polygon depending on axis nodes */}
                        {stats.radarChartData.axes.length >= 3 ? (
                          <polygon
                            points={stats.radarChartData.scorePointsStr}
                            fill="rgba(168, 85, 247, 0.16)"
                            stroke="url(#radarNeonLineGrad)"
                            strokeWidth="2.2"
                            filter="url(#radarAreaGlow)"
                          />
                        ) : stats.radarChartData.axes.length === 2 ? (
                          <polyline
                            points={stats.radarChartData.scorePointsStr}
                            fill="none"
                            stroke="url(#radarNeonLineGrad)"
                            strokeWidth="2.2"
                            filter="url(#radarAreaGlow)"
                          />
                        ) : stats.radarChartData.axes.length === 1 ? (
                          <line
                            x1="200"
                            y1="100"
                            x2={stats.radarChartData.scorePointSingle.x}
                            y2={stats.radarChartData.scorePointSingle.y}
                            stroke="url(#radarNeonLineGrad)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        ) : null}

                        {/* Nodes representing specific values */}
                        {stats.radarChartData.axes.map((axis, idx) => {
                          const angle = (2 * Math.PI * idx) / stats.radarChartData.axes.length - Math.PI / 2;
                          const r = 70 * (axis.score / 100);
                          const mx = 200 + r * Math.cos(angle);
                          const my = 100 + r * Math.sin(angle);

                          return (
                            <circle
                              key={idx}
                              cx={mx}
                              cy={my}
                              r="4"
                              fill="#c084fc"
                              stroke="#ffffff"
                              strokeWidth="1.8"
                              className="cursor-pointer transition-transform hover:scale-125 duration-200"
                            />
                          );
                        })}

                        {/* Labels on vertexes */}
                        {stats.radarChartData.axes.map((axis, idx) => {
                          const angle = (2 * Math.PI * idx) / stats.radarChartData.axes.length - Math.PI / 2;
                          const labelRadius = 82;
                          const lx = 200 + labelRadius * Math.cos(angle);
                          const ly = 100 + labelRadius * Math.sin(angle);

                          let textAnchor: "start" | "middle" | "end" = "middle";
                          if (lx < 190) {
                            textAnchor = "end";
                          } else if (lx > 210) {
                            textAnchor = "start";
                          }

                          return (
                            <text
                              key={idx}
                              x={lx}
                              y={ly + 3}
                              textAnchor={textAnchor}
                              className="text-[8px] font-black fill-slate-400 dark:fill-slate-500 hover:fill-indigo-500 transition-colors"
                            >
                              {axis.name} ({axis.score}%)
                            </text>
                          );
                        })}

                        {/* Radar outline gradient def */}
                        <defs>
                          <linearGradient id="radarNeonLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                          <filter id="radarAreaGlow" x="-10%" y="-10%" width="120%" height="120%">
                            <feGaussianBlur stdDeviation="1" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                      </svg>
                    </div>
                  </div>

                </div>

                {/* AI Learning Coach & Gamified Achievements Section */}
                <div className="grid gap-6 md:grid-cols-3 mb-8 relative z-10">
                  {/* AI Study Coach */}
                  <div className="md:col-span-2 rounded-3xl border border-white/20 dark:border-slate-800/30 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl flex flex-col transition-all hover:shadow-2xl duration-300">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 tracking-tight flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      AI Study Coach Diagnostic Recommendations
                    </h3>

                    <div className="flex-1 space-y-4">
                      {coachInsights && coachInsights.map((insight, idx) => {
                        const Icon = insight.icon;
                        return (
                          <div 
                            key={idx} 
                            className="flex items-start gap-4 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 shadow-sm transition hover:shadow duration-200"
                          >
                            <div className={`p-2.5 rounded-xl border shrink-0 ${insight.badgeColor}`}>
                              <Icon className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                                {insight.title}
                              </h4>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                                {insight.text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gamified Achievements Achievements */}
                  <div className="rounded-3xl border border-white/20 dark:border-slate-800/30 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl flex flex-col transition-all hover:shadow-2xl duration-300">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 tracking-tight flex items-center gap-2">
                      <Award className="h-4 w-4 text-indigo-500" />
                      Milestones unlocked
                    </h3>

                    <div className="flex-1 grid grid-cols-2 gap-3.5">
                      {achievements.map((badge) => (
                        <div
                          key={badge.id}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300 ${
                            badge.unlocked
                              ? "bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 border-indigo-200/50 shadow-md dark:from-indigo-950/20 dark:to-indigo-900/10 dark:border-indigo-900/30"
                              : "bg-slate-50/40 border-slate-100 text-slate-400 dark:bg-slate-900/20 dark:border-slate-800/50 opacity-40"
                          }`}
                          title={badge.description}
                        >
                          <div className={`text-3xl mb-1.5 transition-transform duration-300 ${badge.unlocked ? "hover:scale-110" : ""}`}>
                            {badge.icon}
                          </div>
                          <span className="text-[10px] font-extrabold tracking-wide uppercase text-slate-800 dark:text-slate-200 text-center">
                            {badge.title}
                          </span>
                          <span className="text-[7.5px] font-semibold text-slate-400 text-center mt-1 leading-snug">
                            {badge.unlocked ? "Unlocked" : "Locked"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </PageWrapper>
    </AppShell>
  );
};
