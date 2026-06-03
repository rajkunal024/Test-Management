import { useEffect, useMemo, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Plus, Trash2, Upload, Wand2 } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Spinner } from "../components/ui/Spinner";
import { Toast } from "../components/ui/Toast";
import { bulkCreateQuestions, fetchBulkQuestions, getErrorMessage, updateTest } from "../services/api";
import { useSubTopics, useTest, useTopics } from "../hooks/useTests";
import { CorrectOption, Question, TestPayload } from "../types";
import { questionSchema, QuestionFormValues } from "../utils/validators";

const emptyQuestion = {
  question: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  correct_option: "option1" as CorrectOption,
  explanation: "",
  difficulty: "",
  topic_id: "",
  sub_topic_id: "",
  media_url: "",
};

const stringFromApiValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate = record.name ?? record.title ?? record.id ?? record._id;
    return typeof candidate === "string" ? candidate : "";
  }
  return "";
};

const stringArrayFromApiValue = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map(stringFromApiValue).filter(Boolean);
};

export const AddQuestionsPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: test, isLoading } = useTest(id);
  const { data: topics = [] } = useTopics(test?.subject_id ?? "");
  const selectedTopicIds = useMemo(() => (test?.topics ?? []).filter(Boolean), [test?.topics]);
  const { data: subTopics = [] } = useSubTopics(selectedTopicIds);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [formError, setFormError] = useState("");

  const { data: fetchedQuestions } = useQuery({
    queryKey: ["questions", id, test?.questions],
    queryFn: () => fetchBulkQuestions(test?.questions ?? []),
    enabled: Boolean(test?.questions?.length),
  });

  useEffect(() => {
    if (fetchedQuestions) {
      setQuestions(fetchedQuestions);
    }
  }, [fetchedQuestions]);

  const topicNames = useMemo(() => {
    return (test?.topics ?? []).map(topicId => {
      return topics.find(t => t.id === topicId)?.name ?? topicId;
    });
  }, [test?.topics, topics]);

  const subTopicNames = useMemo(() => {
    return (test?.sub_topics ?? []).map(subTopicId => {
      return subTopics.find(st => st.id === subTopicId)?.name ?? subTopicId;
    });
  }, [test?.sub_topics, subTopics]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: emptyQuestion,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const created = await bulkCreateQuestions(id, questions);
      const questionIds = created.map((question) => question.id).filter((questionId): questionId is string => Boolean(questionId));
      if (!test) {
        throw new Error("Test details are unavailable.");
      }

      const subject = stringFromApiValue(test.subject) || stringFromApiValue(test.subject_id);
      const subjectId = stringFromApiValue(test.subject_id);

      const updatedTestPayload: TestPayload = {
        name: test.name,
        subject,
        subject_id: subjectId || undefined,
        type: test.type === "mock" || test.type === "previous_year" ? test.type : "practice",
        topics: stringArrayFromApiValue(test.topics),
        sub_topics: stringArrayFromApiValue(test.sub_topics),
        difficulty: test.difficulty === "medium" || test.difficulty === "hard" ? test.difficulty : "easy",
        correct_marks: test.correct_marks,
        wrong_marks: test.wrong_marks,
        unattempt_marks: test.unattempt_marks,
        total_time: test.total_time,
        total_questions: questionIds.length || questions.length,
        total_marks: test.total_marks ?? questions.length * test.correct_marks,
        status: test.status,
        questions: questionIds,
      };

      await updateTest(id, updatedTestPayload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tests", id] });
      navigate(`/tests/${id}/preview`);
    },
  });

  const onAddQuestion: SubmitHandler<QuestionFormValues> = (values) => {
    const payload: Question = {
      ...values,
      explanation: values.explanation || undefined,
      difficulty: values.difficulty || undefined,
      topic_id: values.topic_id || undefined,
      sub_topic_id: values.sub_topic_id || undefined,
      media_url: values.media_url || undefined,
      type: "mcq",
      test_id: id,
    };

    setQuestions((current) => {
      if (editingIndex === null) return [...current, payload];
      return current.map((question, index) => (index === editingIndex ? payload : question));
    });
    setEditingIndex(null);
    reset(emptyQuestion);
    setToast(editingIndex === null ? "Question added" : "Question updated");
    window.setTimeout(() => setToast(""), 1800);
  };

  const editQuestion = (index: number) => {
    const question = questions[index];
    reset({
      question: question.question,
      option1: question.option1,
      option2: question.option2,
      option3: question.option3,
      option4: question.option4,
      correct_option: question.correct_option,
      explanation: question.explanation ?? "",
      difficulty: question.difficulty ?? "",
      topic_id: question.topic_id ?? "",
      sub_topic_id: question.sub_topic_id ?? "",
      media_url: question.media_url ?? "",
    });
    setEditingIndex(index);
  };

  const saveAndContinue = async () => {
    setFormError("");
    if (questions.length === 0) {
      setFormError("Add at least one question before continuing.");
      return;
    }
    try {
      await saveMutation.mutateAsync();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  if (isLoading || !test) {
    return (
      <AppShell compactRail>
        <PageWrapper compact>
          <div className="flex h-96 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2">Loading test...</span>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  return (
    <AppShell compactRail>
      <PageWrapper compact>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
            <Link to="/dashboard">Test Creation</Link>
            <span>/</span>
            <Link to={`/tests/${id}/edit`}>Create Test</Link>
            <span>/</span>
            <span>Chapter Wise</span>
          </div>
          <Link to={`/tests/${id}/preview`}>
            <Button>Publish</Button>
          </Link>
        </div>

        <section className="mb-9 rounded-md border border-slate-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Badge tone="blue">Chapter Wise</Badge>
            <h1 className="font-bold text-slate-900">📚 Chapter 1</h1>
            <Badge tone="green">Easy</Badge>
          </div>
          <div className="grid gap-3 text-xs text-slate-500 md:grid-cols-[80px_1fr]">
            <span>Subject</span>
            <span className="text-slate-700">: {test.subject}</span>
            <span>Topic</span>
            <span className="flex flex-wrap gap-2">: 
              {topicNames.length > 0 ? (
                topicNames.map((name) => (
                  <Badge key={name} tone="yellow">{name}</Badge>
                ))
              ) : (
                <span className="text-slate-400">None</span>
              )}
            </span>
            <span>Sub Topic</span>
            <span className="flex flex-wrap gap-2">: 
              {subTopicNames.length > 0 ? (
                subTopicNames.map((name) => (
                  <Badge key={name} tone="yellow">{name}</Badge>
                ))
              ) : (
                <span className="text-slate-400">None</span>
              )}
            </span>
          </div>
          <div className="mt-4 flex justify-end gap-2 text-xs text-slate-500">
            <Badge>⌚ {test.total_time} Min</Badge>
            <Badge>□ {test.total_questions} Q's</Badge>
            <Badge>♙ {test.total_marks} Marks</Badge>
          </div>
        </section>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900">
            Question <span className="text-primary-600">{Math.min(questions.length + 1, test.total_questions)}/{test.total_questions}</span>
          </h2>
          <div className="flex gap-2">
            <Button variant="secondary" className="h-9 px-3" icon={<Plus className="h-4 w-4" />}>
              MCQ
            </Button>
            <Button variant="secondary" className="h-9 px-3" icon={<Upload className="h-4 w-4" />}>
              CSV
            </Button>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit(onAddQuestion)}>
          <button type="button" onClick={() => reset(emptyQuestion)} className="flex items-center gap-1 text-xs font-medium text-rose-500">
            <Trash2 className="h-3.5 w-3.5" /> Delete All Edits
          </button>

          <label className="block">
            <span className="sr-only">Question text</span>
            <div className="rounded-md border border-primary-200 bg-white">
              <div className="flex h-9 items-center gap-3 border-b border-slate-100 px-4 text-xs text-slate-500">
                <span>I</span><span>B</span><span>U</span><span>↳</span><span>🔗</span><span>▰</span><span>≡</span><span>☷</span><span>√x</span>
              </div>
              <textarea
                className="h-32 w-full resize-none rounded-b-md px-4 py-3 text-sm outline-none placeholder:text-slate-300"
                placeholder="Type here"
                {...register("question")}
              />
            </div>
            {errors.question?.message ? <span className="mt-1 block text-xs text-rose-500">{errors.question.message}</span> : null}
          </label>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Type the options below</h3>
            {(["option1", "option2", "option3", "option4"] as const).map((optionName, index) => (
              <div key={optionName} className="mb-3 grid grid-cols-[22px_1fr] items-center gap-3">
                <Controller
                  name="correct_option"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="radio"
                      className="h-4 w-4 accent-[#6c7df7]"
                      checked={field.value === optionName}
                      onChange={() => field.onChange(optionName)}
                    />
                  )}
                />
                <Input placeholder="Type Option here" {...register(optionName)} error={errors[optionName]?.message} />
              </div>
            ))}
          </div>

          <label className="block">
            <span className="mb-3 block text-sm font-semibold text-slate-800">Add Solution</span>
            <textarea
              className="h-28 w-full resize-none rounded-md border border-slate-200 px-4 py-3 text-sm outline-none placeholder:text-slate-300 focus:border-primary-400"
              placeholder="Type here"
              {...register("explanation")}
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <Select
              label="Level of Difficulty"
              options={[
                { label: "Select from Drop-down", value: "" },
                { label: "Easy", value: "easy" },
                { label: "Medium", value: "medium" },
                { label: "Difficult", value: "hard" },
              ]}
              {...register("difficulty")}
            />
            <Select
              label="Topic"
              options={[{ label: "Select from Drop-down", value: "" }, ...topics.map((topic) => ({ label: topic.name, value: topic.id }))]}
              {...register("topic_id")}
            />
            <Select
              label="Sub-topic"
              options={[{ label: "Select from Drop-down", value: "" }, ...subTopics.map((subTopic) => ({ label: subTopic.name, value: subTopic.id }))]}
              {...register("sub_topic_id")}
            />
            <Input label="Media URL" placeholder="https://..." error={errors.media_url?.message} {...register("media_url")} />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-5">
            <Button type="button" variant="danger" onClick={() => navigate("/dashboard")}>
              Exit Test Creation
            </Button>
            <div className="flex gap-3">
              <Button type="submit" variant="secondary" icon={<Wand2 className="h-4 w-4" />}>
                {editingIndex === null ? "Add Question" : "Update Question"}
              </Button>
              <Button type="button" onClick={saveAndContinue} disabled={saveMutation.isPending}>
                Next
              </Button>
            </div>
          </div>
        </form>

        <section className="mt-8 rounded-md border border-slate-200 bg-white p-4">
          <h3 className="mb-4 text-sm font-bold text-slate-800">Added Questions</h3>
          {questions.length === 0 ? (
            <p className="text-sm text-slate-500">No questions added yet.</p>
          ) : (
            <div className="space-y-3">
              {questions.map((question, index) => (
                <div key={`${question.question}-${index}`} className="flex items-start justify-between gap-4 rounded-md border border-slate-100 p-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{index + 1}. {question.question}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Correct: {question.correct_option.replace("option", "Option ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="h-8 px-3" onClick={() => editQuestion(index)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-3 text-rose-600"
                      onClick={() => setQuestions((current) => current.filter((_, questionIndex) => questionIndex !== index))}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {formError ? <p className="mt-4 text-sm font-semibold text-rose-600">{formError}</p> : null}
        {toast ? <Toast>{toast}</Toast> : null}
      </PageWrapper>
    </AppShell>
  );
};
