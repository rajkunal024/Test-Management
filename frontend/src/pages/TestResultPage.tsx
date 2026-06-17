import { useMemo, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  BookOpen,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { useTest } from "../hooks/useTests";
import { fetchBulkQuestions, getAllAttempts, getPassageById } from "../services/api";
import { Passage } from "../types";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { useAuthStore } from "../store/authStore";

export const TestResultPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const { data: test, isLoading: isLoadingTest } = useTest(id);

  useEffect(() => {
    if (user && test && test.start_time) {
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
      if (testStart < studentJoined) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, test, navigate]);

  const isAttemptFromStateValid = Boolean(location.state?.attempt && location.state.attempt.test_id === id);

  // Fetch attempts as fallback if location state is missing or invalid for this test
  const { data: attempts = [], isLoading: isLoadingAttempts } = useQuery({
    queryKey: ["attempts"],
    queryFn: getAllAttempts,
    enabled: !isAttemptFromStateValid && Boolean(user?.userId),
  });

  // Extract attempt
  const attempt = useMemo(() => {
    if (isAttemptFromStateValid) {
      return location.state.attempt;
    }
    // Find latest attempt for this test belonging to the current user
    const testAttempts = attempts.filter((att) => att.test_id === id && att.user_id === user?.userId);
    if (testAttempts.length === 0) return null;
    return testAttempts.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0];
  }, [isAttemptFromStateValid, location.state?.attempt, attempts, id, user?.userId]);

  const hasTestCopy = Boolean(attempt?.test_copy && attempt.test_copy.length > 0);

  // Fetch Questions
  const { data: fetchedQuestions = [], isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["questions", id, test?.questions],
    queryFn: () => fetchBulkQuestions(test?.questions ?? []),
    enabled: Boolean(test?.questions?.length),
  });

  const questions = useMemo(() => {
    let baseQuestions = [];
    if (attempt?.test_copy && attempt.test_copy.length > 0) {
      baseQuestions = attempt.test_copy.map((q: any) => {
        const originalQ = fetchedQuestions.find((fq: any) => fq.id === q.id);
        return {
          id: q.id,
          type: originalQ?.type || q.type || "mcq",
          passage_id: originalQ?.passage_id || q.passage_id || null,
          question: q.question,
          option1: q.option1,
          option2: q.option2,
          option3: q.option3,
          option4: q.option4,
          correct_option: q.correct_option,
          media_url: q.media_url,
          image_url: q.image_url,
        };
      });
    } else {
      baseQuestions = fetchedQuestions;
    }

    // Filter/slice the questions to the deterministic subset of size test.total_questions
    if (test && baseQuestions.length > 0 && attempt) {
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

      const getSectionalQuestions = <T extends { id?: string }>(
        test: any,
        sortedQuestions: T[],
        seed: string
      ): T[] => {
        if (test.sections && test.sections.length > 0) {
          const selected: T[] = [];
          const usedIds = new Set<string>();

          test.sections.forEach((sec: any) => {
            const secQuestionIds = new Set(sec.questions || []);
            const secAllQuestions = sortedQuestions.filter(q => q.id && secQuestionIds.has(q.id) && !usedIds.has(q.id));
            const secCount = Number(sec.questions_count ?? secAllQuestions.length);
            const secSelected = getDeterministicSubset(secAllQuestions, secCount, seed + "-" + sec.name);
            
            secSelected.forEach((q) => {
              if (q.id && !usedIds.has(q.id)) {
                selected.push(q);
                usedIds.add(q.id);
              }
            });
          });

          return selected;
        }

        return getDeterministicSubset(sortedQuestions, test.total_questions, seed);
      };

      const sortedQuestions = [...baseQuestions].sort((a: any, b: any) => (a.id || "").localeCompare(b.id || ""));
      const seed = `${attempt.user_id}-${test.id}`;
      return getSectionalQuestions(test, sortedQuestions, seed);
    }

    return baseQuestions;
  }, [attempt, fetchedQuestions, test]);

  // Passage Caching State & Fetching Hook
  const [passageCache, setPassageCache] = useState<Record<string, Passage>>({});
  const [loadingPassages, setLoadingPassages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (questions.length > 0) {
      questions.forEach((q: any) => {
        const pid = q.passage_id;
        if (pid && !passageCache[pid] && !loadingPassages[pid]) {
          setLoadingPassages((prev) => ({ ...prev, [pid]: true }));
          getPassageById(pid)
            .then((passage) => {
              setPassageCache((prev) => ({ ...prev, [pid]: passage }));
            })
            .catch((err) => {
              console.error("Error fetching passage:", err);
            })
            .finally(() => {
              setLoadingPassages((prev) => ({ ...prev, [pid]: false }));
            });
        }
      });
    }
  }, [questions, passageCache, loadingPassages]);

  // Calculations
  const scorecard = useMemo(() => {
    if (!attempt || !test) return null;

    const score = attempt.score;
    const maxMarks = test.total_marks;
    const pct = Math.max(0, Math.round((score / maxMarks) * 100));

    const totalQuestions = questions.length;
    const answered = attempt.correct_answers + attempt.wrong_answers;
    const accuracy = answered > 0
      ? Math.round((attempt.correct_answers / answered) * 100)
      : 0;

    // Time spent formatting
    const timeSec = attempt.time_spent;
    const m = Math.floor(timeSec / 60);
    const s = timeSec % 60;
    const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;

    // Performance Feedback
    let heading = "Keep Practicing!";
    let desc = "Review the solutions below and re-take the test to improve your score.";
    let gradient = "from-rose-500 to-amber-500";
    let iconColor = "text-rose-500";

    if (pct >= 85) {
      heading = "Outstanding Performance!";
      desc = "Incredible! You have demonstrated absolute mastery over this subject.";
      gradient = "from-emerald-500 to-teal-500";
      iconColor = "text-emerald-500";
    } else if (pct >= 60) {
      heading = "Well Done!";
      desc = "Great attempt! You have a solid grasp. Just a few topics need a quick review.";
      gradient = "from-indigo-500 to-blue-500";
      iconColor = "text-indigo-500";
    }

    return { score, maxMarks, pct, accuracy, timeStr, heading, desc, gradient, iconColor };
  }, [attempt, test, questions]);

  const isLoading = isLoadingTest || isLoadingQuestions || (isLoadingAttempts && !isAttemptFromStateValid);

  if (isLoading) {
    return (
      <AppShell>
        <PageWrapper>
          <div className="flex h-96 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2">Compiling scorecard analysis...</span>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  if (!test) {
    return (
      <AppShell>
        <PageWrapper>
          <div className="text-center py-16">
            <h2 className="text-lg font-bold text-slate-800">Test Not Found</h2>
            <Link to="/dashboard">
              <Button className="mt-4">Back to Dashboard</Button>
            </Link>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  if (!test.results_shared) {
    return (
      <AppShell>
        <PageWrapper>
          <div className="text-center py-16 max-w-md mx-auto rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Results Not Declared</h2>
            <p className="text-sm text-slate-500 mb-6">
              The administrator has not shared the results for this exam yet. You will be able to view your detailed scorecard once the results are published.
            </p>
            <Link to="/dashboard">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Back to Dashboard</Button>
            </Link>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  if (!attempt) {
    return (
      <AppShell>
        <PageWrapper>
          <div className="text-center py-16 max-w-md mx-auto rounded-xl border border-slate-200 bg-white p-8">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-800 mb-2">No Submission Found</h2>
            <p className="text-sm text-slate-500 mb-6">
              You haven't attempted this test yet, or the attempt data was not saved.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/dashboard">
                <Button variant="secondary">Go to Dashboard</Button>
              </Link>
              <Link to={`/tests/${id}/attempt`}>
                <Button>Attempt Test</Button>
              </Link>
            </div>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageWrapper>
        {/* Back Link */}
        <div className="mb-6 print:hidden">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-black text-[#6c7df7] hover:underline uppercase tracking-wider">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>

        {/* Scorecard Hero Banner / Answer Key Mode */}
        {scorecard && (
          <section className="mb-8 overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col md:flex-row transition-all duration-300">
            {/* Left Box: Percentage Circle */}
            <div className={`p-8 bg-gradient-to-br ${scorecard.gradient} text-white flex flex-col items-center justify-center text-center md:w-[280px] shrink-0 relative overflow-hidden`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_60%)] pointer-events-none" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Your Score</span>

              <div className="relative flex items-center justify-center mt-5 mb-5 h-36 w-36 rounded-full border-4 border-white/30 bg-white/10 backdrop-blur-md shadow-2xl transition-transform hover:scale-105 duration-300">
                <div className="text-center">
                  <span className="text-4xl font-black tracking-tight">{scorecard.pct}%</span>
                  <p className="text-[9px] font-black opacity-80 uppercase tracking-widest mt-1">
                    {scorecard.score} / {scorecard.maxMarks} Marks
                  </p>
                </div>
                {/* Glowing ring animation */}
                <div className="absolute -inset-1.5 rounded-full border border-white/20 animate-pulse pointer-events-none" />
              </div>

              <Badge tone="blue" className="font-extrabold text-[10px] uppercase tracking-wider bg-white/20 border border-white/25 rounded-md px-3 py-1 shadow-sm text-white">
                {test.difficulty}
              </Badge>
            </div>

            {/* Right Box: Performance Analytics */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-white dark:bg-slate-900/40 backdrop-blur-md">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
                  <Sparkles className="h-4 w-4 text-amber-550 animate-pulse" />
                  Performance Summary
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2 tracking-tight">{scorecard.heading}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-450 mt-2 leading-relaxed font-semibold">{scorecard.desc}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-6">
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Accuracy</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1 block">{scorecard.accuracy}%</span>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Time Taken</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1 block flex items-center gap-1">
                    <Clock className="h-4.5 w-4.5 text-slate-450 shrink-0" />
                    {scorecard.timeStr}
                  </span>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Correct</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-450 mt-1 block flex items-center gap-1">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-550 shrink-0" />
                    {attempt.correct_answers}
                  </span>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Wrong</span>
                  <span className="text-lg font-black text-rose-500 dark:text-rose-450 mt-1 block flex items-center gap-1">
                    <XCircle className="h-4.5 w-4.5 text-rose-550 shrink-0" />
                    {attempt.wrong_answers}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Detailed Solutions */}
        <section className="mb-8">
          <h2 className="mb-5 text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500 animate-pulse" />
            Detailed Solutions
          </h2>

          <div className="space-y-6">
            {questions.map((question: any, index: number) => {
              const qId = question.id ?? "";
              const selectedOpt = attempt.answers[qId];
              const correctParts = (question.correct_option || "").split(",").map((o: string) => o.trim()).filter(Boolean).sort();
              const selectedParts = (selectedOpt || "").split(",").map((o: string) => o.trim()).filter(Boolean).sort();
              const isCorrect = correctParts.length > 0 &&
                                selectedParts.length === correctParts.length &&
                                selectedParts.every((val: string, index: number) => val === correctParts[index]);
              const isUnattempted = !selectedOpt;
              const isMSQ = (question.correct_option || "").includes(",");

              let cardBorder = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";
              let qBadge = null;

              if (isCorrect) {
                cardBorder = "border-emerald-300 dark:border-emerald-900/60 bg-white/80 dark:bg-slate-900/30 hover:border-emerald-400 dark:hover:border-emerald-800 shadow-[0_0_12px_rgba(16,185,129,0.03)]";
                qBadge = <Badge tone="green" className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md">Correct (+{test.correct_marks} Marks)</Badge>;
              } else if (isUnattempted) {
                cardBorder = "border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/30 hover:border-slate-355 dark:hover:border-slate-700 shadow-sm";
                qBadge = <Badge tone="slate" className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md">Unattempted ({test.unattempt_marks} Marks)</Badge>;
              } else {
                cardBorder = "border-rose-300 dark:border-rose-900/60 bg-white/80 dark:bg-slate-900/30 hover:border-rose-400 dark:hover:border-rose-800 shadow-[0_0_12px_rgba(239,68,68,0.03)]";
                const marksDisplay = isMSQ ? "0" : test.wrong_marks;
                qBadge = <Badge tone="red" className="font-extrabold text-[10px] tracking-wide px-2.5 py-0.5 rounded-md">Incorrect ({marksDisplay} Marks)</Badge>;
              }

              return (
                <article key={qId} className={`rounded-2xl border p-5 md:p-6 shadow-sm transition duration-300 backdrop-blur-md relative overflow-hidden group ${cardBorder}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/60 relative z-10">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest">
                      QUESTION {index + 1}
                    </span>
                    {qBadge}
                  </div>

                  {question.passage_id && (
                    <div className="mb-5 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150/80 dark:border-slate-800/60 relative z-10">
                      {passageCache[question.passage_id] ? (
                        <>
                          <h4 className="text-[9px] font-black text-indigo-650 dark:text-indigo-400 border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5 mb-2.5 uppercase tracking-widest">
                            Passage: {passageCache[question.passage_id].title}
                          </h4>
                          <p className="text-slate-600 dark:text-slate-400 text-xs font-semibold leading-relaxed whitespace-pre-wrap">
                            {passageCache[question.passage_id].content}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-405 font-bold animate-pulse">
                          Loading passage text...
                        </p>
                      )}
                    </div>
                  )}

                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-150 mb-5 leading-relaxed relative z-10">
                    {question.question}
                  </h3>

                  {(question.image_url || question.media_url) && (
                    <div className="mt-4 mb-5 flex justify-start relative z-10">
                      <img
                        src={question.image_url || question.media_url}
                        alt="Question Graphic"
                        loading="lazy"
                        className="max-h-96 w-auto max-w-full rounded-xl border border-slate-200 dark:border-slate-800 object-contain shadow-sm bg-white dark:bg-slate-900 aspect-auto"
                      />
                    </div>
                  )}

                  {/* Options List */}
                  <div className="grid gap-3 mb-5 relative z-10">
                    {(["option1", "option2", "option3", "option4"] as const).map((optKey, oIdx) => {
                      const optText = question[optKey];
                      const optLetter = String.fromCharCode(65 + oIdx);
                      const isSelected = selectedOpt
                        ? selectedOpt.split(",").map((o: string) => o.trim()).includes(optKey)
                        : false;
                      const isCorrOpt = question.correct_option
                        ? question.correct_option.split(",").map((o: string) => o.trim()).includes(optKey)
                        : false;

                      let optStyle = "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/40";
                      let icon = null;
                      let letterCircleStyle = "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900";

                      if (isSelected) {
                        if (isCorrOpt) {
                          optStyle = isMSQ 
                            ? "border-purple-500 dark:border-purple-400 bg-purple-50/30 dark:bg-purple-950/20 text-purple-900 dark:text-purple-100 shadow-sm font-bold"
                            : "border-emerald-500 dark:border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 shadow-sm font-bold";
                          icon = <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
                          letterCircleStyle = isMSQ
                            ? "bg-gradient-to-tr from-purple-600 to-fuchsia-500 border-none text-white font-extrabold shadow-sm"
                            : "bg-emerald-600 border-emerald-600 text-white font-bold";
                        } else {
                          optStyle = "border-rose-500 dark:border-rose-450 bg-rose-50/30 dark:bg-rose-955/20 text-rose-900 dark:text-rose-100 shadow-sm font-bold";
                          icon = <X className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />;
                          letterCircleStyle = "bg-rose-600 border-rose-600 text-white font-bold";
                        }
                      } else if (isCorrOpt) {
                        optStyle = "border-emerald-350 dark:border-emerald-800/85 bg-emerald-50/20 dark:bg-emerald-955/10 text-emerald-800 dark:text-emerald-300 shadow-sm font-bold";
                        icon = <Check className="h-4 w-4 text-emerald-500 shrink-0 animate-bounce-slow" />;
                        letterCircleStyle = "bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-850 text-emerald-850 dark:text-emerald-305";
                      }

                      return (
                        <div
                          key={optKey}
                          className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-semibold transition-all duration-200 hover:scale-[1.005] ${optStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-6.5 w-6.5 flex items-center justify-center font-black text-xs border shrink-0 transition-all duration-200 ${isMSQ ? "rounded-lg" : "rounded-full"} ${letterCircleStyle}`}>
                              {optLetter}
                            </div>
                            <span className="font-semibold leading-relaxed">{optText}</span>
                          </div>
                          {icon}
                        </div>
                      );
                    })}
                  </div>

                </article>
              );
            })}
          </div>
        </section>

        {/* Footer Actions */}
        <div className="flex justify-center gap-4 mt-10 border-t border-slate-200 dark:border-slate-800 pt-6 print:hidden">
          <Link to="/dashboard">
            <Button variant="secondary" className="h-10 rounded-xl font-bold border-slate-200 dark:border-slate-800 hover:border-slate-355 transition-all text-xs px-5">
              Go to Dashboard
            </Button>
          </Link>
          <Button
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-10 px-5 rounded-xl shadow-md shadow-indigo-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all border-none inline-flex items-center gap-2"
          >
            Print Report Card
          </Button>
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
          @media print {
            aside, header, .print\\:hidden {
              display: none !important;
            }
            main {
              padding-top: 0 !important;
              padding-left: 0 !important;
              margin: 0 !important;
            }
            body {
              background: white !important;
              color: black !important;
            }
          }
          .animate-bounce-slow {
            animation: bounce 2s infinite;
          }
          @keyframes bounce {
            0%, 100% {
              transform: translateY(-5%);
              animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
            }
            50% {
              transform: translateY(0);
              animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
            }
          }
        `}} />
      </PageWrapper>
    </AppShell>
  );
};
