import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { deleteTest, getErrorMessage } from "../services/api";
import { useTests } from "../hooks/useTests";
import { Test } from "../types";

export const DashboardPage = () => {
  const { data: tests = [], isLoading, error } = useTests();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Test | null>(null);
  const queryClient = useQueryClient();

  const filteredTests = useMemo(
    () =>
      tests.filter((test) => {
        const matchesName = test.name.toLowerCase().includes(search.toLowerCase());
        const normalizedStatus = test.status ?? "draft";
        const matchesStatus = status === "all" || normalizedStatus === status;
        return matchesName && matchesStatus;
      }),
    [tests, search, status],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTest(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
  });

  return (
    <AppShell>
      <PageWrapper>
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-500">Dashboard</p>
            <h1 className="text-2xl font-bold text-slate-800">Test Management</h1>
          </div>
          <Link to="/tests/create">
            <Button icon={<Plus className="h-4 w-4" />}>Create New Test</Button>
          </Link>
        </div>

        <div className="mb-5 grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-10" placeholder="Search by test name" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-12 rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none focus:border-primary-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="live">Live</option>
          </select>
        </div>

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Test Name</th>
                <th className="px-5 py-4">Subject</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Created Date</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-500" colSpan={5}>
                    <Spinner /> <span className="ml-2">Loading tests...</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-5 py-12 text-center text-rose-500" colSpan={5}>
                    {getErrorMessage(error)}
                  </td>
                </tr>
              ) : filteredTests.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-500" colSpan={5}>
                    No tests found.
                  </td>
                </tr>
              ) : (
                filteredTests.map((test) => (
                  <tr key={test.id}>
                    <td className="px-5 py-4 font-semibold text-slate-800">{test.name}</td>
                    <td className="px-5 py-4 text-slate-600">{test.subject}</td>
                    <td className="px-5 py-4">
                      <Badge tone={test.status === "live" ? "green" : "yellow"}>{test.status ?? "draft"}</Badge>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{new Date(test.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/tests/${test.id}/preview`}>
                          <Button variant="secondary" className="h-9 px-3">
                            View
                          </Button>
                        </Link>
                        <Link to={`/tests/${test.id}/edit`}>
                          <Button variant="secondary" className="h-9 px-3" icon={<Pencil className="h-4 w-4" />}>
                            Edit
                          </Button>
                        </Link>
                        <Link to={`/tests/${test.id}/questions`}>
                          <Button variant="secondary" className="h-9 px-3">
                            Add Questions
                          </Button>
                        </Link>
                        <Button variant="ghost" className="h-9 px-3 text-rose-600" onClick={() => setDeleteTarget(test)} icon={<Trash2 className="h-4 w-4" />}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <Modal
          open={Boolean(deleteTarget)}
          title="Delete test"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">Delete {deleteTarget?.name}? This action cannot be undone.</p>
          {deleteMutation.error ? <p className="mt-3 text-sm text-rose-600">{getErrorMessage(deleteMutation.error)}</p> : null}
        </Modal>
      </PageWrapper>
    </AppShell>
  );
};
