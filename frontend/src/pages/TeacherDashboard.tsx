import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Spinner } from "../components/ui/Spinner";
import { Modal } from "../components/ui/Modal";
import { Toast } from "../components/ui/Toast";
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getAllQuestions,
  getSubjects,
  getErrorMessage,
  getAllTests,
  getActiveStreams,
  ActiveStream,
} from "../services/api";
import { useSubTopics, useTopics } from "../hooks/useTests";
import { useAuthStore } from "../store/authStore";
import { CorrectOption, Question } from "../types";
import { questionSchema, QuestionFormValues } from "../utils/validators";

const emptyQuestion = {
  question: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  correct_option: "option1" as CorrectOption,
  difficulty: "easy",
  topic_id: "",
  sub_topic_id: "",
  new_topic_name: "",
  new_sub_topic_name: "",
  media_url: "",
  class: "Class 10",
};

export const TeacherDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Queries
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: getSubjects });
  const { data: allQuestions = [], isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["questions"],
    queryFn: getAllQuestions,
  });

  // States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [toast, setToast] = useState("");
  const [formError, setFormError] = useState("");
  const [csvText, setCsvText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // URL routing tab parameters and local view states
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "add";
  const selectedClass = searchParams.get("class") || "all";
  const [addSubTab, setAddSubTab] = useState<"manual" | "csv" | null>(null);

  // Live Test Monitoring States
  const [selectedTestIdForMonitoring, setSelectedTestIdForMonitoring] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeTab !== "add") {
      setAddSubTab(null);
    }
  }, [activeTab]);

  // Queries for monitoring
  const { data: tests = [], isLoading: isLoadingTests } = useQuery({
    queryKey: ["tests"],
    queryFn: getAllTests,
  });

  const [wsStreams, setWsStreams] = useState<Record<string, any>>({});
  const [isWsConnected, setIsWsConnected] = useState(false);
  const teacherSocketRef = useRef<WebSocket | null>(null);
  
  interface ChatMessage {
    sender: string;
    text: string;
    timestamp: number;
  }
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const [activeChatStudentId, setActiveChatStudentId] = useState<string | null>(null);
  const [chatInputMap, setChatInputMap] = useState<Record<string, string>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // WebSocket manager for live streams feed
  useEffect(() => {
    if (!selectedTestIdForMonitoring) {
      setWsStreams({});
      setIsWsConnected(false);
      return;
    }

    let ws: WebSocket | null = null;
    let isConnecting = false;
    let isDestroyed = false;

    const connect = () => {
      if (isDestroyed || ws || isConnecting) return;
      isConnecting = true;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // Connect to backend port 4000
      const wsUrl = `${protocol}//127.0.0.1:4000/api/proctor/stream?role=teacher&test_id=${selectedTestIdForMonitoring}`;

      console.log("Teacher connecting to proctor WS:", wsUrl);
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (isDestroyed) {
          socket.close();
          return;
        }
        console.log("Teacher Proctor WS connected successfully.");
        ws = socket;
        teacherSocketRef.current = socket;
        setIsWsConnected(true);
        isConnecting = false;
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "initial_streams") {
            const initialMap: Record<string, any> = {};
            message.streams.forEach((s: any) => {
              initialMap[s.user_id] = s;
            });
            setWsStreams(initialMap);
          } else if (message.type === "frame_update") {
            setWsStreams((prev) => ({
              ...prev,
              [message.user_id]: {
                user_id: message.user_id,
                username: message.username,
                frame: message.frame,
                hasVideo: message.hasVideo,
                hasAudio: message.hasAudio,
                lastSeen: message.lastSeen
              }
            }));
          } else if (message.type === "student_disconnected") {
            setWsStreams((prev) => {
              const updated = { ...prev };
              delete updated[message.user_id];
              return updated;
            });
          } else if (message.type === "chat_message") {
            const studentId = message.sender_id;
            setChatHistory((prev) => {
              const currentChats = prev[studentId] || [];
              return {
                ...prev,
                [studentId]: [...currentChats, {
                  sender: message.sender_name || studentId,
                  text: message.text,
                  timestamp: message.timestamp
                }]
              };
            });
            if (activeChatStudentIdRef.current !== studentId) {
              setUnreadCounts((prev) => ({
                ...prev,
                [studentId]: (prev[studentId] || 0) + 1
              }));
            }
          }
        } catch (err) {
          console.error("Error parsing message on teacher WS:", err);
        }
      };

      socket.onerror = (err) => {
        console.error("Teacher Proctor WS error:", err);
      };

      socket.onclose = () => {
        if (isDestroyed) return;
        console.log("Teacher Proctor WS closed. Falling back to HTTP polling.");
        ws = null;
        teacherSocketRef.current = null;
        setIsWsConnected(false);
        isConnecting = false;
        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      isDestroyed = true;
      if (ws) {
        ws.close();
      }
      teacherSocketRef.current = null;
    };
  }, [selectedTestIdForMonitoring]);

  const activeChatStudentIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeChatStudentIdRef.current = activeChatStudentId;
    if (activeChatStudentId) {
      setUnreadCounts((prev) => ({
        ...prev,
        [activeChatStudentId]: 0
      }));
    }
  }, [activeChatStudentId]);

  const handleSendTeacherChatMessage = (studentId: string) => {
    const input = chatInputMap[studentId] || "";
    if (!input.trim() || !teacherSocketRef.current || teacherSocketRef.current.readyState !== WebSocket.OPEN) return;
    
    const text = input.trim();
    teacherSocketRef.current.send(JSON.stringify({
      type: "chat_message",
      target_user_id: studentId,
      text
    }));
    
    setChatHistory((prev) => {
      const current = prev[studentId] || [];
      return {
        ...prev,
        [studentId]: [...current, {
          sender: "You (Proctor)",
          text,
          timestamp: Date.now()
        }]
      };
    });
    
    setChatInputMap((prev) => ({
      ...prev,
      [studentId]: ""
    }));
  };


  const { data: httpStreamsList = [] } = useQuery({
    queryKey: ["activeStreams", selectedTestIdForMonitoring],
    queryFn: () => getActiveStreams(selectedTestIdForMonitoring || ""),
    enabled: !!selectedTestIdForMonitoring && !isWsConnected,
    refetchInterval: 3000,
  });

  const activeStreamsList = useMemo(() => {
    if (isWsConnected) {
      const now = Date.now();
      return Object.values(wsStreams).filter(
        (s: any) => now - s.lastSeen <= 10000
      );
    }
    return httpStreamsList;
  }, [isWsConnected, wsStreams, httpStreamsList]);

  // Determine current teacher subject details
  const teacherSubject = useMemo(() => {
    const defaultSubject = subjects.find(s => s.name === user?.subject);
    return defaultSubject || { id: "sub-1", name: user?.subject || "Mathematics" };
  }, [subjects, user?.subject]);

  // Hooks for topics/sub-topics based on teacher subject
  const { data: topics = [] } = useTopics(teacherSubject.id);
  const selectedTopicIds = useMemo(() => topics.map(t => t.id), [topics]);
  const { data: subTopics = [] } = useSubTopics(selectedTopicIds);

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: emptyQuestion,
  });

  const selectedTopicId = watch("topic_id");
  const selectedSubTopicId = watch("sub_topic_id");
  const filteredSubTopics = useMemo(() => {
    return subTopics.filter(st => st.topic_id === selectedTopicId);
  }, [subTopics, selectedTopicId]);

  const parsedPreviewQuestions = useMemo(() => {
    if (!csvText.trim()) return [];
    try {
      const lines = csvText.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) return [];

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
      const qIndex = headers.indexOf("question");
      if (qIndex === -1) return [];

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = values[index] || "";
        });
        if (rowObj.question) {
          rows.push(rowObj);
        }
      }
      return rows;
    } catch (e) {
      return [];
    }
  }, [csvText]);

  // Filter questions that belong to the teacher's subject
  const subjectQuestions = useMemo(() => {
    // A question is in the subject if its topic matches one of the teacher's subject's topics
    return allQuestions.filter(q => {
      if (q.topic_id) {
        return selectedTopicIds.includes(q.topic_id);
      }
      return false;
    });
  }, [allQuestions, selectedTopicIds]);

  const effectiveClassFilter = selectedClass;

  const filteredTopics = useMemo(() => {
    if (effectiveClassFilter === "all") {
      return topics;
    }
    const activeTopicIds = new Set(
      subjectQuestions
        .filter(q => q.class === effectiveClassFilter)
        .map(q => q.topic_id)
        .filter(Boolean)
    );
    return topics.filter(t => activeTopicIds.has(t.id));
  }, [topics, subjectQuestions, effectiveClassFilter]);

  useEffect(() => {
    if (topicFilter !== "all" && effectiveClassFilter !== "all") {
      const isValid = filteredTopics.some(t => t.id === topicFilter);
      if (!isValid) {
        setTopicFilter("all");
      }
    }
  }, [effectiveClassFilter, filteredTopics, topicFilter]);

  // Apply search/difficulty/topic/class filters on questions list
  const filteredQuestions = useMemo(() => {
    return subjectQuestions.filter(q => {
      const matchesSearch = q.question.toLowerCase().includes(search.toLowerCase());
      const qDiff = (q.difficulty || "").toLowerCase().trim();
      const filterDiff = difficultyFilter.toLowerCase().trim();
      const matchesDiff =
        difficultyFilter === "all" ||
        qDiff === filterDiff ||
        (filterDiff === "hard" && qDiff === "difficult") ||
        (filterDiff === "difficult" && qDiff === "hard");
      const matchesTopic = topicFilter === "all" || q.topic_id === topicFilter;
      const matchesClass = effectiveClassFilter === "all" || q.class === effectiveClassFilter;
      return matchesSearch && matchesDiff && matchesTopic && matchesClass;
    });
  }, [subjectQuestions, search, difficultyFilter, topicFilter, effectiveClassFilter]);

  // Statistics
  const questionsFilteredExceptDifficulty = useMemo(() => {
    return subjectQuestions.filter(q => {
      const matchesSearch = q.question.toLowerCase().includes(search.toLowerCase());
      const matchesTopic = topicFilter === "all" || q.topic_id === topicFilter;
      const matchesClass = effectiveClassFilter === "all" || q.class === effectiveClassFilter;
      return matchesSearch && matchesTopic && matchesClass;
    });
  }, [subjectQuestions, search, topicFilter, effectiveClassFilter]);

  const stats = useMemo(() => {
    const total = questionsFilteredExceptDifficulty.length;
    const easy = questionsFilteredExceptDifficulty.filter(q => (q.difficulty || "").toLowerCase().trim() === "easy").length;
    const medium = questionsFilteredExceptDifficulty.filter(q => (q.difficulty || "").toLowerCase().trim() === "medium").length;
    const hard = questionsFilteredExceptDifficulty.filter(q => {
      const diff = (q.difficulty || "").toLowerCase().trim();
      return diff === "hard" || diff === "difficult";
    }).length;
    return { total, easy, medium, hard };
  }, [questionsFilteredExceptDifficulty]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createQuestion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      setToast("Question created successfully");
      setModalOpen(false);
      setAddSubTab(null);
      reset(emptyQuestion);
      window.setTimeout(() => setToast(""), 1800);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Question }) => updateQuestion(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      setToast("Question updated successfully");
      setModalOpen(false);
      reset(emptyQuestion);
      setEditingQuestionId(null);
      setEditingIndex(null);
      window.setTimeout(() => setToast(""), 1800);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      setToast("Question deleted successfully");
      window.setTimeout(() => setToast(""), 1800);
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  // Handlers
  const handleOpenAddModal = () => {
    setEditingIndex(null);
    setEditingQuestionId(null);
    setFormError("");
    reset(emptyQuestion);
    setModalOpen(true);
  };

  // CSV Import handler
  const handleCsvImport = async () => {
    if (!csvText.trim()) return;
    setIsImporting(true);

    try {
      // Basic CSV Parser
      const lines = csvText.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert("CSV must contain a header row and at least one question row.");
        setIsImporting(false);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        // Handles standard comma split (simple csv)
        const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = values[index] || "";
        });
        rows.push(rowObj);
      }

      // Create questions in global pool under teacher's subject
      let createdCount = 0;
      for (const row of rows) {
        if (!row.question || !row.option1 || !row.option2) continue;

        const topicNameClean = (row.topic || "").trim();
        const subTopicNameClean = (row.sub_topic || "").trim();

        // Try to match topic name
        const matchedTopic = topicNameClean
          ? topics.find((t) => t.name.toLowerCase() === topicNameClean.toLowerCase())
          : null;
        const topic_id = matchedTopic ? matchedTopic.id : (topicNameClean ? "new" : "");
        const topic_name = matchedTopic ? undefined : topicNameClean;

        // Find subtopic if matched
        const matchedSubTopic = subTopicNameClean
          ? subTopics.find((st) => st.name.toLowerCase() === subTopicNameClean.toLowerCase())
          : null;
        const sub_topic_id = matchedSubTopic ? matchedSubTopic.id : (subTopicNameClean ? "new" : "");
        const sub_topic_name = matchedSubTopic ? undefined : subTopicNameClean;

        // Map correct option value (A -> option1, B -> option2, etc.)
        let correct_option = "option1";
        const rawCorrect = (row.correct_option || "").toUpperCase().trim();
        if (rawCorrect === "A" || rawCorrect === "OPTION1") correct_option = "option1";
        else if (rawCorrect === "B" || rawCorrect === "OPTION2") correct_option = "option2";
        else if (rawCorrect === "C" || rawCorrect === "OPTION3") correct_option = "option3";
        else if (rawCorrect === "D" || rawCorrect === "OPTION4") correct_option = "option4";

        const qPayload: Question = {
          question: row.question,
          option1: row.option1,
          option2: row.option2,
          option3: row.option3 || "",
          option4: row.option4 || "",
          correct_option: correct_option as any,
          difficulty: row.difficulty || "easy",
          class: row.class || "Class 10",
          topic_id: topic_id || undefined,
          sub_topic_id: sub_topic_id || undefined,
          topic_name: topic_name || undefined,
          sub_topic_name: sub_topic_name || undefined,
          subject_id: teacherSubject.id,
          type: "mcq",
          test_id: "",
        };

        const createdQ = await createQuestion(qPayload);
        if (createdQ.id) {
          createdCount++;
        }
      }

      if (createdCount > 0) {
        await queryClient.invalidateQueries({ queryKey: ["questions"] });
        setCsvText("");
        setCsvModalOpen(false);
        setAddSubTab(null);
        setToast(`Successfully imported ${createdCount} questions!`);
        window.setTimeout(() => setToast(""), 2000);
      } else {
        alert("Could not import any questions. Please verify your CSV header columns.");
      }
    } catch (e) {
      alert("Error parsing CSV format. Please ensure it follows correct headers.");
      console.error(e);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleOpenEditModal = (question: Question, index: number) => {
    setEditingIndex(index);
    setEditingQuestionId(question.id ?? null);
    setFormError("");
    reset({
      question: question.question,
      option1: question.option1,
      option2: question.option2,
      option3: question.option3,
      option4: question.option4,
      correct_option: question.correct_option,
      difficulty: question.difficulty ?? "easy",
      topic_id: question.topic_id ?? "",
      sub_topic_id: question.sub_topic_id ?? "",
      new_topic_name: "",
      new_sub_topic_name: "",
      media_url: question.media_url ?? "",
      class: question.class ?? "Class 10",
    });
    setModalOpen(true);
  };

  const handleSaveQuestion: SubmitHandler<QuestionFormValues> = (values) => {
    setFormError("");
    if (values.topic_id === "new" && !values.new_topic_name?.trim()) {
      setFormError("New topic name is required");
      return;
    }
    if ((values.topic_id === "new" || values.sub_topic_id === "new") && !values.new_sub_topic_name?.trim()) {
      setFormError("New sub-topic name is required");
      return;
    }

    const payload: Question = {
      ...values,
      difficulty: values.difficulty || undefined,
      topic_id: values.topic_id || undefined,
      sub_topic_id: values.sub_topic_id || undefined,
      new_topic_name: values.topic_id === "new" ? values.new_topic_name?.trim() : undefined,
      new_sub_topic_name: (values.topic_id === "new" || values.sub_topic_id === "new") ? values.new_sub_topic_name?.trim() : undefined,
      subject_id: teacherSubject.id,
      media_url: values.media_url || undefined,
      type: "mcq",
      test_id: "", // Or unlinked initially
    };

    if (editingQuestionId) {
      updateMutation.mutate({ id: editingQuestionId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <AppShell>
      <PageWrapper>
        {activeTab === "add" && addSubTab === null && (
          <div className="space-y-8 animate-fade-in">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500 via-[#10b981] to-[#047857] p-6 text-white shadow-lg md:p-8">
              <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-100">
                    <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                    Parikshya Teacher Portal
                  </div>
                  <h1 className="text-3xl font-black tracking-tight">
                    {teacherSubject.name} Question Bank Hub
                  </h1>
                  <p className="mt-2 text-sm text-teal-50 max-w-xl">
                    Create and manage your question pool for <strong>{teacherSubject.name}</strong>. Monitor class distribution, perform bulk spreadsheet uploads, or add single questions manually.
                  </p>
                  <p className="mt-4 text-xs text-emerald-800 bg-white/95 rounded-full px-4 py-1.5 inline-block font-bold shadow-sm dark:bg-slate-900/90 dark:text-emerald-450">
                    Active Teacher: {user?.name || "Teacher"} ({teacherSubject.name} Specialist)
                  </p>
                </div>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-4xl border border-white/20 shadow-inner">
                  📚
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -top-8 -left-8 h-40 w-40 rounded-full bg-white/5 pointer-events-none" />
            </div>

            {/* Stats Breakdown Grid */}
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4">Class Pool Distribution</h2>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {["Class 9", "Class 10", "Class 11", "Class 12"].map((cls) => {
                  const count = subjectQuestions.filter((q) => q.class === cls).length;
                  return (
                    <div
                      key={cls}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide">Class Level</span>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{cls}</h4>
                      </div>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-450">{count}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Questions</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions Grid */}
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4">Add Questions to Pool</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <article
                  onClick={() => setAddSubTab("manual")}
                  className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md dark:hover:shadow-slate-950/40 hover:-translate-y-1 transition-all duration-300 border-t-4 border-t-emerald-500"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                    <Plus className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Manual Question Entry
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    Type a new question manually. You can set the question prompt, define options, specify the correct answer, choose class levels, and select topics/subtopics.
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Add Question Manually →
                  </span>
                </article>

                <article
                  onClick={() => setAddSubTab("csv")}
                  className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md dark:hover:shadow-slate-950/40 hover:-translate-y-1 transition-all duration-300 border-t-4 border-t-teal-500"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    CSV Spreadsheet Import
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    Import multiple multiple-choice questions in one go. Upload a standard CSV file or paste raw comma-separated text formatted with headers.
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                    Import CSV file →
                  </span>
                </article>
              </div>
            </div>

            {/* Recent Questions Panel */}
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4">Recently Added Questions</h2>
              {subjectQuestions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center text-slate-400 dark:text-slate-500">
                  <p className="text-sm font-semibold">No questions added yet to this subject.</p>
                  <p className="text-xs mt-1">Use the actions above to populate your question pool.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                  {subjectQuestions.slice(-3).reverse().map((q, idx) => {
                    const diffLower = (q.difficulty || "").toLowerCase().trim();
                    const difficultyColor = 
                      diffLower === "easy" ? "green" : 
                      diffLower === "medium" ? "yellow" : 
                      (diffLower === "hard" || diffLower === "difficult" ? "red" : "slate");
                    return (
                      <div key={q.id || idx} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{q.question}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge tone="blue">{q.class}</Badge>
                            <Badge tone={difficultyColor}>{q.difficulty}</Badge>
                            {q.topic_name && <span className="text-xs text-slate-400 dark:text-slate-550">{q.topic_name}</span>}
                          </div>
                        </div>
                        <div className="text-xs text-slate-450 dark:text-slate-500 shrink-0 font-medium">
                          Option 1: <span className="text-slate-600 dark:text-slate-300 font-semibold">{q.option1}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "add" && addSubTab !== null && (
          <div className="space-y-6">
            {/* Centered card becomes a top header card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-emerald-600 p-6 text-white shadow-lg md:p-8">
              <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-100">
                    <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                    Parikshya Teacher Portal
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                    {teacherSubject.name} Question Bank
                  </h1>
                  <p className="mt-2 text-xs text-emerald-700 bg-white/90 rounded-md px-2.5 py-1 inline-block font-semibold">
                    Logged in as: {user?.name || "Teacher"} ({teacherSubject.name} Expert)
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <Button
                    onClick={() => setAddSubTab("csv")}
                    className={`h-10 text-xs font-bold flex items-center gap-1.5 shadow-sm transition ${
                      addSubTab === "csv"
                        ? "bg-white text-emerald-700 hover:bg-teal-50 border-transparent"
                        : "bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-500/25"
                    }`}
                    icon={<Upload className={`h-3.5 w-3.5 ${addSubTab === "csv" ? "text-emerald-700" : "text-white"}`} />}
                  >
                    Import via CSV
                  </Button>
                  <Button
                    onClick={() => setAddSubTab("manual")}
                    className={`h-10 text-xs font-bold flex items-center gap-1.5 shadow-sm transition ${
                      addSubTab === "manual"
                        ? "bg-white text-emerald-700 hover:bg-teal-50 border-transparent"
                        : "bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-500/25"
                    }`}
                    icon={<Plus className={`h-3.5 w-3.5 ${addSubTab === "manual" ? "text-emerald-700" : "text-white"}`} />}
                  >
                    Add New Question
                  </Button>
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/5 pointer-events-none" />
            </div>

            {/* Manual Form */}
            {addSubTab === "manual" && (
              <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Add MCQ Question to Pool</h2>
                  <button
                    onClick={() => setAddSubTab(null)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition uppercase cursor-pointer"
                  >
                    Close Form ×
                  </button>
                </div>
                <form onSubmit={handleSubmit(handleSaveQuestion)} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Question Prompt</span>
                    <textarea
                      className="h-24 w-full resize-none rounded-md border border-slate-300 px-4 py-3 text-sm outline-none placeholder:text-slate-300 focus:border-emerald-500"
                      placeholder="Type the question details here..."
                      {...register("question")}
                    />
                    {errors.question?.message ? (
                      <span className="mt-1 block text-xs text-rose-500">{errors.question.message}</span>
                    ) : null}
                  </label>

                  <div>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Options (Select the correct one)</span>
                    {(["option1", "option2", "option3", "option4"] as const).map((opt, idx) => (
                      <div key={opt} className="mb-2.5 flex items-center gap-3">
                        <Controller
                          name="correct_option"
                          control={control}
                          render={({ field }) => (
                            <input
                              type="radio"
                              className="h-5 w-5 accent-emerald-500 shrink-0"
                              checked={field.value === opt}
                              onChange={() => field.onChange(opt)}
                            />
                          )}
                        />
                        <div className="flex-1">
                          <Input
                            placeholder={`Option ${idx + 1}`}
                            className="h-10 border-slate-300"
                            error={errors[opt]?.message}
                            {...register(opt)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-4">
                    <Select
                      label="Class"
                      options={[
                        { label: "Class 9", value: "Class 9" },
                        { label: "Class 10", value: "Class 10" },
                        { label: "Class 11", value: "Class 11" },
                        { label: "Class 12", value: "Class 12" },
                      ]}
                      {...register("class")}
                    />
                    <Select
                      label="Difficulty Level"
                      options={[
                        { label: "Easy", value: "easy" },
                        { label: "Medium", value: "medium" },
                        { label: "Difficult", value: "hard" },
                      ]}
                      {...register("difficulty")}
                    />
                    <Select
                      label="Topic"
                      options={[
                        { label: "Select Topic", value: "" },
                        ...topics.map((t) => ({ label: t.name, value: t.id })),
                        { label: "+ Add New Topic", value: "new" },
                      ]}
                      {...register("topic_id")}
                    />
                    <Select
                      label="Sub-topic"
                      options={[
                        { label: "Select Sub-topic", value: "" },
                        ...filteredSubTopics.map((st) => ({ label: st.name, value: st.id })),
                        { label: "+ Add New Sub-topic", value: "new" },
                      ]}
                      {...register("sub_topic_id")}
                    />
                  </div>

                  {selectedTopicId === "new" && (
                    <Input
                      label="New Topic Name"
                      placeholder="Enter new topic name"
                      error={errors.new_topic_name?.message}
                      {...register("new_topic_name")}
                    />
                  )}

                  {(selectedTopicId === "new" || selectedSubTopicId === "new") && (
                    <Input
                      label="New Sub-topic Name"
                      placeholder="Enter new sub-topic name"
                      error={errors.new_sub_topic_name?.message}
                      {...register("new_sub_topic_name")}
                    />
                  )}

                  <Input
                    label="Media URL (Optional)"
                    placeholder="https://example.com/image.png"
                    error={errors.media_url?.message}
                    {...register("media_url")}
                  />

                  {formError ? <p className="text-xs font-bold text-rose-500">{formError}</p> : null}

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button
                      variant="secondary"
                      onClick={() => setAddSubTab(null)}
                      type="button"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Add to Pool"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* CSV Form */}
            {addSubTab === "csv" && (
              <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Import Questions via CSV</h2>
                  <button
                    onClick={() => setAddSubTab(null)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition uppercase cursor-pointer"
                  >
                    Close Form ×
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    Upload a `.csv` file or paste CSV text directly. The imported questions will be added to the global pool for your subject (<strong>{teacherSubject.name}</strong>).
                  </p>

                  {/* CSV File Input */}
                  <label className="block border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-5 hover:border-slate-400 dark:hover:border-slate-600 text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-950/20">
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <FileSpreadsheet className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-xs font-semibold text-emerald-600 block">Click to upload .csv file</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">UTF-8 comma-separated format</span>
                  </label>

                  {/* Textarea for Paste CSV */}
                  <div>
                    <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-350">Or Paste CSV Text:</span>
                    <textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      placeholder="question,option1,option2,option3,option4,correct_option,difficulty,class,topic,sub_topic&#10;What is 1+1?,2,3,4,5,option1,easy,Class 10,Algebra,Addition"
                      className="h-28 w-full resize-none rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>

                  {parsedPreviewQuestions.length > 0 && (
                    <div>
                      <span className="mb-2 block text-xs font-bold text-slate-600">CSV Preview ({parsedPreviewQuestions.length} Questions):</span>
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-2">
                        {parsedPreviewQuestions.map((q, idx) => (
                          <div key={idx} className="rounded border border-slate-100 bg-white p-3 text-xs shadow-sm">
                            <div className="font-bold text-slate-800">Q{idx + 1}: {q.question}</div>
                            <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] text-slate-500">
                              <div>Option 1: {q.option1 || "-"}</div>
                              <div>Option 2: {q.option2 || "-"}</div>
                              <div>Option 3: {q.option3 || "-"}</div>
                              <div>Option 4: {q.option4 || "-"}</div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                              <span className="font-semibold text-emerald-600">Correct: {q.correct_option || "-"}</span>
                              <span className="text-slate-400">Class: {q.class || "Class 10"}</span>
                              <span className="text-slate-400">Difficulty: {q.difficulty || "-"}</span>
                              <span className="text-slate-400">Topic: {q.topic || "-"}</span>
                              <span className="text-slate-400">Sub-topic: {q.sub_topic || "-"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Format Help Details */}
                  <div className="rounded bg-amber-50 border border-amber-100 p-3 text-[10px] text-amber-800 leading-relaxed">
                    <h4 className="font-bold flex items-center gap-1 mb-1">
                      <HelpCircle className="h-3.5 w-3.5 shrink-0" /> Expected CSV Headers:
                    </h4>
                    <p className="font-mono bg-white/70 p-1.5 rounded mb-1.5 text-[9px] overflow-x-auto whitespace-nowrap">
                      question,option1,option2,option3,option4,correct_option,difficulty,class,topic,sub_topic
                    </p>
                    <span>* Correct option should match A, B, C, D or option1, option2, option3, option4.</span>
                    <br />
                    <span>* If the topic name doesn't match any subject topics, the first topic will be auto-assigned.</span>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button
                      variant="secondary"
                      onClick={() => setAddSubTab(null)}
                      disabled={isImporting}
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={!csvText.trim() || isImporting}
                      onClick={handleCsvImport}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isImporting ? "Importing..." : "Import Questions"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "view" && (
          <div>
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {selectedClass === "all" ? "All Questions Bank" : `${selectedClass} Questions Bank`}
                </h1>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                  Subject: {teacherSubject.name}
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <section className="mb-8 grid gap-4 grid-cols-2 sm:grid-cols-4">
              <article 
                onClick={() => setDifficultyFilter("all")}
                className={`rounded-xl border p-4 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] select-none hover:shadow-md ${
                  difficultyFilter === "all" 
                    ? "border-slate-500 bg-slate-50/50 dark:border-slate-650 dark:bg-slate-800/30 ring-2 ring-slate-500/20" 
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Total Pool</p>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{stats.total} Qs</h3>
              </article>
              <article 
                onClick={() => setDifficultyFilter("easy")}
                className={`rounded-xl border p-4 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] select-none hover:shadow-md ${
                  difficultyFilter === "easy" 
                    ? "border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20" 
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Easy Level</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.easy} Qs</h3>
              </article>
              <article 
                onClick={() => setDifficultyFilter("medium")}
                className={`rounded-xl border p-4 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] select-none hover:shadow-md ${
                  difficultyFilter === "medium" 
                    ? "border-amber-500 bg-amber-50/10 dark:bg-amber-950/20 ring-2 ring-amber-500/20" 
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Medium Level</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">{stats.medium} Qs</h3>
              </article>
              <article 
                onClick={() => setDifficultyFilter("hard")}
                className={`rounded-xl border p-4 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] select-none hover:shadow-md ${
                  difficultyFilter === "hard" 
                    ? "border-rose-500 bg-rose-50/10 dark:bg-rose-950/20 ring-2 ring-rose-500/20" 
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">Difficult Level</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">{stats.hard} Qs</h3>
              </article>
            </section>

            {/* Search & Topic Filters */}
            <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm md:grid-cols-[1fr_240px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-10 h-11 border-slate-200"
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="relative">
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="h-11 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-750 dark:text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">All Topics</option>
                  {filteredTopics.map((t) => (
                    <option key={t.id} value={t.id} className="dark:bg-slate-900 dark:text-slate-200">
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Questions Table */}
            <h2 className="mb-4 text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-500" />
              Manage Subject Questions
            </h2>

            {isLoadingQuestions ? (
              <div className="flex h-64 items-center justify-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <Spinner /> <span className="ml-2">Loading question pool...</span>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 text-center text-slate-500 dark:text-slate-400">
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">No questions found</p>
                <p className="mt-1 text-sm text-slate-400">Add questions or adjust your search filters.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950/20 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-850">
                    <tr>
                      <th className="px-6 py-4 w-12 text-center">#</th>
                      <th className="px-6 py-4">Question Prompt</th>
                      <th className="px-6 py-4 w-44">Topic</th>
                      <th className="px-6 py-4 w-32">Difficulty</th>
                      <th className="px-6 py-4 w-40 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredQuestions.map((q, index) => {
                      const topicName = topics.find(t => t.id === q.topic_id)?.name ?? "General";
                      const diffLower = (q.difficulty || "").toLowerCase().trim();
                      const difficultyColor =
                        diffLower === "easy" ? "green" :
                        diffLower === "medium" ? "yellow" : 
                        (diffLower === "hard" || diffLower === "difficult" ? "red" : "slate");

                      return (
                        <tr key={q.id ?? index} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40">
                          <td className="px-6 py-4 text-center font-bold text-slate-400">{index + 1}</td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">{q.question}</div>
                            <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Ans: {q.correct_option.replace("option", "Option ")}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">
                            <Badge tone="blue">{topicName}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge tone={difficultyColor}>{q.difficulty ?? "easy"}</Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {(user?.role === "Admin" || q.created_by === user?.userId) ? (
                                <>
                                  <Button
                                    variant="secondary"
                                    className="h-8 px-2.5 text-xs"
                                    onClick={() => handleOpenEditModal(q, index)}
                                    icon={<Pencil className="h-3.5 w-3.5" />}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="h-8 px-2.5 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                                    onClick={() => {
                                      if (confirm("Delete this question from pool?")) {
                                        deleteMutation.mutate(q.id ?? "");
                                      }
                                    }}
                                    icon={<Trash2 className="h-3.5 w-3.5" />}
                                  >
                                    Delete
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs font-semibold text-slate-400 italic bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                                  View Only
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "monitoring" && (
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-900 p-6 shadow-sm">
            {!selectedTestIdForMonitoring ? (
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Select Live Test to Monitor</h2>
                {isLoadingTests ? (
                  <div className="flex h-40 items-center justify-center text-slate-500">
                    <Spinner /> <span className="ml-2">Loading tests...</span>
                  </div>
                ) : (() => {
                  const liveAndScheduledTests = tests.filter((test) => {
                    if (test.status !== "live") return false;
                    // Filter out tests that are fully completed (time slot has finished)
                    if (test.end_time && new Date(test.end_time).getTime() < now) {
                      return false;
                    }
                    return true;
                  });

                  if (liveAndScheduledTests.length === 0) {
                    return (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20">
                        <p className="text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">No Active or Scheduled Tests Found</p>
                        <p className="text-xs">There are no upcoming or currently live tests to monitor.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {liveAndScheduledTests.map((test) => {
                        const isFuture = test.start_time && new Date(test.start_time).getTime() > now;
                        
                        const getRemainingTimeStr = (startTime: string) => {
                          const diff = new Date(startTime).getTime() - now;
                          if (diff <= 0) return "00h 00m 00s";
                          const hours = Math.floor(diff / (1000 * 60 * 60));
                          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                          return `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
                        };

                        return (
                          <div key={test.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md dark:hover:shadow-slate-950/45 transition bg-slate-50/50 dark:bg-slate-950/20">
                            <div className="mb-2 flex items-center justify-between">
                              {isFuture ? (
                                <Badge tone="yellow">Upcoming</Badge>
                              ) : (
                                <Badge tone="green">Live Now</Badge>
                              )}
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-450">{test.class || "All Classes"}</span>
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">{test.name}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Subject: {Array.isArray(test.subject) ? test.subject.join(", ") : test.subject}</p>
                            {isFuture ? (
                              <Button
                                disabled
                                className="w-full bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-550 font-bold h-9 text-xs border border-slate-200 dark:border-slate-850 cursor-not-allowed"
                              >
                                Starts in {getRemainingTimeStr(test.start_time || "")}
                              </Button>
                            ) : (
                              <Button
                                onClick={() => setSelectedTestIdForMonitoring(test.id)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs animate-pulse"
                              >
                                Monitor Live Feeds
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div>
                {/* Header for monitoring a specific test */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div>
                    <button
                      onClick={() => setSelectedTestIdForMonitoring(null)}
                      className="mb-1 text-xs font-bold text-emerald-600 hover:underline uppercase flex items-center gap-1 cursor-pointer"
                    >
                      ← Back to Test List
                    </button>
                    <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-200">
                      Monitoring: {tests.find(t => t.id === selectedTestIdForMonitoring)?.name || "Live Test"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Class: {tests.find(t => t.id === selectedTestIdForMonitoring)?.class || "All"} | Subject: {
                        (() => {
                          const test = tests.find(t => t.id === selectedTestIdForMonitoring);
                          return test ? (Array.isArray(test.subject) ? test.subject.join(", ") : test.subject) : "";
                        })()
                      }
                    </p>
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                    isWsConnected
                      ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30"
                      : "text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800"
                  }`}>
                    <span className={`h-2 w-2 rounded-full animate-ping ${
                      isWsConnected ? "bg-emerald-500" : "bg-red-500"
                    }`} />
                    <span>
                      {isWsConnected
                        ? "Real-time WebSocket feed active"
                        : "Real-time polling active (every 3s)"}
                    </span>
                  </div>
                </div>

                {/* Grid of student feeds */}
                {activeStreamsList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-sm font-semibold mb-1">Waiting for students to join...</p>
                    <p className="text-xs">No active students have started the test attempt with proctoring stream yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {activeStreamsList.map((stream) => (
                      <div key={stream.user_id} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-sm relative aspect-video flex flex-col justify-end text-white">
                        {/* Stream Image / Fallback */}
                        {stream.frame ? (
                          <img
                            src={stream.frame}
                            alt={`${stream.username}'s webcam`}
                            className="w-full h-full object-cover absolute inset-0"
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 dark:bg-slate-950 text-slate-400">
                            <span className="text-4xl font-extrabold mb-1">👤</span>
                            <span className="text-xs font-semibold uppercase tracking-wider">Camera Inactive</span>
                          </div>
                        )}

                        {/* Top corner indicators */}
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            stream.hasVideo ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
                          }`}>
                            Video: {stream.hasVideo ? "ON" : "OFF"}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            stream.hasAudio ? "bg-emerald-500/90 text-white animate-pulse" : "bg-red-500/90 text-white"
                          }`}>
                            Mic: {stream.hasAudio ? "ON" : "OFF"}
                          </span>
                        </div>

                        {/* Bottom Info Overlay */}
                        <div className="relative z-10 bg-slate-950/80 p-2 border-t border-white/5 backdrop-blur-[2px] flex items-center justify-between gap-2">
                          <div className="truncate flex-1">
                            <div className="text-xs font-extrabold truncate text-white">{stream.username}</div>
                            <div className="text-[9px] text-slate-400 truncate">{stream.user_id}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setActiveChatStudentId(stream.user_id)}
                              className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-[9px] font-bold text-white uppercase tracking-wider relative flex items-center gap-1"
                            >
                              Chat
                              {unreadCounts[stream.user_id] > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-rose-500 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white animate-bounce">
                                  {unreadCounts[stream.user_id]}
                                </span>
                              )}
                            </button>
                            <span className="flex h-2 w-2 rounded-full bg-emerald-400" title="Connected" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Modal (for editing from the list view) */}
        <Modal
          open={modalOpen}
          title={editingQuestionId ? "Edit MCQ Question" : "Add MCQ Question to Pool"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setModalOpen(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit(handleSaveQuestion)}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingQuestionId
                  ? "Save Changes"
                  : "Add to Pool"}
              </Button>
            </>
          }
        >
          <form className="space-y-4" onSubmit={handleSubmit(handleSaveQuestion)}>
            {/* Question Text */}
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Question Prompt</span>
              <textarea
                className="h-24 w-full resize-none rounded-md border border-slate-300 px-4 py-3 text-sm outline-none placeholder:text-slate-300 focus:border-emerald-500"
                placeholder="Type the question details here..."
                {...register("question")}
              />
              {errors.question?.message ? (
                <span className="mt-1 block text-xs text-rose-500">{errors.question.message}</span>
              ) : null}
            </label>

            {/* Options */}
            <div>
              <span className="mb-2 block text-sm font-semibold text-slate-700">Options (Select the correct one)</span>
              {(["option1", "option2", "option3", "option4"] as const).map((opt, idx) => (
                <div key={opt} className="mb-2.5 flex items-center gap-3">
                  <Controller
                    name="correct_option"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="radio"
                        className="h-5 w-5 accent-emerald-500 shrink-0"
                        checked={field.value === opt}
                        onChange={() => field.onChange(opt)}
                      />
                    )}
                  />
                  <div className="flex-1">
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      className="h-10 border-slate-300"
                      error={errors[opt]?.message}
                      {...register(opt)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Classification */}
            <div className="grid gap-4 sm:grid-cols-4">
              <Select
                label="Class"
                options={[
                  { label: "Class 9", value: "Class 9" },
                  { label: "Class 10", value: "Class 10" },
                  { label: "Class 11", value: "Class 11" },
                  { label: "Class 12", value: "Class 12" },
                ]}
                {...register("class")}
              />
              <Select
                label="Difficulty Level"
                options={[
                  { label: "Easy", value: "easy" },
                  { label: "Medium", value: "medium" },
                  { label: "Difficult", value: "hard" },
                ]}
                {...register("difficulty")}
              />
              <Select
                label="Topic"
                options={[
                  { label: "Select Topic", value: "" },
                  ...topics.map((t) => ({ label: t.name, value: t.id })),
                  { label: "+ Add New Topic", value: "new" },
                ]}
                {...register("topic_id")}
              />
              <Select
                label="Sub-topic"
                options={[
                  { label: "Select Sub-topic", value: "" },
                  ...filteredSubTopics.map((st) => ({ label: st.name, value: st.id })),
                  { label: "+ Add New Sub-topic", value: "new" },
                ]}
                {...register("sub_topic_id")}
              />
            </div>

            {selectedTopicId === "new" && (
              <Input
                label="New Topic Name"
                placeholder="Enter new topic name"
                error={errors.new_topic_name?.message}
                {...register("new_topic_name")}
              />
            )}

            {(selectedTopicId === "new" || selectedSubTopicId === "new") && (
              <Input
                label="New Sub-topic Name"
                placeholder="Enter new sub-topic name"
                error={errors.new_sub_topic_name?.message}
                {...register("new_sub_topic_name")}
              />
            )}

            <Input
              label="Media URL (Optional)"
              placeholder="https://example.com/image.png"
              error={errors.media_url?.message}
              {...register("media_url")}
            />

            {formError ? <p className="text-xs font-bold text-rose-500">{formError}</p> : null}
          </form>
        </Modal>

      {/* Proctor Chat Modal / Drawer for Teachers */}
      {activeChatStudentId && (
        <Modal
          open={Boolean(activeChatStudentId)}
          title={`Chat with Student (${activeChatStudentId})`}
          onClose={() => setActiveChatStudentId(null)}
          footer={
            <div className="flex w-full gap-2">
              <input
                type="text"
                value={chatInputMap[activeChatStudentId] || ""}
                onChange={(e) => setChatInputMap((prev) => ({
                  ...prev,
                  [activeChatStudentId]: e.target.value
                }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendTeacherChatMessage(activeChatStudentId);
                  }
                }}
                placeholder="Type a warning/message to the student..."
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-white"
              />
              <Button
                variant="primary"
                onClick={() => handleSendTeacherChatMessage(activeChatStudentId)}
                className="bg-indigo-600 text-white hover:bg-indigo-700 h-9"
              >
                Send
              </Button>
            </div>
          }
        >
          <div className="flex flex-col h-[350px]">
            <div className="flex-1 overflow-y-auto space-y-3 p-2 mb-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
              {(!chatHistory[activeChatStudentId] || chatHistory[activeChatStudentId].length === 0) ? (
                <div className="h-full flex items-center justify-center text-center p-6 text-slate-400 text-xs">
                  <p>No chat history. Send a warning message to warn the student of any rules switches or suspicious movements.</p>
                </div>
              ) : (
                chatHistory[activeChatStudentId].map((msg, mIdx) => {
                  const isTeacher = msg.sender.includes("Proctor") || msg.sender === "You (Proctor)";
                  return (
                    <div 
                      key={mIdx}
                      className={`flex flex-col max-w-[85%] ${isTeacher ? "ml-auto items-end" : "mr-auto"}`}
                    >
                      <span className="text-[10px] font-bold text-slate-400 mb-0.5">
                        {msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div 
                        className={`p-2.5 rounded-xl text-xs font-semibold leading-relaxed ${
                          isTeacher 
                            ? "bg-indigo-600 text-white rounded-tr-none"
                            : "bg-rose-50 border border-rose-100 text-rose-800 rounded-tl-none dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-300"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Modal>
      )}

        {toast ? <Toast>{toast}</Toast> : null}
      </PageWrapper>
    </AppShell>
  );
};
