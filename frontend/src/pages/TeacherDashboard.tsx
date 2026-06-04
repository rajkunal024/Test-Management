import { useEffect, useMemo, useState } from "react";
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

  // Apply search/difficulty/topic filters on questions list
  const filteredQuestions = useMemo(() => {
    return subjectQuestions.filter(q => {
      const matchesSearch = q.question.toLowerCase().includes(search.toLowerCase());
      const qDiff = (q.difficulty || "").toLowerCase().trim();
      const filterDiff = difficultyFilter.toLowerCase().trim();
      const matchesDiff = difficultyFilter === "all" || qDiff === filterDiff;
      const matchesTopic = topicFilter === "all" || q.topic_id === topicFilter;
      return matchesSearch && matchesDiff && matchesTopic;
    });
  }, [subjectQuestions, search, difficultyFilter, topicFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = subjectQuestions.length;
    const easy = subjectQuestions.filter(q => (q.difficulty || "").toLowerCase().trim() === "easy").length;
    const medium = subjectQuestions.filter(q => (q.difficulty || "").toLowerCase().trim() === "medium").length;
    const hard = subjectQuestions.filter(q => {
      const diff = (q.difficulty || "").toLowerCase().trim();
      return diff === "hard" || diff === "difficult";
    }).length;
    return { total, easy, medium, hard };
  }, [subjectQuestions]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createQuestion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      setToast("Question created successfully");
      setModalOpen(false);
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
        {/* Welcome Header */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-emerald-600 p-6 text-white shadow-lg md:p-8">
          <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-100">
                <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                PrepRoute Teacher Portal
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {teacherSubject.name} Question Bank
              </h1>
              <p className="mt-2 text-sm text-teal-500 bg-white/90 rounded-md px-3 py-1.5 inline-block font-semibold">
                Logged in as: {user?.name || "Teacher"} ({teacherSubject.name} Expert)
              </p>
            </div>
            <div className="flex gap-2.5">
              <Button
                onClick={() => setCsvModalOpen(true)}
                className="h-11 bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-2 border border-emerald-500/25 shadow-sm"
                icon={<Upload className="h-4 w-4 text-white" />}
              >
                Import via CSV
              </Button>
              <Button
                onClick={handleOpenAddModal}
                className="h-11 bg-white text-emerald-700 hover:bg-teal-50 flex items-center gap-2 border-transparent"
                icon={<Plus className="h-4 w-4 text-emerald-700" />}
              >
                Add New Question
              </Button>
            </div>
          </div>
          <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/5" />
        </div>

        {/* Stats Grid */}
        <section className="mb-8 grid gap-4 grid-cols-2 sm:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Pool</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.total} Qs</h3>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Easy Level</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.easy} Qs</h3>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Medium Level</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{stats.medium} Qs</h3>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">Difficult Level</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{stats.hard} Qs</h3>
          </article>
        </section>

        {/* Search & Filters */}
        <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_200px_200px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10 h-11"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="relative">
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Topics</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Difficult</option>
            </select>
          </div>
        </div>

        {/* Questions Table */}
        <h2 className="mb-4 text-base font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-500" />
          Manage Subject Questions
        </h2>

        {isLoadingQuestions ? (
          <div className="flex h-64 items-center justify-center text-slate-500 bg-white rounded-xl border border-slate-200">
            <Spinner /> <span className="ml-2">Loading question pool...</span>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700">No questions found</p>
            <p className="mt-1 text-sm text-slate-400">Add questions or adjust your search filters.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">#</th>
                  <th className="px-6 py-4">Question Prompt</th>
                  <th className="px-6 py-4 w-44">Topic</th>
                  <th className="px-6 py-4 w-32">Difficulty</th>
                  <th className="px-6 py-4 w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuestions.map((q, index) => {
                  const topicName = topics.find(t => t.id === q.topic_id)?.name ?? "General";
                  const diffLower = (q.difficulty || "").toLowerCase().trim();
                  const difficultyColor =
                    diffLower === "easy" ? "green" :
                    diffLower === "medium" ? "yellow" : 
                    (diffLower === "hard" || diffLower === "difficult" ? "red" : "slate");

                  return (
                    <tr key={q.id ?? index} className="hover:bg-slate-50/40">
                      <td className="px-6 py-4 text-center font-bold text-slate-400">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 line-clamp-2">{q.question}</div>
                        <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Ans: {q.correct_option.replace("option", "Option ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        <Badge tone="blue">{topicName}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge tone={difficultyColor}>{q.difficulty ?? "easy"}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
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
                            className="h-8 px-2.5 text-xs text-rose-600 hover:bg-rose-50"
                            onClick={() => {
                              if (confirm("Delete this question from pool?")) {
                                deleteMutation.mutate(q.id ?? "");
                              }
                            }}
                            icon={<Trash2 className="h-3.5 w-3.5" />}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Modal */}
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
            <div className="grid gap-4 sm:grid-cols-3">
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

        {/* CSV Import Modal */}
        <Modal
          open={csvModalOpen}
          title="Import Questions via CSV"
          onClose={() => setCsvModalOpen(false)}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setCsvModalOpen(false)}
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
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 leading-normal">
              Upload a `.csv` file or paste CSV text directly. The imported questions will be added to the global pool for your subject (<strong>{teacherSubject.name}</strong>).
            </p>

            {/* CSV File Input */}
            <label className="block border border-dashed border-slate-300 rounded-lg p-5 hover:border-slate-400 text-center cursor-pointer transition bg-slate-50/50">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <FileSpreadsheet className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <span className="text-xs font-semibold text-emerald-600 block">Click to upload .csv file</span>
              <span className="text-[10px] text-slate-400 block mt-1">UTF-8 comma-separated format</span>
            </label>

            {/* Textarea for Paste CSV */}
            <div>
              <span className="mb-1 block text-xs font-bold text-slate-600">Or Paste CSV Text:</span>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="question,option1,option2,option3,option4,correct_option,difficulty,topic,sub_topic&#10;What is 1+1?,2,3,4,5,option1,easy,Algebra,Addition"
                className="h-28 w-full resize-none rounded border border-slate-300 p-2.5 text-xs font-mono outline-none focus:border-emerald-500"
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
                question,option1,option2,option3,option4,correct_option,difficulty,topic,sub_topic
              </p>
              <span>* Correct option should match A, B, C, D or option1, option2, option3, option4.</span>
              <br />
              <span>* If the topic name doesn't match any subject topics, the first topic will be auto-assigned.</span>
            </div>
          </div>
        </Modal>

        {toast ? <Toast>{toast}</Toast> : null}
      </PageWrapper>
    </AppShell>
  );
};
