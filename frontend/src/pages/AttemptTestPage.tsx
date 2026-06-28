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
  Sun,
  Moon,
  Info,
  MessageSquare,
  LayoutGrid,
  Check,
  Sliders,
  Eye,
} from "lucide-react";
import { useTest } from "../hooks/useTests";
import { fetchBulkQuestions, submitAttempt, getAllAttempts, uploadStreamFrame, getPassageById, getMyOrganization } from "../services/api";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Toast } from "../components/ui/Toast";
import { Logo } from "../components/layout/Logo";
import { useAuthStore } from "../store/authStore";
import { Passage } from "../types";

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

export const AttemptTestPage = () => {
  const user = useAuthStore((state) => state.user);
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { data: orgData } = useQuery({
    queryKey: ["myOrganization"],
    queryFn: getMyOrganization,
    enabled: Boolean(user?.userId),
  });

  // Pre-Test Environment Check States
  const [envChecked, setEnvChecked] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isScreenSizeOk, setIsScreenSizeOk] = useState(window.innerWidth >= 768);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);

  // Time-ticking state to dynamically update start-time readiness
  const [currentTime, setCurrentTime] = useState(new Date().getTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen and violation monitoring states and refs
  const storageKeyFullscreenViolations = `attempt_fullscreen_violations_${id}_${user?.userId}`;
  const [fullscreenViolations, setFullscreenViolations] = useState(() => {
    const saved = localStorage.getItem(`attempt_fullscreen_violations_${id}_${user?.userId}`);
    return saved ? Number(saved) : 0;
  });
  const [fullscreenWarningOpen, setFullscreenWarningOpen] = useState(false);
  const fullscreenViolationsRef = useRef(fullscreenViolations);
  const autoSubmitRef = useRef<() => void>();

  useEffect(() => {
    if (user?.userId && id) {
      localStorage.setItem(storageKeyFullscreenViolations, String(fullscreenViolations));
      fullscreenViolationsRef.current = fullscreenViolations;
    }
  }, [fullscreenViolations, storageKeyFullscreenViolations, user?.userId, id]);

  const enterFullscreen = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch((err) => {
        console.error("Error entering fullscreen:", err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      
      if (envChecked && !active) {
        fullscreenViolationsRef.current += 1;
        setFullscreenViolations(fullscreenViolationsRef.current);
        setFullscreenWarningOpen(true);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [envChecked]);

  // Theme state
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Proctoring States and Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const proctorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const navigatorSidebarRef = useRef<HTMLElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenStoppedMidTest, setIsScreenStoppedMidTest] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [streamError, setStreamError] = useState(false);

  // Sectional timers states
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [sectionTimeoutAlertOpen, setSectionTimeoutAlertOpen] = useState(false);
  const [timeoutInfo, setTimeoutInfo] = useState<{ prevName: string; nextName: string } | null>(null);

  const handleAuthorizeScreenSharing = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { max: 640 },
          height: { max: 480 },
          frameRate: { max: 10 }
        },
        audio: false
      });
      setScreenStream(stream);
      setIsScreenStoppedMidTest(false);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setScreenStream(null);
          setIsScreenStoppedMidTest(true);
        };
      }
    } catch (err) {
      console.error("Screen share authorization error:", err);
      alert("Screen sharing is required. Please authorize screen sharing to proceed.");
    }
  };

  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [screenStream]);

  // Proctor Chat States
  interface ChatMessage {
    sender: string;
    text: string;
    timestamp: number;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Toggle States for Header Popovers
  const [showInstructions, setShowInstructions] = useState(false);
  const [showNavigatorPopover, setShowNavigatorPopover] = useState(false);
  const [showProctorFeed, setShowProctorFeed] = useState(false);
  const [unreadChat, setUnreadChat] = useState(false);

  // Internet connectivity monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Screen size check monitoring
  useEffect(() => {
    const handleResize = () => {
      setIsScreenSizeOk(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const proctorStartedRef = useRef(false);

  const startProctoring = async () => {
    if (orgData && orgData.securityFeatures?.cameraMonitoring === false) {
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("MediaDevices or getUserMedia is not supported in this context.");
      setStreamError(true);
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: true,
        });
      } catch (err) {
        console.warn("Failed to get video and audio, retrying with video only...", err);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: false,
        });
      }
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setHasVideo(stream.getVideoTracks().length > 0);
      setHasAudio(stream.getAudioTracks().length > 0);
      setStreamError(false);

      if (hiddenVideoRef.current) {
        hiddenVideoRef.current.srcObject = stream;
        hiddenVideoRef.current.play().catch((e) => console.error("Hidden video play error:", e));
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.error("Video play error:", e));
      }
    } catch (err) {
      console.error("Proctoring connection error:", err);
      setStreamError(true);
    }
  };

  useEffect(() => {
    if (orgData === undefined) return;
    if (proctorStartedRef.current) return;

    if (orgData?.securityFeatures?.cameraMonitoring !== false) {
      proctorStartedRef.current = true;
      startProctoring();
    }

    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [orgData]);

  useEffect(() => {
    if (cameraStream) {
      if (hiddenVideoRef.current && hiddenVideoRef.current.srcObject !== cameraStream) {
        hiddenVideoRef.current.srcObject = cameraStream;
        hiddenVideoRef.current.play().catch((e) => console.error("Hidden video play error:", e));
      }
      if (videoRef.current && videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
        videoRef.current.play().catch((e) => console.error("Video play error:", e));
      }
    }
  }, [cameraStream, showProctorFeed, envChecked]);

  useEffect(() => {
    if (screenStream && screenVideoRef.current && screenVideoRef.current.srcObject !== screenStream) {
      screenVideoRef.current.srcObject = screenStream;
      screenVideoRef.current.play().catch((e) => console.error("Screen video play error:", e));
    }
  }, [screenStream, envChecked]);

  // Periodic stream frame upload with WebSockets and HTTP fallback
  useEffect(() => {
    if (!envChecked || !user) return;

    const isCameraEnabled = orgData?.securityFeatures?.cameraMonitoring !== false;
    const isScreenEnabled = orgData?.securityFeatures?.screenSharingDetection !== false;

    // If neither is enabled, we don't upload frames
    if (!isCameraEnabled && !isScreenEnabled) return;

    // If a feature is enabled, wait until its stream is ready
    if (isCameraEnabled && !cameraStream) return;
    if (isScreenEnabled && !screenStream) return;

    let ws: WebSocket | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    let wsInterval: NodeJS.Timeout | null = null;
    let isWsConnecting = false;
    let isDestroyed = false;

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");

    const sCanvas = document.createElement("canvas");
    sCanvas.width = 160;
    sCanvas.height = 120;
    const sCtx = sCanvas.getContext("2d");

    const captureFrame = () => {
      const video = hiddenVideoRef.current;
      if (video && video.readyState >= 2 && ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.5);
      }
      return null;
    };

    const captureScreenFrame = () => {
      const sVideo = screenVideoRef.current;
      if (screenStream && sVideo && sVideo.readyState >= 2 && sCtx) {
        sCtx.drawImage(sVideo, 0, 0, sCanvas.width, sCanvas.height);
        return sCanvas.toDataURL("image/jpeg", 0.4);
      }
      return null;
    };

    const startHttpFallback = () => {
      if (fallbackInterval) return;
      console.log("Using HTTP fallback for proctoring...");
      fallbackInterval = setInterval(async () => {
        try {
          const frame = captureFrame();
          const screenFrame = captureScreenFrame();
          if (frame || screenFrame) {
            await uploadStreamFrame({
              test_id: id || "",
              user_id: user.userId || "",
              username: user.name || user.userId || "",
              frame: frame || "",
              screenFrame: screenFrame || "",
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
      
      let host = "127.0.0.1:4000";
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      if (apiBaseUrl) {
        try {
          const parsed = new URL(apiBaseUrl);
          host = parsed.host;
        } catch (e) {
          host = `${window.location.hostname}:4000`;
        }
      } else {
        host = `${window.location.hostname}:4000`;
      }
      
      const wsUrl = `${protocol}//${host}/api/proctor/stream?role=student&test_id=${id}&user_id=${user.userId}&username=${encodeURIComponent(user.name || user.userId || "")}`;

      console.log("Connecting to proctor WS:", wsUrl);
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (isDestroyed) {
          socket.close();
          return;
        }
        console.log("Proctor WS connected successfully.");
        ws = socket;
        socketRef.current = socket;
        isWsConnecting = false;

        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }

        // Stream frames at 250ms for live quality
        wsInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            const frame = captureFrame();
            const screenFrame = captureScreenFrame();
            if (frame || screenFrame) {
              socket.send(JSON.stringify({
                type: "frame",
                frame: frame || "",
                screenFrame: screenFrame || "",
                hasVideo,
                hasAudio
              }));
            }
          }
        }, 250);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "chat_message") {
            setChatMessages((prev) => [...prev, {
              sender: payload.sender || "Proctor",
              text: payload.text,
              timestamp: payload.timestamp || Date.now()
            }]);
            setUnreadChat(true);
          }
        } catch (e) {
          // ignore
        }
      };

      socket.onerror = (err) => {
        console.error("Proctor WS error:", err);
      };

      socket.onclose = () => {
        if (isDestroyed) return;
        console.log("Proctor WS closed. Falling back to HTTP.");
        ws = null;
        socketRef.current = null;
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
  }, [cameraStream, screenStream, id, user, hasVideo, hasAudio, envChecked, orgData]);

  // AI Proctoring Canvas Overlay Loop
  useEffect(() => {
    if (!envChecked || !cameraStream || !proctorCanvasRef.current) return;
    const canvas = proctorCanvasRef.current;
    let animationFrameId: number;
    let scanY = 0;
    let scanDirection = 1;

    const renderOverlay = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // Draw Face Bounding Box
      const boxW = w * 0.48;
      const boxH = h * 0.68;
      const boxX = (w - boxW) / 2;
      const boxY = (h - boxH) / 2;

      ctx.strokeStyle = isTabOutRef.current ? "#ef4444" : "#10b981";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.setLineDash([]);

      // Bounding box corners
      ctx.strokeStyle = isTabOutRef.current ? "#ef4444" : "#10b981";
      ctx.lineWidth = 3;
      const len = 12;
      // top-left
      ctx.beginPath(); ctx.moveTo(boxX, boxY + len); ctx.lineTo(boxX, boxY); ctx.lineTo(boxX + len, boxY); ctx.stroke();
      // top-right
      ctx.beginPath(); ctx.moveTo(boxX + boxW - len, boxY); ctx.lineTo(boxX + boxW, boxY); ctx.lineTo(boxX + boxW, boxY + len); ctx.stroke();
      // bottom-left
      ctx.beginPath(); ctx.moveTo(boxX, boxY + boxH - len); ctx.lineTo(boxX, boxY + boxH); ctx.lineTo(boxX + len, boxY + boxH); ctx.stroke();
      // bottom-right
      ctx.beginPath(); ctx.moveTo(boxX + boxW, boxY + boxH - len); ctx.lineTo(boxX + boxW, boxY + boxH); ctx.lineTo(boxX + boxW - len, boxY + boxH); ctx.stroke();

      // Eye center markers
      const leftEyeX = boxX + boxW * 0.35;
      const rightEyeX = boxX + boxW * 0.65;
      const eyeY = boxY + boxH * 0.38;

      ctx.fillStyle = isTabOutRef.current ? "rgba(239, 68, 68, 0.45)" : "rgba(16, 185, 129, 0.45)";
      ctx.beginPath(); ctx.arc(leftEyeX, eyeY, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(rightEyeX, eyeY, 4, 0, Math.PI * 2); ctx.fill();

      // Laser Scanner Sweep Line
      ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      ctx.stroke();

      const grad = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8);
      grad.addColorStop(0, "rgba(99, 102, 241, 0)");
      grad.addColorStop(0.5, "rgba(99, 102, 241, 0.2)");
      grad.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 8, w, 16);

      scanY += 1.2 * scanDirection;
      if (scanY >= h || scanY <= 0) {
        scanDirection *= -1;
      }

      // HUD Text
      ctx.fillStyle = isTabOutRef.current ? "#ef4444" : "#10b981";
      ctx.font = "bold 8px monospace";
      ctx.fillText(`AI MONITOR: ACTIVE`, 6, 10);
      ctx.fillText(`GAZE DIRECTION: ${isTabOutRef.current ? "UNFOCUSED" : "SECURE"}`, 6, 18);
      ctx.fillStyle = "rgba(99, 102, 241, 0.85)";
      ctx.fillText(`CONFIDENCE: 98.4%`, w - 90, 10);

      if (isTabOutRef.current) {
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText("OUT OF FOCUSED WARNING", w / 2 - 60, h - 8);
      }

      animationFrameId = requestAnimationFrame(renderOverlay);
    };

    renderOverlay();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraStream, showProctorFeed, envChecked]);

  // Send Chat Message Handler
  const handleSendChatMessage = () => {
    if (!chatInput.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    const text = chatInput.trim();
    socketRef.current.send(JSON.stringify({
      type: "chat_message",
      text
    }));

    setChatMessages((prev) => [...prev, {
      sender: "You",
      text,
      timestamp: Date.now()
    }]);
    setChatInput("");
  };

  // Disable copy, cut, paste, and context menu on the test screen
  useEffect(() => {
    const preventAction = (e: Event) => {
      e.preventDefault();
    };

    const isCopyPasteDisabled = orgData?.securityFeatures?.copyPasteDisabled !== false;
    const isRightClickDisabled = orgData?.securityFeatures?.rightClickDisabled !== false;

    if (isCopyPasteDisabled) {
      document.addEventListener("copy", preventAction);
      document.addEventListener("cut", preventAction);
      document.addEventListener("paste", preventAction);
    }
    if (isRightClickDisabled) {
      document.addEventListener("contextmenu", preventAction);
    }

    return () => {
      document.removeEventListener("copy", preventAction);
      document.removeEventListener("cut", preventAction);
      document.removeEventListener("paste", preventAction);
      document.removeEventListener("contextmenu", preventAction);
    };
  }, [orgData]);

  // Monitor tab switching / window blurring (visibility changes and window focus/blur)
  const storageKeyTabSwitches = `attempt_tab_switches_${id}_${user?.userId}`;
  const [tabSwitches, setTabSwitches] = useState(() => {
    const saved = localStorage.getItem(storageKeyTabSwitches);
    return saved ? Number(saved) : 0;
  });
  const tabSwitchesRef = useRef(tabSwitches);
  const isTabOutRef = useRef(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.userId && id) {
      localStorage.setItem(storageKeyTabSwitches, String(tabSwitches));
      tabSwitchesRef.current = tabSwitches;
    }
  }, [tabSwitches, storageKeyTabSwitches, user?.userId, id]);

  useEffect(() => {
    if (!envChecked) return;
    if (orgData?.securityFeatures?.tabSwitchingDetection === false) return;

    const handleTabAway = () => {
      if (!isTabOutRef.current) {
        isTabOutRef.current = true;
        tabSwitchesRef.current += 1;
        setTabSwitches(tabSwitchesRef.current);

        const limit = Number(test?.tabSwitchLimit ?? 0);
        if (limit > 0 && tabSwitchesRef.current >= limit) {
          alert(`Maximum tab switches limit (${limit}) reached. Your test has been automatically submitted.`);
          autoSubmitRef.current?.();
        }
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
  }, [envChecked, orgData]);

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
    return getSectionalQuestions(test, sortedQuestions, seed);
  }, [test, rawQuestions, user?.userId]);

  const isSectional = Boolean(test?.sections && test.sections.length > 0);

  const sectionsWithRanges = useMemo(() => {
    if (!test || !test.sections || test.sections.length === 0 || questions.length === 0) {
      return [];
    }
    
    let currentIdx = 0;
    const sortedQuestions = [...rawQuestions].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
    const seed = `${user?.userId || "student"}-${test.id}`;
    const usedIds = new Set<string>();

    return test.sections.map((sec) => {
      const secQuestionIds = new Set(sec.questions || []);
      const secAllQuestions = sortedQuestions.filter(q => q.id && secQuestionIds.has(q.id) && !usedIds.has(q.id));
      const secCount = Number(sec.questions_count ?? secAllQuestions.length);
      const secSelected = getDeterministicSubset(secAllQuestions, secCount, seed + "-" + sec.name);
      
      secSelected.forEach((q) => {
        if (q.id) {
          usedIds.add(q.id);
        }
      });

      const count = secSelected.length;
      const range = {
        start: currentIdx,
        end: currentIdx + count - 1
      };
      currentIdx += count;
      return {
        ...sec,
        range
      };
    });
  }, [test, rawQuestions, user?.userId, questions]);

  const isQuestionInActiveSection = (idx: number) => {
    if (!isSectional) return true;
    const activeRange = sectionsWithRanges[activeSectionIdx]?.range;
    if (!activeRange) return true;
    return idx >= activeRange.start && idx <= activeRange.end;
  };

  const imageUrls = useMemo(() => {
    return questions
      .map((q) => q.image_url || q.media_url)
      .filter(Boolean) as string[];
  }, [questions]);

  useEffect(() => {
    if (questions.length > 0) {
      if (imageUrls.length === 0) {
        setImagesPreloaded(true);
        setResourcesLoaded(true);
      } else {
        let loadedCount = 0;
        const preloadImage = (url: string) => {
          const img = new Image();
          img.src = url;
          const onFinish = () => {
            loadedCount++;
            if (loadedCount === imageUrls.length) {
              setImagesPreloaded(true);
              setResourcesLoaded(true);
            }
          };
          img.onload = onFinish;
          img.onerror = onFinish;
        };
        imageUrls.forEach(preloadImage);
      }
    }
  }, [imageUrls, questions]);

  // State
  const storageKeyAnswers = `attempt_answers_${id}_${user?.userId}`;
  const storageKeyCurrentIdx = `attempt_current_idx_${id}_${user?.userId}`;
  const storageKeyMarked = `attempt_marked_${id}_${user?.userId}`;
  const storageKeyVisited = `attempt_visited_${id}_${user?.userId}`;
  const storageKeyTimeSpent = `attempt_time_spent_${id}_${user?.userId}`;

  const [currentIdx, setCurrentIdx] = useState(() => {
    const saved = localStorage.getItem(storageKeyCurrentIdx);
    return saved ? Number(saved) : 0;
  });
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(storageKeyAnswers);
    return saved ? JSON.parse(saved) : {};
  });
  const [marked, setMarked] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(storageKeyMarked);
    return saved ? JSON.parse(saved) : {};
  });
  const [visited, setVisited] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(storageKeyVisited);
    return saved ? JSON.parse(saved) : { "0": true };
  });

  useEffect(() => {
    if (user?.userId && id) {
      localStorage.setItem(storageKeyCurrentIdx, String(currentIdx));
    }
  }, [currentIdx, storageKeyCurrentIdx, user?.userId, id]);

  useEffect(() => {
    if (user?.userId && id) {
      localStorage.setItem(storageKeyAnswers, JSON.stringify(answers));
      answersRef.current = answers;
    }
  }, [answers, storageKeyAnswers, user?.userId, id]);

  useEffect(() => {
    if (user?.userId && id) {
      localStorage.setItem(storageKeyMarked, JSON.stringify(marked));
    }
  }, [marked, storageKeyMarked, user?.userId, id]);

  useEffect(() => {
    if (user?.userId && id) {
      localStorage.setItem(storageKeyVisited, JSON.stringify(visited));
    }
  }, [visited, storageKeyVisited, user?.userId, id]);

  // Real-time backend draft synchronization
  useEffect(() => {
    if (!user?.userId || !id) return;
    const saveDraftBackend = async () => {
      try {
        await fetch("/api/attempts/save-draft", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            test_id: id,
            user_id: user.userId,
            answers,
            time_spent: timeSpentRef.current
          })
        });
      } catch (err) {
        console.error("Failed to auto-save draft to backend:", err);
      }
    };
    saveDraftBackend();
  }, [answers, user?.userId, id]);

  // Periodic draft saving (every 30 seconds) to sync elapsed time
  useEffect(() => {
    if (!user?.userId || !id) return;
    const interval = setInterval(async () => {
      try {
        await fetch("/api/attempts/save-draft", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            test_id: id,
            user_id: user.userId,
            answers: answersRef.current,
            time_spent: timeSpentRef.current
          })
        });
      } catch (err) {
        console.error("Failed to auto-save periodic draft to backend:", err);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.userId, id]);

  useEffect(() => {
    if (navigatorSidebarRef.current) {
      const activeBtn = navigatorSidebarRef.current.querySelector(
        `[data-index="${currentIdx}"]`
      );
      if (activeBtn) {
        activeBtn.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [currentIdx]);

  const currentQuestion = questions[currentIdx];

  // Passage Caching State & Fetching Hook
  const [passageCache, setPassageCache] = useState<Record<string, Passage>>({});
  const [loadingPassage, setLoadingPassage] = useState<string | null>(null);

  useEffect(() => {
    const pid = currentQuestion?.passage_id;
    if (pid && !passageCache[pid] && loadingPassage !== pid) {
      setLoadingPassage(pid);
      getPassageById(pid)
        .then((passage) => {
          setPassageCache((prev) => ({ ...prev, [pid]: passage }));
        })
        .catch((err) => {
          console.error("Error fetching passage:", err);
        })
        .finally(() => {
          setLoadingPassage(null);
        });
    }
  }, [currentQuestion?.passage_id, passageCache, loadingPassage]);

  // Refs to always hold latest values (avoid stale closures in timer callbacks)
  const answersRef = useRef<Record<string, string>>({});
  const timeSpentRef = useRef(0);
  const hasSubmittedRef = useRef(false);

  // Timer State
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState(() => {
    const saved = localStorage.getItem(`attempt_time_spent_${id}_${user?.userId}`);
    return saved ? Number(saved) : 0;
  });

  // Cognitive Comfort states
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("parikshya_exam_theme") || "default");
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("parikshya_exam_font_size") || "medium");
  const [lineHeight, setLineHeight] = useState(() => localStorage.getItem("parikshya_exam_line_height") || "normal");
  const [tintFilter, setTintFilter] = useState(() => localStorage.getItem("parikshya_exam_tint") || "none");
  const [readingRuler, setReadingRuler] = useState(() => localStorage.getItem("parikshya_exam_ruler") === "true");
  const [showComfortSettings, setShowComfortSettings] = useState(false);
  const [mouseY, setMouseY] = useState(0);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!readingRuler) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [readingRuler]);

  useEffect(() => {
    if (!envChecked || !test) return;
    const saved = localStorage.getItem(`attempt_answers_${id}_${user?.userId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      const solvedCount = Object.keys(parsed).length;
      if (solvedCount > 0) {
        setRestoreMessage(`✓ Session restored. Resumed from Question #${currentIdx + 1} (${solvedCount} answers loaded)`);
        const timer = setTimeout(() => {
          setRestoreMessage(null);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [envChecked, test]);

  const getPassageStyle = () => {
    let size = "14px";
    let height = "1.625"; // normal
    if (fontSize === "small") size = "12px";
    if (fontSize === "large") size = "16px";
    if (fontSize === "xlarge") size = "18px";
    
    if (lineHeight === "tight") height = "1.25";
    if (lineHeight === "loose") height = "2";
    
    return { fontSize: size, lineHeight: height };
  };

  const getQuestionStyle = () => {
    let size = "18px";
    let height = "1.625";
    if (fontSize === "small") size = "15px";
    if (fontSize === "large") size = "21px";
    if (fontSize === "xlarge") size = "24px";
    
    if (lineHeight === "tight") height = "1.25";
    if (lineHeight === "loose") height = "2";
    
    return { fontSize: size, lineHeight: height };
  };

  const getOptionStyle = () => {
    let size = "14px";
    let height = "1.625";
    if (fontSize === "small") size = "12px";
    if (fontSize === "large") size = "16px";
    if (fontSize === "xlarge") size = "18px";
    
    if (lineHeight === "tight") height = "1.25";
    if (lineHeight === "loose") height = "2";
    
    return { fontSize: size, lineHeight: height };
  };

  // Modals
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sectionConfirmOpen, setSectionConfirmOpen] = useState(false);

  const handleSectionTimeout = () => {
    if (!test || !test.sections) return;
    const nextIdx = activeSectionIdx + 1;
    const prevSec = test.sections[activeSectionIdx];
    const nextSec = test.sections[nextIdx];

    if (nextSec) {
      setTimeoutInfo({ prevName: prevSec.name, nextName: nextSec.name });
      setSectionTimeoutAlertOpen(true);
      
      setActiveSectionIdx(nextIdx);
      const nextDuration = nextSec.duration * 60;
      setTimeLeft(nextDuration);

      const nextRange = sectionsWithRanges[nextIdx]?.range;
      if (nextRange && nextRange.start <= nextRange.end) {
        setCurrentIdx(nextRange.start);
        setVisited((prev) => ({ ...prev, [nextRange.start]: true }));
      }
    }
  };

  // Initialize Timer
  useEffect(() => {
    if (!envChecked) return;
    if (test && timeLeft === null) {
      let lateSeconds = 0;
      if (test.start_time) {
        const testStartTime = new Date(test.start_time).getTime();
        const now = Date.now();
        if (!isNaN(testStartTime) && now > testStartTime) {
          lateSeconds = Math.floor((now - testStartTime) / 1000);
        }
      }

      const latePenaltySeconds = Math.max(0, lateSeconds - 600); // 10-minute start buffer (600 seconds)

      if (isSectional && test.sections && test.sections.length > 0) {
        let tempLate = latePenaltySeconds;
        let startSecIdx = 0;
        let startSecTimeLeft = 0;
        let found = false;

        for (let i = 0; i < test.sections.length; i++) {
          const sec = test.sections[i];
          const secDur = sec.duration * 60;
          if (tempLate < secDur) {
            startSecIdx = i;
            startSecTimeLeft = secDur - tempLate;
            found = true;
            break;
          } else {
            tempLate -= secDur;
          }
        }

        if (found) {
          setActiveSectionIdx(startSecIdx);
          setTimeLeft(startSecTimeLeft);
          const range = sectionsWithRanges[startSecIdx]?.range;
          if (range && range.start <= range.end) {
            setCurrentIdx(range.start);
            setVisited((prev) => ({ ...prev, [range.start]: true }));
          }
        } else {
          // They missed the entire test duration
          setActiveSectionIdx(test.sections.length - 1);
          setTimeLeft(0);
          const range = sectionsWithRanges[test.sections.length - 1]?.range;
          if (range) {
            setCurrentIdx(range.end);
          }
        }
      } else {
        let durationSeconds = test.total_time * 60;
        const remainingTime = Math.max(0, durationSeconds - latePenaltySeconds);
        let finalTime = remainingTime;
        if (test.end_time) {
          const now = new Date().getTime();
          const end = new Date(test.end_time).getTime();
          if (!isNaN(end) && end > 0) {
            const remainingWindowSeconds = Math.max(0, Math.floor((end - now) / 1000));
            finalTime = Math.min(finalTime, remainingWindowSeconds);
          }
        }
        setTimeLeft(finalTime);
      }
    }
  }, [test, timeLeft, envChecked, isSectional, sectionsWithRanges]);

  // Timer Tick — uses a single persistent interval, not one per tick
  useEffect(() => {
    if (timeLeft === null || !envChecked) return;

    // If timer already expired when effect runs (e.g. page load with 0s left)
    if (timeLeft <= 0) {
      if (isSectional && activeSectionIdx < (test?.sections?.length ?? 0) - 1) {
        handleSectionTimeout();
      } else {
        triggerAutoSubmit();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        const next = prev - 1;
        if (next <= 0) {
          // Use setTimeout to trigger timeout/submit outside of setState call
          setTimeout(() => {
            if (isSectional && activeSectionIdx < (test?.sections?.length ?? 0) - 1) {
              handleSectionTimeout();
            } else {
              triggerAutoSubmit();
            }
          }, 0);
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
  }, [timeLeft === null, envChecked, activeSectionIdx, isSectional]);

  // Mutation to submit the attempt
  const submitMutation = useMutation({
    mutationFn: submitAttempt,
    onSuccess: (data) => {
      // Clean up localStorage attempt progress keys
      localStorage.removeItem(`attempt_answers_${id}_${user?.userId}`);
      localStorage.removeItem(`attempt_current_idx_${id}_${user?.userId}`);
      localStorage.removeItem(`attempt_marked_${id}_${user?.userId}`);
      localStorage.removeItem(`attempt_visited_${id}_${user?.userId}`);
      localStorage.removeItem(`attempt_time_spent_${id}_${user?.userId}`);
      localStorage.removeItem(`attempt_tab_switches_${id}_${user?.userId}`);
      localStorage.removeItem(`attempt_fullscreen_violations_${id}_${user?.userId}`);
      navigate("/dashboard");
    },
    onError: (err) => {
      alert("Error submitting test. Please try again.");
      console.error(err);
    },
  });

  // Handlers
  const handleSelectOption = (questionId: string, option: string) => {
    const qObj = questions.find((q) => q.id === questionId);
    const isMSQ = qObj?.correct_option?.includes(",") ?? false;

    setAnswers((prev) => {
      const copy = { ...prev };
      let newVal = "";
      if (isMSQ) {
        const currentSelected = prev[questionId];
        const parts = currentSelected ? currentSelected.split(",").map(o => o.trim()).filter(Boolean) : [];
        if (parts.includes(option)) {
          newVal = parts.filter(o => o !== option).sort().join(",");
        } else {
          newVal = [...parts, option].sort().join(",");
        }
      } else {
        newVal = option;
      }

      if (newVal === "") {
        delete copy[questionId];
      } else {
        copy[questionId] = newVal;
      }
      answersRef.current = copy;
      return copy;
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
      tab_switches: tabSwitchesRef.current + fullscreenViolationsRef.current,
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
      tab_switches: tabSwitchesRef.current + fullscreenViolationsRef.current,
    });
  };

  useEffect(() => {
    autoSubmitRef.current = triggerAutoSubmit;
  }, [triggerAutoSubmit]);

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

  const isPrepWindowActive = useMemo(() => {
    if (!test) return true;
    if (!test.start_time) return true;
    const start = new Date(test.start_time).getTime();
    const end = test.end_time ? new Date(test.end_time).getTime() : Infinity;
    // Allowed to enter starting 60 seconds before start time, and up to the end time
    return currentTime >= (start - 60000) && currentTime <= end;
  }, [test, currentTime]);

  const isSlotActive = useMemo(() => {
    if (!test) return true;
    if (!test.start_time) return true;
    const start = new Date(test.start_time).getTime();
    const end = test.end_time ? new Date(test.end_time).getTime() : Infinity;
    return currentTime >= start && currentTime <= end;
  }, [test, currentTime]);

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

  if (!isPrepWindowActive) {
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
  }  const checks = [
    { name: "Internet Connection", passed: isOnline, label: isOnline ? "Connected to Internet" : "No Internet Connection" },
    { name: "Screen Resolution", passed: isScreenSizeOk, label: isScreenSizeOk ? "Desktop/Tablet OK" : "Screen Width too small (<768px)" },
    ...(orgData?.securityFeatures?.fullscreenMode !== false
      ? [{ name: "Fullscreen Mode", passed: isFullscreen, label: isFullscreen ? "Fullscreen Enabled" : "Fullscreen Required" }]
      : []),
    ...(orgData?.securityFeatures?.screenSharingDetection !== false
      ? [{ name: "Screen Sharing", passed: Boolean(screenStream), label: screenStream ? "Screen Sharing Authorized" : "Screen Sharing Required" }]
      : []),
    ...(orgData?.securityFeatures?.cameraMonitoring !== false
      ? [{ name: "Camera Verification", passed: Boolean(cameraStream) && !streamError, label: cameraStream && !streamError ? "Camera Active" : "Camera Access Required" }]
      : []),
    { name: "Resources Loaded", passed: resourcesLoaded, label: resourcesLoaded ? "Questions & Assets Preloaded" : "Preloading exam assets..." },
    { name: "Instructions Accepted", passed: acknowledged, label: acknowledged ? "Rules Acknowledged" : "Instructions Not Accepted" },
  ];

  const passedChecksCount = checks.filter(c => c.passed).length;
  const progressPercent = (passedChecksCount / checks.length) * 100;
  const allChecksPassed = passedChecksCount === checks.length;

  if (!envChecked) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col select-none relative">
        {!isOnline && (
          <div className="fixed top-0 inset-x-0 z-50 bg-rose-600 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-md animate-pulse">
            <AlertTriangle className="h-4 w-4" />
            <span>No Internet Connection detected. Please check your connectivity. Retrying automatically...</span>
          </div>
        )}

        <header className="h-[72px] bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <Logo compact />
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-sm font-bold text-slate-800">Exam Environment Setup</h1>
              <p className="text-[10px] font-semibold text-indigo-500 tracking-wider uppercase">
                Secure Assessment Portal
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-slate-500 hover:text-slate-800 text-xs">
            Cancel & Return
          </Button>
        </header>

        <main className="flex-1 max-w-[1200px] mx-auto w-full p-4 md:p-8 flex flex-col lg:flex-row gap-8">
          <div className="flex-1 flex flex-col gap-6">
            <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-bold text-indigo-500 tracking-widest uppercase">EXAM SUMMARY</span>
                  <h2 className="text-xl font-extrabold text-slate-800 mt-1">{test.name}</h2>
                </div>
                <Badge tone="blue" className="text-xs uppercase tracking-wider px-3 py-1 font-bold">{test.type.replace("_", " ")}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Subject</span>
                  <span className="text-sm font-bold text-slate-700 mt-1 block leading-tight text-slate-800">
                    {Array.isArray(test.subject) ? test.subject.join(", ") : test.subject}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Questions</span>
                  <span className="text-sm font-bold text-slate-700 mt-1 block leading-tight">{test.total_questions} Questions</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Marks</span>
                  <span className="text-sm font-bold text-slate-700 mt-1 block leading-tight">{test.total_marks} Marks</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Duration</span>
                  <span className="text-sm font-bold text-slate-700 mt-1 block leading-tight">{test.total_time} Minutes</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Passing Marks</span>
                  <span className="text-sm font-bold text-slate-700 mt-1 block leading-tight">
                    {Math.ceil(test.total_marks * 0.4)} Marks (40%)
                  </span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Negative Marking</span>
                  <span className={`text-sm font-bold mt-1 block leading-tight ${test.wrong_marks !== 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {test.wrong_marks === 0 ? "0" : (test.wrong_marks < 0 ? test.wrong_marks : `-${test.wrong_marks}`)}
                  </span>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
              <h3 className="text-sm font-extrabold text-slate-800 mb-4 tracking-wide border-b border-slate-100 pb-2">
                System Readiness Checklist
              </h3>
              
              <div className="space-y-3.5 mb-6">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isOnline ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                      {isOnline ? "✓" : "⚠"}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Internet Connectivity</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{isOnline ? "High Speed Connection Active" : "No Internet Connection"}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isOnline ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {isOnline ? "Connected" : "Disconnected"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isScreenSizeOk ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                      {isScreenSizeOk ? "✓" : "⚠"}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Screen Resolution</span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {isScreenSizeOk ? "Desktop or tablet viewport size is optimal" : "Screen is narrow. Desktop or landscape tablet is recommended."}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isScreenSizeOk ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {isScreenSizeOk ? "Pass" : "Warning"}
                  </span>
                </div>

                {orgData?.securityFeatures?.fullscreenMode !== false && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isFullscreen ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                        {isFullscreen ? "✓" : "⚠"}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Fullscreen Mode</span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {isFullscreen ? "Secure assessment view enabled" : "Fullscreen mode is required to start the exam"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isFullscreen ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {isFullscreen ? "Enabled" : "Required"}
                      </span>
                      {!isFullscreen && (
                        <Button onClick={enterFullscreen} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 py-0 px-3 font-semibold">
                          Enter Fullscreen
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {orgData?.securityFeatures?.screenSharingDetection !== false && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${screenStream ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                        {screenStream ? "✓" : "⚠"}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Screen Sharing Authorization</span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {screenStream ? "Active screen capture relayed to proctors" : "Screen sharing is required to start the exam"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${screenStream ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {screenStream ? "Authorized" : "Required"}
                      </span>
                      {!screenStream && (
                        <Button onClick={handleAuthorizeScreenSharing} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 py-0 px-3 font-semibold">
                          Authorize Screen Sharing
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {orgData?.securityFeatures?.cameraMonitoring !== false && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${cameraStream && !streamError ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                        {cameraStream && !streamError ? "✓" : "⚠"}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Camera Verification</span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {cameraStream && !streamError ? "Camera feed verified and active" : "Camera permission and stream are required to start the exam"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cameraStream && !streamError ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {cameraStream && !streamError ? "Active" : "Required"}
                      </span>
                      {(!cameraStream || streamError) && (
                        <Button onClick={startProctoring} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 py-0 px-3 font-semibold">
                          Enable Camera
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${resourcesLoaded ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600 animate-pulse"}`}>
                      {resourcesLoaded ? "✓" : "⌛"}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Question Loading Verification</span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {resourcesLoaded 
                          ? "✓ Questions Loaded | ✓ Images Loaded | ✓ Assets Loaded | ✓ Test Ready" 
                          : "Preloading and verifying exam questions and graphics..."}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${resourcesLoaded ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {resourcesLoaded ? "Ready" : "Loading"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${acknowledged ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"}`}>
                      {acknowledged ? "✓" : "–"}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Exam Rules Acknowledgement</span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {acknowledged ? "Instructions signed and accepted" : "Please read and accept instructions in the right panel"}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${acknowledged ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {acknowledged ? "Accepted" : "Pending"}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5 uppercase">
                    <span>Environment Readiness Progress</span>
                    <span>{passedChecksCount} / {checks.length} Checks Passed ({Math.round(progressPercent)}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${allChecksPassed ? "bg-emerald-500" : "bg-indigo-500"}`} 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="w-full lg:w-[360px] flex flex-col gap-6 shrink-0">
            <section className="bg-slate-800 rounded-xl p-5 text-white shadow-md flex-1 flex flex-col">
              <h3 className="text-sm font-extrabold tracking-wide uppercase text-indigo-400 mb-4 border-b border-slate-700 pb-2 flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Exam Rules & Instructions
              </h3>
              <ul className="text-xs text-slate-300 space-y-3.5 leading-relaxed list-none flex-1">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 shrink-0 font-bold">•</span>
                  <span><strong>Do not refresh the page</strong>. Doing so may submit or invalidate your session.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 shrink-0 font-bold">•</span>
                  <span><strong>Do not switch browser tabs</strong> or windows. Tab switching is flagged as a violation.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 shrink-0 font-bold">•</span>
                  <span><strong>Do not close the browser</strong>. The exam must be finished in a single session.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 shrink-0 font-bold">•</span>
                  <span><strong>Timer cannot be paused</strong>. Once started, the countdown runs continuously.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-400 shrink-0 font-bold">•</span>
                  <span><strong>Answers are automatically saved</strong>. When the timer expires, the test auto-submits.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-400 shrink-0 font-bold">•</span>
                  <span><strong>Negative marking may apply</strong>. Please review summary for marking schemes.</span>
                </li>
              </ul>

              <div className="border-t border-slate-700 pt-4 mt-6">
                <label className={`flex items-start gap-3 group ${(orgData?.securityFeatures?.cameraMonitoring !== false && (!cameraStream || streamError)) ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    disabled={orgData?.securityFeatures?.cameraMonitoring !== false && (!cameraStream || streamError)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs text-slate-300 group-hover:text-white transition duration-150 leading-relaxed font-semibold">
                    I have read and understood all exam instructions. {orgData?.securityFeatures?.cameraMonitoring !== false && (!cameraStream || streamError) && <span className="text-indigo-400 font-bold block mt-1">(Please enable and verify camera access first)</span>}
                  </span>
                </label>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              {allChecksPassed && isSlotActive ? (
                <Button
                  onClick={() => setEnvChecked(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl text-sm transition duration-200"
                >
                  Start Test
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 text-slate-400 font-bold h-12 rounded-xl text-sm cursor-not-allowed"
                  >
                    Start Test
                  </Button>
                  {!allChecksPassed ? (
                    <p className="text-[11px] text-center font-bold text-rose-500 leading-snug bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                      Complete all checks before starting the exam.
                    </p>
                  ) : (
                    <p className="text-[11px] text-center font-bold text-amber-600 leading-snug bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                      Waiting for exam start time: {new Date(test.start_time!).toLocaleTimeString()} (starts in {Math.max(0, Math.ceil((new Date(test.start_time!).getTime() - currentTime) / 1000))}s)
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        </main>

        {/* Hidden video element to keep the camera stream alive during setup */}
        <video
          ref={hiddenVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: "fixed",
            width: "4px",
            height: "4px",
            opacity: 0.01,
            pointerEvents: "none",
            bottom: "10px",
            right: "10px",
            zIndex: -9999
          }}
        />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        <div className="text-center">
          <Spinner />
          <p className="mt-3 text-sm font-medium">Preparing question content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-955 flex flex-col select-none relative transition-colors duration-200 theme-${themeMode} ${
      themeMode === "cyberpunk" ? "theme-cyberpunk font-mono" : 
      themeMode === "minimalist" ? "theme-minimalist" : 
      themeMode === "epaper" ? "theme-epaper" : 
      themeMode === "terminal" ? "theme-terminal font-mono" : 
      themeMode === "forest" ? "theme-forest" : 
      themeMode === "midnight" ? "theme-midnight" : 
      themeMode === "solarized" ? "theme-solarized" : ""
    }`}>
      <style>{`
        /* E-Paper Theme overrides */
        .theme-epaper {
          background-color: #fbf0d9 !important;
          color: #1a1a1a !important;
          font-family: Georgia, Cambria, "Times New Roman", Times, serif !important;
        }
        .theme-epaper header {
          background-color: #f5e6c4 !important;
          border-bottom: 2px solid #e0cda9 !important;
        }
        .theme-epaper aside, .theme-epaper .question-card, .theme-epaper .sidebar-card, .theme-epaper .main-box {
          background-color: #fdfbf7 !important;
          border: 1px solid #d3c2a0 !important;
          color: #1a1a1a !important;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05) !important;
        }
        .theme-epaper h1, .theme-epaper h2, .theme-epaper h3, .theme-epaper h4, .theme-epaper h5, .theme-epaper p, .theme-epaper span, .theme-epaper text {
          color: #2b2b2b !important;
        }
        .theme-epaper button {
          border-color: #d3c2a0 !important;
          color: #2b2b2b !important;
        }
        .theme-epaper .text-slate-650, .theme-epaper .text-slate-350 {
          color: #2c2c2c !important;
        }

        /* Cyberpunk Theme overrides */
        .theme-cyberpunk {
          background-color: #03001e !important;
          background-image: linear-gradient(180deg, #03001e 0%, #12002b 100%) !important;
          color: #39ff14 !important; /* toxic green */
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
        }
        .theme-cyberpunk header {
          background-color: #0d001f !important;
          border-bottom: 2px solid #06b6d4 !important; /* neon cyan */
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.4) !important;
        }
        .theme-cyberpunk .question-card, .theme-cyberpunk .sidebar-card, .theme-cyberpunk .main-box {
          background-color: rgba(13, 0, 31, 0.8) !important;
          border: 2px solid #06b6d4 !important;
          color: #39ff14 !important;
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.25) !important;
        }
        .theme-cyberpunk h1, .theme-cyberpunk h2, .theme-cyberpunk h3, .theme-cyberpunk h4, .theme-cyberpunk h5, .theme-cyberpunk p, .theme-cyberpunk span, .theme-cyberpunk text {
          color: #00ffff !important; /* neon cyan */
          text-shadow: 0 0 5px rgba(0, 255, 255, 0.5) !important;
        }
        .theme-cyberpunk .text-slate-650, .theme-cyberpunk .text-slate-350 {
          color: #39ff14 !important;
        }
        .theme-cyberpunk button {
          border-color: #ff007f !important; /* neon pink */
          color: #ff007f !important;
          box-shadow: 0 0 5px rgba(255, 0, 127, 0.3) !important;
        }
        .theme-cyberpunk button:hover {
          background-color: #ff007f !important;
          color: black !important;
        }
        .theme-cyberpunk .active-choice {
          border-color: #39ff14 !important;
          box-shadow: 0 0 10px rgba(57, 255, 20, 0.5) !important;
          background-color: rgba(57, 255, 20, 0.1) !important;
          color: #39ff14 !important;
        }
        .theme-cyberpunk .choice-card {
          border: 1px solid #ff007f !important;
          background-color: rgba(255, 0, 127, 0.05) !important;
          color: #ff007f !important;
        }

        /* Minimalist Dark Theme overrides */
        .theme-minimalist {
          background-color: #07090e !important;
          color: #f1f5f9 !important;
        }
        .theme-minimalist header {
          background-color: #090d16 !important;
          border-bottom: 1px solid #1e293b !important;
        }
        .theme-minimalist .question-card, .theme-minimalist .sidebar-card, .theme-minimalist .main-box {
          background-color: #0f172a !important;
          border: none !important;
          box-shadow: none !important;
        }
        .theme-minimalist h1, .theme-minimalist h2, .theme-minimalist h3, .theme-minimalist h4, .theme-minimalist h5, .theme-minimalist p, .theme-minimalist span, .theme-minimalist text {
          color: #f8fafc !important;
        }
        .theme-minimalist button {
          border-color: #334155 !important;
          color: #94a3b8 !important;
        }
        .theme-minimalist .text-slate-650, .theme-minimalist .text-slate-350 {
          color: #cbd5e1 !important;
        }

        /* Terminal Theme overrides */
        .theme-terminal {
          background-color: #050505 !important;
          color: #ffb000 !important; /* amber neon */
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
        }
        .theme-terminal header {
          background-color: #000000 !important;
          border-bottom: 2px solid #ffb000 !important;
          box-shadow: 0 0 10px rgba(255, 176, 0, 0.4) !important;
        }
        .theme-terminal .question-card, .theme-terminal .sidebar-card, .theme-terminal .main-box {
          background-color: #0a0a0a !important;
          border: 1px solid #ffb000 !important;
          color: #ffb000 !important;
          box-shadow: inset 0 0 10px rgba(255, 176, 0, 0.1), 0 0 10px rgba(255, 176, 0, 0.15) !important;
        }
        .theme-terminal h1, .theme-terminal h2, .theme-terminal h3, .theme-terminal h4, .theme-terminal h5, .theme-terminal p, .theme-terminal span, .theme-terminal text {
          color: #ffb000 !important;
          text-shadow: 0 0 3px rgba(255, 176, 0, 0.6) !important;
        }
        .theme-terminal .text-slate-650, .theme-terminal .text-slate-350 {
          color: #ffb000 !important;
        }
        .theme-terminal button {
          border-color: #ffb000 !important;
          color: #ffb000 !important;
        }
        .theme-terminal button:hover {
          background-color: #ffb000 !important;
          color: black !important;
        }
        .theme-terminal .active-choice {
          border-color: #ffb000 !important;
          background-color: rgba(255, 176, 0, 0.2) !important;
          box-shadow: 0 0 8px rgba(255, 176, 0, 0.4) !important;
        }
        .theme-terminal .choice-card {
          border: 1px solid rgba(255, 176, 0, 0.6) !important;
          background-color: rgba(255, 176, 0, 0.03) !important;
          color: #ffb000 !important;
        }

        /* Forest Theme overrides */
        .theme-forest {
          background-color: #eef1ec !important;
          color: #2d4a22 !important;
          font-family: ui-sans-serif, system-ui, sans-serif !important;
        }
        .theme-forest header {
          background-color: #dae2d5 !important;
          border-bottom: 2px solid #a3b899 !important;
        }
        .theme-forest .question-card, .theme-forest .sidebar-card, .theme-forest .main-box {
          background-color: #f7f9f5 !important;
          border: 1px solid #cbd5c5 !important;
          color: #2d4a22 !important;
          box-shadow: 0 4px 6px -1px rgba(45, 74, 34, 0.05) !important;
        }
        .theme-forest h1, .theme-forest h2, .theme-forest h3, .theme-forest h4, .theme-forest h5, .theme-forest p, .theme-forest span, .theme-forest text {
          color: #213c16 !important;
        }
        .theme-forest .text-slate-650, .theme-forest .text-slate-350 {
          color: #2d4a22 !important;
        }
        .theme-forest button {
          border-color: #a3b899 !important;
          color: #2d4a22 !important;
        }
        .theme-forest button:hover {
          background-color: #a3b899 !important;
          color: white !important;
        }
        .theme-forest .active-choice {
          border-color: #4b6f44 !important;
          background-color: rgba(75, 111, 68, 0.1) !important;
          color: #2d4a22 !important;
        }
        .theme-forest .choice-card {
          border: 1px solid #cbd5c5 !important;
          background-color: rgba(203, 213, 197, 0.2) !important;
        }

        /* Midnight Navy Theme overrides */
        .theme-midnight {
          background-color: #0b0f19 !important;
          background-image: linear-gradient(180deg, #0b0f19 0%, #111827 100%) !important;
          color: #e2e8f0 !important;
          font-family: ui-sans-serif, system-ui, sans-serif !important;
        }
        .theme-midnight header {
          background-color: #0f172a !important;
          border-bottom: 2px solid #3b82f6 !important;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.25) !important;
        }
        .theme-midnight .question-card, .theme-midnight .sidebar-card, .theme-midnight .main-box {
          background-color: #1e293b !important;
          border: 1px solid #334155 !important;
          color: #f1f5f9 !important;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2) !important;
        }
        .theme-midnight h1, .theme-midnight h2, .theme-midnight h3, .theme-midnight h4, .theme-midnight h5, .theme-midnight p, .theme-midnight span, .theme-midnight text {
          color: #f8fafc !important;
        }
        .theme-midnight .text-slate-650, .theme-midnight .text-slate-350 {
          color: #e2e8f0 !important;
        }
        .theme-midnight button {
          border-color: #475569 !important;
          color: #cbd5e1 !important;
        }
        .theme-midnight button:hover {
          background-color: #3b82f6 !important;
          color: white !important;
          border-color: #3b82f6 !important;
        }
        .theme-midnight .active-choice {
          border-color: #3b82f6 !important;
          background-color: rgba(59, 130, 246, 0.15) !important;
          color: #ffffff !important;
        }
        .theme-midnight .choice-card {
          border: 1px solid #334155 !important;
          background-color: rgba(30, 41, 59, 0.5) !important;
        }

        /* Solarized Light Theme overrides */
        .theme-solarized {
          background-color: #fdf6e3 !important;
          color: #586e75 !important;
          font-family: Georgia, serif !important;
        }
        .theme-solarized header {
          background-color: #eee8d5 !important;
          border-bottom: 2px solid #93a1a1 !important;
        }
        .theme-solarized aside, .theme-solarized .question-card, .theme-solarized .sidebar-card, .theme-solarized .main-box {
          background-color: #fdf6e3 !important;
          border: 1px solid #d3c7a8 !important;
          color: #586e75 !important;
          box-shadow: none !important;
        }
        .theme-solarized h1, .theme-solarized h2, .theme-solarized h3, .theme-solarized h4, .theme-solarized h5, .theme-solarized p, .theme-solarized span, .theme-solarized text {
          color: #073642 !important;
        }
        .theme-solarized .text-slate-650, .theme-solarized .text-slate-350 {
          color: #586e75 !important;
        }
        .theme-solarized button {
          border-color: #93a1a1 !important;
          color: #586e75 !important;
        }
        .theme-solarized button:hover {
          background-color: #eee8d5 !important;
          color: #073642 !important;
        }
        .theme-solarized .active-choice {
          border-color: #268bd2 !important;
          background-color: rgba(38, 139, 210, 0.1) !important;
          color: #073642 !important;
        }
        .theme-solarized .choice-card {
          border: 1px solid #d3c7a8 !important;
          background-color: #fcf8ec !important;
        }
      `}</style>

      {tintFilter !== "none" && (
        <div 
          className={`fixed inset-0 pointer-events-none z-50 transition-colors duration-300 ${
            tintFilter === "amber"
              ? "bg-amber-500/[0.07]"
              : tintFilter === "mint"
                ? "bg-emerald-500/[0.05]"
                : tintFilter === "blue"
                  ? "bg-blue-500/[0.05]"
                  : ""
          }`}
        />
      )}

      {readingRuler && (
        <div 
          className="fixed left-0 right-0 h-10 bg-indigo-500/10 dark:bg-indigo-400/15 border-y-2 border-indigo-500/25 pointer-events-none z-50 transition-all duration-75 ease-out shadow-[0_0_15px_rgba(99,102,241,0.15)]"
          style={{ top: `${mouseY - 20}px` }}
        />
      )}

      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-rose-600 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-md animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          <span>No Internet Connection detected. Please check your connectivity. Retrying automatically...</span>
        </div>
      )}
      {/* Distraction-Free Header */}
      <header className="h-[72px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3">
          <Logo compact />
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{test.name}</h1>
            <p className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 tracking-wider uppercase mt-0.5">
              {test.subject} • {test.type.replace("_", " ")}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="hidden md:flex flex-col items-center flex-1 max-w-md px-10">
          <div className="flex justify-between w-full text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">
            <span>PROGRESS</span>
            <span>{Math.round((stats.answered / totalQuestions) * 100)}% ({stats.answered}/{totalQuestions})</span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${(stats.answered / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Proctor Live Feed / Support Chat Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProctorFeed(!showProctorFeed);
                setShowInstructions(false);
                setShowNavigatorPopover(false);
                setUnreadChat(false);
              }}
              className={`flex items-center justify-center h-10 w-10 rounded-xl border transition shrink-0 relative ${
                showProctorFeed
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900"
              }`}
              title="Live Proctor Support Feed"
            >
              <MessageSquare className="h-5 w-5" />
              {unreadChat && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-black text-white animate-bounce">
                  !
                </span>
              )}
            </button>

            {showProctorFeed && (
              <div className={`absolute right-0 mt-3 ${orgData?.securityFeatures?.cameraMonitoring !== false ? "w-[560px]" : "w-[320px]"} max-w-[90vw] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl z-50 flex flex-col ${orgData?.securityFeatures?.cameraMonitoring !== false ? "md:flex-row" : ""} gap-5`}>
                {/* Left: Video feed */}
                {orgData?.securityFeatures?.cameraMonitoring !== false && (
                  <div className="w-full md:w-1/2 flex flex-col">
                    <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                      Live Camera Monitor
                    </h5>
                    <div className="relative aspect-video w-full rounded-xl bg-slate-950 overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                      {streamError ? (
                        <div className="text-center p-3 text-rose-500">
                          <AlertTriangle className="h-7 w-7 mx-auto mb-1 text-rose-500" />
                          <p className="text-[9px] font-bold uppercase tracking-wider text-rose-500">Device Blocked</p>
                        </div>
                      ) : !cameraStream ? (
                        <div className="text-center text-slate-400">
                          <Spinner />
                          <p className="text-[9px] font-bold mt-1.5">Connecting Camera...</p>
                        </div>
                      ) : (
                        <div className="relative w-full h-full">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover scale-x-[-1]"
                          />
                          <canvas
                            ref={proctorCanvasRef}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                          />
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-[9px] text-slate-500 dark:text-slate-450 leading-relaxed font-semibold">
                      Live device monitoring is active. Do not block the camera lens or exit fullscreen view.
                    </div>
                  </div>
                )}

                {/* Right: Messages list */}
                <div className={`w-full ${orgData?.securityFeatures?.cameraMonitoring !== false ? "md:w-1/2 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-5" : "pt-0"} flex flex-col`}>
                  <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    Proctor Support Chat
                  </h5>
                  <div className="flex-1 min-h-[140px] max-h-[180px] overflow-y-auto pr-1 space-y-2 mb-3">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center p-3 text-slate-400 dark:text-slate-500 text-[10px] font-semibold">
                        No support messages yet. System warnings or messages from the proctor will appear here.
                      </div>
                    ) : (
                      chatMessages.map((msg, mIdx) => {
                        const isProctor = msg.sender === "Proctor";
                        return (
                          <div
                            key={mIdx}
                            className={`flex flex-col max-w-[85%] ${isProctor ? "mr-auto" : "ml-auto items-end"}`}
                          >
                            <span className="text-[9px] font-bold text-slate-400 mb-0.5">
                              {msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div
                              className={`p-2 rounded-xl text-[10px] font-semibold leading-relaxed ${
                                isProctor
                                  ? "bg-rose-50 border border-rose-100 text-rose-855 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-350"
                                  : "bg-indigo-600 text-white"
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {/* Chat input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                      placeholder="Type a message..."
                      className="flex-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                    <Button
                      variant="primary"
                      onClick={handleSendChatMessage}
                      className="h-7 text-[10px] px-2.5 bg-indigo-600 text-white"
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions popover */}
          <div className="relative">
            <button
              onClick={() => {
                setShowInstructions(!showInstructions);
                setShowNavigatorPopover(false);
                setShowProctorFeed(false);
              }}
              className={`flex items-center justify-center h-10 w-10 rounded-xl border transition shrink-0 ${
                showInstructions
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900"
              }`}
              title="Show Instructions"
            >
              <Info className="h-5 w-5" />
            </button>

            {showInstructions && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-955 dark:to-slate-900 text-white p-5 shadow-2xl border border-slate-850 z-50">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2.5">
                  <h4 className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-indigo-400" />
                    Instructions
                  </h4>
                  <button
                    onClick={() => setShowInstructions(false)}
                    className="text-slate-500 hover:text-white text-xs font-bold font-mono transition"
                  >
                    ✕
                  </button>
                </div>
                <ul className="text-xs text-slate-300 space-y-3 leading-relaxed list-disc list-inside font-semibold">
                  <li>Marks Scheme: +{test.correct_marks} / {test.wrong_marks} marks.</li>
                  <li>Leaving or refreshing the tab does <strong>NOT</strong> pause the timer.</li>
                  <li>Auto-submit occurs when the timer ends.</li>
                  <li>Review marked questions using the navigator palette.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Comfort Settings Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowComfortSettings(!showComfortSettings);
                setShowInstructions(false);
              }}
              className={`flex items-center justify-center h-10 w-10 rounded-xl border transition shrink-0 ${
                showComfortSettings
                  ? "bg-indigo-50 border-indigo-200 text-indigo-650 dark:bg-indigo-955/40 dark:border-indigo-900/50 dark:text-indigo-400"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900"
              }`}
              title="Cognitive Comfort & Accessibility Settings"
            >
              <Sliders className="h-4 w-4" />
            </button>

            {showComfortSettings && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-fade-in font-sans">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h4 className="text-xs font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5 font-sans">
                    <Eye className="h-4 w-4 text-indigo-500" />
                    Cognitive Comfort
                  </h4>
                  <button
                    onClick={() => setShowComfortSettings(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold font-mono transition"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4 text-xs font-semibold">
                  {/* Visual Themes */}
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 font-bold font-sans">Visual Theme</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "default", name: "Default" },
                        { id: "cyberpunk", name: "Cyberpunk" },
                        { id: "minimalist", name: "Minimal Dark" },
                        { id: "epaper", name: "E-Paper" },
                        { id: "terminal", name: "Retro CRT" },
                        { id: "forest", name: "Forest Mint" },
                        { id: "midnight", name: "Midnight Navy" },
                        { id: "solarized", name: "Solarized Light" }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setThemeMode(t.id);
                            localStorage.setItem("parikshya_exam_theme", t.id);
                          }}
                          className={`py-1.5 px-3 rounded-lg border text-left transition font-bold ${
                            themeMode === t.id
                              ? "bg-indigo-600 text-white border-indigo-650"
                              : "border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-350"
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size Modifier */}
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 font-bold font-sans">Text Scale</span>
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                      {[
                        { id: "small", label: "A-" },
                        { id: "medium", label: "A" },
                        { id: "large", label: "A+" },
                        { id: "xlarge", label: "A++" }
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setFontSize(s.id);
                            localStorage.setItem("parikshya_exam_font_size", s.id);
                          }}
                          className={`flex-1 py-1 rounded-lg text-center transition font-bold ${
                            fontSize === s.id
                              ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm"
                              : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Line Height Modifier */}
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 font-bold font-sans">Line Spacing</span>
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                      {[
                        { id: "tight", label: "Tight" },
                        { id: "normal", label: "Normal" },
                        { id: "loose", label: "Loose" }
                      ].map((lh) => (
                        <button
                          key={lh.id}
                          type="button"
                          onClick={() => {
                            setLineHeight(lh.id);
                            localStorage.setItem("parikshya_exam_line_height", lh.id);
                          }}
                          className={`flex-1 py-1 rounded-lg text-center transition font-bold ${
                            lineHeight === lh.id
                              ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm"
                              : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                          }`}
                        >
                          {lh.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Screen Filters Tint */}
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 font-bold font-sans">Eye Strain Filters</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "none", name: "No Filter" },
                        { id: "amber", name: "Warm Amber" },
                        { id: "mint", name: "Soft Mint" },
                        { id: "blue", name: "Cool Ice" }
                      ].map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => {
                            setTintFilter(filter.id);
                            localStorage.setItem("parikshya_exam_tint", filter.id);
                          }}
                          className={`py-1.5 px-3 rounded-lg border text-left transition font-bold ${
                            tintFilter === filter.id
                              ? "bg-indigo-600 text-white border-indigo-650"
                              : "border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {filter.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reading Focus Ruler Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 font-sans">
                    <div>
                      <span className="text-[11px] block font-bold text-slate-700 dark:text-slate-300">Reading Focus Ruler</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium block">Horizontal guideline follows cursor</span>
                    </div>
                    <button
                      onClick={() => {
                        const newVal = !readingRuler;
                        setReadingRuler(newVal);
                        localStorage.setItem("parikshya_exam_ruler", String(newVal));
                      }}
                      type="button"
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        readingRuler ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          readingRuler ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Reset to Default Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        setThemeMode("default");
                        setFontSize("medium");
                        setLineHeight("normal");
                        setTintFilter("none");
                        setReadingRuler(false);
                        localStorage.removeItem("parikshya_exam_theme");
                        localStorage.removeItem("parikshya_exam_font_size");
                        localStorage.removeItem("parikshya_exam_line_height");
                        localStorage.removeItem("parikshya_exam_tint");
                        localStorage.removeItem("parikshya_exam_ruler");
                      }}
                      className="w-full py-2 px-4 rounded-xl border border-rose-250 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-455 text-center transition font-bold"
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 transition shrink-0"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Timer Display */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border font-mono text-sm font-bold transition duration-300 shrink-0 ${
              timeLeft !== null && timeLeft < 300
                ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-455 animate-pulse"
                : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
            }`}
          >
            <Clock className={`h-4 w-4 ${timeLeft !== null && timeLeft < 300 ? "text-rose-550 animate-bounce" : "text-slate-500"}`} />
            <span>{formattedTimeLeft}</span>
          </div>

          {/* Submit Button */}
          <Button
            variant="primary"
            onClick={handleManualSubmit}
            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4"
            icon={<Send className="h-3.5 w-3.5" />}
          >
            Submit
          </Button>
        </div>
      </header>

      {/* Main Attempt Area */}
      <div className="flex-1 flex flex-col lg:flex-row w-full p-4 lg:py-0 lg:pl-0 lg:pr-16 gap-6 lg:gap-0">

        {/* Left Column: Question Card */}
        <main className="flex-1 flex flex-col min-w-0">
          <article className="bg-white dark:bg-slate-900 rounded-xl lg:rounded-none border border-slate-200 dark:border-slate-800 lg:border-0 shadow-sm lg:shadow-none flex flex-col flex-1 p-6 lg:p-8 transition-colors duration-200 question-card">
            {/* Question Header Info */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-6">
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                QUESTION {currentIdx + 1} OF {totalQuestions}
              </span>

              {/* Status Squares */}
              <div className="hidden md:flex items-center gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Answered ({stats.answered})</span>
                </div>
                <div className="bg-rose-50 dark:bg-rose-955/20 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-350 px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                  <span>Not Answered ({stats.notAnswered})</span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-955/20 border border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                  <span>Marked ({stats.marked})</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                  <span>Not Visited ({stats.notVisited})</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge tone="blue">+{test.correct_marks} / {test.wrong_marks} Marks</Badge>
              </div>
            </div>

            {isSectional && (
              <div className="mb-4 bg-indigo-50/45 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/40 rounded-xl px-4 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between shadow-sm">
                <span>Active Section: {test.sections![activeSectionIdx].name} ({test.sections![activeSectionIdx].subject})</span>
                <span className="bg-indigo-100/80 dark:bg-indigo-900/50 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold">Locked Sectional Timer</span>
              </div>
            )}

            {/* Split layout: Question details on the left, Option selector cards on the right */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
              {/* Left Column: Dedicated to the question context */}
              <div className="flex flex-col min-w-0 lg:border-r lg:border-slate-100 lg:dark:border-slate-800/40 lg:pr-8">
                {/* Conditionally Render Passage Box (Paragraph context) */}
                {currentQuestion.passage_id && (
                  <div className="bg-slate-50/50 dark:bg-slate-900/35 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm mb-6 transition-all duration-200 main-box">
                    {loadingPassage === currentQuestion.passage_id || !passageCache[currentQuestion.passage_id] ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <Spinner />
                        <p className="mt-2 text-xs font-semibold text-slate-400">Loading passage context...</p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gradient-to-r from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/30 dark:to-purple-950/20 backdrop-blur-md rounded-xl px-4 py-3 border border-indigo-100/60 dark:border-indigo-900/40 shadow-sm mb-4">
                          <h3 className="text-sm font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                            {passageCache[currentQuestion.passage_id].title}
                          </h3>
                        </div>
                        <div 
                          className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed whitespace-pre-wrap font-semibold max-h-[35vh] overflow-y-auto pr-2 custom-scrollbar"
                          style={getPassageStyle()}
                        >
                          {passageCache[currentQuestion.passage_id].content}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="flex-1 flex flex-col justify-start">
                  <h2 
                    className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap mb-4"
                    style={getQuestionStyle()}
                  >
                    {currentQuestion.question}
                  </h2>

                  {currentQuestion.correct_option?.includes(",") && (
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 text-fuchsia-700 dark:text-fuchsia-400 border border-fuchsia-200/50 dark:border-fuchsia-900/30 shadow-sm mb-5 inline-flex self-start">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse text-fuchsia-600 dark:text-fuchsia-400 shrink-0" />
                      <span>Multiple Correct Options: Select all that apply</span>
                    </div>
                  )}

                  {(currentQuestion.image_url || currentQuestion.media_url) && (
                    <div className="mt-4 mb-4 flex justify-start">
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-2.5 shadow-sm">
                        <img
                          src={currentQuestion.image_url || currentQuestion.media_url}
                          alt="Question Graphic"
                          loading="lazy"
                          className="max-h-80 w-auto max-w-full rounded-lg object-contain bg-white aspect-auto"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Dedicated to the option cards */}
              <div className="flex flex-col justify-start">
                <div className="grid gap-3.5">
                  {(["option1", "option2", "option3", "option4"] as const).map((optKey, oIdx) => {
                    const optText = currentQuestion[optKey];
                    const optionLetter = String.fromCharCode(65 + oIdx);
                    const isSelected = answers[currentQuestion.id ?? ""]
                      ? answers[currentQuestion.id ?? ""].split(",").map(o => o.trim()).includes(optKey)
                      : false;
                    const isMSQ = currentQuestion.correct_option?.includes(",") ?? false;

                    return (
                      <button
                        key={optKey}
                        onClick={() => handleSelectOption(currentQuestion.id ?? "", optKey)}
                        className={`flex items-center justify-between gap-4 w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden choice-card ${
                          isSelected
                            ? `${isMSQ
                                ? "border-fuchsia-500 dark:border-fuchsia-400 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/5 to-transparent dark:from-fuchsia-950/20 dark:via-purple-950/10 dark:to-transparent text-fuchsia-950 dark:text-fuchsia-100 shadow-[0_4px_20px_rgba(217,70,239,0.15)] scale-[1.01] ring-1 ring-fuchsia-500/30"
                                : "border-indigo-500 dark:border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-100 shadow-[0_4px_16px_rgba(99,102,241,0.12)] scale-[1.01] ring-1 ring-indigo-500/30"
                              } active-choice`
                            : isMSQ
                              ? "border-slate-200 dark:border-slate-800/80 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 bg-white dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-fuchsia-50/10 dark:hover:bg-fuchsia-950/10 hover:-translate-y-0.5 hover:shadow-md"
                              : "border-slate-200 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-indigo-50/10 dark:hover:bg-indigo-955/10 hover:-translate-y-0.5 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {isMSQ ? (
                            <div
                              className={`h-8 w-8 rounded-xl flex items-center justify-center font-extrabold text-xs border transition-all duration-300 shrink-0 ${
                                isSelected
                                  ? "bg-gradient-to-tr from-fuchsia-600 to-purple-500 border-none text-white shadow-md shadow-fuchsia-500/25 rotate-6 scale-105 animate-scale-in"
                                  : "border-fuchsia-100 dark:border-purple-900/50 bg-fuchsia-50/40 dark:bg-purple-955/20 text-fuchsia-600 dark:text-purple-400"
                              }`}
                            >
                              {optionLetter}
                            </div>
                          ) : (
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center font-extrabold text-xs border transition-all duration-300 shrink-0 ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white scale-105 animate-scale-in"
                                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {optionLetter}
                            </div>
                          )}
                          <span className="text-sm font-bold leading-relaxed" style={getOptionStyle()}>{optText}</span>
                        </div>

                        {isMSQ ? (
                          <div className={`h-6 w-6 rounded-lg border flex items-center justify-center transition-all duration-200 ${
                            isSelected 
                              ? "bg-gradient-to-tr from-fuchsia-600 to-purple-500 border-none text-white scale-110 shadow-md shadow-fuchsia-500/20" 
                              : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                          }`}>
                            {isSelected && <Check className="h-4 w-4 stroke-[3.5]" />}
                          </div>
                        ) : (
                          <div className={`h-6 w-6 rounded-full border flex items-center justify-center transition-all duration-200 ${
                            isSelected 
                              ? "bg-indigo-600 border-indigo-600 text-white scale-110 shadow-md shadow-indigo-500/20" 
                              : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                          }`}>
                            {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-white animate-scale-in" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex flex-wrap items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5 gap-4">
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
                  className={`text-xs h-10 px-4 ${marked[currentQuestion.id ?? ""]
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
                  disabled={currentIdx === 0 || !isQuestionInActiveSection(currentIdx - 1)}
                  onClick={handlePrev}
                  className="h-10 text-xs px-3"
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>

                {(() => {
                  const activeRange = isSectional ? sectionsWithRanges[activeSectionIdx]?.range : null;
                  const isLastQuestionOfSection = activeRange ? (currentIdx === activeRange.end) : (currentIdx === totalQuestions - 1);
                  const isLastSection = !isSectional || (activeSectionIdx === sectionsWithRanges.length - 1);

                  if (isLastQuestionOfSection) {
                    if (isLastSection) {
                      return (
                        <Button
                          onClick={handleManualSubmit}
                          className="h-10 text-xs px-5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Finish Test
                        </Button>
                      );
                    } else {
                      return (
                        <Button
                          onClick={() => setSectionConfirmOpen(true)}
                          className="h-10 text-xs px-5 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1"
                          icon={<ChevronRight className="h-4 w-4" />}
                        >
                          Submit Section & Proceed
                        </Button>
                      );
                    }
                  } else {
                    return (
                      <div className="flex gap-2">
                        <Button
                          onClick={handleNext}
                          className="h-10 text-xs px-5 bg-indigo-600 hover:bg-indigo-700 text-white"
                          icon={<ChevronRight className="h-4 w-4" />}
                        >
                          Save & Next
                        </Button>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </article>
        </main>

        {/* Question Navigator stick to right edge of screen */}
        <aside ref={navigatorSidebarRef} className="hidden lg:flex fixed right-0 top-[72px] bottom-0 w-16 flex-col items-center bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 py-6 gap-3 z-20 overflow-y-auto custom-scrollbar shadow-sm transition-colors duration-200 sidebar-card">
          {questions.map((q, idx) => {
            const qId = q.id ?? "";
            const isAns = answers[qId] !== undefined;
            const isMarked = marked[qId] === true;
            const isVis = visited[idx] === true;
            const isCurrent = currentIdx === idx;
            const inActiveSec = isQuestionInActiveSection(idx);

            let btnBg = "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-955 dark:border-slate-800";

            if (!inActiveSec) {
              btnBg = "bg-slate-100/50 border-slate-200/45 text-slate-300 dark:bg-slate-950/40 dark:border-slate-850/50 cursor-not-allowed opacity-30";
            } else if (isAns && isMarked) {
              btnBg = "bg-purple-500 border-purple-500 text-white";
            } else if (isMarked) {
              btnBg = "bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-955/30 dark:border-purple-900/50 dark:text-purple-300";
            } else if (isAns) {
              btnBg = "bg-emerald-500 border-emerald-500 text-white";
            } else if (isVis) {
              btnBg = "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-955/30 dark:border-rose-900/50 dark:text-rose-350";
            }

            return (
              <button
                key={qId}
                data-index={idx}
                disabled={!inActiveSec}
                onClick={() => handleSelectQuestion(idx)}
                className={`h-10 w-10 rounded-xl font-bold text-xs border flex items-center justify-center transition-all shrink-0 ${btnBg} ${isCurrent ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105 shadow-sm" : ""}`}
                title={inActiveSec ? `Question ${idx + 1}` : `Question ${idx + 1} (Locked)`}
              >
                {idx + 1}
              </button>
            );
          })}
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
        <div className="text-slate-650 dark:text-slate-300 text-sm">
          <p className="font-bold text-slate-800 dark:text-slate-100 text-base mb-3">Are you sure you want to submit your test?</p>
          <p className="mb-4">Once submitted, you will not be able to edit any answers.</p>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 grid grid-cols-2 gap-3 font-semibold mt-4">
            <span className="text-slate-500">Total Questions:</span>
            <span className="text-slate-800 dark:text-slate-100 text-right">{totalQuestions}</span>
            <span className="text-emerald-600">Answered:</span>
            <span className="text-emerald-600 text-right">{stats.answered}</span>
            <span className="text-purple-600">Marked for Review:</span>
            <span className="text-purple-600 text-right">{stats.marked}</span>
            <span className="text-rose-500">Unanswered / Skipped:</span>
            <span className="text-rose-500 text-right">{totalQuestions - stats.answered}</span>
          </div>
        </div>
      </Modal>

      {/* Fullscreen Violation Modal */}
      <Modal
        open={orgData?.securityFeatures?.fullscreenMode !== false && fullscreenWarningOpen}
        title="Fullscreen Warning"
        onClose={() => {}} // Cannot close unless they re-enter fullscreen
        footer={
          <Button
            onClick={() => {
              enterFullscreen();
              setFullscreenWarningOpen(false);
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white w-full font-bold animate-pulse"
          >
            Re-enter Fullscreen Mode
          </Button>
        }
      >
        <div className="text-center p-4">
          <AlertTriangle className="h-16 w-16 text-rose-500 mx-auto mb-4 animate-bounce" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Fullscreen Mode Exited!</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed font-semibold">
            Exiting fullscreen is a proctoring violation. This event has been recorded and reported to the system administrator.
          </p>
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg p-3 inline-block font-bold text-rose-600 mb-2">
            Fullscreen Violations: {fullscreenViolations}
          </div>
          <p className="text-xs text-slate-400 mt-2 font-semibold">
            Please click the button below to re-enter fullscreen mode and resume your exam.
          </p>
        </div>
      </Modal>

      {warningMessage && <Toast tone="error">{warningMessage}</Toast>}
      {restoreMessage && <Toast tone="success">{restoreMessage}</Toast>}

      {/* Section Timeout Modal */}
      <Modal
        open={sectionTimeoutAlertOpen}
        title="Section Completed"
        onClose={() => setSectionTimeoutAlertOpen(false)}
        footer={
          <Button
            onClick={() => setSectionTimeoutAlertOpen(false)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full font-bold"
          >
            Start Next Section
          </Button>
        }
      >
        <div className="text-center p-4">
          <Clock className="h-16 w-16 text-indigo-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Section Time Expired!</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed font-semibold">
            Time is up for <span className="text-indigo-650 dark:text-indigo-400 font-extrabold">"{timeoutInfo?.prevName}"</span>.
          </p>
          <p className="text-xs text-slate-400 mt-2 font-semibold">
            You have been locked out of the previous section and automatically transitioned to:
          </p>
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg p-3 inline-block font-extrabold text-indigo-600 mt-2">
            {timeoutInfo?.nextName}
          </div>
        </div>
      </Modal>

      {/* Section Submission Confirmation Modal */}
      <Modal
        open={sectionConfirmOpen}
        title="Submit Section"
        onClose={() => setSectionConfirmOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSectionConfirmOpen(false)}>
              Resume Section
            </Button>
            <Button
              onClick={() => {
                setSectionConfirmOpen(false);
                handleSectionTimeout();
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Yes, Submit Section
            </Button>
          </>
        }
      >
        <div className="text-slate-650 dark:text-slate-350 text-sm">
          <p className="font-bold text-slate-805 dark:text-slate-100 text-base mb-3">
            Are you sure you want to submit the section "{test.sections && test.sections[activeSectionIdx]?.name}"?
          </p>
          <p className="mb-4">
            Once submitted, you will proceed to the next section and will NOT be able to return to this section.
          </p>
        </div>
      </Modal>

      {/* Screen share violation overlay */}
      {orgData?.securityFeatures?.screenSharingDetection !== false && isScreenStoppedMidTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-6">
          <div className="text-center max-w-md rounded-2xl border-2 border-rose-500 bg-white dark:bg-slate-900 p-8 shadow-2xl space-y-6">
            <AlertTriangle className="h-16 w-16 text-rose-500 mx-auto animate-bounce" />
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Screen Sharing Disconnected!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              You stopped sharing your screen. This is a proctoring violation. Workspace inputs are blocked.
            </p>
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 p-4 rounded-xl">
              <p className="text-xs text-rose-700 dark:text-rose-400 font-bold leading-normal">
                Please re-authorize screen sharing immediately to resume the test.
              </p>
            </div>
            <Button
              onClick={handleAuthorizeScreenSharing}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-12 rounded-xl text-sm transition-all shadow-md shadow-rose-500/20 animate-pulse"
            >
              Re-authorize Screen Sharing
            </Button>
          </div>
        </div>
      )}

      {/* Hidden video element to keep the camera stream alive in the background */}
      <video
        ref={hiddenVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "fixed",
          width: "4px",
          height: "4px",
          opacity: 0.01,
          pointerEvents: "none",
          bottom: "10px",
          right: "10px",
          zIndex: -9999
        }}
      />

      {/* Hidden video element to keep the screen capture stream alive in the background */}
      <video
        ref={screenVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "fixed",
          width: "4px",
          height: "4px",
          opacity: 0.01,
          pointerEvents: "none",
          bottom: "10px",
          right: "15px",
          zIndex: -9999
        }}
      />
    </div>
  );
};
