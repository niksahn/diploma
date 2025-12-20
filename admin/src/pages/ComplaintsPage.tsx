import { useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "../shared/api/client";

type Complaint = {
  id: number;
  author_login?: string;
  status: string;
  created_at: string;
};

type ComplaintsResponse = {
  complaints: Complaint[];
  total: number;
  limit: number;
  offset: number;
};

type StatusHistory = {
  status: string;
  comment?: string;
  changed_at?: string;
};

type ComplaintDetail = {
  id: number;
  text: string;
  status: string;
  author_name?: string;
  author_login?: string;
  device_description?: string;
  created_at: string;
  status_history?: StatusHistory[];
};

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function ComplaintsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [updateStatus, setUpdateStatus] = useState("pending");
  const [updateComment, setUpdateComment] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const {
    data: complaintsData,
    isLoading: isComplaintsLoading,
    isFetching: isComplaintsFetching,
    error: complaintsError,
    refetch: refetchComplaints,
  } = useQuery<ComplaintsResponse>({
    queryKey: ["complaints", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: "20",
        offset: "0",
      });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      return apiFetch<ComplaintsResponse>(
        `/api/v1/complaints?${params.toString()}`
      );
    },
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });

  const {
    data: detailData,
    isLoading: isDetailLoading,
    isFetching: isDetailFetching,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery<ComplaintDetail>({
    queryKey: ["complaint", selectedId],
    queryFn: () =>
      apiFetch<ComplaintDetail>(`/api/v1/complaints/${selectedId!}`),
    enabled: selectedId !== null,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (detailData?.status) {
      setUpdateStatus(detailData.status);
      setUpdateComment("");
    }
  }, [detailData?.status, detailData?.id]);

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; status: string; comment?: string }) =>
      apiFetch<void>(`/api/v1/complaints/${payload.id}/status`, {
        method: "PUT",
        body: {
          status: payload.status,
          comment: payload.comment?.trim() || undefined,
        },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({
        queryKey: ["complaint", variables.id],
      });
    },
  });

  useEffect(() => {
    updateMutation.reset();
  }, [selectedId, updateMutation]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/v1/complaints/${id}`, { method: "DELETE" }),
    onMutate: (id) => {
      setPendingDeleteId(id);
    },
    onSettled: () => {
      setPendingDeleteId(null);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      if (selectedId === id) {
        setSelectedId(null);
      } else {
        queryClient.invalidateQueries({ queryKey: ["complaint", id] });
      }
    },
  });

  const handleUpdate = () => {
    if (selectedId === null) return;
    updateMutation.mutate({
      id: selectedId,
      status: updateStatus,
      comment: updateComment || undefined,
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const authorLabel = useMemo(() => {
    if (!detailData) return "—";
    return detailData.author_name || detailData.author_login || "—";
  }, [detailData]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Complaints</h1>
          <p className="text-gray-600">
            View complaints, inspect details, and update statuses.
          </p>
          {isComplaintsFetching && !isComplaintsLoading && (
            <p className="mt-1 text-sm text-indigo-600">⏳ Refreshing...</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-md border border-gray-300 text-sm bg-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetchComplaints()}
            disabled={isComplaintsFetching}
            className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {isComplaintsFetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {isComplaintsLoading && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <p className="text-gray-600">Loading complaints...</p>
        </div>
      )}

      {complaintsError && !isComplaintsLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">
              {(complaintsError as Error).message ||
                "Failed to load complaints."}
            </p>
            <button
              onClick={() => refetchComplaints()}
              className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!isComplaintsLoading && !complaintsError && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {complaintsData?.complaints?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Author
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {complaintsData.complaints.map((complaint) => (
                      <tr key={complaint.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          #{complaint.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {complaint.author_login || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                            {complaint.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {formatDate(complaint.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedId(complaint.id)}
                            className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(complaint.id)}
                            disabled={
                              deleteMutation.isPending &&
                              pendingDeleteId === complaint.id
                            }
                            className="px-3 py-1.5 rounded-md border border-red-200 bg-red-50 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {deleteMutation.isPending &&
                            pendingDeleteId === complaint.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-600">
                No complaints found.
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            {!selectedId && (
              <p className="text-gray-600">
                Select a complaint to view details.
              </p>
            )}

            {selectedId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Complaint #{selectedId}
                    </h2>
                    {isDetailFetching && !isDetailLoading && (
                      <p className="text-sm text-indigo-600">Refreshing…</p>
                    )}
                  </div>
                  <button
                    onClick={() => refetchDetail()}
                    disabled={isDetailFetching}
                    className="px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isDetailFetching ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {isDetailLoading && (
                  <p className="text-gray-600">Loading details...</p>
                )}

                {detailError && !isDetailLoading && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm">
                        {(detailError as Error).message ||
                          "Failed to load complaint."}
                      </span>
                      <button
                        onClick={() => refetchDetail()}
                        className="px-2.5 py-1 rounded-md bg-red-600 text-white text-xs hover:bg-red-700"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}

                {detailData && !detailError && (
                  <div className="space-y-4">
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Author</span>
                        <span className="text-gray-900">{authorLabel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status</span>
                        <span className="text-gray-900">
                          {detailData.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created</span>
                        <span className="text-gray-900">
                          {formatDate(detailData.created_at)}
                        </span>
                      </div>
                      {detailData.device_description && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Device</span>
                          <span className="text-gray-900 text-right">
                            {detailData.device_description}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-800 mb-1">
                        Text
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 border border-gray-200 rounded-md p-3">
                        {detailData.text}
                      </p>
                    </div>

                    {detailData.status_history?.length ? (
                      <div>
                        <p className="text-sm font-semibold text-gray-800 mb-2">
                          Status history
                        </p>
                        <div className="space-y-2">
                          {detailData.status_history.map((entry, idx) => (
                            <div
                              key={`${entry.status}-${idx}`}
                              className="border border-gray-200 rounded-md p-3 bg-gray-50 text-sm"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">
                                  {entry.status}
                                </span>
                                <span className="text-gray-600">
                                  {entry.changed_at
                                    ? formatDate(entry.changed_at)
                                    : "—"}
                                </span>
                              </div>
                              {entry.comment && (
                                <p className="mt-1 text-gray-700 whitespace-pre-line">
                                  {entry.comment}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="border-t border-gray-200 pt-4 space-y-3">
                      <p className="text-sm font-semibold text-gray-800">
                        Update status
                      </p>
                      <div className="grid gap-3">
                        <label className="text-sm text-gray-700">
                          Status
                          <select
                            value={updateStatus}
                            onChange={(e) => setUpdateStatus(e.target.value)}
                            className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white"
                          >
                            {STATUS_OPTIONS.filter(
                              (opt) => opt.value !== "all"
                            ).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm text-gray-700">
                          Comment (optional)
                          <textarea
                            value={updateComment}
                            onChange={(e) => setUpdateComment(e.target.value)}
                            rows={3}
                            className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white"
                            placeholder="Add a note about the status change"
                          />
                        </label>
                        <button
                          onClick={handleUpdate}
                          disabled={updateMutation.isPending}
                          className="w-fit px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {updateMutation.isPending ? "Updating..." : "Update"}
                        </button>
                        {updateMutation.error && (
                          <p className="text-sm text-red-600">
                            {(updateMutation.error as Error).message ||
                              "Failed to update status."}
                          </p>
                        )}
                        {updateMutation.isSuccess && (
                          <p className="text-sm text-green-700">
                            Status updated successfully.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplaintsPage;

















