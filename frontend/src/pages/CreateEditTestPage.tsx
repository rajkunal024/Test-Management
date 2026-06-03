import { useEffect, useMemo, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Spinner } from "../components/ui/Spinner";
import { createTest, getErrorMessage, updateTest } from "../services/api";
import { useSubjects, useSubTopics, useTest, useTopics } from "../hooks/useTests";
import { TestPayload } from "../types";
import { testSchema, TestFormInput, TestFormValues } from "../utils/validators";

const testTypeTabs = [
  { label: "Chapter Wise", value: "practice" },
  { label: "PYQ", value: "previous_year" },
  { label: "Mock Test", value: "mock" },
] as const;

export const CreateEditTestPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState("");
  const { data: subjects = [] } = useSubjects();
  const { data: existingTest, isLoading: isLoadingTest } = useTest(id);

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
      subject: "",
      type: "practice",
      topics: [],
      sub_topics: [],
      difficulty: "easy",
      correct_marks: 5,
      wrong_marks: -1,
      unattempt_marks: 0,
      total_time: 60,
      total_marks: 250,
      total_questions: 50,
    },
  });

  const subjectId = watch("subject");
  const selectedTopics = watch("topics");
  const selectedType = watch("type");
  const selectedDifficulty = watch("difficulty");
  const { data: topics = [] } = useTopics(subjectId);
  const { data: subTopics = [] } = useSubTopics(selectedTopics);

  useEffect(() => {
    if (existingTest) {
      reset({
        name: existingTest.name,
        subject: existingTest.subject_id ?? existingTest.subject,
        type: existingTest.type === "mock" || existingTest.type === "previous_year" ? existingTest.type : "practice",
        topics: existingTest.topics ?? [],
        sub_topics: existingTest.sub_topics ?? [],
        difficulty: existingTest.difficulty === "medium" || existingTest.difficulty === "hard" ? existingTest.difficulty : "easy",
        correct_marks: existingTest.correct_marks,
        wrong_marks: existingTest.wrong_marks,
        unattempt_marks: existingTest.unattempt_marks,
        total_time: existingTest.total_time,
        total_marks: existingTest.total_marks,
        total_questions: existingTest.total_questions,
      });
    }
  }, [existingTest, reset]);

  const subjectName = useMemo(
    () => subjects.find((subject) => subject.id === subjectId)?.name ?? subjectId,
    [subjects, subjectId],
  );

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
    subject: subjectName,
    subject_id: values.subject,
    status: null,
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
                      className={`h-10 min-w-[112px] rounded-md px-4 text-sm font-semibold ${
                        selectedType === tab.value ? "bg-primary-50 text-primary-700" : "text-slate-400"
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
              <Select
                label="Subject"
                error={errors.subject?.message}
                options={[{ label: "Choose from Drop-down", value: "" }, ...subjects.map((subject) => ({ label: subject.name, value: subject.id }))]}
                {...register("subject", { onChange: () => setValue("topics", []) })}
              />
              <Input label="Name of Test" placeholder="Enter name of Test" error={errors.name?.message} {...register("name")} />

              <Controller
                name="topics"
                control={control}
                render={({ field }) => (
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Topic</span>
                    <select
                      multiple
                      value={field.value}
                      onChange={(event) => field.onChange(Array.from(event.target.selectedOptions, (option) => option.value))}
                      className="min-h-12 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary-500"
                    >
                      {topics.length === 0 ? <option value="">Choose from Drop-down</option> : null}
                      {topics.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.name}
                        </option>
                      ))}
                    </select>
                    {errors.topics?.message ? <span className="mt-1 block text-xs font-medium text-rose-500">{errors.topics.message}</span> : null}
                  </label>
                )}
              />

              <Controller
                name="sub_topics"
                control={control}
                render={({ field }) => (
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Sub Topic</span>
                    <select
                      multiple
                      value={field.value}
                      onChange={(event) => field.onChange(Array.from(event.target.selectedOptions, (option) => option.value))}
                      className="min-h-12 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary-500"
                    >
                      {subTopics.length === 0 ? <option value="">Choose from Drop-down</option> : null}
                      {subTopics.map((subTopic) => (
                        <option key={subTopic.id} value={subTopic.id}>
                          {subTopic.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              />

              <Input label="Duration (Minutes)" placeholder="Enter the time" type="number" error={errors.total_time?.message} {...register("total_time")} />

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
                <Input label="No of Questions" type="number" placeholder="Ex:250 Marks" error={errors.total_questions?.message} {...register("total_questions")} />
                <Input label="Total Marks" type="number" placeholder="Ex:250 Marks" error={errors.total_marks?.message} {...register("total_marks")} />
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
