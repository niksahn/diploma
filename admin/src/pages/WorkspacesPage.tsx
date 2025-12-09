import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { apiFetch } from "../shared/api/client";

type AdminWorkspace = {
  id: number;
  name: string;
  creator: number;
  members_count?: number;
  created_at?: string;
  tariff?: {
    id: number;
    name: string;
    description?: string;
  };
};

type AdminWorkspacesResponse = {
  workspaces: AdminWorkspace[];
  total: number;
  limit: number;
  offset: number;
};

function WorkspacesPage() {
  const navigate = useNavigate();
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [tariffId, setTariffId] = useState("");

  const { data, isLoading, isFetching, error, refetch } = useQuery<AdminWorkspacesResponse>({
    queryKey: ["admin-workspaces", { limit, offset, tariffId }],
    queryFn: () =>
      apiFetch<AdminWorkspacesResponse>(
        `/api/v1/workspaces/all?limit=${limit}&offset=${offset}${tariffId ? `&tariff_id=${tariffId}` : ""}`
      ),
    staleTime: 30_000
  });

  const workspaces = Array.isArray(data?.workspaces) ? data.workspaces : [];
  const total = data?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="text-gray-600">Admin view of all workspaces.</p>
          {isFetching && !isLoading && <p className="mt-1 text-sm text-indigo-600">⏳ Refreshing...</p>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={() => navigate("/workspaces/new")}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            Create
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <p className="text-gray-600">Loading workspaces...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">{(error as Error).message || "Failed to load workspaces."}</p>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">Tariff ID (optional)</label>
              <input
                value={tariffId}
                onChange={(e) => {
                  setTariffId(e.target.value);
                  setOffset(0);
                }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="123"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">Limit</label>
              <input
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value) || 20);
                  setOffset(0);
                }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">Total: {total} | Offset: {offset}</div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {workspaces.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tariff
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Members
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created at
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workspaces.map((workspace) => (
                    <tr key={workspace.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{workspace.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{workspace.tariff?.name ?? "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{workspace.members_count ?? "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatDate(workspace.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/workspaces/${workspace.id}`)}
                          className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-600">No workspaces yet.</div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {workspaces.length} of {total} (offset {offset})
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset((prev) => Math.max(prev - limit, 0))}
                disabled={!canPrev}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setOffset((prev) => prev + limit)}
                disabled={!canNext}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkspacesPage;
