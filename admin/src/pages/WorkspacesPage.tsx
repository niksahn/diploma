import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { apiFetch } from "../shared/api/client";
import { LOCALE, ru } from "../shared/i18n/ru";

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
      : date.toLocaleDateString(LOCALE, {
          year: "numeric",
          month: "short",
          day: "numeric"
        });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{ru.workspaces.title}</h1>
          <p className="text-gray-600">{ru.workspaces.subtitle}</p>
          {isFetching && !isLoading && (
            <p className="mt-1 text-sm text-indigo-600">⏳ {ru.actions.refreshing}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {isFetching ? ru.actions.refreshing : ru.actions.refresh}
          </button>
          <button
            onClick={() => navigate("/workspaces/new")}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            {ru.workspaces.create}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <p className="text-gray-600">{ru.workspaces.loading}</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">{(error as Error).message || ru.errors.loadWorkspaces}</p>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700"
            >
              {ru.actions.retry}
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">{ru.workspaces.tariffIdOptional}</label>
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
              <label className="text-sm text-gray-700">{ru.workspaces.limit}</label>
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
              <div className="text-sm text-gray-600">{ru.workspaces.totalOffset(total, offset)}</div>
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
                      {ru.workspaces.name}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ru.workspaces.tariff}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ru.workspaces.members}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ru.workspaces.createdAt}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ru.workspaces.actions}
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
                          {ru.actions.open}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-600">{ru.workspaces.none}</div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {ru.workspaces.showing(workspaces.length, total, offset)}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset((prev) => Math.max(prev - limit, 0))}
                disabled={!canPrev}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {ru.actions.prev}
              </button>
              <button
                onClick={() => setOffset((prev) => prev + limit)}
                disabled={!canNext}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {ru.actions.next}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkspacesPage;
