import { useEffect, useState, useMemo, useRef } from "react";
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
import { fetchBulkQuestions, submitAttempt, getAllAttempts, uploadStreamFrame } from "../services/api";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Toast } from "../components/ui/Toast";
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

  // Proctoring States and Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [streamError, setStreamError] = useState(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startProctoring = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: true,
        });
        activeStream = stream;
        setCameraStream(stream);
        setHasVideo(stream.getVideoTracks().length > 0);
        setHasAudio(stream.getAudioTracks().length > 0);
        setStreamError(false);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Proctoring connection error:", err);
        setStreamError(true);
      }
    };

    startProctoring();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Periodic stream frame upload with WebSockets and HTTP fallback
  useEffect(() => {
    if (!cameraStream || !user) return;

    let ws: WebSocket | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    let wsInterval: NodeJS.Timeout | null = null;
    let isWsConnecting = false;
    let isDestroyed = false;

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");

    const captureFrame = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.5);
      }
      return null;
    };

    const startHttpFallback = () => {
      if (fallbackInterval) return;
      console.log("Using HTTP fallback for proctoring...");
      fallbackInterval = setInterval(async () => {
        try {
          const frame = captureFrame();
          if (frame) {
            await uploadStreamFrame({
              test_id: id || "",
              user_id: user.userId || "",
              username: user.name || user.userId || "",
              frame: frame,
              hasVideo: hasVideo,
              hasAudio: hasAudio
            });
          }
        } catch (err) {
          console.error("HTTP proctor fallback error:", err);
        }
      }, 3000);
    };

    const connectWS = () => {
      if (isDestroyed || ws || isWsConnecting) return;
      isWsConnecting = true;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // Connect to port 4000 (backend)
      const wsUrl = `${protocol}//127.0.0.1:4000/api/proctor/stream?role=student&test_id=${id}&user_id=${user.userId}&username=${encodeURIComponent(user.name || user.userId || "")}`;

      console.log("Connecting to proctor WS:", wsUrl);
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (isDestroyed) {
          socket.close();
          return;
        }
        console.log("Proctor WS connected successfully.");
        ws = socket;
        isWsConnecting = false;

        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }

        // Stream frames at 250ms for live quality
        wsInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            const frame = captureFrame();
            if (frame) {
              socket.send(JSON.stringify({
                type: "frame",
                frame,
                hasVideo,
                hasAudio
              }));
            }
          }
        }, 250);
      };

      socket.onerror = (err) => {
        console.error("Proctor WS error:", err);
      };

      socket.onclose = () => {
        if (isDestroyed) return;
        console.log("Proctor WS closed. Falling back to HTTP.");
        ws = null;
        isWsConnecting = false;
        if (wsInterval) {
          clearInterval(wsInterval);
          wsInterval = null;
        }
        startHttpFallback();
        // Try to reconnect in 5 seconds
        setTimeout(connectWS, 5000);
      };
    };

    connectWS();

    return () => {
      isDestroyed = true;
      if (ws) {
        ws.close();
      }
      if (wsInterval) {
        clearInterval(wsInterval);
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [cameraStream, id, user, hasVideo, hasAudio]);

  // Disable copy, cut, paste, and context menu on the test screen
  useEffect(() => {
    const preventAction = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("copy", preventAction);
    document.addEventListener("cut", preventAction);
    document.addEventListener("paste", preventAction);
    document.addEventListener("contextmenu", preventAction);

    return () => {
      document.removeEventListener("copy", preventAction);
      document.removeEventListener("cut", preventAction);
      document.removeEventListener("paste", preventAction);
      document.removeEventListener("contextmenu", preventAction);
    };
  }, []);

  // Monitor tab switching / window blurring (visibility changes and window focus/blur)
  const tabSwitchesRef = useRef(0);
  const isTabOutRef = useRef(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleTabAway = () => {
      if (!isTabOutRef.current) {
        isTabOutRef.current = true;
        tabSwitchesRef.current += 1;
        setTabSwitches(tabSwitchesRef.current);
      }
    };

    const handleTabBack = () => {
      if (isTabOutRef.current) {
        isTabOutRef.current = false;
        setWarningMessage(`Warning: You switched tabs! This activity has been recorded and reported to the administrator. (Tab switch count: ${tabSwitchesRef.current})`);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleTabAway();
      } else if (document.visibilityState === "visible") {
        handleTabBack();
      }
    };

    const handleWindowBlur = () => {
      handleTabAway();
    };

    const handleWindowFocus = () => {
      handleTabBack();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  useEffect(() => {
    if (warningMessage) {
      const timer = setTimeout(() => {
        setWarningMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [warningMessage]);

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
  
  // Refs to always hold latest values (avoid stale closures in timer callbacks)
  const answersRef = useRef<Record<string, string>>({});
  const timeSpentRef = useRef(0);
  const hasSubmittedRef = useRef(false);

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

  // Timer Tick — uses a single persistent interval, not one per tick
  useEffect(() => {
    if (timeLeft === null) return;

    // If timer already expired when effect runs (e.g. page load with 0s left)
    if (timeLeft <= 0) {
      triggerAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        const next = prev - 1;
        if (next <= 0) {
          // Use setTimeout to trigger submit outside of setState call
          setTimeout(() => triggerAutoSubmit(), 0);
          return 0;
        }
        return next;
      });
      setTimeSpent((prev) => {
        const updated = prev + 1;
        timeSpentRef.current = updated;
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft === null]);

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
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: option };
      answersRef.current = updated;
      return updated;
    });
  };

  const handleClearResponse = (questionId: string) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      answersRef.current = copy;
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
    if (!test || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    submitMutation.mutate({
      test_id: test.id,
      user_id: user?.userId,
      answers: answersRef.current,
      time_spent: timeSpentRef.current,
      tab_switches: tabSwitchesRef.current,
    });
  };

  // Auto-submit: reads from refs so it always gets the latest answers even
  // when called from inside a stale closure (e.g. the interval callback).
  const triggerAutoSubmit = () => {
    if (!test || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    submitMutation.mutate({
      test_id: test.id,
      user_id: user?.userId,
      answers: answersRef.current,       // always latest
      time_spent: timeSpentRef.current,  // always latest
      tab_switches: tabSwitchesRef.current,
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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col select-none">
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
          
          {/* Proctoring Card */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              Live Proctoring Feed
            </h3>
            <div className="relative aspect-video rounded-lg bg-slate-950 overflow-hidden shadow-inner border border-slate-200 flex items-center justify-center">
              {streamError ? (
                <div className="text-center p-3 text-rose-500">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider">Permission Denied</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Camera & microphone access is required for proctoring.
                  </p>
                </div>
              ) : !cameraStream ? (
                <div className="text-center text-slate-400">
                  <div className="h-6 w-6 mx-auto mb-2 text-indigo-500 flex items-center justify-center">
                    <Spinner />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider">Connecting Devices...</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-semibold">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className={`h-2 w-2 rounded-full ${cameraStream && hasVideo ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span>Camera: {cameraStream && hasVideo ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className={`h-2 w-2 rounded-full ${cameraStream && hasAudio ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                <span>Microphone: {cameraStream && hasAudio ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </section>

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
      {warningMessage && <Toast tone="error">{warningMessage}</Toast>}
    </div>
  );
};
