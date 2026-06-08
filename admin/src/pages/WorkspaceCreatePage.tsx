import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../shared/api/client";
import { ru } from "../shared/i18n/ru";

type Tariff = {
  id: number;
  name: string;
  description: string;
};

type TariffsResponse = {
  tariffs: Tariff[];
};

type CreateWorkspaceRequest = {
  name: string;
  leader_id: number;
  tariff_id: number;
};

type WorkspaceResponse = {
  id: number;
  name: string;
  creator: number;
  tariffs_id: number;
  created_at: string;
};

function WorkspaceCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    leaderId: "",
    tariffId: ""
  });
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: tariffsData,
    isLoading: tariffsLoading,
    isFetching: tariffsFetching,
    error: tariffsError,
    refetch: refetchTariffs
  } = useQuery<TariffsResponse>({
    queryKey: ["workspaceTariffs"],
    queryFn: () => apiFetch<TariffsResponse>("/api/v1/workspaces/tariffs"),
    staleTime: 60_000
  });

  const createWorkspace = useMutation<WorkspaceResponse, Error, CreateWorkspaceRequest>({
    mutationFn: (payload) =>
      apiFetch<WorkspaceResponse>("/api/v1/workspaces", {
        method: "POST",
        body: payload
      }),
    onSuccess: () => {
      setErrorMessage(null);
      setMessage(ru.workspaceCreate.success);
      setTimeout(() => navigate("/workspaces"), 500);
    },
    onError: (err) => {
      setMessage(null);
      setErrorMessage(err.message || ru.errors.createWorkspaceFailed);
    }
  });

  const sortedTariffs = useMemo(
    () => tariffsData?.tariffs?.slice().sort((a, b) => a.name.localeCompare(b.name, "ru")) ?? [],
    [tariffsData]
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    const leaderIdNumber = Number(form.leaderId);
    const tariffIdNumber = Number(form.tariffId);

    if (!form.name.trim()) {
      setErrorMessage(ru.workspaceCreate.nameRequired);
      return;
    }
    if (Number.isNaN(leaderIdNumber) || leaderIdNumber <= 0) {
      setErrorMessage(ru.workspaceCreate.leaderRequired);
      return;
    }
    if (Number.isNaN(tariffIdNumber) || tariffIdNumber <= 0) {
      setErrorMessage(ru.workspaceCreate.tariffRequired);
      return;
    }

    createWorkspace.mutate({
      name: form.name.trim(),
      leader_id: leaderIdNumber,
      tariff_id: tariffIdNumber
    });
  };

  const isSubmitting = createWorkspace.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{ru.workspaceCreate.title}</h1>
          <p className="text-gray-600">{ru.workspaceCreate.subtitle}</p>
          {tariffsFetching && !tariffsLoading && (
            <p className="text-sm text-indigo-600 mt-1">{ru.workspaceCreate.refreshingTariffs}</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        {tariffsLoading ? (
          <p className="text-gray-600">{ru.workspaceCreate.loadingTariffs}</p>
        ) : tariffsError ? (
          <div className="space-y-3">
            <p className="text-red-700 text-sm">
              {(tariffsError as Error).message || ru.errors.loadTariffs}
            </p>
            <button
              type="button"
              onClick={() => refetchTariffs()}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              {ru.actions.retry}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">{ru.workspaceCreate.name}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={ru.workspaceCreate.namePlaceholder}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">{ru.workspaceCreate.leaderUserId}</label>
                <input
                  type="number"
                  min={1}
                  value={form.leaderId}
                  onChange={(e) => setForm((prev) => ({ ...prev, leaderId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={ru.workspaceCreate.leaderPlaceholder}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">{ru.workspaceCreate.tariff}</label>
              <select
                value={form.tariffId}
                onChange={(e) => setForm((prev) => ({ ...prev, tariffId: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">{ru.workspaceCreate.selectTariff}</option>
                {sortedTariffs.map((tariff) => (
                  <option key={tariff.id} value={tariff.id}>
                    {tariff.name}
                  </option>
                ))}
              </select>

              {sortedTariffs.length > 0 && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="font-medium text-slate-900">{ru.workspaceCreate.tariffs}</div>
                  <ul className="mt-2 space-y-1">
                    {sortedTariffs.map((tariff) => (
                      <li key={tariff.id}>
                        <span className="font-semibold text-slate-900">{tariff.name}:</span>{" "}
                        {tariff.description || ru.workspaceCreate.noDescription}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {ru.actions.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? ru.actions.creating : ru.actions.create}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default WorkspaceCreatePage;
