import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { apiFetch } from "../shared/api/client";
import { useAuthStore } from "../shared/state/auth";

type Tariff = {
  id: number;
  name: string;
  description?: string;
};

type TariffsResponse = {
  tariffs: Tariff[];
};

type WorkspaceDetails = {
  id: number;
  name: string;
  creator: number;
  created_at: string;
  tariff: Tariff | null;
};

type WorkspaceUpdateRequest = {
  name: string;
  tariff_id: number;
};

type Member = {
  user_id: number;
  login: string;
  role: number;
  joined_at: string;
};

type MembersResponse = {
  members: Member[];
};

const roleOptions = [
  { value: 2, label: "Руководитель" },
  { value: 1, label: "Участник" },
];

function WorkspaceDetailPage() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { admin } = useAuthStore();

  const [workspaceForm, setWorkspaceForm] = useState({ name: "", tariffId: "" });
  const [addMemberForm, setAddMemberForm] = useState({ userId: "", role: "1" });
  const [roleDrafts, setRoleDrafts] = useState<Record<number, string>>({});

  const workspaceQuery = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => apiFetch<WorkspaceDetails>(`/api/v1/workspaces/${workspaceId}`),
    enabled: Boolean(workspaceId),
  });

  const tariffsQuery = useQuery({
    queryKey: ["workspaceTariffs"],
    queryFn: () => apiFetch<TariffsResponse>("/api/v1/workspaces/tariffs"),
  });

  const membersQuery = useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () => apiFetch<MembersResponse>(`/api/v1/workspaces/${workspaceId}/members`),
    enabled: Boolean(workspaceId),
  });

  const sortedTariffs = useMemo(
    () => tariffsQuery.data?.tariffs?.slice().sort((a, b) => a.name.localeCompare(b.name)) ?? [],
    [tariffsQuery.data],
  );

  useEffect(() => {
    if (workspaceQuery.data) {
      setWorkspaceForm({
        name: workspaceQuery.data.name,
        tariffId: workspaceQuery.data.tariff?.id ? String(workspaceQuery.data.tariff.id) : "",
      });
    }
  }, [workspaceQuery.data]);

  const updateWorkspace = useMutation({
    mutationFn: (payload: WorkspaceUpdateRequest) =>
      apiFetch(`/api/v1/workspaces/${workspaceId}`, { method: "PUT", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
    },
  });


  const addMember = useMutation({
    mutationFn: (payload: { user_id: number; role: number; leader_id: number }) =>
      apiFetch(`/api/v1/workspaces/${workspaceId}/members`, { method: "POST", body: payload }),
    onSuccess: () => {
      setAddMemberForm({ userId: "", role: "1" });
      queryClient.invalidateQueries({ queryKey: ["workspaceMembers", workspaceId] });
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: (payload: { userId: number; role: number; leader_id: number }) =>
      apiFetch(`/api/v1/workspaces/${workspaceId}/members/${payload.userId}`, {
        method: "PUT",
        body: { role: payload.role, leader_id: payload.leader_id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceMembers", workspaceId] });
    },
  });

  const removeMember = useMutation({
    mutationFn: (userId: number) =>
      apiFetch(`/api/v1/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceMembers", workspaceId] });
    },
  });

  if (!workspaceId) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          Workspace id is missing in the URL.
        </div>
      </div>
    );
  }

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString();
  };

  const handleUpdateWorkspace = (event: FormEvent) => {
    event.preventDefault();
    if (!workspaceForm.name.trim() || !workspaceForm.tariffId) return;

    updateWorkspace.mutate({
      name: workspaceForm.name.trim(),
      tariff_id: Number(workspaceForm.tariffId),
    });
  };


  const handleAddMember = (event: FormEvent) => {
    event.preventDefault();
    if (!addMemberForm.userId.trim() || !admin?.id) return;

    addMember.mutate({
      user_id: Number(addMemberForm.userId),
      role: Number(addMemberForm.role),
      leader_id: Number(admin.id),
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Workspace details</h1>
          <p className="text-sm text-slate-600">ID: {workspaceId}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              workspaceQuery.refetch();
              tariffsQuery.refetch();
              membersQuery.refetch();
            }}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={workspaceQuery.isFetching || tariffsQuery.isFetching || membersQuery.isFetching}
          >
            Refresh
          </button>
        </div>
      </div>

      {workspaceQuery.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-700">Загрузка…</div>
      ) : workspaceQuery.error ? (
        <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          <p>{(workspaceQuery.error as Error).message}</p>
          <button
            type="button"
            onClick={() => workspaceQuery.refetch()}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : workspaceQuery.data ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{workspaceQuery.data.name}</h2>
                  <p className="text-sm text-slate-600">
                    Creator: {workspaceQuery.data.creator} • Created {formatDate(workspaceQuery.data.created_at)}
                  </p>
                </div>
                {workspaceQuery.data.tariff && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800">
                    {workspaceQuery.data.tariff.name}
                  </span>
                )}
              </div>

              <form onSubmit={handleUpdateWorkspace} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-800">Name</label>
                    <input
                      value={workspaceForm.name}
                      onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                      placeholder="Workspace name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-800">Tariff</label>
                    {tariffsQuery.isLoading ? (
                      <p className="text-sm text-slate-600">Загрузка тарифов…</p>
                    ) : tariffsQuery.error ? (
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-rose-700">Не удалось получить тарифы.</p>
                        <button
                          type="button"
                          onClick={() => tariffsQuery.refetch()}
                          className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <select
                        value={workspaceForm.tariffId}
                        onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, tariffId: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                      >
                        <option value="">Select tariff</option>
                        {sortedTariffs.map((tariff) => (
                          <option key={tariff.id} value={tariff.id}>
                            {tariff.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {sortedTariffs.length > 0 && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">Тарифы</div>
                    <ul className="mt-2 space-y-1">
                      {sortedTariffs.map((tariff) => (
                        <li key={tariff.id}>
                          <span className="font-semibold text-slate-900">{tariff.name}:</span>{" "}
                          {tariff.description || "Без описания"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updateWorkspace.isPending}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {updateWorkspace.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>

          </div>

          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Members</h3>
                <p className="text-sm text-slate-600">
                  {membersQuery.data?.members?.length ?? 0} участников
                </p>
              </div>
              {membersQuery.isFetching && <span className="text-xs text-slate-500">Refreshing…</span>}
            </div>

            <form onSubmit={handleAddMember} className="grid gap-3 md:grid-cols-[1fr,auto,auto]">
              <input
                type="number"
                min={1}
                value={addMemberForm.userId}
                onChange={(e) => setAddMemberForm((prev) => ({ ...prev, userId: e.target.value }))}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                placeholder="User ID"
              />
              <select
                value={addMemberForm.role}
                onChange={(e) => setAddMemberForm((prev) => ({ ...prev, role: e.target.value }))}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={addMember.isPending}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {addMember.isPending ? "Adding…" : "Add"}
              </button>
            </form>

            {membersQuery.isLoading ? (
              <p className="text-sm text-slate-600">Загрузка участников…</p>
            ) : membersQuery.error ? (
              <div className="space-y-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                <p>{(membersQuery.error as Error).message}</p>
                <button
                  type="button"
                  onClick={() => membersQuery.refetch()}
                  className="rounded-md bg-rose-600 px-3 py-1.5 text-xs text-white hover:bg-rose-700"
                >
                  Retry
                </button>
              </div>
            ) : membersQuery.data && membersQuery.data.members.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Login</th>
                      <th className="px-4 py-2 text-left">Role</th>
                      <th className="px-4 py-2 text-left">Joined</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {membersQuery.data.members.map((member) => {
                      const draft = roleDrafts[member.user_id] ?? String(member.role);
                      const updating =
                        updateMemberRole.isPending &&
                        updateMemberRole.variables?.userId === member.user_id;
                      const removing =
                        removeMember.isPending && removeMember.variables === member.user_id;

                      return (
                        <tr key={member.user_id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-900">{member.login}</td>
                          <td className="px-4 py-2">
                            <select
                              value={draft}
                              onChange={(e) =>
                                setRoleDrafts((prev) => ({ ...prev, [member.user_id]: e.target.value }))
                              }
                              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                            >
                              {roleOptions.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2 text-slate-700">{formatDate(member.joined_at)}</td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateMemberRole.mutate({
                                    userId: member.user_id,
                                    role: Number(draft),
                                    leader_id: Number(admin?.id),
                                  })
                                }
                                disabled={updating}
                                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60"
                              >
                                {updating ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeMember.mutate(member.user_id)}
                                disabled={removing}
                                className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                              >
                                {removing ? "Removing…" : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Участников пока нет.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default WorkspaceDetailPage;

