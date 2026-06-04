import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Send,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useTest } from "../hooks/useTests";
import { fetchBulkQuestions, submitAttempt, getAllAttempts } from "../services/api";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Logo } from "../components/layout/Logo";
import { useAuthStore } from "../store/authStore";

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

export const AttemptTestPage = () => {
  const user = useAuthStore((state) => state.user);
  const { id = "" } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== "Student") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const { data: attempts = [] } = useQuery({
    queryKey: ["attempts"],
    queryFn: getAllAttempts,
    enabled: Boolean(user?.userId),
  });

  useEffect(() => {
    if (user && attempts.some(a => a.test_id === id && a.user_id === user.userId)) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate, attempts, id]);
  const { data: test, isLoading: isLoadingTest } = useTest(id);

  // Fetch Questions
  const { data: rawQuestions = [], isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["questions", id, test?.questions],
    queryFn: () => fetchBulkQuestions(test?.questions ?? []),
    enabled: Boolean(test?.questions?.length),
  });

  const questions = useMemo(() => {
    if (!test || !rawQuestions.length) return [];
    // Sort rawQuestions by ID to ensure identical ordering as the backend
    const sortedQuestions = [...rawQuestions].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
    const seed = `${user?.userId || "student"}-${test.id}`;
    return getDeterministicSubset(sortedQuestions, test.total_questions, seed);
  }, [test, rawQuestions, user?.userId]);

  // State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({ "0": true });
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  
  // Modals
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Initialize Timer
  useEffect(() => {
    if (test && timeLeft === null) {
      let durationSeconds = test.total_time * 60;
      if (test.end_time) {
        const now = new Date().getTime();
        const end = new Date(test.end_time).getTime();
        if (!isNaN(end) && end > 0) {
          const remainingWindowSeconds = Math.max(0, Math.floor((end - now) / 1000));
          durationSeconds = Math.min(durationSeconds, remainingWindowSeconds);
        }
      }
      setTimeLeft(durationSeconds);
    }
  }, [test, timeLeft]);

  // Timer Tick
  useEffect(() => {
    if (timeLeft === null || confirmOpen) return;

    if (timeLeft <= 0) {
      // Auto submit
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, confirmOpen]);

  // Mutation to submit the attempt
  const submitMutation = useMutation({
    mutationFn: submitAttempt,
    onSuccess: (data) => {
      navigate("/dashboard");
    },
    onError: (err) => {
      alert("Error submitting test. Please try again.");
      console.error(err);
    },
  });

  // Handlers
  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleClearResponse = (questionId: string) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  const handleMarkReview = (questionId: string) => {
    setMarked((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
    // Move to next question if not at end
    if (currentIdx < questions.length - 1) {
      handleNext();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      const prevIdx = currentIdx - 1;
      setCurrentIdx(prevIdx);
      setVisited((prev) => ({ ...prev, [prevIdx]: true }));
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setVisited((prev) => ({ ...prev, [nextIdx]: true }));
    }
  };

  const handleSelectQuestion = (idx: number) => {
    setCurrentIdx(idx);
    setVisited((prev) => ({ ...prev, [idx]: true }));
  };

  const handleManualSubmit = () => {
    setConfirmOpen(true);
  };

  const executeSubmission = () => {
    if (!test) return;
    submitMutation.mutate({
      test_id: test.id,
      user_id: user?.userId,
      answers,
      time_spent: timeSpent,
    });
  };

  const handleAutoSubmit = () => {
    if (!test) return;
    submitMutation.mutate({
      test_id: test.id,
      user_id: user?.userId,
      answers,
      time_spent: timeSpent,
    });
  };

  // Formatting Timer (strictly min:sec)
  const formattedTimeLeft = useMemo(() => {
    if (timeLeft === null) return "00:00";
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [timeLeft]);

  // Statistics for Sidebar
  const stats = useMemo(() => {
    let answered = 0;
    let markedCount = 0;
    let notAnswered = 0;
    let notVisited = 0;

    questions.forEach((q, idx) => {
      const isAns = answers[q.id ?? ""] !== undefined;
      const isMarked = marked[q.id ?? ""] === true;
      const isVis = visited[idx] === true;

      if (isAns) {
        answered++;
      } else if (isVis && !isAns) {
        notAnswered++;
      } else {
        notVisited++;
      }

      if (isMarked) {
        markedCount++;
      }
    });

    return { answered, marked: markedCount, notAnswered, notVisited };
  }, [questions, answers, marked, visited]);

  const isSlotValid = useMemo(() => {
    if (!test) return true;
    if (!test.start_time || !test.end_time) return true;
    const now = new Date().getTime();
    const start = new Date(test.start_time).getTime();
    const end = new Date(test.end_time).getTime();
    return now >= start && now <= end;
  }, [test]);

  if (isLoadingTest || isLoadingQuestions || !test) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">
        <div className="text-center">
          <Spinner />
          <p className="mt-3 text-sm font-medium">Preparing your exam environment...</p>
        </div>
      </div>
    );
  }

  if (!isSlotValid) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 p-6">
        <div className="text-center max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Test Slot Inactive</h2>
          <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
            This test is not currently active. The scheduled time slot is from{" "}
            <span className="font-semibold block my-1">
              {test.start_time ? new Date(test.start_time).toLocaleString() : "N/A"} to{" "}
              {test.end_time ? new Date(test.end_time).toLocaleString() : "N/A"}
            </span>
          </p>
          <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const totalQuestions = questions.length;

  if (totalQuestions === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 p-6">
        <div className="text-center max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">No Questions Available</h2>
          <p className="text-sm text-slate-500 mb-6">
            This test doesn't contain any questions yet. Please contact the administrator.
          </p>
          <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Distraction-Free Header */}
      <header className="h-[72px] bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <Logo compact />
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-slate-800 line-clamp-1">{test.name}</h1>
            <p className="text-[10px] font-semibold text-indigo-500 tracking-wider uppercase mt-0.5">
              {test.subject} • {test.type.replace("_", " ")}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="hidden md:flex flex-col items-center flex-1 max-w-md px-10">
          <div className="flex justify-between w-full text-[10px] font-bold text-slate-400 mb-1">
            <span>PROGRESS</span>
            <span>{Math.round((stats.answered / totalQuestions) * 100)}% ({stats.answered}/{totalQuestions})</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300 rounded-full" 
              style={{ width: `${(stats.answered / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Timer Component */}
        <div className="flex items-center gap-4">
          <div 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-mono text-sm font-bold transition duration-300 ${
              timeLeft !== null && timeLeft < 300 
                ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse" 
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <Clock className={`h-4 w-4 ${timeLeft !== null && timeLeft < 300 ? "text-rose-500" : "text-slate-500"}`} />
            <span>Time Remaining: {formattedTimeLeft}</span>
          </div>

          <Button 
            variant="primary" 
            onClick={handleManualSubmit}
            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-xs px-4"
            icon={<Send className="h-3.5 w-3.5" />}
          >
            Submit
          </Button>
        </div>
      </header>

      {/* Main Attempt Area */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] mx-auto w-full p-4 lg:p-6 gap-6">
        
        {/* Left Column: Question Card */}
        <main className="flex-1 flex flex-col min-w-0">
          <article className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 p-6 lg:p-8">
            {/* Question Header Info */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                QUESTION {currentIdx + 1} OF {totalQuestions}
              </span>
              <div className="flex items-center gap-2">
                <Badge tone={
                  (test.difficulty || "").toLowerCase().trim() === "easy" ? "green" : 
                  (test.difficulty || "").toLowerCase().trim() === "medium" ? "yellow" : 
                  (((test.difficulty || "").toLowerCase().trim() === "hard" || (test.difficulty || "").toLowerCase().trim() === "difficult") ? "red" : "slate")
                }>
                  {test.difficulty}
                </Badge>
                <Badge tone="blue">+{test.correct_marks} / {test.wrong_marks} Marks</Badge>
              </div>
            </div>

            {/* Question Prompt */}
            <div className="flex-1 mb-8">
              <h2 className="text-base md:text-lg font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Multiple Choice Options */}
            <div className="grid gap-3 mb-8">
              {(["option1", "option2", "option3", "option4"] as const).map((optKey, oIdx) => {
                const optText = currentQuestion[optKey];
                const optionLetter = String.fromCharCode(65 + oIdx); // A, B, C, D
                const isSelected = answers[currentQuestion.id ?? ""] === optKey;

                return (
                  <button
                    key={optKey}
                    onClick={() => handleSelectOption(currentQuestion.id ?? "", optKey)}
                    className={`flex items-center gap-4 w-full text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/50 shadow-sm text-indigo-900"
                        : "border-slate-100 hover:border-slate-300 hover:bg-slate-50/30 text-slate-700"
                    }`}
                  >
                    <div 
                      className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-sm border-2 shrink-0 transition-all ${
                        isSelected 
                          ? "bg-indigo-600 border-indigo-600 text-white" 
                          : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {optionLetter}
                    </div>
                    <span className="text-sm font-semibold leading-relaxed">{optText}</span>
                  </button>
                );
              })}
            </div>

            {/* Actions Footer */}
            <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-6 gap-4">
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => handleClearResponse(currentQuestion.id ?? "")}
                  disabled={answers[currentQuestion.id ?? ""] === undefined}
                  className="text-xs text-rose-600 hover:bg-rose-50 h-10 px-3.5"
                >
                  Clear Response
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleMarkReview(currentQuestion.id ?? "")}
                  className={`text-xs h-10 px-4 ${
                    marked[currentQuestion.id ?? ""] 
                      ? "bg-purple-100 text-purple-700 hover:bg-purple-200" 
                      : "text-purple-600 hover:bg-purple-50"
                  }`}
                  icon={<Bookmark className="h-3.5 w-3.5" />}
                >
                  {marked[currentQuestion.id ?? ""] ? "Marked" : "Mark for Review"}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={currentIdx === 0}
                  onClick={handlePrev}
                  className="h-10 text-xs px-3"
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>
                
                {currentIdx === totalQuestions - 1 ? (
                  <Button
                    onClick={handleManualSubmit}
                    className="h-10 text-xs px-5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Finish Test
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="h-10 text-xs px-5 bg-indigo-600 hover:bg-indigo-700 text-white"
                    icon={<ChevronRight className="h-4 w-4" />}
                  >
                    Save & Next
                  </Button>
                )}
              </div>
            </div>
          </article>
        </main>

        {/* Right Column: Question Navigator Sidebar */}
        <aside className="w-full lg:w-[320px] flex flex-col gap-6 shrink-0">
          
          {/* Palette Card */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Question Navigator
            </h3>
            
            {/* Grid */}
            <div className="grid grid-cols-5 gap-2.5 mb-6">
              {questions.map((q, idx) => {
                const qId = q.id ?? "";
                const isAns = answers[qId] !== undefined;
                const isMarked = marked[qId] === true;
                const isVis = visited[idx] === true;
                const isCurrent = currentIdx === idx;

                let btnBg = "bg-slate-50 text-slate-400 border-slate-200";
                
                if (isAns && isMarked) {
                  // Answered and Marked for Review
                  btnBg = "bg-purple-500 border-purple-500 text-white";
                } else if (isMarked) {
                  // Marked for Review (unanswered)
                  btnBg = "bg-purple-100 border-purple-200 text-purple-700";
                } else if (isAns) {
                  // Answered / Saved
                  btnBg = "bg-emerald-500 border-emerald-500 text-white";
                } else if (isVis) {
                  // Visited but unanswered
                  btnBg = "bg-rose-100 border-rose-200 text-rose-700";
                }

                return (
                  <button
                    key={qId}
                    onClick={() => handleSelectQuestion(idx)}
                    className={`h-11 w-full rounded-lg font-bold text-sm border flex items-center justify-center transition-all ${btnBg} ${
                      isCurrent ? "ring-2 ring-indigo-500 ring-offset-2 scale-105" : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend / Status Block */}
            <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <span className="h-3 w-3 rounded bg-emerald-500 shrink-0" />
                <span>Answered ({stats.answered})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <span className="h-3 w-3 rounded bg-rose-100 border border-rose-200 shrink-0" />
                <span>Not Answered ({stats.notAnswered})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <span className="h-3 w-3 rounded bg-purple-100 border border-purple-200 shrink-0" />
                <span>Marked ({stats.marked})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <span className="h-3 w-3 rounded bg-slate-50 border border-slate-200 shrink-0" />
                <span>Not Visited ({stats.notVisited})</span>
              </div>
            </div>
          </section>

          {/* Test Summary / Instructions Card */}
          <section className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-md">
            <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-indigo-400" />
              Exam Instructions
            </h4>
            <ul className="text-xs text-slate-300 space-y-2 leading-relaxed list-disc list-inside">
              <li>Marks Scheme: +{test.correct_marks} / {test.wrong_marks} marks.</li>
              <li>Leaving or refreshing the tab does NOT pause the timer.</li>
              <li>Auto-submit occurs when the timer ends.</li>
              <li>Review marked questions using the navigator palette.</li>
            </ul>
          </section>
        </aside>
      </div>

      {/* Confirmation Modal */}
      <Modal
        open={confirmOpen}
        title="Submit Test"
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={submitMutation.isPending}>
              Resume Test
            </Button>
            <Button 
              onClick={executeSubmission}
              disabled={submitMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitMutation.isPending ? "Submitting..." : "Yes, Submit Test"}
            </Button>
          </>
        }
      >
        <div className="text-slate-600 text-sm">
          <p className="font-bold text-slate-800 text-base mb-3">Are you sure you want to submit your test?</p>
          <p className="mb-4">Once submitted, you will not be able to edit any answers.</p>
          
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 gap-3 font-semibold mt-4">
            <span className="text-slate-500">Total Questions:</span>
            <span className="text-slate-800 text-right">{totalQuestions}</span>
            <span className="text-emerald-600">Answered:</span>
            <span className="text-emerald-600 text-right">{stats.answered}</span>
            <span className="text-purple-600">Marked for Review:</span>
            <span className="text-purple-600 text-right">{stats.marked}</span>
            <span className="text-rose-500">Unanswered / Skipped:</span>
            <span className="text-rose-500 text-right">{totalQuestions - stats.answered}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
