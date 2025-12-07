import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../shared/api/client";

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
    tariffId: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: tariffsData,
    isLoading: tariffsLoading,
    isFetching: tariffsFetching,
    error: tariffsError,
    refetch: refetchTariffs,
  } = useQuery<TariffsResponse>({
    queryKey: ["workspaceTariffs"],
    queryFn: () => apiFetch<TariffsResponse>("/api/v1/workspaces/tariffs"),
    staleTime: 60_000,
  });

  const createWorkspace = useMutation<WorkspaceResponse, Error, CreateWorkspaceRequest>({
    mutationFn: (payload) =>
      apiFetch<WorkspaceResponse>("/api/v1/workspaces", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      setErrorMessage(null);
      setMessage("Workspace created successfully");
      setTimeout(() => navigate("/workspaces"), 500);
    },
    onError: (err) => {
      setMessage(null);
      setErrorMessage(err.message || "Failed to create workspace");
    },
  });

  const sortedTariffs = useMemo(
    () => tariffsData?.tariffs?.slice().sort((a, b) => a.name.localeCompare(b.name)) ?? [],
    [tariffsData]
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    const leaderIdNumber = Number(form.leaderId);
    const tariffIdNumber = Number(form.tariffId);

    if (!form.name.trim()) {
      setErrorMessage("Workspace name is required");
      return;
    }
    if (Number.isNaN(leaderIdNumber) || leaderIdNumber <= 0) {
      setErrorMessage("Leader ID must be a positive number");
      return;
    }
    if (Number.isNaN(tariffIdNumber) || tariffIdNumber <= 0) {
      setErrorMessage("Tariff is required");
      return;
    }

    createWorkspace.mutate({
      name: form.name.trim(),
      leader_id: leaderIdNumber,
      tariff_id: tariffIdNumber,
    });
  };

  const isSubmitting = createWorkspace.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Create Workspace</h1>
          <p className="text-gray-600">Fill in details to create a workspace.</p>
          {tariffsFetching && !tariffsLoading && (
            <p className="text-sm text-indigo-600 mt-1">Refreshing tariffs...</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        {tariffsLoading ? (
          <p className="text-gray-600">Loading tariffs...</p>
        ) : tariffsError ? (
          <div className="space-y-3">
            <p className="text-red-700 text-sm">
              {(tariffsError as Error).message || "Failed to load tariffs."}
            </p>
            <button
              type="button"
              onClick={() => refetchTariffs()}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Workspace name"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Leader ID</label>
                <input
                  type="number"
                  min={1}
                  value={form.leaderId}
                  onChange={(e) => setForm((prev) => ({ ...prev, leaderId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="123"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Tariff</label>
              <select
                value={form.tariffId}
                onChange={(e) => setForm((prev) => ({ ...prev, tariffId: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select tariff</option>
                {sortedTariffs.map((tariff) => (
                  <option key={tariff.id} value={tariff.id}>
                    {tariff.name}
                  </option>
                ))}
              </select>
              {sortedTariffs.length > 0 && (
                <ul className="text-sm text-gray-600 space-y-1 bg-gray-50 border border-gray-200 rounded-md p-3">
                  {sortedTariffs.map((tariff) => (
                    <li key={tariff.id}>
                      <span className="font-medium text-gray-800">{tariff.name}:</span>{" "}
                      {tariff.description || "No description"}
                    </li>
                  ))}
                </ul>
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default WorkspaceCreatePage;

