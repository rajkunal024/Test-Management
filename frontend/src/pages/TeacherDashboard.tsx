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
  FolderPlus,
  Check,
  FileQuestion,
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
  uploadQuestionImage,
  getAllPassages,
  createPassage,
  updatePassage,
} from "../services/api";
import { useSubTopics, useTopics } from "../hooks/useTests";
import { useAuthStore } from "../store/authStore";
import { CorrectOption, Question, Passage } from "../types";
import { questionSchema, QuestionFormValues } from "../utils/validators";

const emptyQuestion = {
  type: "mcq" as const,
  passage_id: "",
  passage_title: "",
  passage_content: "",
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
  const { data: passages = [] } = useQuery({
    queryKey: ["passages"],
    queryFn: getAllPassages,
  });

  // States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [search, setSearch] = useState("");
  const [subQuestions, setSubQuestions] = useState<Array<{
    question: string;
    option1: string;
    option2: string;
    option3: string;
    option4: string;
    correct_option: CorrectOption;
  }>>([
    { question: "", option1: "", option2: "", option3: "", option4: "", correct_option: "option1" }
  ]);
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [toast, setToast] = useState("");
  const [formError, setFormError] = useState("");
  const [csvText, setCsvText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [passageCsvText, setPassageCsvText] = useState("");

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

  useEffect(() => {
    setSelectedIds([]);
  }, [search, difficultyFilter, topicFilter, selectedClass, activeTab]);

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
    setValue,
    getValues,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: emptyQuestion,
  });

  useEffect(() => {
    if (addSubTab === "manual" || addSubTab === null) {
      reset(emptyQuestion);
      setFormError("");
      setSubQuestions([{ question: "", option1: "", option2: "", option3: "", option4: "", correct_option: "option1" }]);
      setPassageCsvText("");
    }
  }, [addSubTab, reset]);

  const selectedTopicId = watch("topic_id");
  const selectedSubTopicId = watch("sub_topic_id");
  const watchedClass = watch("class");
  const selectedDifficulty = watch("difficulty");
  const correctOptionValue = watch("correct_option");
  const selectedType = watch("type") || "mcq";
  const selectedPassageId = watch("passage_id");
  const filteredSubTopics = useMemo(() => {
    return subTopics.filter(st => st.topic_id === selectedTopicId);
  }, [subTopics, selectedTopicId]);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageUrl = watch("image_url");

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.includes(ext)) {
      alert("Allowed formats are JPG, JPEG, PNG, WEBP.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadQuestionImage(formData);
      setValue("image_url", res.image_url);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to upload image.";
      alert(msg);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setValue("image_url", "");
  };

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
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      setToast("Question created successfully");
      if (variables.type === "passage_sub_question" && variables.passage_id) {
        reset({
          ...emptyQuestion,
          type: "passage_sub_question",
          passage_id: variables.passage_id,
          class: variables.class,
          topic_id: variables.topic_id,
          sub_topic_id: variables.sub_topic_id,
        });
      } else {
        setModalOpen(false);
        setAddSubTab(null);
        reset(emptyQuestion);
      }
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

  const downloadCsv = () => {
    const selectedQuestions = filteredQuestions.filter(q => selectedIds.includes(q.id || ""));
    if (selectedQuestions.length === 0) return;

    const headers = ["question", "option1", "option2", "option3", "option4", "correct_option", "difficulty", "class", "topic", "sub_topic"];
    
    const escapeCsvField = (val: string) => {
      if (val === undefined || val === null) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = selectedQuestions.map(q => {
      const tName = topics.find(t => t.id === q.topic_id)?.name ?? q.topic_name ?? "General";
      const stName = subTopics.find(st => st.id === q.sub_topic_id)?.name ?? q.sub_topic_name ?? "";
      
      return [
        escapeCsvField(q.question),
        escapeCsvField(q.option1),
        escapeCsvField(q.option2),
        escapeCsvField(q.option3),
        escapeCsvField(q.option4),
        escapeCsvField(q.correct_option),
        escapeCsvField(q.difficulty || "easy"),
        escapeCsvField(q.class || "Class 10"),
        escapeCsvField(tName),
        escapeCsvField(stName)
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `selected_questions_${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteSelected = async () => {
    const selectedQuestions = filteredQuestions.filter(q => selectedIds.includes(q.id || ""));
    const deletableQuestions = selectedQuestions.filter(q => user?.role === "Admin" || q.created_by === user?.userId);

    if (deletableQuestions.length === 0) {
      alert("You do not have permission to delete any of the selected questions.");
      return;
    }

    const totalCount = selectedQuestions.length;
    const deletableCount = deletableQuestions.length;
    const nonDeletableCount = totalCount - deletableCount;

    let confirmationMsg = "";
    if (nonDeletableCount > 0) {
      confirmationMsg = `You selected ${totalCount} questions. You only have permission to delete ${deletableCount} of them.\n\nAre you sure you want to delete these ${deletableCount} questions? The other ${nonDeletableCount} question(s) will be skipped.`;
    } else {
      confirmationMsg = `Are you sure you want to delete the ${deletableCount} selected question(s)?`;
    }

    if (confirm(confirmationMsg)) {
      setIsDeletingSelected(true);
      try {
        await Promise.all(deletableQuestions.map(q => deleteQuestion(q.id || "")));
        await queryClient.invalidateQueries({ queryKey: ["questions"] });
        setSelectedIds([]);
        setToast(`${deletableCount} question(s) deleted successfully`);
        window.setTimeout(() => setToast(""), 1800);
      } catch (err) {
        alert("An error occurred while deleting selected questions: " + getErrorMessage(err));
      } finally {
        setIsDeletingSelected(false);
      }
    }
  };

  const handleParsePassageCsv = (text: string) => {
    try {
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert("CSV must contain a header row and at least one question row.");
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
      
      const requiredHeaders = ["question", "option1", "option2"];
      const missing = requiredHeaders.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        alert(`Missing required CSV columns: ${missing.join(", ")}`);
        return;
      }

      const parsedQuestions: Array<{
        question: string;
        option1: string;
        option2: string;
        option3: string;
        option4: string;
        correct_option: CorrectOption;
      }> = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = values[index] || "";
        });

        if (!rowObj.question || !rowObj.option1 || !rowObj.option2) continue;

        let correct_option: CorrectOption = "option1";
        const rawCorrect = (rowObj.correct_option || "").toUpperCase().trim();
        const coLower = (rowObj.correct_option || "").toLowerCase().trim();
        const optVal1 = (rowObj.option1 || "").toLowerCase().trim();
        const optVal2 = (rowObj.option2 || "").toLowerCase().trim();
        const optVal3 = (rowObj.option3 || "").toLowerCase().trim();
        const optVal4 = (rowObj.option4 || "").toLowerCase().trim();

        if (rawCorrect === "A" || rawCorrect === "OPTION1" || coLower === optVal1) {
          correct_option = "option1";
        } else if (rawCorrect === "B" || rawCorrect === "OPTION2" || coLower === optVal2) {
          correct_option = "option2";
        } else if (rawCorrect === "C" || rawCorrect === "OPTION3" || coLower === optVal3) {
          correct_option = "option3";
        } else if (rawCorrect === "D" || rawCorrect === "OPTION4" || coLower === optVal4) {
          correct_option = "option4";
        }

        parsedQuestions.push({
          question: rowObj.question,
          option1: rowObj.option1,
          option2: rowObj.option2,
          option3: rowObj.option3 || "",
          option4: rowObj.option4 || "",
          correct_option
        });
      }

      if (parsedQuestions.length === 0) {
        alert("No valid questions found in CSV.");
        return;
      }

      setSubQuestions(parsedQuestions);
      setPassageCsvText("");
      setToast(`Loaded ${parsedQuestions.length} sub-question(s) from CSV`);
      window.setTimeout(() => setToast(""), 1800);
    } catch (err) {
      alert("Error parsing CSV: " + (err as Error).message);
    }
  };

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
        const coLower = (row.correct_option || "").toLowerCase().trim();
        const optVal1 = (row.option1 || "").toLowerCase().trim();
        const optVal2 = (row.option2 || "").toLowerCase().trim();
        const optVal3 = (row.option3 || "").toLowerCase().trim();
        const optVal4 = (row.option4 || "").toLowerCase().trim();

        if (rawCorrect === "A" || rawCorrect === "OPTION1" || coLower === optVal1) {
          correct_option = "option1";
        } else if (rawCorrect === "B" || rawCorrect === "OPTION2" || coLower === optVal2) {
          correct_option = "option2";
        } else if (rawCorrect === "C" || rawCorrect === "OPTION3" || coLower === optVal3) {
          correct_option = "option3";
        } else if (rawCorrect === "D" || rawCorrect === "OPTION4" || coLower === optVal4) {
          correct_option = "option4";
        }

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
    const passage = question.passage_id ? passages.find(p => p.id === question.passage_id) : null;
    reset({
      type: question.type,
      passage_id: question.passage_id ?? "",
      passage_title: passage?.title ?? "",
      passage_content: passage?.content ?? "",
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
      image_url: question.image_url ?? "",
      class: question.class ?? "Class 10",
    });
    setSubQuestions([{ question: "", option1: "", option2: "", option3: "", option4: "", correct_option: "option1" }]);
    setModalOpen(true);
  };

  const handleSaveQuestion: SubmitHandler<QuestionFormValues> = async (values) => {
    setFormError("");
    if (values.topic_id === "new" && !values.new_topic_name?.trim()) {
      setFormError("New topic name is required");
      return;
    }
    if ((values.topic_id === "new" || values.sub_topic_id === "new") && !values.new_sub_topic_name?.trim()) {
      setFormError("New sub-topic name is required");
      return;
    }

    if (values.type === "passage_sub_question") {
      if (!values.passage_title?.trim()) {
        setFormError("Passage title is required");
        return;
      }
      if (!values.passage_content?.trim()) {
        setFormError("Passage content is required");
        return;
      }
      if (editingQuestionId === null) {
        // Validate all subQuestions in state
        for (let i = 0; i < subQuestions.length; i++) {
          const q = subQuestions[i];
          if (!q.question.trim()) {
            setFormError(`Question ${i + 1} Prompt is required`);
            return;
          }
          if (!q.option1.trim()) {
            setFormError(`Question ${i + 1} Option 1 is required`);
            return;
          }
          if (!q.option2.trim()) {
            setFormError(`Question ${i + 1} Option 2 is required`);
            return;
          }
          if (!q.option3.trim()) {
            setFormError(`Question ${i + 1} Option 3 is required`);
            return;
          }
          if (!q.option4.trim()) {
            setFormError(`Question ${i + 1} Option 4 is required`);
            return;
          }
        }
      } else {
        // When editing, the single question form fields are edited
        if (!values.question?.trim()) {
          setFormError("Question Prompt is required");
          return;
        }
        if (!values.option1?.trim()) {
          setFormError("Option 1 is required");
          return;
        }
        if (!values.option2?.trim()) {
          setFormError("Option 2 is required");
          return;
        }
        if (!values.option3?.trim()) {
          setFormError("Option 3 is required");
          return;
        }
        if (!values.option4?.trim()) {
          setFormError("Option 4 is required");
          return;
        }
      }
    }

    try {
      let finalPassageId = values.passage_id;

      if (values.type === "passage_sub_question") {
        if (editingQuestionId !== null && finalPassageId) {
          await updatePassage(finalPassageId, {
            title: values.passage_title,
            content: values.passage_content,
          });
          await queryClient.invalidateQueries({ queryKey: ["passages"] });
        } else {
          const newPassage = await createPassage({
            title: values.passage_title,
            content: values.passage_content,
            subject_id: teacherSubject.id,
            class: values.class,
          });
          finalPassageId = newPassage.id;
          await queryClient.invalidateQueries({ queryKey: ["passages"] });
        }
      }

      if (values.type === "passage_sub_question" && editingQuestionId === null) {
        // Bulk save passage sub questions
        const createPromises = subQuestions.map((q) => {
          const payload: Question = {
            question: q.question,
            option1: q.option1,
            option2: q.option2,
            option3: q.option3,
            option4: q.option4,
            correct_option: q.correct_option,
            difficulty: values.difficulty || undefined,
            topic_id: values.topic_id || undefined,
            sub_topic_id: values.sub_topic_id || undefined,
            new_topic_name: values.topic_id === "new" ? values.new_topic_name?.trim() : undefined,
            new_sub_topic_name: (values.topic_id === "new" || values.sub_topic_id === "new") ? values.new_sub_topic_name?.trim() : undefined,
            subject_id: teacherSubject.id,
            media_url: values.media_url || undefined,
            image_url: values.image_url || "",
            type: "passage_sub_question",
            passage_id: finalPassageId,
            test_id: "",
            class: values.class,
          };
          return createQuestion(payload);
        });

        await Promise.all(createPromises);
        await queryClient.invalidateQueries({ queryKey: ["questions"] });
        setToast("Passage and questions created successfully");
        setModalOpen(false);
        setAddSubTab(null);
        reset(emptyQuestion);
        setSubQuestions([{ question: "", option1: "", option2: "", option3: "", option4: "", correct_option: "option1" }]);
        window.setTimeout(() => setToast(""), 1800);
      } else {
        // Single MCQ or single Question edit
        const payload: Question = {
          ...values,
          question: values.question || "",
          option1: values.option1 || "",
          option2: values.option2 || "",
          option3: values.option3 || "",
          option4: values.option4 || "",
          correct_option: values.correct_option || "option1",
          difficulty: values.difficulty || undefined,
          topic_id: values.topic_id || undefined,
          sub_topic_id: values.sub_topic_id || undefined,
          new_topic_name: values.topic_id === "new" ? values.new_topic_name?.trim() : undefined,
          new_sub_topic_name: (values.topic_id === "new" || values.sub_topic_id === "new") ? values.new_sub_topic_name?.trim() : undefined,
          subject_id: teacherSubject.id,
          media_url: values.media_url || undefined,
          image_url: values.image_url || "",
          type: values.type || "mcq",
          passage_id: values.type === "passage_sub_question" ? finalPassageId : undefined,
          test_id: "",
        };

        if (editingQuestionId) {
          updateMutation.mutate({ id: editingQuestionId, payload });
        } else {
          createMutation.mutate(payload);
        }
      }
    } catch (err) {
      setFormError(getErrorMessage(err));
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
                    className={`h-10 text-xs font-bold flex items-center gap-1.5 shadow-sm transition ${addSubTab === "csv"
                      ? "bg-white text-emerald-700 hover:bg-teal-50 border-transparent"
                      : "bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-500/25"
                      }`}
                    icon={<Upload className={`h-3.5 w-3.5 ${addSubTab === "csv" ? "text-emerald-700" : "text-white"}`} />}
                  >
                    Import via CSV
                  </Button>
                  <Button
                    onClick={() => setAddSubTab("manual")}
                    className={`h-10 text-xs font-bold flex items-center gap-1.5 shadow-sm transition ${addSubTab === "manual"
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
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-md relative overflow-hidden">
                {/* Visual Accent top border */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-500" />

                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-850 dark:text-slate-100 tracking-tight flex items-center gap-2">
                      <Plus className="h-5 w-5 text-emerald-500" />
                      Create New MCQ Question
                    </h2>
                    <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5 font-medium">Add a structured multiple-choice question to the global pool.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddSubTab(null)}
                    className="h-8 px-3 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition uppercase cursor-pointer"
                  >
                    Close Form ×
                  </button>
                </div>

                <form onSubmit={handleSubmit(handleSaveQuestion)} className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8">
                  {/* Left Column: Prompt & Choices */}
                  <div className="space-y-6">
                    {/* Question Type Selection */}
                    <div className="space-y-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Question Type</span>
                        <select
                          className="h-11 w-full appearance-none rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 pl-4 pr-10 text-sm text-slate-750 dark:text-slate-200 outline-none transition focus:border-indigo-505 focus:ring-4 focus:ring-indigo-550/10 cursor-pointer font-semibold"
                          {...register("type")}
                        >
                          <option value="mcq">Standard Single MCQ</option>
                          <option value="passage_sub_question">Passage-based Question</option>
                        </select>
                      </label>
                    </div>

                    {/* Passage Creation */}
                    {selectedType === "passage_sub_question" && (
                      <div className="space-y-4 border border-dashed border-slate-205 dark:border-slate-800 rounded-xl p-4 bg-slate-50/30 dark:bg-slate-950/10">
                        <div className="space-y-2">
                          <label className="block">
                            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Passage Title</span>
                            <input
                              type="text"
                              className="h-11 w-full rounded-xl border border-slate-250 dark:border-slate-805 bg-white dark:bg-slate-950 px-4 text-sm outline-none placeholder:text-slate-350 focus:border-indigo-505 focus:ring-4 focus:ring-indigo-550/10 transition-all font-semibold"
                              placeholder="Enter a descriptive title for this passage"
                              {...register("passage_title")}
                            />
                            {errors.passage_title?.message ? (
                              <span className="mt-1 block text-xs font-bold text-rose-500">{errors.passage_title.message}</span>
                            ) : null}
                          </label>
                        </div>

                        <div className="space-y-2">
                          <label className="block">
                            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Passage Content</span>
                            <textarea
                              className="h-40 w-full resize-none rounded-xl border border-slate-250 dark:border-slate-805/80 dark:bg-slate-955 px-4 py-3.5 text-sm outline-none placeholder:text-slate-350 focus:border-indigo-505 focus:ring-4 focus:ring-indigo-550/10 transition-all font-semibold leading-relaxed"
                              placeholder="Enter the full comprehension passage text here..."
                              {...register("passage_content")}
                            />
                            {errors.passage_content?.message ? (
                              <span className="mt-1 block text-xs font-bold text-rose-500">{errors.passage_content.message}</span>
                            ) : null}
                          </label>
                        </div>
                      </div>
                    )}

                    {selectedType === "passage_sub_question" ? (
                      <div className="space-y-6">
                        {/* CSV Import Section for Passage Sub-Questions */}
                        <div className="border border-dashed border-slate-250 dark:border-slate-800 rounded-2xl p-5 bg-white/70 dark:bg-slate-900/40 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-extrabold text-slate-755 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                              <FileSpreadsheet className="h-4 w-4 text-emerald-600 animate-bounce" />
                              Quick Import Sub-Questions via CSV
                            </h3>
                          </div>
                          <p className="text-[11px] text-slate-455 dark:text-slate-500 font-semibold leading-relaxed">
                            Instead of adding questions one by one manually, you can paste CSV text or select a CSV file containing your questions.
                          </p>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block">
                                <span className="mb-2 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Paste CSV Data</span>
                                <textarea
                                  value={passageCsvText}
                                  onChange={(e) => setPassageCsvText(e.target.value)}
                                  placeholder="question,option1,option2,option3,option4,correct_option&#10;What is 1+1?,2,3,4,5,option1&#10;What is 2+2?,3,4,5,6,option2"
                                  className="h-24 w-full resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-55/20 dark:bg-slate-955 p-3 text-xs font-mono outline-none focus:border-indigo-505 focus:ring-4 focus:ring-indigo-550/10 transition-all leading-normal"
                                />
                              </label>
                            </div>
                            
                            <div className="flex flex-col justify-between">
                              <div>
                                <span className="mb-2 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Upload CSV File</span>
                                <label className="flex flex-col items-center justify-center border border-dashed border-slate-250 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-700/60 rounded-xl p-5 bg-slate-50/20 dark:bg-slate-900/35 cursor-pointer group transition-all h-24">
                                  <Upload className="h-5 w-5 text-slate-400 group-hover:text-emerald-500 transition-colors mb-1.5" />
                                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-emerald-600 transition-colors">Select CSV file</span>
                                  <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        const text = event.target?.result as string;
                                        handleParsePassageCsv(text);
                                      };
                                      reader.readAsText(file);
                                      e.target.value = "";
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
                            <div className="rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-2.5 text-[9px] text-amber-800 dark:text-amber-300 leading-normal flex-1">
                              Expected Format: <code className="font-mono font-bold bg-white/70 dark:bg-slate-950/50 px-1 py-0.5 rounded">question,option1,option2,option3,option4,correct_option</code>
                            </div>
                            <Button
                              type="button"
                              disabled={!passageCsvText.trim()}
                              onClick={() => handleParsePassageCsv(passageCsvText)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 shrink-0 rounded-xl"
                            >
                              Parse & Populate
                            </Button>
                          </div>
                        </div>

                        {subQuestions.map((subQ, subIdx) => (
                          <div key={subIdx} className="space-y-4 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/10 dark:bg-slate-900/10 relative">
                            {subQuestions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = subQuestions.filter((_, idx) => idx !== subIdx);
                                  setSubQuestions(updated);
                                }}
                                className="absolute top-4 right-4 text-xs font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                              >
                                Remove Question
                              </button>
                            )}
                            <h4 className="text-xs font-extrabold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">
                              Question {subIdx + 1}
                            </h4>

                            {/* Question Prompt */}
                            <div className="space-y-2">
                              <label className="block">
                                <span className="mb-2 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Question Prompt</span>
                                <textarea
                                  className="h-24 w-full resize-none rounded-xl border border-slate-250 dark:border-slate-800/80 dark:bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-350 focus:border-indigo-505 focus:ring-4 focus:ring-indigo-550/10 transition-all font-semibold leading-relaxed"
                                  placeholder="Enter the question text or problem description here..."
                                  value={subQ.question}
                                  onChange={(e) => {
                                    const updated = [...subQuestions];
                                    updated[subIdx].question = e.target.value;
                                    setSubQuestions(updated);
                                  }}
                                />
                              </label>
                            </div>

                            {/* Options List */}
                            <div className="space-y-3">
                              <span className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Options (Select Correct Indicator)</span>
                              {(["option1", "option2", "option3", "option4"] as const).map((opt, idx) => {
                                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                                const isCorrect = subQ.correct_option === opt;
                                const colors = [
                                  { text: "text-indigo-650 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-100 dark:border-indigo-900/40" },
                                  { text: "text-purple-650 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-purple-100 dark:border-purple-900/40" },
                                  { text: "text-amber-650 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-100 dark:border-amber-900/40" },
                                  { text: "text-rose-650 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-100 dark:border-rose-900/40" },
                                ][idx];

                                return (
                                  <div
                                    key={opt}
                                    className={`flex items-center gap-3.5 p-2 px-3 rounded-2xl border-2 transition-all duration-250 ${isCorrect
                                      ? "border-emerald-500 bg-emerald-50/15 dark:bg-emerald-950/10 shadow-sm"
                                      : "border-slate-150 dark:border-slate-800/80 hover:border-slate-250 dark:hover:border-slate-700 bg-slate-50/20 dark:bg-slate-900/30"
                                      }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...subQuestions];
                                        updated[subIdx].correct_option = opt;
                                        setSubQuestions(updated);
                                      }}
                                      className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs border shrink-0 transition-all ${isCorrect
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                        : `${colors.bg} ${colors.border} ${colors.text} hover:scale-105`
                                        }`}
                                      title={`Set Option ${letter} as correct`}
                                    >
                                      {isCorrect ? "✓" : letter}
                                    </button>
                                    <div className="flex-1">
                                      <input
                                        type="text"
                                        placeholder={`Option ${idx + 1}`}
                                        className={`h-9 w-full rounded-md px-3 text-sm font-semibold border transition-all focus:outline-none focus:ring-4 focus:ring-indigo-550/10 dark:bg-slate-905 dark:text-slate-205 ${isCorrect
                                          ? "border-emerald-250 dark:border-emerald-900 focus:border-emerald-500"
                                          : "border-slate-200 dark:border-slate-850 focus:border-indigo-505"
                                          }`}
                                        value={subQ[opt]}
                                        onChange={(e) => {
                                          const updated = [...subQuestions];
                                          updated[subIdx][opt] = e.target.value;
                                          setSubQuestions(updated);
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {/* Add More Question button */}
                        <div className="pt-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setSubQuestions([...subQuestions, { question: "", option1: "", option2: "", option3: "", option4: "", correct_option: "option1" }]);
                            }}
                            className="w-full h-11 text-xs font-bold border border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Plus className="h-4 w-4 text-emerald-500" />
                            Add More Question
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Prompt Box */}
                        <div className="space-y-2">
                          <label className="block">
                            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Question Prompt</span>
                            <textarea
                              className="h-32 w-full resize-none rounded-xl border border-slate-250 dark:border-slate-800/80 dark:bg-slate-950 px-4 py-3.5 text-sm outline-none placeholder:text-slate-350 focus:border-indigo-505 focus:ring-4 focus:ring-indigo-550/10 transition-all font-semibold leading-relaxed"
                              placeholder="Enter the question text or problem description here..."
                              {...register("question")}
                            />
                            {errors.question?.message ? (
                              <span className="mt-1 block text-xs font-bold text-rose-500">{errors.question.message}</span>
                            ) : null}
                          </label>
                        </div>

                        {/* Options List */}
                        <div className="space-y-3">
                          <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Options (Select Correct Indicator)</span>

                          {(["option1", "option2", "option3", "option4"] as const).map((opt, idx) => {
                            const letter = String.fromCharCode(65 + idx); // A, B, C, D
                            const isCorrect = correctOptionValue === opt;
                            const colors = [
                              { text: "text-indigo-650 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-100 dark:border-indigo-900/40" },
                              { text: "text-purple-650 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-purple-100 dark:border-purple-900/40" },
                              { text: "text-amber-650 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-100 dark:border-amber-900/40" },
                              { text: "text-rose-650 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-100 dark:border-rose-900/40" },
                            ][idx];

                            return (
                              <div
                                key={opt}
                                className={`flex items-center gap-3.5 p-3.5 rounded-2xl border-2 transition-all duration-250 ${isCorrect
                                  ? "border-emerald-500 bg-emerald-50/15 dark:bg-emerald-950/10 shadow-sm"
                                  : "border-slate-150 dark:border-slate-800/80 hover:border-slate-250 dark:hover:border-slate-700 bg-slate-50/20 dark:bg-slate-900/30"
                                  }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setValue("correct_option", opt)}
                                  className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs border shrink-0 transition-all ${isCorrect
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                    : `${colors.bg} ${colors.border} ${colors.text} hover:scale-105`
                                    }`}
                                  title={`Set Option ${letter} as correct`}
                                >
                                  {isCorrect ? "✓" : letter}
                                </button>
                                <div className="flex-1">
                                  <Input
                                    placeholder={`Option ${idx + 1}`}
                                    className={`h-10 text-sm font-semibold transition-all focus:ring-4 focus:ring-indigo-550/10 ${isCorrect
                                      ? "border-emerald-250 dark:border-emerald-900 focus:border-emerald-500"
                                      : "border-slate-200 dark:border-slate-850 focus:border-indigo-500"
                                      }`}
                                    error={errors[opt]?.message}
                                    {...register(opt)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Column: Meta & Image */}
                  <div className="space-y-6 lg:border-l lg:border-slate-100 lg:dark:border-slate-800 lg:pl-8">
                    {/* Class Selection */}
                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Class Level</span>
                      <div className="grid grid-cols-2 gap-2">
                        {["Class 9", "Class 10", "Class 11", "Class 12"].map((cls) => {
                          const isActive = watchedClass === cls;
                          return (
                            <button
                              key={cls}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setValue("class", cls);
                              }}
                              className={`py-2.5 px-3.5 rounded-xl text-xs font-bold border transition-all duration-205 ${isActive
                                  ? "bg-indigo-605 border-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-605 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                }`}
                            >
                              {cls}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Difficulty Selection */}
                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Difficulty Rating</span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Easy", value: "easy", activeClass: "bg-emerald-600 border-emerald-600 text-white shadow-emerald-500/25" },
                          { label: "Medium", value: "medium", activeClass: "bg-amber-500 border-amber-500 text-white shadow-amber-500/25" },
                          { label: "Difficult", value: "hard", activeClass: "bg-rose-600 border-rose-600 text-white shadow-rose-500/25" },
                        ].map((diff) => {
                          const isActive = selectedDifficulty === diff.value;
                          return (
                            <button
                              key={diff.value}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setValue("difficulty", diff.value);
                              }}
                              className={`py-2.5 px-1.5 rounded-xl text-xs font-bold border text-center transition-all duration-205 ${isActive
                                  ? `${diff.activeClass} shadow-md scale-[1.02]`
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-605 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                }`}
                            >
                              {diff.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Topic Selectors */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Select
                        label="Topic Category"
                        options={[
                          { label: "Select Topic", value: "" },
                          ...topics.map((t) => ({ label: t.name, value: t.id })),
                          { label: "+ Add New Topic", value: "new" },
                        ]}
                        {...register("topic_id")}
                      />
                      <Select
                        label="Sub-topic Category"
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

                    {/* Image Upload Area */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Question Graphic (Optional)
                      </label>
                      {imageUrl ? (
                        <div className="relative group rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 max-w-md shadow-sm">
                          <img
                            src={imageUrl}
                            alt="Question Preview"
                            className="max-h-48 object-contain rounded-xl mx-auto shadow-inner bg-white dark:bg-slate-950"
                          />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-2xl">
                            <label className="p-2.5 bg-white text-slate-800 rounded-full hover:bg-slate-100 transition cursor-pointer shadow-md hover:scale-105 active:scale-95 animate-fade-in" title="Replace Image">
                              <Upload className="h-5 w-5" />
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(file);
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="p-2.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
                              title="Remove Image"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2.5 truncate px-1 text-center font-mono">{imageUrl}</p>
                        </div>
                      ) : (
                        <div
                          className="border-2 border-dashed border-slate-250 dark:border-slate-750 hover:border-indigo-400 dark:hover:border-indigo-850 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/40 dark:bg-slate-950/10 max-w-md transition duration-200 hover:shadow-sm"
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                        >
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            className="hidden"
                            id="file-upload-add"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file);
                            }}
                            disabled={isUploadingImage}
                          />
                          <label htmlFor="file-upload-add" className="cursor-pointer block">
                            {isUploadingImage ? (
                              <div className="flex flex-col items-center justify-center space-y-3 py-2">
                                <Spinner className="h-7 w-7 text-indigo-500" />
                                <span className="text-xs font-bold text-slate-500 animate-pulse">Uploading to ImageKit...</span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
                                  <Upload className="h-5.5 w-5.5" />
                                </div>
                                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block">Click or drag & drop to upload question image</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">JPG, JPEG, PNG or WEBP up to 5MB</span>
                              </div>
                            )}
                          </label>
                        </div>
                      )}
                    </div>

                    {formError ? <p className="text-xs font-bold text-rose-500 mt-2">{formError}</p> : null}

                    {/* Form Footer Buttons */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        variant="secondary"
                        onClick={() => setAddSubTab(null)}
                        type="button"
                        className="rounded-xl px-5 h-11 text-xs font-bold"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="rounded-xl px-6 h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Add to Pool"}
                      </Button>
                    </div>
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
          <div className="space-y-6 animate-fade-in">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 border border-indigo-150/50 dark:border-indigo-900/30 p-6 shadow-sm backdrop-blur-md">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-indigo-650 dark:text-indigo-400">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                    Subject Question Repository
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-850 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    <FolderPlus className="h-6.5 w-6.5 text-indigo-500" />
                    {selectedClass === "all" ? "All Questions Bank" : `${selectedClass} Questions Bank`}
                  </h1>
                  <p className="text-xs text-slate-450 dark:text-slate-500 font-semibold mt-1">
                    Subject Domain: <span className="font-bold text-indigo-650 dark:text-indigo-400">{teacherSubject.name}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-extrabold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/45 px-3.5 py-2 rounded-xl border border-indigo-100/60 dark:border-indigo-900/40 shadow-sm">
                    {filteredQuestions.length} Questions Displayed
                  </span>
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
            </div>

            {/* Stats Grid */}
            <section className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              <article
                onClick={() => setDifficultyFilter("all")}
                className={`rounded-2xl border p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg select-none relative overflow-hidden group flex flex-col items-center justify-center text-center min-h-[140px] ${difficultyFilter === "all"
                  ? "border-indigo-500 bg-indigo-50/20 dark:border-indigo-855 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20"
                  : "border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:border-slate-350 dark:hover:border-slate-700 shadow-sm"
                  }`}
              >
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-500 mb-2.5 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-5 w-5" />
                </div>
                <p className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Total Pool</p>
                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-200 mt-1">{stats.total} <span className="text-xs font-bold text-slate-450">Qs</span></h3>
                <div className="absolute bottom-2 text-[9px] font-bold text-indigo-650 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Click to view all</div>
              </article>

              <article
                onClick={() => setDifficultyFilter("easy")}
                className={`rounded-2xl border p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg select-none relative overflow-hidden group flex flex-col items-center justify-center text-center min-h-[140px] ${difficultyFilter === "easy"
                  ? "border-emerald-500 bg-emerald-50/20 dark:border-emerald-855 dark:bg-emerald-955/20 ring-2 ring-emerald-500/20"
                  : "border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:border-emerald-300 dark:hover:border-emerald-900/40 shadow-sm"
                  }`}
              >
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-500 mb-2.5 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-[10px] font-extrabold text-emerald-555 dark:text-emerald-455 uppercase tracking-widest">Easy Level</p>
                <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.easy} <span className="text-xs font-bold text-emerald-500 dark:text-emerald-555">Qs</span></h3>
                <div className="absolute bottom-2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">Filter by easy</div>
              </article>

              <article
                onClick={() => setDifficultyFilter("medium")}
                className={`rounded-2xl border p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg select-none relative overflow-hidden group flex flex-col items-center justify-center text-center min-h-[140px] ${difficultyFilter === "medium"
                  ? "border-amber-500 bg-amber-50/20 dark:border-amber-855 dark:bg-amber-955/20 ring-2 ring-amber-500/20"
                  : "border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:border-amber-300 dark:hover:border-amber-900/40 shadow-sm"
                  }`}
              >
                <div className="p-2 bg-amber-50 dark:bg-amber-955/50 rounded-xl text-amber-500 mb-2.5 group-hover:scale-110 transition-transform">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <p className="text-[10px] font-extrabold text-amber-555 dark:text-amber-455 uppercase tracking-widest">Medium Level</p>
                <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.medium} <span className="text-xs font-bold text-amber-555 dark:text-amber-455">Qs</span></h3>
                <div className="absolute bottom-2 text-[9px] font-bold text-amber-655 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">Filter by medium</div>
              </article>

              <article
                onClick={() => setDifficultyFilter("hard")}
                className={`rounded-2xl border p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg select-none relative overflow-hidden group flex flex-col items-center justify-center text-center min-h-[140px] ${difficultyFilter === "hard"
                  ? "border-rose-500 bg-rose-50/20 dark:border-rose-855 dark:bg-rose-955/20 ring-2 ring-rose-500/20"
                  : "border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:border-rose-300 dark:hover:border-rose-900/40 shadow-sm"
                  }`}
              >
                <div className="p-2 bg-rose-50 dark:bg-rose-955/50 rounded-xl text-rose-500 mb-2.5 group-hover:scale-110 transition-transform">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-[10px] font-extrabold text-rose-555 dark:text-rose-455 uppercase tracking-widest">Difficult Level</p>
                <h3 className="text-3xl font-black text-rose-600 dark:text-rose-450 mt-1">{stats.hard} <span className="text-xs font-bold text-rose-500 dark:text-rose-555">Qs</span></h3>
                <div className="absolute bottom-2 text-[9px] font-bold text-rose-600 dark:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">Filter by hard</div>
              </article>
            </section>

            {/* Search & Topic Filters */}
            <div className="grid gap-4 rounded-2xl border border-slate-200/60 dark:border-slate-850 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md p-4.5 shadow-sm md:grid-cols-[1fr_260px] items-center">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  className="pl-11 h-11 rounded-xl border-slate-250 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm w-full bg-white dark:bg-slate-950/60"
                  placeholder="Search questions by keyword or prompt text..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="relative w-full">
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 pl-4 pr-10 text-sm text-slate-750 dark:text-slate-200 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
                >
                  <option value="all">All Topic Nodes</option>
                  {filteredTopics.map((t) => (
                    <option key={t.id} value={t.id} className="dark:bg-slate-950 dark:text-slate-200">
                      {t.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-550">
                  <Filter className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Questions Table Section */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-500 animate-pulse" />
                  Manage Questions Inventory
                </h2>

                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-150/50 dark:border-indigo-900/40 px-4 py-2 rounded-xl animate-fade-in">
                    <span className="text-xs font-bold text-slate-650 dark:text-slate-400">
                      {selectedIds.length} question{selectedIds.length > 1 ? "s" : ""} selected:
                    </span>
                    <Button
                      variant="secondary"
                      className="h-8 rounded-lg px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900 font-bold transition-all shadow-sm hover:shadow active:scale-95 flex items-center gap-1.5"
                      onClick={downloadCsv}
                      icon={<FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />}
                    >
                      Download CSV
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8 rounded-lg px-3 text-xs text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-955/40 border border-rose-200 dark:border-rose-900/40 font-bold transition-all hover:shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      onClick={handleDeleteSelected}
                      disabled={isDeletingSelected}
                      icon={<Trash2 className="h-3.5 w-3.5 text-rose-555" />}
                    >
                      {isDeletingSelected ? "Deleting..." : "Delete Selected"}
                    </Button>
                  </div>
                )}
              </div>

              {isLoadingQuestions ? (
                <div className="flex h-64 items-center justify-center text-slate-550 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <Spinner /> <span className="ml-2 font-semibold text-sm">Loading question bank...</span>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-955/20 py-20 text-center text-slate-550 dark:text-slate-400 shadow-inner flex flex-col items-center justify-center space-y-3">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900 text-slate-450 dark:text-slate-550 rounded-full border border-slate-200 dark:border-slate-800">
                    <FileQuestion className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-750 dark:text-slate-350">No questions found</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Create new questions or adjust search filters.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md shadow-md mb-10 transition-all hover:shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm relative">
                      <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-850 sticky top-0 backdrop-blur-md z-10">
                        <tr>
                          <th className="px-6 py-4.5 w-12 text-center">
                            {selectedIds.length > 0 && (
                              <input
                                type="checkbox"
                                checked={filteredQuestions.length > 0 && selectedIds.length === filteredQuestions.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedIds(filteredQuestions.map(q => q.id).filter(Boolean) as string[]);
                                  } else {
                                    setSelectedIds([]);
                                  }
                                }}
                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-650 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                              />
                            )}
                          </th>
                          <th className="px-6 py-4.5 w-14 text-center">#</th>
                          <th className="px-6 py-4.5">Question Prompt</th>
                          <th className="px-6 py-4.5 w-24">Image</th>
                          <th className="px-6 py-4.5 w-44">Topic</th>
                          <th className="px-6 py-4.5 w-32">Difficulty</th>
                          <th className="px-6 py-4.5 w-40 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                        {filteredQuestions.map((q, index) => {
                          const topicName = topics.find(t => t.id === q.topic_id)?.name ?? "General";
                          const diffLower = (q.difficulty || "").toLowerCase().trim();
                          const difficultyColor =
                            diffLower === "easy" ? "green" :
                              diffLower === "medium" ? "yellow" :
                                (diffLower === "hard" || diffLower === "difficult" ? "red" : "slate");

                          const isSelected = selectedIds.includes(q.id || "");
                          return (
                            <tr key={q.id ?? index} className={`group odd:bg-white/40 even:bg-slate-55/10 dark:odd:bg-slate-900/20 dark:even:bg-slate-900/5 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-all duration-200 ${isSelected ? "bg-indigo-50/10 dark:bg-indigo-950/5" : ""}`}>
                              <td className="px-6 py-4.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      if (q.id) setSelectedIds([...selectedIds, q.id]);
                                    } else {
                                      setSelectedIds(selectedIds.filter(id => id !== q.id));
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-650 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                />
                              </td>
                              <td className="px-6 py-4.5 text-center font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">{index + 1}</td>
                              <td className="px-6 py-4.5">
                                <div
                                  className="font-bold text-slate-800 dark:text-slate-200 leading-relaxed max-w-xl group-hover:text-indigo-650 dark:group-hover:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer transition-all"
                                  onClick={() => setPreviewQuestion(q)}
                                  title="Click to preview question details"
                                >
                                  {q.question}
                                </div>
                                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                                  <span className="text-[10px] text-slate-455 dark:text-slate-500 font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800/60 px-2 py-1 rounded-md">
                                    Class: {q.class || "Class 10"}
                                  </span>
                                  <span className="text-[10px] text-emerald-655 dark:text-emerald-400 font-extrabold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md shadow-sm">
                                    <Check className="h-3 w-3 stroke-[3]" />
                                    Correct Option: <span className="font-black uppercase">{q.correct_option?.replace("option", "Option ")}</span>
                                  </span>
                                  {q.sub_topic_name && (
                                    <span className="text-[10px] text-slate-455 dark:text-slate-500 font-bold">
                                      Subtopic: <span className="text-slate-600 dark:text-slate-400">{q.sub_topic_name}</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4.5">
                                {(q.image_url || q.media_url) ? (
                                  <img
                                    src={q.image_url || q.media_url}
                                    alt="Thumbnail"
                                    className="h-10 w-10 object-contain rounded-md border border-slate-200 bg-white"
                                  />
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 bg-slate-100 dark:bg-slate-800/60 px-2 py-1 rounded-md select-none">No Image</span>
                                )}
                              </td>
                              <td className="px-6 py-4.5 text-slate-500 dark:text-slate-450 font-medium">
                                <Badge tone="blue" className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide">{topicName}</Badge>
                              </td>
                              <td className="px-6 py-4.5">
                                <Badge tone={difficultyColor} className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider">{q.difficulty ?? "easy"}</Badge>
                              </td>
                              <td className="px-6 py-4.5 text-right">
                                <div className="flex justify-end gap-2">
                                  {(user?.role === "Admin" || q.created_by === user?.userId) ? (
                                    <>
                                      <Button
                                        variant="secondary"
                                        className="h-8.5 rounded-lg px-3 text-xs border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900 bg-white hover:bg-slate-50 dark:bg-slate-900 font-bold transition-all shadow-sm hover:shadow active:scale-95"
                                        onClick={() => handleOpenEditModal(q, index)}
                                        icon={<Pencil className="h-3.5 w-3.5 text-indigo-500" />}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        className="h-8.5 rounded-lg px-3 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 font-bold transition-all hover:shadow-sm active:scale-95 cursor-pointer"
                                        onClick={() => {
                                          if (confirm("Delete this question from pool?")) {
                                            deleteMutation.mutate(q.id ?? "");
                                          }
                                        }}
                                        icon={<Trash2 className="h-3.5 w-3.5 text-rose-555" />}
                                      >
                                        Delete
                                      </Button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50 select-none">
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
                </div>
              )}
            </div>
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
                  <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border ${isWsConnected
                    ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30"
                    : "text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800"
                    }`}>
                    <span className={`h-2 w-2 rounded-full animate-ping ${isWsConnected ? "bg-emerald-500" : "bg-red-500"
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
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${stream.hasVideo ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
                            }`}>
                            Video: {stream.hasVideo ? "ON" : "OFF"}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${stream.hasAudio ? "bg-emerald-500/90 text-white animate-pulse" : "bg-red-500/90 text-white"
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
            {/* Question Type Selection */}
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Question Type</span>
                <select
                  className="h-10 w-full appearance-none rounded-md border border-slate-300 bg-white dark:bg-slate-950 px-3 text-sm text-slate-750 dark:text-slate-200 outline-none transition focus:border-indigo-505 focus:ring-4 focus:ring-indigo-550/10 cursor-pointer font-semibold"
                  {...register("type")}
                >
                  <option value="mcq">Standard Single MCQ</option>
                  <option value="passage_sub_question">Passage-based Question</option>
                </select>
              </label>
            </div>

            {/* Passage Creation */}
            {selectedType === "passage_sub_question" && (
              <div className="space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/30 dark:bg-slate-950/10">
                <div className="space-y-1">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Passage Title</span>
                    <input
                      type="text"
                      className="h-10 w-full rounded-md border border-slate-300 dark:border-slate-805 bg-white dark:bg-slate-950 px-3 text-sm outline-none placeholder:text-slate-300 focus:border-indigo-550 focus:ring-4 focus:ring-indigo-550/10 transition-all font-semibold"
                      placeholder="Enter a descriptive title for this passage"
                      {...register("passage_title")}
                    />
                    {errors.passage_title?.message ? (
                      <span className="mt-1 block text-xs font-medium text-rose-500">{errors.passage_title.message}</span>
                    ) : null}
                  </label>
                </div>
                <div className="space-y-1">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Passage Content</span>
                    <textarea
                      className="h-28 w-full resize-none rounded-md border border-slate-300 dark:border-slate-805/80 dark:bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-indigo-550 focus:ring-4 focus:ring-indigo-550/10 transition-all font-semibold"
                      placeholder="Enter comprehension passage content..."
                      {...register("passage_content")}
                    />
                    {errors.passage_content?.message ? (
                      <span className="mt-1 block text-xs font-medium text-rose-500">{errors.passage_content.message}</span>
                    ) : null}
                  </label>
                </div>
              </div>
            )}

            {selectedType === "passage_sub_question" && editingQuestionId === null ? (
              <div className="space-y-4">
                {/* CSV Import Section for Passage Sub-Questions in Modal */}
                <div className="border border-dashed border-slate-250 dark:border-slate-800 rounded-xl p-4 bg-white/70 dark:bg-slate-900/40 shadow-sm space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-700 dark:text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      Quick Import Sub-Questions via CSV
                    </h3>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Paste CSV Data</span>
                        <textarea
                          value={passageCsvText}
                          onChange={(e) => setPassageCsvText(e.target.value)}
                          placeholder="question,option1,option2,option3,option4,correct_option&#10;What is 1+1?,2,3,4,5,option1"
                          className="h-20 w-full resize-none rounded-lg border border-slate-205 dark:border-slate-800 dark:bg-slate-955 p-2 text-xs font-mono outline-none focus:border-indigo-505 focus:ring-4 focus:ring-indigo-550/10 transition-all leading-normal text-slate-800 dark:text-slate-200"
                        />
                      </label>
                    </div>
                    
                    <div className="flex flex-col justify-between">
                      <div>
                        <span className="mb-1.5 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Upload CSV File</span>
                        <label className="flex flex-col items-center justify-center border border-dashed border-slate-250 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-700/60 rounded-lg p-4 bg-slate-50/20 dark:bg-slate-900/35 cursor-pointer group transition-all h-20">
                          <Upload className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors mb-1" />
                          <span className="text-[10px] font-bold text-slate-500 group-hover:text-emerald-600 transition-colors">Select CSV file</span>
                          <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const text = event.target?.result as string;
                                handleParsePassageCsv(text);
                              };
                              reader.readAsText(file);
                              e.target.value = "";
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1.5">
                    <div className="rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-2 text-[9px] text-amber-800 dark:text-amber-300 leading-normal flex-1">
                      Headers: <code className="font-mono font-bold bg-white/70 dark:bg-slate-950/50 px-1 py-0.5 rounded">question,option1,option2,option3,option4,correct_option</code>
                    </div>
                    <Button
                      type="button"
                      disabled={!passageCsvText.trim()}
                      onClick={() => handleParsePassageCsv(passageCsvText)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 shrink-0 rounded-lg"
                    >
                      Parse & Populate
                    </Button>
                  </div>
                </div>

                {subQuestions.map((subQ, subIdx) => (
                  <div key={subIdx} className="space-y-4 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/10 dark:bg-slate-900/10 relative animate-fade-in">
                    {subQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = subQuestions.filter((_, idx) => idx !== subIdx);
                          setSubQuestions(updated);
                        }}
                        className="absolute top-4 right-4 text-xs font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                    <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">
                      Question {subIdx + 1}
                    </h4>

                    {/* Question Prompt */}
                    <div className="space-y-1">
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Question Prompt</span>
                        <textarea
                          className="h-20 w-full resize-none rounded-md border border-slate-305 dark:border-slate-800 dark:bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-emerald-500 font-semibold text-slate-800 dark:text-slate-200"
                          placeholder="Type the question details here..."
                          value={subQ.question}
                          onChange={(e) => {
                            const updated = [...subQuestions];
                            updated[subIdx].question = e.target.value;
                            setSubQuestions(updated);
                          }}
                        />
                      </label>
                    </div>

                    {/* Options */}
                    <div>
                      <span className="mb-2 block text-xs font-semibold text-slate-750 dark:text-slate-300">Options</span>
                      {(["option1", "option2", "option3", "option4"] as const).map((opt, idx) => (
                        <div key={opt} className="mb-2.5 flex items-center gap-3">
                          <input
                            type="radio"
                            className="h-5 w-5 accent-emerald-500 shrink-0 cursor-pointer"
                            checked={subQ.correct_option === opt}
                            onChange={() => {
                              const updated = [...subQuestions];
                              updated[subIdx].correct_option = opt;
                              setSubQuestions(updated);
                            }}
                          />
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder={`Option ${idx + 1}`}
                              className="h-10 w-full rounded-md px-3 text-sm font-semibold border border-slate-300 dark:border-slate-800 dark:bg-slate-905 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-550/10 focus:border-indigo-500"
                              value={subQ[opt]}
                              onChange={(e) => {
                                const updated = [...subQuestions];
                                updated[subIdx][opt] = e.target.value;
                                setSubQuestions(updated);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Add More Question button */}
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setSubQuestions([...subQuestions, { question: "", option1: "", option2: "", option3: "", option4: "", correct_option: "option1" }]);
                    }}
                    className="w-full h-10 text-xs font-bold border border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4 text-emerald-500" />
                    Add More Question
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Question Text */}
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-350">Question Prompt</span>
                  <textarea
                    className="h-24 w-full resize-none rounded-md border border-slate-300 dark:border-slate-800 dark:bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-300 focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                    placeholder="Type the question details here..."
                    {...register("question")}
                  />
                  {errors.question?.message ? (
                    <span className="mt-1 block text-xs text-rose-500">{errors.question.message}</span>
                  ) : null}
                </label>

                {/* Options */}
                <div>
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-355">Options (Select the correct one)</span>
                  {(["option1", "option2", "option3", "option4"] as const).map((opt, idx) => (
                    <div key={opt} className="mb-2.5 flex items-center gap-3">
                      <Controller
                        name="correct_option"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="radio"
                            className="h-5 w-5 accent-emerald-500 shrink-0 cursor-pointer"
                            checked={field.value === opt}
                            onChange={() => field.onChange(opt)}
                          />
                        )}
                      />
                      <div className="flex-1">
                        <Input
                          placeholder={`Option ${idx + 1}`}
                          className="h-10 border-slate-300 dark:border-slate-800"
                          error={errors[opt]?.message}
                          {...register(opt)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

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

            {/* Question Image (Optional) */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">
                Question Image (Optional)
              </label>
              {imageUrl ? (
                <div className="relative group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 max-w-sm">
                  <img
                    src={imageUrl}
                    alt="Question Preview"
                    className="max-h-40 object-contain rounded-lg mx-auto"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-xl">
                    <label className="p-2 bg-white text-slate-800 rounded-full hover:bg-slate-100 transition cursor-pointer shadow-md" title="Replace Image">
                      <Upload className="h-4.5 w-4.5" />
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition shadow-md cursor-pointer"
                      title="Remove Image"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-455 mt-1 truncate px-1 text-center">{imageUrl}</p>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-900 rounded-xl p-5 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-950/20 max-w-sm transition-colors"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    id="file-upload-edit"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    disabled={isUploadingImage}
                  />
                  <label htmlFor="file-upload-edit" className="cursor-pointer block">
                    {isUploadingImage ? (
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Spinner className="h-6 w-6 text-indigo-500" />
                        <span className="text-xs font-semibold text-slate-500 animate-pulse">Uploading to ImageKit...</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="h-7 w-7 text-slate-455 mx-auto mb-1" />
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">Click or drag & drop to upload question image</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">JPG, JPEG, PNG or WEBP up to 5MB</span>
                      </div>
                    )}
                  </label>
                </div>
              )}
            </div>

            {formError ? <p className="text-xs font-bold text-rose-500">{formError}</p> : null}
          </form>
        </Modal>

        {/* Question Preview Modal */}
        <Modal
          open={Boolean(previewQuestion)}
          title="Question Preview"
          onClose={() => setPreviewQuestion(null)}
          footer={
            <Button variant="secondary" onClick={() => setPreviewQuestion(null)}>
              Close
            </Button>
          }
        >
          {previewQuestion && (
            <div className="space-y-5">
              {previewQuestion.passage_id && (
                (() => {
                  const p = passages.find((x: Passage) => x.id === previewQuestion.passage_id);
                  if (!p) return null;
                  return (
                    <div className="bg-indigo-50/50 dark:bg-slate-800/40 rounded-xl p-4 border border-indigo-100/50 dark:border-slate-800 shadow-inner mb-2 animate-fade-in">
                      <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
                        <BookOpen className="h-4 w-4 text-indigo-500 shrink-0" />
                        Passage Context: {p.title}
                      </div>
                      <div className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-semibold max-h-40 overflow-y-auto whitespace-pre-wrap">
                        {p.content}
                      </div>
                    </div>
                  );
                })()
              )}

              <div className="text-slate-800 dark:text-slate-200 text-sm font-bold border-b border-slate-100 dark:border-slate-800/80 pb-3 whitespace-pre-wrap leading-relaxed">
                {previewQuestion.question}
              </div>
              {(previewQuestion.image_url || previewQuestion.media_url) && (
                <div className="flex justify-start">
                  <img
                    src={previewQuestion.image_url || previewQuestion.media_url}
                    alt="Question Graphic"
                    loading="lazy"
                    className="max-h-72 w-auto max-w-full rounded-lg border border-slate-200 object-contain shadow-sm bg-white aspect-auto"
                  />
                </div>
              )}
              <div className="grid gap-3 pt-2">
                {(["option1", "option2", "option3", "option4"] as const).map((optKey, oIdx) => {
                  const optText = previewQuestion[optKey];
                  const optLetter = String.fromCharCode(65 + oIdx);
                  const isCorrect = previewQuestion.correct_option === optKey;

                  return (
                    <div
                      key={optKey}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-xs font-semibold ${isCorrect
                          ? "border-emerald-500 bg-emerald-50/25 text-emerald-800 dark:text-emerald-400"
                          : "border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-400"
                        }`}
                    >
                      <span className={`h-6 w-6 rounded flex items-center justify-center font-bold border ${isCorrect
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"
                        }`}>
                        {optLetter}
                      </span>
                      <span>{optText}</span>
                      {isCorrect && (
                        <span className="ml-auto text-[10px] font-extrabold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded">
                          Correct
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                          className={`p-2.5 rounded-xl text-xs font-semibold leading-relaxed ${isTeacher
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
