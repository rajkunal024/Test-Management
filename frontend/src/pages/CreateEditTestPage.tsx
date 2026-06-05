import { useEffect, useMemo, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
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
import { createTest, getErrorMessage, updateTest, getTopicsBySubject, getAllQuestions } from "../services/api";
import { useSubjects, useSubTopics, useTest } from "../hooks/useTests";
import { TestPayload } from "../types";
import { testSchema, TestFormInput, TestFormValues } from "../utils/validators";
import { useAuthStore } from "../store/authStore";

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
  const { data: subjects = [] } = useSubjects();
  const { data: existingTest, isLoading: isLoadingTest } = useTest(id);

  useEffect(() => {
    if (existingTest && isEdit) {
      const now = new Date().getTime();
      const start = existingTest.start_time ? new Date(existingTest.start_time).getTime() : 0;
      if (existingTest.status === "live" && start && now >= start) {
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
    },
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
      });

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
    status: existingTest?.status ?? null,
  });

  const submit =
    (goNext: boolean): SubmitHandler<TestFormValues> =>
      async (values) => {
        setFormError("");
        try {
          const result = await saveMutation.mutateAsync(buildPayload(values));
          navigate(goNext ? `/tests/${result.id}/questions` : "/dashboard");
        } catch (error) {
          setFormError(getErrorMessage(error));
        }
      };

  const showEditSkeleton = isEdit && isLoadingTest;

  return (
    <AppShell>
      <PageWrapper>
        <div className="mb-11 flex items-center gap-3 text-sm font-medium text-slate-500">
          <Link to="/dashboard">Test Creation</Link>
          <span>/</span>
          <span>{isEdit ? "Edit Test" : "Create Test"}</span>
          <span>/</span>
          <span>Chapter Wise</span>
        </div>

        {showEditSkeleton ? (
          <div className="flex h-80 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2">Loading test...</span>
          </div>
        ) : (
          <form className="space-y-8" onSubmit={handleSubmit(submit(true))}>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
                  {testTypeTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      className={`h-10 min-w-[112px] rounded-md px-4 text-sm font-semibold ${selectedType === tab.value ? "bg-primary-50 text-primary-700" : "text-slate-400"
                        }`}
                      onClick={() => field.onChange(tab.value)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            />

            <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
              <Controller
                name="subject"
                control={control}
                render={({ field }) => (
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Subject(s)</span>
                    <div className="flex flex-wrap gap-4 border border-slate-300 rounded-md p-3.5 bg-white min-h-12">
                      {subjects.map((sub) => {
                        const isChecked = field.value?.includes(sub.id);
                        return (
                          <label key={sub.id} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              className="h-4 w-4 accent-[#6c7df7]"
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
                      <span className="mt-1 block text-xs font-medium text-rose-500">{errors.subject.message}</span>
                    ) : null}
                  </label>
                )}
              />
              <Controller
                name="class"
                control={control}
                render={({ field }) => (
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Class</span>
                    <select
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#6c7df7]"
                    >
                      <option value="Class 9">Class 9</option>
                      <option value="Class 10">Class 10</option>
                      <option value="Class 11">Class 11</option>
                      <option value="Class 12">Class 12</option>
                    </select>
                    {errors.class?.message ? (
                      <span className="mt-1 block text-xs font-medium text-rose-500">{errors.class.message}</span>
                    ) : null}
                  </label>
                )}
              />
              <Input label="Name of Test" placeholder="Enter name of Test" error={errors.name?.message} {...register("name")} />

              <Controller
                name="topics"
                control={control}
                render={({ field }) => (
                  <label className="block col-span-1 md:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Topic(s)</span>
                    <div className="flex flex-wrap gap-4 border border-slate-300 rounded-md p-3.5 bg-white min-h-12">
                      {filteredTopics.length === 0 ? (
                        <span className="text-sm text-slate-400">No topics available for selected Class / Subject(s)</span>
                      ) : (
                        filteredTopics.map((topic) => {
                          const isChecked = field.value?.includes(topic.id);
                          return (
                            <label key={topic.id} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                className="h-4 w-4 accent-[#6c7df7]"
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
                      <span className="mt-1 block text-xs font-medium text-rose-500">{errors.topics.message}</span>
                    ) : null}
                  </label>
                )}
              />

              {/* Sub Topic selector removed since subtopics are auto-selected on topic selection */}

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Scheduling Type</span>
                <select
                  value={schedulingType}
                  onChange={(e) => {
                    const val = e.target.value as "live_now" | "live_until";
                    setSchedulingType(val);
                    setValue("start_time", "");
                    setValue("end_time", "");
                    setValue("total_time", "" as any);
                  }}
                  className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#6c7df7]"
                >
                  <option value="live_now">Live Today</option>
                  <option value="live_until">Live Until</option>
                </select>
              </div>

              {schedulingType === "live_now" ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <Input
                    label="Duration (Minutes)"
                    placeholder="Enter the duration"
                    type="number"
                    error={errors.total_time?.message}
                    {...register("total_time")}
                  />
                  <Input
                    label="Start Time (Today)"
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
                  />
                  <Input
                    label="End Time (Today)"
                    type="time"
                    value={endTimeTimePart}
                    error={errors.end_time?.message}
                    readOnly
                    className="bg-slate-50 cursor-not-allowed"
                  />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Start Time Slot"
                      type="datetime-local"
                      min={getMinStartTime()}
                      error={errors.start_time?.message}
                      {...register("start_time")}
                    />
                    <Input
                      label="End Time Slot"
                      type="datetime-local"
                      min={startTime || getMinStartTime()}
                      error={errors.end_time?.message}
                      {...register("end_time")}
                    />
                  </div>
                  <Input
                    label="Duration (Minutes)"
                    placeholder="Enter the time"
                    type="number"
                    error={errors.total_time?.message}
                    {...register("total_time")}
                  />
                </>
              )}

              <Controller
                name="difficulty"
                control={control}
                render={({ field }) => (
                  <div>
                    <span className="mb-8 block text-sm font-semibold text-slate-700">Test Difficulty Level</span>
                    <div className="grid grid-cols-3 gap-4">
                      {(["easy", "medium", "hard"] as const).map((difficulty) => (
                        <label key={difficulty} className="flex items-center gap-3 text-sm font-semibold capitalize text-slate-700">
                          <input
                            type="radio"
                            checked={selectedDifficulty === difficulty}
                            onChange={() => field.onChange(difficulty)}
                            className="h-5 w-5 accent-[#6c7df7]"
                          />
                          {difficulty === "hard" ? "Difficult" : difficulty}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              />
            </div>

            <div>
              <h2 className="mb-7 text-sm font-bold text-slate-700">Marking Scheme:</h2>
              <div className="grid gap-6 md:grid-cols-3 xl:grid-cols-5">
                <Input label="Wrong Answer" type="number" error={errors.wrong_marks?.message} {...register("wrong_marks")} />
                <Input label="Unattempted" type="number" error={errors.unattempt_marks?.message} {...register("unattempt_marks")} />
                <Input label="Correct Answer" type="number" error={errors.correct_marks?.message} {...register("correct_marks")} />
                <Input label="No of Questions" type="number" placeholder="Ex: 50" error={errors.total_questions?.message} {...register("total_questions")} />
                <Input label="Total Marks" type="number" placeholder="Ex:250 Marks" error={errors.total_marks?.message} {...register("total_marks")} readOnly className="bg-slate-50 cursor-not-allowed" />
              </div>
            </div>

            {formError ? <Badge tone="red">{formError}</Badge> : null}

            <div className="flex justify-end gap-5 pt-3">
              <Button type="button" variant="secondary" onClick={() => navigate("/dashboard")}>
                Cancel
              </Button>
              <Button type="button" variant="secondary" disabled={saveMutation.isPending} onClick={handleSubmit(submit(false))}>
                Save as Draft
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Next
              </Button>
            </div>
          </form>
        )}
      </PageWrapper>
    </AppShell>
  );
};
