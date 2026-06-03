import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle2, Clock, Pencil } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { Spinner } from "../components/ui/Spinner";
import { Toast } from "../components/ui/Toast";
import { fetchBulkQuestions, getErrorMessage, publishTest } from "../services/api";
import { useSubTopics, useTest, useTopics } from "../hooks/useTests";

export const PreviewPublishPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: test, isLoading } = useTest(id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const { data: topics = [] } = useTopics(test?.subject_id ?? "");
  const selectedTopicIds = useMemo(() => (test?.topics ?? []).filter(Boolean), [test?.topics]);
  const { data: subTopics = [] } = useSubTopics(selectedTopicIds);

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

  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["questions", id, test?.questions],
    queryFn: () => fetchBulkQuestions(test?.questions ?? []),
    enabled: Boolean(test?.questions?.length),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishTest(id),
    onSuccess: () => {
      setConfirmOpen(false);
      setToast("Test published successfully");
      window.setTimeout(() => navigate("/dashboard"), 2000);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  useEffect(() => {
    if (test?.status === "live") setToast("This test is already live");
  }, [test?.status]);

  if (isLoading || !test) {
    return (
      <AppShell compactRail>
        <PageWrapper compact>
          <div className="flex h-96 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2">Loading preview...</span>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  return (
    <AppShell compactRail>
      <PageWrapper compact>
        <p className="mb-8 text-sm font-medium text-slate-500">Test creation</p>
        <div className="mb-5 flex items-center gap-3">
          <h1 className="text-sm font-bold text-slate-700">Test created</h1>
          <Badge tone="green">All {test.total_questions} Questions done</Badge>
        </div>

        <section className="mb-7 rounded-md border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="blue">Chapter Wise</Badge>
              <h2 className="font-bold text-slate-900">📚 Chapter 1</h2>
              <Badge tone="green">{test.difficulty}</Badge>
            </div>
            <Link to={`/tests/${id}/edit`} title="Edit test details">
              <Pencil className="h-4 w-4 text-primary-600" />
            </Link>
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

        <div className="mb-6 inline-flex rounded-md border border-slate-200 bg-white p-1">
          <button className="h-10 min-w-[142px] rounded-md bg-white px-4 text-sm font-bold text-slate-900">Publish Now</button>
          <button className="h-10 min-w-[156px] rounded-md px-4 text-sm font-semibold text-slate-400">Schedule Publish</button>
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold text-slate-800">Live Until</h2>
          <p className="mb-5 text-sm text-slate-600">Choose how long this test should remain available on the platform.</p>
          <div className="mb-6 grid gap-5 md:grid-cols-2">
            {["Always Available", "3 Weeks", "1 Week", "1 Month", "2 Weeks", "Custom Duration"].map((label, index) => (
              <label key={label} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <input type="radio" name="liveUntil" defaultChecked={index === 5} className="h-4 w-4 accent-[#6c7df7]" />
                {label}
              </label>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="relative block">
              <input className="h-12 w-full rounded-md border border-slate-300 px-4 pr-10 text-sm outline-none" placeholder="Select End Date" />
              <Calendar className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </label>
            <Select
              options={[
                { label: "Select End Time", value: "" },
                { label: "11:59 PM", value: "23:59" },
                { label: "6:00 PM", value: "18:00" },
              ]}
            />
          </div>
        </section>

        <section className="mb-8 rounded-md border border-slate-200 bg-white p-5">
          <h2 className="mb-5 text-sm font-bold text-slate-800">Questions Preview</h2>
          {isLoadingQuestions ? (
            <p className="text-sm text-slate-500"><Spinner /> Loading questions...</p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-slate-500">No saved questions found for this test.</p>
          ) : (
            <div className="space-y-5">
              {questions.map((question, index) => (
                <article key={question.id ?? `${question.question}-${index}`} className="rounded-md border border-slate-100 p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-800">{index + 1}. {question.question}</h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {(["option1", "option2", "option3", "option4"] as const).map((option) => (
                      <div
                        key={option}
                        className={`rounded-md border px-3 py-2 text-sm ${
                          question.correct_option === option ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {question.correct_option === option ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : null}
                        {question[option]}
                      </div>
                    ))}
                  </div>
                  {question.explanation ? <p className="mt-3 text-sm text-slate-600">Explanation: {question.explanation}</p> : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-end gap-4">
          <Link to={`/tests/${id}/questions`}>
            <Button variant="secondary">Edit Questions</Button>
          </Link>
          <Button variant="secondary" onClick={() => navigate("/dashboard")}>Cancel</Button>
          <Button icon={<Clock className="h-4 w-4" />} onClick={() => setConfirmOpen(true)}>Confirm</Button>
        </div>

        <Modal
          open={confirmOpen}
          title="Publish test"
          onClose={() => setConfirmOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button disabled={publishMutation.isPending} onClick={() => publishMutation.mutate()}>
                Publish Test
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">Publish {test.name}? Learners will be able to access it according to the selected availability.</p>
          {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
        </Modal>

        {toast ? <Toast>{toast}</Toast> : null}
      </PageWrapper>
    </AppShell>
  );
};
