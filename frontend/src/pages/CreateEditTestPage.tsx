import { useEffect, useMemo, useState } from "react";
import { Controller, SubmitHandler, useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Spinner } from "../components/ui/Spinner";
import { createTest, getErrorMessage, updateTest, getTopicsBySubject, getAllQuestions, createTestFromCsv } from "../services/api";
import { useSubjects, useSubTopics, useTest } from "../hooks/useTests";
import { Modal } from "../components/ui/Modal";
import { TestPayload } from "../types";
import { testSchema, TestFormInput, TestFormValues } from "../utils/validators";
import { useAuthStore } from "../store/authStore";
import { Sparkles, UploadCloud, CheckCircle2, Settings, Clock, ClipboardList, GraduationCap, Award, AlertCircle, Edit3, ChevronRight, Calendar, Percent, Check, FileSpreadsheet } from "lucide-react";

const testTypeTabs = [
  { label: "Chapter Wise", value: "practice" },
  { label: "PYQ", value: "previous_year" },
  { label: "Mock Test", value: "mock" },
] as const;

const getMinStartTime = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};



export const CreateEditTestPage = () => {
  const user = useAuthStore((state) => state.user);
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && user.role !== "Admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);
  const [formError, setFormError] = useState("");
  const [schedulingType, setSchedulingType] = useState<"live_now" | "live_until">("live_now");
  const [enableSections, setEnableSections] = useState(false);

  // CSV Import Wizard State Variables
  const [mode, setMode] = useState<"manual" | "csv">("manual");
  const [csvStep, setCsvStep] = useState<1 | 2>(1);
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [parsedErrors, setParsedErrors] = useState<{ row: number; error: string }[]>([]);
  const [parseErrorMsg, setParseErrorMsg] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isSubmittingCsv, setIsSubmittingCsv] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [createdTestId, setCreatedTestId] = useState("");
  const [summaryData, setSummaryData] = useState<any>({
    totalRows: 0,
    newSubjects: 0,
    newTopics: 0,
    newSubTopics: 0,
    newQuestions: 0,
    reusedQuestions: 0,
    failedRows: 0
  });

  const [csvForm, setCsvForm] = useState({
    name: "",
    type: "practice",
    class: "Class 10",
    difficulty: "easy",
    correct_marks: 4,
    wrong_marks: -1,
    unattempt_marks: 0,
    total_time: 60,
    start_time: "",
    end_time: "",
    lateEntryTime: 0,
    graceTime: 0,
    tabSwitchLimit: 0,
    schedulingType: "live_now" as "live_now" | "live_until",
    total_questions: 0
  });
  const [csvFormErrors, setCsvFormErrors] = useState<Record<string, string>>({});
  const { data: subjects = [] } = useSubjects();
  const { data: existingTest, isLoading: isLoadingTest } = useTest(id);

  useEffect(() => {
    if (existingTest && isEdit) {
      const now = new Date().getTime();
      const start = existingTest.start_time ? new Date(existingTest.start_time).getTime() : 0;
      const hasStarted = (existingTest.status === "live" || existingTest.status === "scheduled") && (!start || now >= start);
      if (hasStarted) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [existingTest, isEdit, navigate]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TestFormInput, unknown, TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      name: "",
      subject: [],
      type: "practice",
      class: "Class 10",
      topics: [],
      sub_topics: [],
      difficulty: "easy",
      correct_marks: "" as unknown as number,
      wrong_marks: "" as unknown as number,
      unattempt_marks: "" as unknown as number,
      total_time: "" as unknown as number,
      total_marks: "" as unknown as number,
      total_questions: "" as unknown as number,
      start_time: "",
      end_time: "",
      lateEntryTime: 0,
      graceTime: 0,
      tabSwitchLimit: 0,
      sections: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sections",
  });

  const subjectIds = watch("subject") || [];
  const selectedTopics = watch("topics") || [];
  const selectedType = watch("type");
  const selectedDifficulty = watch("difficulty");
  const selectedClass = watch("class");

  // Fetch all questions from pool
  const { data: allQuestions = [] } = useQuery({
    queryKey: ["questions"],
    queryFn: getAllQuestions,
  });

  // Track class changes to clear selections
  const [prevClass, setPrevClass] = useState(selectedClass);
  useEffect(() => {
    if (selectedClass !== prevClass) {
      setValue("topics", []);
      setValue("sub_topics", []);
      setPrevClass(selectedClass);
    }
  }, [selectedClass, prevClass, setValue]);

  // Fetch topics for all selected subjects in parallel
  const { data: topics = [] } = useQuery({
    queryKey: ["topics", subjectIds],
    queryFn: async () => {
      const results = await Promise.all(
        subjectIds.map(subId => getTopicsBySubject(subId))
      );
      return results.flat();
    },
    enabled: subjectIds.length > 0,
  });

  // Filter topics dynamically by the selected class questions
  const filteredTopics = useMemo(() => {
    if (!selectedClass) return [];
    const activeTopicIds = new Set(
      allQuestions
        .filter(q => q.class === selectedClass)
        .map(q => q.topic_id)
        .filter(Boolean)
    );
    return topics.filter(t => activeTopicIds.has(t.id));
  }, [topics, allQuestions, selectedClass]);

  const { data: subTopics = [] } = useSubTopics(selectedTopics);
  const selectedSubtopics = watch("sub_topics") || [];

  // Filter subtopics dynamically by the selected class questions
  const filteredSubTopics = useMemo(() => {
    if (!selectedClass) return [];
    const activeSubTopicIds = new Set(
      allQuestions
        .filter(q => q.class === selectedClass)
        .map(q => q.sub_topic_id)
        .filter(Boolean)
    );
    return subTopics.filter(st => activeSubTopicIds.has(st.id));
  }, [subTopics, allQuestions, selectedClass]);

  // Automatically select all subtopics that belong to the selected topics
  useEffect(() => {
    if (selectedTopics.length === 0) {
      if (selectedSubtopics.length > 0) {
        setValue("sub_topics", []);
      }
    } else if (filteredSubTopics.length > 0) {
      const allSubTopicIds = filteredSubTopics.map(st => st.id);
      const currentSet = new Set(selectedSubtopics);
      const isExactlySame = allSubTopicIds.length === selectedSubtopics.length && allSubTopicIds.every(id => currentSet.has(id));
      if (!isExactlySame) {
        setValue("sub_topics", allSubTopicIds);
      }
    }
  }, [selectedTopics, filteredSubTopics, selectedSubtopics, setValue]);

  const correctMarks = watch("correct_marks");
  const totalQuestions = watch("total_questions");
  const totalTime = watch("total_time");
  const startTime = watch("start_time");
  const endTime = watch("end_time");

  const startTimeTimePart = useMemo(() => {
    if (startTime && startTime.includes("T")) {
      return startTime.split("T")[1].substring(0, 5);
    }
    return "";
  }, [startTime]);

  const endTimeTimePart = useMemo(() => {
    if (endTime && endTime.includes("T")) {
      return endTime.split("T")[1].substring(0, 5);
    }
    return "";
  }, [endTime]);

  useEffect(() => {
    const qCount = Number(totalQuestions);
    const cMarks = Number(correctMarks);
    if (!isNaN(qCount) && !isNaN(cMarks)) {
      setValue("total_marks", qCount * cMarks, { shouldValidate: true });
    }
  }, [totalQuestions, correctMarks, setValue]);

  // Live Today: Initialize start_time to now if not set, and auto-calculate end_time from start_time + totalTime
  useEffect(() => {
    if (schedulingType === "live_now") {
      const pad = (n: number) => String(n).padStart(2, "0");
      const format = (date: Date) => {
        const yyyy = date.getFullYear();
        const MM = pad(date.getMonth() + 1);
        const dd = pad(date.getDate());
        const hh = pad(date.getHours());
        const mm = pad(date.getMinutes());
        return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
      };

      if (!startTime) {
        const now = new Date();
        setValue("start_time", format(now), { shouldValidate: true });
        return;
      }

      const minutes = Number(totalTime);
      if (startTime && !isNaN(minutes) && minutes > 0) {
        const startDate = new Date(startTime);
        if (!isNaN(startDate.getTime())) {
          const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
          setValue("end_time", format(endDate), { shouldValidate: true });
        }
      } else {
        setValue("end_time", "");
      }
    }
  }, [schedulingType, startTime, totalTime, setValue]);

  useEffect(() => {
    if (existingTest) {
      let testSubjectIds: string[] = [];
      if (existingTest.subject_ids && existingTest.subject_ids.length > 0) {
        testSubjectIds = existingTest.subject_ids;
      } else if (existingTest.subject_id) {
        testSubjectIds = [existingTest.subject_id];
      } else if (typeof existingTest.subject === "string") {
        const found = subjects.find(s => s.name === existingTest.subject);
        if (found) testSubjectIds = [found.id];
      } else if (Array.isArray(existingTest.subject)) {
        testSubjectIds = existingTest.subject.map(name => subjects.find(s => s.name === name)?.id ?? name);
      }

      reset({
        name: existingTest.name,
        subject: testSubjectIds,
        type: existingTest.type === "mock" || existingTest.type === "previous_year" ? existingTest.type : "practice",
        class: existingTest.class ?? "Class 10",
        topics: existingTest.topics ?? [],
        sub_topics: existingTest.sub_topics ?? [],
        difficulty: existingTest.difficulty === "medium" || existingTest.difficulty === "hard" ? existingTest.difficulty : "easy",
        correct_marks: existingTest.correct_marks,
        wrong_marks: existingTest.wrong_marks,
        unattempt_marks: existingTest.unattempt_marks,
        total_time: existingTest.total_time,
        total_marks: existingTest.total_marks,
        total_questions: existingTest.total_questions,
        start_time: existingTest.start_time ?? "",
        end_time: existingTest.end_time ?? "",
        lateEntryTime: existingTest.lateEntryTime ?? 0,
        graceTime: existingTest.graceTime ?? 0,
        tabSwitchLimit: existingTest.tabSwitchLimit ?? 0,
        sections: existingTest.sections ?? [],
      });

      setEnableSections(Boolean(existingTest.sections && existingTest.sections.length > 0));

      // Default schedulingType based on whether start_time is set
      if (existingTest.start_time && existingTest.end_time) {
        setSchedulingType("live_until");
      } else {
        setSchedulingType("live_now");
      }
    }
  }, [existingTest, reset, subjects]);

  const subjectNames = useMemo(() => {
    return subjectIds.map(id => subjects.find(s => s.id === id)?.name ?? id);
  }, [subjects, subjectIds]);

  const saveMutation = useMutation({
    mutationFn: (payload: TestPayload) => (isEdit && id ? updateTest(id, payload) : createTest(payload)),
    onSuccess: async (test, variables) => {
      void test;
      void variables;
      await queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
  });

  const buildPayload = (values: TestFormValues): TestPayload => ({
    ...values,
    subject: subjectNames.length === 1 ? subjectNames[0] : subjectNames,
    subject_id: values.subject[0] || undefined,
    subject_ids: values.subject,
    status: existingTest?.status ?? "draft",
    sections: enableSections ? values.sections : undefined,
  });

  const submit =
    (goNext: boolean): SubmitHandler<TestFormValues> =>
      async (values) => {
        setFormError("");
        if (enableSections) {
          if (!values.sections || values.sections.length === 0) {
            setFormError("Please add at least one section when sectional timers are enabled.");
            return;
          }
          const sumDurations = values.sections.reduce((acc, sec) => acc + Number(sec.duration || 0), 0);
          if (sumDurations !== Number(values.total_time)) {
            setFormError(`The sum of section durations (${sumDurations} mins) must equal the total test time (${values.total_time} mins).`);
            return;
          }
          if (values.start_time && values.end_time) {
            const start = new Date(values.start_time).getTime();
            const end = new Date(values.end_time).getTime();
            const slotMins = Math.floor((end - start) / (60 * 1000));
            if (sumDurations > slotMins) {
              setFormError(`The sum of section durations (${sumDurations} mins) cannot be greater than the schedule time slot (${slotMins} mins).`);
              return;
            }
          }
        } else {
          if (values.start_time && values.end_time) {
            const start = new Date(values.start_time).getTime();
            const end = new Date(values.end_time).getTime();
            const slotMins = Math.floor((end - start) / (60 * 1000));
            if (Number(values.total_time) > slotMins) {
              setFormError(`Test duration (${values.total_time} mins) cannot be greater than the schedule time slot (${slotMins} mins).`);
              return;
            }
          }
        }
        try {
          const result = await saveMutation.mutateAsync(buildPayload(values));
          navigate(goNext ? `/tests/${result.id}/questions` : "/dashboard");
        } catch (error) {
          setFormError(getErrorMessage(error));
        }
      };

  // Helper functions for CSV Parsing & Import Wizard
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(val => val.replace(/^["']|["']$/g, "").trim());
  };

  const parseCsv = (text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      return { headers: [], rows: [], error: "CSV must contain a header row and at least one question row." };
    }

    const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
    const requiredHeaders = ["question", "correct_option", "subject"];
    const missing = requiredHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      return {
        headers,
        rows: [],
        error: `Missing required headers: ${missing.join(", ")}. Expected headers: question, option1, option2, option3, option4, correct_option, difficulty, class, topic, sub_topic, subject`
      };
    }

    const rows: any[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rawValues = parseCsvLine(lines[i]);
      const rowObj: any = {};
      headers.forEach((header, idx) => {
        rowObj[header] = rawValues[idx] || "";
      });

      const rowNum = i + 1;
      const rowErrors: string[] = [];

      if (!rowObj.question) {
        rowErrors.push("Question is empty");
      }
      if (!rowObj.correct_option) {
        rowErrors.push("Correct option is empty");
      }
      if (!rowObj.subject) {
        rowErrors.push("Subject is empty");
      }
      if (!rowObj.option1) {
        rowErrors.push("Option 1 is empty");
      }
      if (!rowObj.option2) {
        rowErrors.push("Option 2 is empty");
      }

      let resolvedCorrectOption = "";
      if (rowObj.correct_option && rowObj.option1 && rowObj.option2) {
        const co = rowObj.correct_option.toLowerCase().trim();
        const optVal1 = (rowObj.option1 || "").toLowerCase().trim();
        const optVal2 = (rowObj.option2 || "").toLowerCase().trim();
        const optVal3 = (rowObj.option3 || "").toLowerCase().trim();
        const optVal4 = (rowObj.option4 || "").toLowerCase().trim();

        if (["option1", "option2", "option3", "option4"].includes(co)) {
          resolvedCorrectOption = co;
        } else if (co === "a") {
          resolvedCorrectOption = "option1";
        } else if (co === "b") {
          resolvedCorrectOption = "option2";
        } else if (co === "c") {
          resolvedCorrectOption = "option3";
        } else if (co === "d") {
          resolvedCorrectOption = "option4";
        } else if (co === optVal1) {
          resolvedCorrectOption = "option1";
        } else if (co === optVal2) {
          resolvedCorrectOption = "option2";
        } else if (co === optVal3 && optVal3) {
          resolvedCorrectOption = "option3";
        } else if (co === optVal4 && optVal4) {
          resolvedCorrectOption = "option4";
        } else {
          rowErrors.push(`Correct option "${rowObj.correct_option}" does not match A, B, C, D or any of the provided options`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, error: rowErrors.join(", ") });
      } else {
        rows.push({
          id: `row-${rowNum}-${Date.now()}`,
          rowNum,
          question: rowObj.question,
          option1: rowObj.option1,
          option2: rowObj.option2,
          option3: rowObj.option3 || "",
          option4: rowObj.option4 || "",
          correct_option: resolvedCorrectOption,
          difficulty: rowObj.difficulty || "easy",
          class: rowObj.class || "",
          topic: rowObj.topic || "General",
          sub_topic: rowObj.sub_topic || "General",
          subject: rowObj.subject,
        });
      }
    }

    return { headers, rows, errors };
  };

  const handleParseCsv = (text: string) => {
    setParseErrorMsg("");
    setParsedErrors([]);
    setParsedRows([]);
    setSelectedRowIds([]);

    const result = parseCsv(text);
    if (result.error) {
      setParseErrorMsg(result.error);
      return;
    }

    setParsedRows(result.rows);
    setParsedErrors(result.errors || []);
    setSelectedRowIds(result.rows.map(r => r.id));
  };

  const validateCsvForm = () => {
    const errs: Record<string, string> = {};
    if (!csvForm.name.trim()) errs.name = "Test name is required";
    if (csvForm.correct_marks === undefined || isNaN(Number(csvForm.correct_marks))) {
      errs.correct_marks = "Correct marks must be a number";
    }
    if (csvForm.wrong_marks === undefined || isNaN(Number(csvForm.wrong_marks))) {
      errs.wrong_marks = "Wrong marks must be a number";
    }
    if (csvForm.unattempt_marks === undefined || isNaN(Number(csvForm.unattempt_marks))) {
      errs.unattempt_marks = "Unattempted marks must be a number";
    }
    if (!csvForm.total_time || isNaN(Number(csvForm.total_time)) || Number(csvForm.total_time) <= 0) {
      errs.total_time = "Duration must be greater than 0";
    }
    if (!csvForm.start_time) {
      errs.start_time = "Start time is required";
    }
    if (csvForm.schedulingType === "live_until" && !csvForm.end_time) {
      errs.end_time = "End time is required";
    }
    if (csvForm.start_time && csvForm.end_time) {
      const start = new Date(csvForm.start_time).getTime();
      const end = new Date(csvForm.end_time).getTime();
      if (end < start) {
        errs.end_time = "End time slot cannot be earlier than start time slot";
      } else {
        const slotMins = Math.floor((end - start) / (60 * 1000));
        if (Number(csvForm.total_time) > slotMins) {
          errs.total_time = `Test duration (${csvForm.total_time} mins) cannot be greater than the schedule time slot (${slotMins} mins)`;
        }
      }
    }
    if (csvForm.total_questions === undefined || isNaN(Number(csvForm.total_questions)) || Number(csvForm.total_questions) <= 0) {
      errs.total_questions = "Number of questions must be greater than 0";
    } else if (!Number.isInteger(Number(csvForm.total_questions))) {
      errs.total_questions = "Number of questions must be a whole number";
    } else if (Number(csvForm.total_questions) > selectedRowIds.length) {
      errs.total_questions = `Number of questions cannot exceed selected questions (${selectedRowIds.length})`;
    }
    setCsvFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCsvImportSubmit = async () => {
    if (!validateCsvForm()) return;
    setFormError("");

    const selectedQuestions = parsedRows
      .filter(r => selectedRowIds.includes(r.id))
      .map(r => ({
        question: r.question,
        option1: r.option1,
        option2: r.option2,
        option3: r.option3,
        option4: r.option4,
        correct_option: r.correct_option,
        difficulty: r.difficulty,
        class: r.class || csvForm.class,
        topic: r.topic,
        sub_topic: r.sub_topic,
        subject: r.subject
      }));

    if (selectedQuestions.length === 0) {
      setFormError("No questions selected for import");
      return;
    }

    try {
      setIsSubmittingCsv(true);
      const response = await createTestFromCsv({
        name: csvForm.name,
        total_time: Number(csvForm.total_time),
        correct_marks: Number(csvForm.correct_marks),
        wrong_marks: Number(csvForm.wrong_marks),
        unattempt_marks: Number(csvForm.unattempt_marks),
        type: csvForm.type,
        class: csvForm.class,
        status: "draft",
        questions: selectedQuestions,
        total_questions: Number(csvForm.total_questions),
        start_time: csvForm.start_time || undefined,
        end_time: csvForm.end_time || undefined
      });

      if (response.success) {
        setSummaryData(response.summary || {
          totalRows: selectedQuestions.length,
          newSubjects: 0,
          newTopics: 0,
          newSubTopics: 0,
          newQuestions: 0,
          reusedQuestions: 0,
          failedRows: response.errors?.length || 0
        });
        if (response.errors) {
          setSummaryData((prev: any) => ({ ...prev, errors: response.errors }));
        }
        setCreatedTestId(response.data.id);
        setShowSummaryModal(true);
      } else {
        setFormError("Import failed");
      }
    } catch (err: any) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsSubmittingCsv(false);
    }
  };

  useEffect(() => {
    if (csvForm.schedulingType === "live_now") {
      const pad = (n: number) => String(n).padStart(2, "0");
      const format = (date: Date) => {
        const yyyy = date.getFullYear();
        const MM = pad(date.getMonth() + 1);
        const dd = pad(date.getDate());
        const hh = pad(date.getHours());
        const mm = pad(date.getMinutes());
        return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
      };

      if (!csvForm.start_time) {
        const now = new Date();
        setCsvForm((prev: any) => ({ ...prev, start_time: format(now) }));
        return;
      }

      const minutes = Number(csvForm.total_time);
      if (csvForm.start_time && !isNaN(minutes) && minutes > 0) {
        const startDate = new Date(csvForm.start_time);
        if (!isNaN(startDate.getTime())) {
          const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
          setCsvForm((prev: any) => ({ ...prev, end_time: format(endDate) }));
        }
      } else {
        setCsvForm((prev: any) => ({ ...prev, end_time: "" }));
      }
    }
  }, [csvForm.schedulingType, csvForm.start_time, csvForm.total_time]);

  const showTabs = !isEdit;

  const showEditSkeleton = isEdit && isLoadingTest;

  return (
    <AppShell>
      <PageWrapper>
        {/* Modern Breadcrumbs & Navigation */}
        <div className="mb-6 flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">
          <Link to="/dashboard" className="hover:text-primary-600 dark:hover:text-indigo-405 transition-colors">Dashboard</Link>
          <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-700" />
          <span className="text-slate-500 dark:text-slate-400">{isEdit ? "Edit Test Slot" : "New Test Slot"}</span>
          <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-700" />
          <span className="text-slate-800 dark:text-slate-200">Chapter Wise</span>
        </div>

        {/* Studio Title Header Card */}
        <header className="relative overflow-hidden mb-10 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 shadow-md text-white border border-slate-800/80">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 border border-indigo-400/30 px-3.5 py-1.5 text-xs font-bold text-indigo-300">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Test Configuration Studio</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
                {isEdit ? `Edit Configuration: ${existingTest?.name || "Test"}` : "Configure New Test Slot"}
              </h1>
              <p className="text-sm text-slate-300/80 max-w-xl">
                {isEdit 
                  ? "Adjust slot attributes, timing configurations, or marking policies for this upcoming test instance." 
                  : "Establish exam parameters, schedule testing slots, set up scoring structures, or batch import question matrices via CSV."
                }
              </p>
            </div>
            
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 shadow-inner md:mr-4 flex-shrink-0">
              <Settings className="h-7 w-7 animate-[spin_16s_linear_infinite]" />
            </div>
          </div>
        </header>

        {showTabs && (
          <div className="mb-8 flex justify-start">
            <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-205 dark:border-slate-900 shadow-inner">
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`py-2.5 px-6 rounded-xl text-sm font-bold transition-all duration-250 flex items-center gap-2 ${
                  mode === "manual"
                    ? "bg-white dark:bg-slate-900 text-primary-605 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-800"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-350 border border-transparent"
                }`}
              >
                <Edit3 className="h-4 w-4" />
                Manual Configuration
              </button>
              <button
                type="button"
                onClick={() => setMode("csv")}
                className={`py-2.5 px-6 rounded-xl text-sm font-bold transition-all duration-250 flex items-center gap-2 ${
                  mode === "csv"
                    ? "bg-white dark:bg-slate-900 text-primary-605 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-800"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-350 border border-transparent"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV Import Wizard
              </button>
            </div>
          </div>
        )}

        {showEditSkeleton ? (
          <div className="flex h-80 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2 font-semibold text-sm">Loading test parameters...</span>
          </div>
        ) : mode === "csv" ? (
          <div className="space-y-8">
            {/* Stepper block */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-4 sm:gap-12 md:gap-20">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm transition-all duration-300 ${
                    csvStep === 1 
                      ? "bg-indigo-650 text-white shadow-md shadow-indigo-500/20 scale-105" 
                      : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                  }`}>
                    {csvStep > 1 ? <Check className="h-5 w-5" /> : "1"}
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${csvStep === 1 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-750 dark:text-slate-300"}`}>
                      Upload & Preview
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Provide CSV and parse questions</p>
                  </div>
                </div>
                
                <div className="hidden sm:block h-0.5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm transition-all duration-300 ${
                    csvStep === 2 
                      ? "bg-indigo-650 text-white shadow-md shadow-indigo-500/20 scale-105" 
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500"
                  }`}>
                    2
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${csvStep === 2 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-455 dark:text-slate-500"}`}>
                      Configure Parameters
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Define marking logic & timeslots</p>
                  </div>
                </div>
              </div>
            </div>

            {csvStep === 1 ? (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* File Upload Zone */}
                  <div className="rounded-2xl border-2 border-dashed border-slate-300/80 dark:border-slate-800/80 p-8 text-center bg-white/60 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-900/60 hover:border-indigo-550 dark:hover:border-indigo-400 transition-all duration-350 shadow-sm flex flex-col items-center justify-center min-h-[220px] group">
                    <label className="cursor-pointer flex flex-col items-center justify-center space-y-3 w-full h-full">
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-605 dark:text-indigo-400 rounded-2xl group-hover:scale-110 group-hover:bg-indigo-100/50 dark:group-hover:bg-indigo-950/70 transition-all duration-300">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-slate-850 dark:text-slate-200 text-sm block">Upload Question CSV</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 block">Required: question, correct_option, subject, option1, option2</span>
                      </div>
                      <div className="inline-flex px-4 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100/50 transition-colors">
                        Browse Local File
                      </div>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const text = event.target?.result as string;
                              setCsvText(text);
                              handleParseCsv(text);
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Paste CSV Values */}
                  <div className="flex flex-col bg-white/60 dark:bg-slate-900/30 border border-slate-205 dark:border-slate-850 rounded-2xl p-5 shadow-sm">
                    <span className="mb-2 block text-sm font-bold text-slate-750 dark:text-slate-300 flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-indigo-505" />
                      Or Paste Raw CSV Values
                    </span>
                    <textarea
                      placeholder="question,option1,option2,option3,option4,correct_option,difficulty,class,topic,sub_topic,subject&#10;What is 1+1?,2,3,4,5,option1,easy,Class 10,Arithmetic,Addition,Math"
                      value={csvText}
                      onChange={(e) => {
                        setCsvText(e.target.value);
                        handleParseCsv(e.target.value);
                      }}
                      className="h-[148px] w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-955/90 p-4 text-xs font-mono text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-505 focus:ring-2 focus:ring-indigo-500/20 transition-all scrollbar-thin"
                    />
                  </div>
                </div>

                {parseErrorMsg && (
                  <div className="rounded-2xl bg-rose-50/50 dark:bg-rose-955/20 p-4 text-sm text-rose-600 dark:text-rose-400 border border-rose-105 dark:border-rose-900/50 font-medium flex items-start gap-3 shadow-sm">
                    <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold mb-0.5">Parse Failure</strong>
                      <span>{parseErrorMsg}</span>
                    </div>
                  </div>
                )}

                {parsedErrors.length > 0 && (
                  <div className="rounded-2xl bg-rose-50/50 dark:bg-rose-955/20 p-5 border border-rose-105 dark:border-rose-900/50 shadow-sm flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-505 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-rose-700 dark:text-rose-450 block">
                        Question Validation Failures ({parsedErrors.length})
                      </span>
                      <p className="text-xs text-rose-500 dark:text-rose-450 mt-1">The following rows have missing fields and will be skipped during import:</p>
                      <div className="mt-3 max-h-40 overflow-y-auto text-xs text-rose-600 dark:text-rose-400 space-y-1.5 scrollbar-thin pr-2">
                        {parsedErrors.map((err, idx) => (
                          <div key={idx} className="flex gap-2 items-baseline bg-rose-100/30 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200/30 dark:border-rose-900/20">
                            <span className="font-bold">Row {err.row}:</span>
                            <span className="truncate">{err.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {parsedRows.length > 0 && (
                  <div className="rounded-2xl border border-slate-205 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-pulse" />
                          Valid Question Pool ({parsedRows.length})
                        </h3>
                        <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
                          Questions to import: <span className="font-bold text-indigo-500 dark:text-indigo-405">{selectedRowIds.length}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 rounded-xl px-4 text-xs font-bold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-205"
                          onClick={() => setSelectedRowIds(parsedRows.map(r => r.id))}
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 rounded-xl px-4 text-xs font-bold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-205"
                          onClick={() => setSelectedRowIds([])}
                        >
                          Clear Selection
                        </Button>
                      </div>
                    </div>

                    <div className="border border-slate-150 dark:border-slate-800/60 rounded-xl overflow-hidden shadow-sm max-h-[360px] overflow-y-auto scrollbar-thin">
                      <table className="w-full border-collapse text-left text-xs relative">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-150 dark:border-slate-800/60 sticky top-0 z-10">
                            <th className="p-3.5 w-12 text-center bg-slate-50 dark:bg-slate-950">Select</th>
                            <th className="p-3.5 w-16 bg-slate-50 dark:bg-slate-950">Index</th>
                            <th className="p-3.5 min-w-[200px] bg-slate-50 dark:bg-slate-950">Question Statement</th>
                            <th className="p-3.5 min-w-[240px] bg-slate-50 dark:bg-slate-950">Options Details</th>
                            <th className="p-3.5 w-20 bg-slate-50 dark:bg-slate-950">Answer</th>
                            <th className="p-3.5 w-28 bg-slate-50 dark:bg-slate-950">Subject</th>
                            <th className="p-3.5 min-w-[150px] bg-slate-50 dark:bg-slate-950">Topic Node</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-350">
                          {parsedRows.map((row) => {
                            const isSelected = selectedRowIds.includes(row.id);
                            return (
                              <tr key={row.id} className={`hover:bg-slate-50/70 dark:hover:bg-slate-950/30 transition-colors ${
                                isSelected ? "bg-indigo-50/20 dark:bg-indigo-950/10" : ""
                              }`}>
                                <td className="p-3.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      setSelectedRowIds(prev =>
                                        prev.includes(row.id) ? prev.filter(id => id !== row.id) : [...prev, row.id]
                                      );
                                    }}
                                    className="h-4.5 w-4.5 rounded text-indigo-600 focus:ring-indigo-500/20 accent-indigo-600 cursor-pointer transition-all border-slate-300 dark:border-slate-700"
                                  />
                                </td>
                                <td className="p-3.5 font-bold text-slate-400">#{row.rowNum}</td>
                                <td className="p-3.5 font-semibold max-w-xs truncate text-slate-805 dark:text-slate-200" title={row.question}>
                                  {row.question}
                                </td>
                                <td className="p-3.5 text-slate-500 dark:text-slate-400 truncate max-w-xs" title={`1: ${row.option1} | 2: ${row.option2} ${row.option3 && `| 3: ${row.option3}`} ${row.option4 && `| 4: ${row.option4}`}`}>
                                  <span className="inline-flex gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 font-bold scale-90">A</span> {row.option1}
                                    <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 font-bold scale-90">B</span> {row.option2}
                                    {row.option3 && <><span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 font-bold scale-90">C</span> {row.option3}</>}
                                    {row.option4 && <><span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 font-bold scale-90">D</span> {row.option4}</>}
                                  </span>
                                </td>
                                <td className="p-3.5">
                                  <Badge tone="green" className="font-bold px-2 py-0.5 uppercase tracking-wide">
                                    {row.correct_option?.replace("option", "Option ")}
                                  </Badge>
                                </td>
                                <td className="p-3.5">
                                  <Badge tone="blue" className="font-semibold">{row.subject}</Badge>
                                </td>
                                <td className="p-3.5 text-slate-450 dark:text-slate-500 max-w-[180px] truncate" title={`${row.topic} / ${row.sub_topic}`}>
                                  {row.topic} <span className="mx-1">→</span> {row.sub_topic}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {formError ? <Badge tone="red">{formError}</Badge> : null}

                <div className="flex justify-end gap-3.5 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate("/dashboard")}
                    className="rounded-xl shadow-sm border border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 transition-all text-xs font-bold px-5 py-2.5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={selectedRowIds.length === 0}
                    onClick={() => {
                      setCsvForm(prev => ({
                        ...prev,
                        total_questions: selectedRowIds.length
                      }));
                      setCsvStep(2);
                    }}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/10 text-white border-none font-bold transition-all hover:scale-[1.02] active:scale-[0.98] text-xs px-5 py-2.5 disabled:opacity-50 disabled:scale-100"
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Form parameters */}
                <div className="grid gap-8 lg:grid-cols-2">
                  {/* General settings */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 shadow-sm space-y-6">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-indigo-500" />
                      <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">General Setup</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Name of Test</span>
                        <input
                          type="text"
                          placeholder="Enter name of Test"
                          value={csvForm.name}
                          onChange={(e) => setCsvForm(p => ({ ...p, name: e.target.value }))}
                          className="h-12 w-full rounded-xl border border-slate-250 dark:border-slate-850 bg-white dark:bg-slate-950 px-4 text-sm text-slate-805 dark:text-slate-300 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10"
                        />
                        {csvFormErrors.name && (
                          <span className="mt-1 block text-xs font-semibold text-rose-500">{csvFormErrors.name}</span>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Grade / Class</span>
                          <select
                            value={csvForm.class}
                            onChange={(e) => setCsvForm(p => ({ ...p, class: e.target.value }))}
                            className="h-12 w-full rounded-xl border border-slate-250 dark:border-slate-850 bg-white dark:bg-slate-950 px-4 text-sm text-slate-805 dark:text-slate-300 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 cursor-pointer"
                          >
                            <option value="Class 9">Class 9</option>
                            <option value="Class 10">Class 10</option>
                            <option value="Class 11">Class 11</option>
                            <option value="Class 12">Class 12</option>
                          </select>
                        </div>

                        <div>
                          <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Test Category</span>
                          <select
                            value={csvForm.type}
                            onChange={(e) => setCsvForm(p => ({ ...p, type: e.target.value }))}
                            className="h-12 w-full rounded-xl border border-slate-250 dark:border-slate-850 bg-white dark:bg-slate-955 px-4 text-sm text-slate-805 dark:text-slate-300 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 cursor-pointer"
                          >
                            <option value="practice">Chapter Wise</option>
                            <option value="previous_year">PYQ</option>
                            <option value="mock">Mock Test</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scheduling settings */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 shadow-sm space-y-6">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-indigo-500" />
                      <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Scheduling & Timeslots</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Scheduling Policy</span>
                        <select
                          value={csvForm.schedulingType}
                          onChange={(e) => {
                            const val = e.target.value as "live_now" | "live_until";
                            setCsvForm(p => ({ ...p, schedulingType: val, start_time: "", end_time: "" }));
                          }}
                          className="h-12 w-full rounded-xl border border-slate-250 dark:border-slate-850 bg-white dark:bg-slate-950 px-4 text-sm text-slate-805 dark:text-slate-300 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 cursor-pointer"
                        >
                          <option value="live_now">Live Today</option>
                          <option value="live_until">Live Until</option>
                        </select>
                      </div>

                      {csvForm.schedulingType === "live_now" ? (
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div>
                            <span className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">Duration (Min)</span>
                            <input
                              type="number"
                              placeholder="Minutes"
                              value={csvForm.total_time}
                              onChange={(e) => setCsvForm(p => ({ ...p, total_time: Number(e.target.value) }))}
                              className="h-12 w-full rounded-xl border border-slate-250 dark:border-slate-850 bg-white dark:bg-slate-950 px-4 text-sm text-slate-805 dark:text-slate-300 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10"
                            />
                            {csvFormErrors.total_time && (
                              <span className="mt-1 block text-xs font-semibold text-rose-500">{csvFormErrors.total_time}</span>
                            )}
                          </div>
                          <div>
                            <span className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">Start (Today)</span>
                            <input
                              type="time"
                              value={csvForm.start_time ? csvForm.start_time.split("T")[1]?.substring(0, 5) : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  const now = new Date();
                                  const pad = (n: number) => String(n).padStart(2, "0");
                                  const todayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                                  setCsvForm(p => ({ ...p, start_time: `${todayDate}T${val}` }));
                                } else {
                                  setCsvForm(p => ({ ...p, start_time: "" }));
                                }
                              }}
                              className="h-12 w-full rounded-xl border border-slate-250 dark:border-slate-850 bg-white dark:bg-slate-950 px-4 text-sm text-slate-805 dark:text-slate-300 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10"
                            />
                            {csvFormErrors.start_time && (
                              <span className="mt-1 block text-xs font-semibold text-rose-500">{csvFormErrors.start_time}</span>
                            )}
                          </div>
                          <div>
                            <span className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">End (Today)</span>
                            <input
                              type="time"
                              value={csvForm.end_time ? csvForm.end_time.split("T")[1]?.substring(0, 5) : ""}
                              readOnly
                              className="h-12 w-full rounded-xl border border-slate-250 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 px-4 text-sm text-slate-400 dark:text-slate-500 outline-none cursor-not-allowed"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <span className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">Start Time Slot</span>
                              <input
                                type="datetime-local"
                                min={getMinStartTime()}
                                value={csvForm.start_time}
                                onChange={(e) => setCsvForm(p => ({ ...p, start_time: e.target.value }))}
                                className="h-12 w-full rounded-xl border border-slate-250 dark:border-slate-855 bg-white dark:bg-slate-950 px-4 text-sm text-slate-805 dark:text-slate-300 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10"
                              />
                              {csvFormErrors.start_time && (
                                <span className="mt-1 block text-xs font-semibold text-rose-500">{csvFormErrors.start_time}</span>
                              )}
                            </div>
                            <div>
                              <span className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">End Time Slot</span>
                              <input
                                type="datetime-local"
                                min={csvForm.start_time || getMinStartTime()}
                                value={csvForm.end_time}
                                onChange={(e) => setCsvForm(p => ({ ...p, end_time: e.target.value }))}
                                className="h-12 w-full rounded-xl border border-slate-250 dark:border-slate-855 bg-white dark:bg-slate-950 px-4 text-sm text-slate-805 dark:text-slate-300 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10"
                              />
                              {csvFormErrors.end_time && (
                                <span className="mt-1 block text-xs font-semibold text-rose-500">{csvFormErrors.end_time}</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Duration (Minutes)</span>
                            <input
                              type="number"
                              placeholder="Enter the duration"
                              value={csvForm.total_time}
                              onChange={(e) => setCsvForm(p => ({ ...p, total_time: Number(e.target.value) }))}
                              className="h-12 w-full rounded-xl border border-slate-250 dark:border-slate-850 bg-white dark:bg-slate-950 px-4 text-sm text-slate-805 dark:text-slate-300 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10"
                            />
                            {csvFormErrors.total_time && (
                              <span className="mt-1 block text-xs font-semibold text-rose-500">{csvFormErrors.total_time}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scoring Setup */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 shadow-sm">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 flex items-center gap-2">
                    <Percent className="h-5 w-5 text-indigo-500" />
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Scoring Policy</h3>
                  </div>
                  
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-805 bg-white dark:bg-slate-950 border-l-4 border-l-rose-500 transition-all hover:shadow-sm">
                      <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Wrong Answer Penalty</span>
                      <input
                        type="number"
                        value={csvForm.wrong_marks}
                        onChange={(e) => setCsvForm(p => ({ ...p, wrong_marks: Number(e.target.value) }))}
                        className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all"
                      />
                      {csvFormErrors.wrong_marks && (
                        <span className="mt-1 block text-xs font-semibold text-rose-500">{csvFormErrors.wrong_marks}</span>
                      )}
                    </div>
                    
                    <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-805 bg-white dark:bg-slate-950 border-l-4 border-l-slate-400 transition-all hover:shadow-sm">
                      <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Unattempted Score</span>
                      <input
                        type="number"
                        value={csvForm.unattempt_marks}
                        onChange={(e) => setCsvForm(p => ({ ...p, unattempt_marks: Number(e.target.value) }))}
                        className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-slate-450 focus:ring-2 focus:ring-slate-500/10 transition-all"
                      />
                      {csvFormErrors.unattempt_marks && (
                        <span className="mt-1 block text-xs font-semibold text-rose-505">{csvFormErrors.unattempt_marks}</span>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-805 bg-white dark:bg-slate-950 border-l-4 border-l-emerald-500 transition-all hover:shadow-sm">
                      <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Correct Answer Award</span>
                      <input
                        type="number"
                        value={csvForm.correct_marks}
                        onChange={(e) => setCsvForm(p => ({ ...p, correct_marks: Number(e.target.value) }))}
                        className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                      />
                      {csvFormErrors.correct_marks && (
                        <span className="mt-1 block text-xs font-semibold text-rose-505">{csvFormErrors.correct_marks}</span>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-slate-155 dark:border-slate-805 bg-white dark:bg-slate-955 border-l-4 border-l-indigo-500 transition-all hover:shadow-sm">
                      <span className="mb-2 block text-xs font-bold text-slate-505 dark:text-slate-450 uppercase tracking-wider">No of Questions</span>
                      <input
                        type="number"
                        value={csvForm.total_questions}
                        onChange={(e) => setCsvForm(p => ({ ...p, total_questions: Number(e.target.value) }))}
                        className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      />
                      {csvFormErrors.total_questions && (
                        <span className="mt-1 block text-xs font-semibold text-rose-505">{csvFormErrors.total_questions}</span>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-slate-155 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-950 border-l-4 border-l-purple-500 transition-all select-none">
                      <span className="mb-2 block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Aggregated Marks</span>
                      <input
                        type="number"
                        value={(csvForm.total_questions || 0) * (Number(csvForm.correct_marks) || 0)}
                        readOnly
                        className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-900 bg-slate-100 dark:bg-slate-900 px-3 text-sm font-bold text-purple-600 dark:text-purple-400 cursor-not-allowed outline-none"
                      />
                    </div>
                  </div>
                </div>

                {formError ? <Badge tone="red">{formError}</Badge> : null}

                <div className="flex justify-end gap-3.5 pt-4 border-t border-slate-150 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setCsvStep(1)}
                    className="rounded-xl shadow-sm border border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 transition-all text-xs font-bold px-5 py-2.5"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmittingCsv}
                    onClick={handleCsvImportSubmit}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/10 text-white border-none font-bold transition-all hover:scale-[1.02] active:scale-[0.98] text-xs px-5 py-2.5 flex items-center gap-2"
                  >
                    {isSubmittingCsv ? <Spinner /> : "Save as Draft & Finish"}
                  </Button>
                </div>
              </div>
            )}

            {/* Summary Modal */}
            <Modal
              open={showSummaryModal}
              title="Import Summary Matrix"
              onClose={() => { }}
              preventClose={true}
              footer={
                <Button
                  onClick={() => {
                    setShowSummaryModal(false);
                    navigate(`/tests/${createdTestId}/preview`);
                  }}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/10 text-white border-none font-bold transition-all hover:scale-[1.02] active:scale-[0.98] text-xs px-5 py-2.5"
                >
                  Proceed to Preview
                </Button>
              }
            >
              <div className="space-y-4">
                <p className="text-sm text-slate-605 dark:text-slate-400">
                  CSV questions parsing and DB matrix generation completed successfully:
                </p>
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 dark:bg-slate-950 p-4.5 border border-slate-150 dark:border-slate-850/80 text-sm">
                  <div className="font-semibold text-slate-605 dark:text-slate-400">Total Rows Processed:</div>
                  <div className="text-slate-900 dark:text-slate-100 font-bold">{summaryData.totalRows}</div>

                  <div className="font-semibold text-slate-605 dark:text-slate-400">New Subjects Created:</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">{summaryData.newSubjects}</div>

                  <div className="font-semibold text-slate-605 dark:text-slate-400">New Topics Created:</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">{summaryData.newTopics}</div>

                  <div className="font-semibold text-slate-605 dark:text-slate-400">New Sub-Topics Created:</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">{summaryData.newSubTopics}</div>

                  <div className="font-semibold text-slate-605 dark:text-slate-400">New Questions Created:</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">{summaryData.newQuestions}</div>

                  <div className="font-semibold text-slate-605 dark:text-slate-400">Existing Questions Reused:</div>
                  <div className="text-indigo-600 dark:text-indigo-400 font-bold">{summaryData.reusedQuestions}</div>

                  <div className="font-semibold text-slate-605 dark:text-slate-400">Failed Rows:</div>
                  <div className="text-rose-600 dark:text-rose-450 font-bold">{summaryData.failedRows}</div>
                </div>

                {summaryData.failedRows > 0 && (
                  <div className="mt-4">
                    <span className="text-xs font-bold text-rose-600 block">Failed Row Details:</span>
                    <div className="mt-1.5 max-h-32 overflow-y-auto text-xs text-rose-600 bg-rose-50/50 dark:bg-rose-955/20 p-2.5 rounded border border-rose-100 dark:border-rose-900/50 space-y-1 scrollbar-thin">
                      {summaryData.errors?.map((err: any, idx: number) => (
                        <div key={idx}>• Row {err.row}: {err.error}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Modal>
          </div>
        ) : (
          <form className="space-y-8" onSubmit={handleSubmit(submit(true))}>
            {/* Category tabs */}
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="inline-flex bg-slate-100/80 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-205 dark:border-slate-900 shadow-inner">
                  {testTypeTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      className={`h-11 min-w-[120px] rounded-xl px-5 text-sm font-bold transition-all duration-205 ${
                        selectedType === tab.value
                          ? "bg-white dark:bg-slate-900 text-primary-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-800"
                          : "text-slate-500 hover:text-slate-755 dark:text-slate-400 dark:hover:text-slate-300 border border-transparent"
                      }`}
                      onClick={() => field.onChange(tab.value)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            />

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Card 1: General Details */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 shadow-sm space-y-6 lg:col-span-2">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-100 tracking-tight">General Setup</h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Controller
                    name="subject"
                    control={control}
                    render={({ field }) => (
                      <label className="block md:col-span-2">
                        <span className="mb-2.5 block text-sm font-bold text-slate-700 dark:text-slate-300">Target Subject(s)</span>
                        <div className="flex flex-wrap gap-3.5 border border-slate-200 dark:border-slate-805 rounded-xl p-4 bg-white/90 dark:bg-slate-950/90 min-h-12 shadow-inner">
                          {subjects.map((sub) => {
                            const isChecked = field.value?.includes(sub.id);
                            return (
                              <label key={sub.id} className={`flex items-center gap-2.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                isChecked
                                  ? "bg-indigo-50/50 dark:bg-indigo-955/30 border-indigo-500/50 text-indigo-600 dark:text-indigo-400"
                                  : "bg-slate-50/50 dark:bg-slate-900/30 border-slate-205 dark:border-slate-800 text-slate-600 hover:border-slate-305 dark:hover:border-slate-700"
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  className="h-4.5 w-4.5 rounded text-indigo-650 focus:ring-indigo-500/20 accent-indigo-600 cursor-pointer border-slate-300 dark:border-slate-700"
                                  onChange={() => {
                                    const nextValue = isChecked
                                      ? field.value.filter((id: string) => id !== sub.id)
                                      : [...(field.value || []), sub.id];
                                    field.onChange(nextValue);
                                    setValue("topics", []);
                                    setValue("sub_topics", []);
                                  }}
                                />
                                {sub.name}
                              </label>
                            );
                          })}
                        </div>
                        {errors.subject?.message ? (
                          <span className="mt-1 block text-xs font-semibold text-rose-500">{errors.subject.message}</span>
                        ) : null}
                      </label>
                    )}
                  />

                  <div className="md:col-span-2">
                    <Input label="Name of Test" placeholder="Enter custom name for test slot" error={errors.name?.message} {...register("name")} className="rounded-xl border-slate-200 dark:border-slate-800" />
                  </div>

                  <Controller
                    name="class"
                    control={control}
                    render={({ field }) => (
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Grade / Class</span>
                        <select
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 px-4 text-sm text-slate-750 dark:text-slate-350 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 cursor-pointer"
                        >
                          <option value="Class 9">Class 9</option>
                          <option value="Class 10">Class 10</option>
                          <option value="Class 11">Class 11</option>
                          <option value="Class 12">Class 12</option>
                        </select>
                        {errors.class?.message ? (
                          <span className="mt-1 block text-xs font-semibold text-rose-550">{errors.class.message}</span>
                        ) : null}
                      </label>
                    )}
                  />

                  <Controller
                    name="topics"
                    control={control}
                    render={({ field }) => (
                      <label className="block md:col-span-2">
                        <span className="mb-2.5 block text-sm font-bold text-slate-700 dark:text-slate-300">Topic Node(s)</span>
                        <div className="flex flex-wrap gap-3.5 border border-slate-200 dark:border-slate-805 rounded-xl p-4 bg-white/90 dark:bg-slate-950/90 min-h-12 shadow-inner">
                          {filteredTopics.length === 0 ? (
                            <span className="text-xs text-slate-400 dark:text-slate-550 py-1.5 font-medium">No topics available for selected Grade & Subjects combination</span>
                          ) : (
                            filteredTopics.map((topic) => {
                              const isChecked = field.value?.includes(topic.id);
                              return (
                                <label key={topic.id} className={`flex items-center gap-2.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isChecked
                                    ? "bg-indigo-50/50 dark:bg-indigo-955/30 border-indigo-500/50 text-indigo-605 dark:text-indigo-400"
                                    : "bg-slate-50/50 dark:bg-slate-900/30 border-slate-205 dark:border-slate-800 text-slate-600 hover:border-slate-300 dark:hover:border-slate-700"
                                }`}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    className="h-4.5 w-4.5 rounded text-indigo-650 focus:ring-indigo-500/20 accent-indigo-600 cursor-pointer border-slate-300 dark:border-slate-700"
                                    onChange={() => {
                                      const nextValue = isChecked
                                        ? field.value.filter((id: string) => id !== topic.id)
                                        : [...(field.value || []), topic.id];
                                      field.onChange(nextValue);
                                    }}
                                  />
                                  {topic.name}
                                </label>
                              );
                            })
                          )}
                        </div>
                        {errors.topics?.message ? (
                          <span className="mt-1 block text-xs font-semibold text-rose-500">{errors.topics.message}</span>
                        ) : null}
                      </label>
                    )}
                  />
                </div>
              </div>

              {/* Card 2: Scheduling Timing Details */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-505" />
                  <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-100 tracking-tight">Schedule & Window</h3>
                </div>

                <div className="space-y-6">
                  <div>
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Scheduling Type</span>
                    <select
                      value={schedulingType}
                      onChange={(e) => {
                        const val = e.target.value as "live_now" | "live_until";
                        setSchedulingType(val);
                        setValue("start_time", "");
                        setValue("end_time", "");
                        setValue("total_time", "" as any);
                      }}
                      className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 px-4 text-sm text-slate-750 dark:text-slate-350 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 cursor-pointer"
                    >
                      <option value="live_now">Live Today</option>
                      <option value="live_until">Live Until</option>
                    </select>
                  </div>
                  {schedulingType === "live_now" ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                        <Input
                          label="Duration (Min)"
                          placeholder="Ex: 60"
                          type="number"
                          error={errors.total_time?.message}
                          {...register("total_time")}
                          className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-indigo-550 focus:ring-indigo-550/10"
                        />
                        <Input
                          label="Start (Today)"
                          type="time"
                          value={startTimeTimePart}
                          error={errors.start_time?.message}
                          onChange={(e) => {
                            const timeVal = e.target.value;
                            if (timeVal) {
                              const now = new Date();
                              const pad = (n: number) => String(n).padStart(2, "0");
                              const todayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                              setValue("start_time", `${todayDate}T${timeVal}`, { shouldValidate: true });
                            } else {
                              setValue("start_time", "");
                            }
                          }}
                          className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-indigo-550 focus:ring-indigo-550/10"
                        />
                        <Input
                          label="End (Today)"
                          type="time"
                          value={endTimeTimePart}
                          error={errors.end_time?.message}
                          readOnly
                          className="bg-slate-50 dark:bg-slate-950 cursor-not-allowed text-slate-400 rounded-xl border-slate-200 dark:border-slate-800"
                        />
                      </div>
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                        <Input
                          label="Late Entry (Minutes)"
                          placeholder="Ex: 10 (0 for none)"
                          type="number"
                          error={errors.lateEntryTime?.message}
                          {...register("lateEntryTime", { valueAsNumber: true })}
                          className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-indigo-550 focus:ring-indigo-550/10"
                        />
                        <Input
                          label="Grace Time (Minutes)"
                          placeholder="Ex: 5 (0 for none)"
                          type="number"
                          error={errors.graceTime?.message}
                          {...register("graceTime", { valueAsNumber: true })}
                          className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-indigo-550 focus:ring-indigo-550/10"
                        />
                        <Input
                          label="Tab Switching Allowed"
                          placeholder="Ex: 5 (0 for unlimited)"
                          type="number"
                          error={errors.tabSwitchLimit?.message}
                          {...register("tabSwitchLimit", { valueAsNumber: true })}
                          className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-indigo-550 focus:ring-indigo-550/10"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          label="Start Time Slot"
                          type="datetime-local"
                          min={getMinStartTime()}
                          error={errors.start_time?.message}
                          {...register("start_time")}
                          className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-indigo-550 focus:ring-indigo-550/10"
                        />
                        <Input
                          label="End Time Slot"
                          type="datetime-local"
                          min={startTime || getMinStartTime()}
                          error={errors.end_time?.message}
                          {...register("end_time")}
                          className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-indigo-550 focus:ring-indigo-550/10"
                        />
                      </div>
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        <Input
                          label="Duration (Minutes)"
                          placeholder="Duration in minutes"
                          type="number"
                          error={errors.total_time?.message}
                          {...register("total_time")}
                          className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-indigo-550 focus:ring-indigo-550/10"
                        />
                        <Input
                          label="Late Entry (Minutes)"
                          placeholder="Ex: 10 (0 for none)"
                          type="number"
                          error={errors.lateEntryTime?.message}
                          {...register("lateEntryTime", { valueAsNumber: true })}
                          className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-indigo-550 focus:ring-indigo-550/10"
                        />
                        <Input
                          label="Grace Time (Minutes)"
                          placeholder="Ex: 5 (0 for none)"
                          type="number"
                          error={errors.graceTime?.message}
                          {...register("graceTime", { valueAsNumber: true })}
                          className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-indigo-550 focus:ring-indigo-550/10"
                        />
                        <Input
                          label="Tab Switching Allowed"
                          placeholder="Ex: 5 (0 for unlimited)"
                          type="number"
                          error={errors.tabSwitchLimit?.message}
                          {...register("tabSwitchLimit", { valueAsNumber: true })}
                          className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-indigo-550 focus:ring-indigo-550/10"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Sectional Timers Setup */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-indigo-500 animate-spin-slow" />
                    <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-100 tracking-tight">Sectional Timers</h3>
                  </div>
                  
                  {/* Stylish Switch */}
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableSections}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEnableSections(checked);
                        if (!checked) {
                          setValue("sections", []);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-850 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-650 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {enableSections ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Defined Subject Sections</span>
                      <Button
                        type="button"
                        onClick={() => append({ name: "", subject: subjectNames[0] || "", duration: 0, questions_count: 0 })}
                        className="h-8 rounded-lg px-3 text-xs bg-indigo-50 dark:bg-indigo-955/40 border border-indigo-200/30 text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5 hover:bg-indigo-100/50"
                      >
                        Add Section
                      </Button>
                    </div>

                    {fields.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400 dark:text-slate-500 font-medium">
                        No sections added yet. Click "Add Section" to get started.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                        {fields.map((fieldItem, idx) => (
                          <div key={fieldItem.id} className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40 space-y-3 relative group">
                            <button
                              type="button"
                              onClick={() => remove(idx)}
                              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-rose-500 transition-colors p-1"
                              title="Remove section"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>

                            <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                              <div>
                                <span className="mb-1 block text-xs font-bold text-slate-655 dark:text-slate-400">Section Name</span>
                                <input
                                  type="text"
                                  placeholder="e.g. Section A: Physics"
                                  {...register(`sections.${idx}.name` as const)}
                                  className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-550"
                                />
                                {errors.sections?.[idx]?.name && (
                                  <span className="mt-1 block text-[10px] font-semibold text-rose-500">{errors.sections[idx]?.name?.message}</span>
                                )}
                              </div>

                              <div>
                                <span className="mb-1 block text-xs font-bold text-slate-655 dark:text-slate-400">Subject Category</span>
                                <select
                                  {...register(`sections.${idx}.subject` as const)}
                                  className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-550 cursor-pointer"
                                >
                                  {subjectNames.map((name) => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </select>
                                {errors.sections?.[idx]?.subject && (
                                  <span className="mt-1 block text-[10px] font-semibold text-rose-500">{errors.sections[idx]?.subject?.message}</span>
                                )}
                              </div>

                              <div>
                                <span className="mb-1 block text-xs font-bold text-slate-655 dark:text-slate-400">Duration (Minutes)</span>
                                <input
                                  type="number"
                                  placeholder="Minutes"
                                  {...register(`sections.${idx}.duration` as const)}
                                  className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-550"
                                />
                                {errors.sections?.[idx]?.duration && (
                                  <span className="mt-1 block text-[10px] font-semibold text-rose-500">{errors.sections[idx]?.duration?.message}</span>
                                )}
                              </div>

                              <div>
                                <span className="mb-1 block text-xs font-bold text-slate-655 dark:text-slate-400">Question Count</span>
                                <input
                                  type="number"
                                  placeholder="Questions"
                                  {...register(`sections.${idx}.questions_count` as const)}
                                  className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-550"
                                />
                                {errors.sections?.[idx]?.questions_count && (
                                  <span className="mt-1 block text-[10px] font-semibold text-rose-500">{errors.sections[idx]?.questions_count?.message}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-450">
                    Enable sectional timers to segment the exam into discrete subjects, each containing its own countdown timer and lock progression.
                  </p>
                )}
              </div>

            </div>

            {/* Card 4: Scoring Setup */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 shadow-sm">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 flex items-center gap-2">
                <Percent className="h-5 w-5 text-indigo-505" />
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Scoring Policy</h3>
              </div>
              
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950 border-l-4 border-l-rose-500 transition-all hover:shadow-sm">
                  <Input label="Wrong Answer" type="number" error={errors.wrong_marks?.message} {...register("wrong_marks")} className="h-10 rounded-lg border border-slate-200 dark:border-slate-800/80 focus:border-rose-500 focus:ring-rose-500/10" />
                </div>
                
                <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950 border-l-4 border-l-slate-400 transition-all hover:shadow-sm">
                  <Input label="Unattempted" type="number" error={errors.unattempt_marks?.message} {...register("unattempt_marks")} className="h-10 rounded-lg border border-slate-200 dark:border-slate-800/80 focus:border-slate-500 focus:ring-slate-500/10" />
                </div>

                <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950 border-l-4 border-l-emerald-500 transition-all hover:shadow-sm">
                  <Input label="Correct Answer" type="number" error={errors.correct_marks?.message} {...register("correct_marks")} className="h-10 rounded-lg border border-slate-200 dark:border-slate-800/80 focus:border-emerald-500 focus:ring-emerald-500/10" />
                </div>

                <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-955 border-l-4 border-l-indigo-500 transition-all hover:shadow-sm">
                  <Input label="No of Questions" type="number" placeholder="Ex: 50" error={errors.total_questions?.message} {...register("total_questions")} className="h-10 rounded-lg border-slate-200 dark:border-slate-800/80 focus:border-indigo-500 focus:ring-indigo-500/10" />
                </div>

                <div className="p-4 rounded-xl border border-slate-155 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-950 border-l-4 border-l-purple-500 transition-all select-none">
                  <Input label="Total Marks" type="number" placeholder="Ex: 200" error={errors.total_marks?.message} {...register("total_marks")} readOnly className="h-10 rounded-lg border-slate-200 dark:border-slate-900 bg-slate-100 dark:bg-slate-900 text-purple-600 dark:text-purple-400 font-bold cursor-not-allowed" />
                </div>
              </div>
            </div>

            {formError ? <Badge tone="red">{formError}</Badge> : null}

            <div className="flex justify-end gap-3.5 pt-6 border-t border-slate-100 dark:border-slate-800/80">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/dashboard")}
                className="rounded-xl shadow-sm border border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 transition-all text-xs font-bold px-5 py-2.5"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={saveMutation.isPending}
                onClick={handleSubmit(submit(false))}
                className="rounded-xl shadow-sm border border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 transition-all text-xs font-bold px-5 py-2.5"
              >
                Save as Draft
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/10 text-white border-none font-bold transition-all hover:scale-[1.02] active:scale-[0.98] text-xs px-5 py-2.5 flex items-center gap-2"
              >
                {saveMutation.isPending ? <Spinner /> : "Next Phase"}
              </Button>
            </div>
          </form>
        )}
      </PageWrapper>
    </AppShell>
  );
};
