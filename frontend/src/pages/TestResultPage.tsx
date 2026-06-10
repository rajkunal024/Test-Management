import { useMemo, useEffect } from "react";
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
import { fetchBulkQuestions, getAllAttempts } from "../services/api";
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
    enabled: Boolean(test?.questions?.length) && !hasTestCopy,
  });

  const questions = useMemo(() => {
    let baseQuestions = [];
    if (attempt?.test_copy && attempt.test_copy.length > 0) {
      baseQuestions = attempt.test_copy.map((q: any) => ({
        id: q.id,
        type: "mcq" as const,
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correct_option: q.correct_option,
        media_url: q.media_url,
        image_url: q.image_url,
      }));
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

      const sortedQuestions = [...baseQuestions].sort((a: any, b: any) => (a.id || "").localeCompare(b.id || ""));
      const seed = `${attempt.user_id}-${test.id}`;
      return getDeterministicSubset(sortedQuestions, test.total_questions, seed);
    }

    return baseQuestions;
  }, [attempt, fetchedQuestions, test]);

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
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-bold text-[#6c7df7] hover:underline uppercase">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>

        {/* Scorecard Hero Banner / Answer Key Mode */}
        {scorecard && (
          <section className="mb-8 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row">
            {/* Left Box: Percentage Circle */}
            <div className={`p-8 bg-gradient-to-br ${scorecard.gradient} text-white flex flex-col items-center justify-center text-center md:w-[280px]`}>
              <span className="text-xs font-bold uppercase tracking-wider opacity-75">Your Score</span>

              <div className="relative flex items-center justify-center mt-4 mb-4 h-36 w-36 rounded-full border-4 border-white/20 bg-white/10">
                <div className="text-center">
                  <span className="text-4xl font-extrabold">{scorecard.pct}%</span>
                  <p className="text-[10px] font-semibold opacity-75 uppercase tracking-wide mt-0.5">
                    {scorecard.score} / {scorecard.maxMarks} M
                  </p>
                </div>
              </div>

              <Badge tone={
                (test.difficulty || "").toLowerCase().trim() === "easy" ? "green" :
                  (test.difficulty || "").toLowerCase().trim() === "medium" ? "yellow" :
                    (((test.difficulty || "").toLowerCase().trim() === "hard" || (test.difficulty || "").toLowerCase().trim() === "difficult") ? "red" : "slate")
              }>
                {test.difficulty}
              </Badge>
            </div>

            {/* Right Box: Performance Analytics */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 uppercase tracking-wide">
                  <Sparkles className="h-4 w-4 animate-pulse text-amber-500" />
                  Performance Summary
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 mt-2">{scorecard.heading}</h2>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{scorecard.desc}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 border-t border-slate-100 pt-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Accuracy</span>
                  <span className="text-lg font-bold text-slate-700 mt-1 block">{scorecard.accuracy}%</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Time Taken</span>
                  <span className="text-lg font-bold text-slate-700 mt-1 block flex items-center gap-1">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {scorecard.timeStr}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Correct Answers</span>
                  <span className="text-lg font-bold text-emerald-600 mt-1 block flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {attempt.correct_answers}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Wrong Answers</span>
                  <span className="text-lg font-bold text-rose-500 mt-1 block flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    {attempt.wrong_answers}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Detailed Solutions */}
        <section className="mb-8">
          <h2 className="mb-4 text-base font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            Detailed Solutions
          </h2>

          <div className="space-y-6">
            {questions.map((question: any, index: number) => {
              const qId = question.id ?? "";
              const selectedOpt = attempt.answers[qId];
              const isCorrect = selectedOpt === question.correct_option;
              const isUnattempted = !selectedOpt;

              let cardBorder = "border-slate-200";
              let qBadge = null;

              if (isCorrect) {
                cardBorder = "border-emerald-200 bg-emerald-50/10";
                qBadge = <Badge tone="green">Correct (+{test.correct_marks} Marks)</Badge>;
              } else if (isUnattempted) {
                cardBorder = "border-slate-200 bg-slate-50/10";
                qBadge = <Badge tone="slate">Unattempted ({test.unattempt_marks} Marks)</Badge>;
              } else {
                cardBorder = "border-rose-200 bg-rose-50/10";
                qBadge = <Badge tone="red">Incorrect ({test.wrong_marks} Marks)</Badge>;
              }

              return (
                <article key={qId} className={`rounded-xl border p-5 md:p-6 bg-white shadow-sm transition ${cardBorder}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-400 tracking-wider">
                      QUESTION {index + 1}
                    </span>
                    {qBadge}
                  </div>

                  <h3 className="text-base font-bold text-slate-800 mb-5 leading-relaxed">
                    {question.question}
                  </h3>

                  {(question.image_url || question.media_url) && (
                    <div className="mt-4 mb-4 flex justify-start">
                      <img
                        src={question.image_url || question.media_url}
                        alt="Question Graphic"
                        loading="lazy"
                        className="max-h-96 w-auto max-w-full rounded-lg border border-slate-200 object-contain shadow-sm bg-white aspect-auto"
                      />
                    </div>
                  )}

                  {/* Options List */}
                  <div className="grid gap-3 mb-5">
                    {(["option1", "option2", "option3", "option4"] as const).map((optKey, oIdx) => {
                      const optText = question[optKey];
                      const optLetter = String.fromCharCode(65 + oIdx);
                      const isSelected = selectedOpt === optKey;
                      const isCorrOpt = question.correct_option === optKey;

                      let optStyle = "border-slate-100 text-slate-600";
                      let icon = null;
                      let letterCircleStyle = "border-slate-200 text-slate-400 bg-white";

                      if (isSelected) {
                        if (isCorrect) {
                          optStyle = "border-emerald-500 bg-emerald-50 text-emerald-900";
                          icon = <Check className="h-4 w-4 text-emerald-600" />;
                          letterCircleStyle = "bg-emerald-600 border-emerald-600 text-white";
                        } else {
                          optStyle = "border-rose-500 bg-rose-50 text-rose-900";
                          icon = <X className="h-4 w-4 text-rose-600" />;
                          letterCircleStyle = "bg-rose-600 border-rose-600 text-white";
                        }
                      } else if (isCorrOpt) {
                        optStyle = "border-emerald-300 bg-emerald-50/30 text-emerald-800";
                        icon = <Check className="h-4 w-4 text-emerald-500" />;
                        letterCircleStyle = "bg-emerald-100 border-emerald-300 text-emerald-800";
                      }

                      return (
                        <div
                          key={optKey}
                          className={`flex items-center justify-between p-3.5 rounded-lg border text-sm font-semibold ${optStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-6 w-6 rounded flex items-center justify-center font-bold text-xs border ${letterCircleStyle}`}>
                              {optLetter}
                            </div>
                            <span>{optText}</span>
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
        <div className="flex justify-center gap-4 mt-8 border-t border-slate-200 pt-6 print:hidden">
          <Link to="/dashboard">
            <Button variant="secondary">Go to Dashboard</Button>
          </Link>
          <Button
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold inline-flex items-center gap-2"
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
        `}} />
      </PageWrapper>
    </AppShell>
  );
};
