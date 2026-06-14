import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteUser,
  fetchUsers,
  type SearchUsersParams,
  type UserListItem,
  type SearchUsersResponse
} from "../shared/api/users";
import { ru, userStatusLabel } from "../shared/i18n/ru";

const STATUS_OPTIONS = [
  { value: "", label: ru.userStatus.all },
  { value: "1", label: ru.userStatus.online },
  { value: "2", label: ru.userStatus.dnd },
  { value: "3", label: ru.userStatus.away },
  { value: "4", label: ru.userStatus.offline }
];

function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | "">("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

  const queryParams: SearchUsersParams = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status ? Number(status) : undefined,
      workspace_id: workspaceId ? Number(workspaceId) : undefined,
      limit,
      offset
    }),
    [search, status, workspaceId, limit, offset]
  );

  const { data, isLoading, isFetching, error, refetch } = useQuery<SearchUsersResponse>({
    queryKey: ["users", queryParams],
    queryFn: () => fetchUsers(queryParams),
    staleTime: 30_000
  });

  const users: UserListItem[] = Array.isArray(data?.users) ? data.users : [];
  const total = data?.total ?? 0;

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  const removeUser = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    refetch();
  };

  const handleDeleteUser = (user: UserListItem) => {
    if (!window.confirm(ru.users.deleteConfirm(user.login))) return;
    removeUser.mutate(user.id);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{ru.users.title}</h1>
          <p className="text-gray-600">{ru.users.subtitle}</p>
          {isFetching && !isLoading && (
            <p className="mt-1 text-sm text-indigo-600">⏳ {ru.actions.refreshing}</p>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {isFetching ? ru.actions.refreshing : ru.actions.refresh}
        </button>
      </div>

      <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-5 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-700">{ru.users.search}</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder={ru.users.searchPlaceholder}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-700">{ru.users.status}</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-700">{ru.users.workspaceIdOptional}</label>
          <input
            value={workspaceId}
            onChange={(e) => {
              setWorkspaceId(e.target.value);
              setOffset(0);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="123"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-700">{ru.users.limit}</label>
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
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            {ru.actions.apply}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <p className="text-gray-600">{ru.users.loading}</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">{(error as Error).message || ru.errors.loadUsers}</p>
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
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {users.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ru.users.id}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ru.users.login}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ru.users.name}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ru.users.status}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ru.users.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => {
                    const deleting = removeUser.isPending && removeUser.variables === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">#{u.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{u.login}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {[u.surname, u.name, u.patronymic].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{userStatusLabel(u.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            disabled={deleting}
                            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                          >
                            {deleting ? ru.actions.deleting : ru.actions.delete}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-600">{ru.users.none}</div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">{ru.users.showing(users.length, total, offset)}</div>
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

export default UsersPage;
