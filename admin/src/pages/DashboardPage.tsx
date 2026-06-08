import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../shared/api/client";
import { complaintStatusLabel, healthStatusLabel, LOCALE, ru } from "../shared/i18n/ru";

type HealthResponse = {
  status?: string;
  service?: string;
};

type Complaint = {
  id: number;
  status: string;
  created_at: string;
  author_login: string;
};

type ComplaintsResponse = {
  complaints: Complaint[];
  total: number;
};

type UserWorkspacesResponse = {
  total: number;
  workspaces: unknown[];
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(LOCALE, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
}

function statusBadgeClasses(status?: string) {
  const normalized = (status || "").toLowerCase();
  if (!normalized) return "bg-gray-100 text-gray-800";
  if (["ok", "healthy", "up", "ready"].includes(normalized)) {
    return "bg-green-100 text-green-800";
  }
  if (["degraded", "warn", "warning"].includes(normalized)) {
    return "bg-yellow-100 text-yellow-800";
  }
  return "bg-red-100 text-red-800";
}

function DashboardPage() {
  const {
    data: healthData,
    isLoading: isHealthLoading,
    isFetching: isHealthFetching,
    error: healthError,
    refetch: refetchHealth
  } = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthResponse>("/health", { skipAuth: true }),
    retry: 1,
    staleTime: 15_000
  });

  const {
    data: complaintsData,
    isLoading: isComplaintsLoading,
    isFetching: isComplaintsFetching,
    error: complaintsError,
    refetch: refetchComplaints
  } = useQuery<ComplaintsResponse>({
    queryKey: ["dashboard", "complaints"],
    queryFn: () => apiFetch<ComplaintsResponse>("/api/v1/complaints?limit=5"),
    staleTime: 30_000
  });

  const {
    data: workspacesData,
    isLoading: isWorkspacesLoading,
    isFetching: isWorkspacesFetching,
    error: workspacesError,
    refetch: refetchWorkspaces
  } = useQuery<UserWorkspacesResponse>({
    queryKey: ["dashboard", "workspaces"],
    queryFn: () => apiFetch<UserWorkspacesResponse>("/api/v1/workspaces"),
    staleTime: 30_000
  });

  const handleRetryStats = () => {
    refetchComplaints();
    refetchWorkspaces();
  };

  const handleRetryHealth = () => {
    refetchHealth();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{ru.dashboard.title}</h1>
          <p className="text-gray-600">{ru.dashboard.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRetryHealth}
            disabled={isHealthFetching}
            className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {isHealthFetching ? ru.dashboard.checking : ru.dashboard.retryHealth}
          </button>
          <button
            onClick={handleRetryStats}
            disabled={isComplaintsFetching || isWorkspacesFetching}
            className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {isComplaintsFetching || isWorkspacesFetching
              ? ru.actions.refreshing
              : ru.dashboard.refreshStats}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{ru.dashboard.health}</h2>
              {isHealthFetching && !isHealthLoading && (
                <p className="text-sm text-indigo-600">{ru.dashboard.rechecking}</p>
              )}
            </div>
          </div>
          {isHealthLoading && <p className="text-gray-600">{ru.dashboard.checkingHealth}</p>}
          {healthError && !isHealthLoading && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700">
              <p className="text-sm">
                {(healthError as Error).message || ru.errors.healthCheckFailed}
              </p>
              <button
                onClick={handleRetryHealth}
                className="mt-2 px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700"
              >
                {ru.actions.retry}
              </button>
            </div>
          )}
          {!isHealthLoading && !healthError && healthData && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{ru.dashboard.service}</p>
                <p className="text-base font-medium text-gray-900">
                  {healthData.service || ru.dashboard.unknown}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeClasses(
                  healthData.status
                )}`}
              >
                {healthStatusLabel(healthData.status)}
              </span>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{ru.dashboard.quickStats}</h2>
            {(isComplaintsFetching || isWorkspacesFetching) && (
              <p className="text-sm text-indigo-600">{ru.actions.refreshing}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-md p-4">
              <p className="text-sm text-gray-500">{ru.dashboard.complaints}</p>
              {isComplaintsLoading ? (
                <p className="mt-1 text-gray-600">{ru.dashboard.loading}</p>
              ) : complaintsError ? (
                <p className="mt-1 text-sm text-red-600">
                  {(complaintsError as Error).message || ru.errors.loadComplaints}
                </p>
              ) : (
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {complaintsData?.total ?? 0}
                </p>
              )}
            </div>
            <div className="border border-gray-200 rounded-md p-4">
              <p className="text-sm text-gray-500">{ru.dashboard.workspaces}</p>
              {isWorkspacesLoading ? (
                <p className="mt-1 text-gray-600">{ru.dashboard.loading}</p>
              ) : workspacesError ? (
                <p className="mt-1 text-sm text-red-600">
                  {(workspacesError as Error).message || ru.errors.loadWorkspaces}
                </p>
              ) : (
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {workspacesData?.total ?? 0}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold">{ru.dashboard.latestComplaints}</h2>
            {isComplaintsFetching && !isComplaintsLoading && (
              <p className="text-sm text-indigo-600">{ru.actions.refreshing}</p>
            )}
          </div>
          <button
            onClick={() => refetchComplaints()}
            disabled={isComplaintsFetching}
            className="px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {isComplaintsFetching ? ru.actions.refreshing : ru.actions.refresh}
          </button>
        </div>

        {isComplaintsLoading && (
          <div className="p-6 text-gray-600">{ru.dashboard.loadingComplaints}</div>
        )}

        {complaintsError && !isComplaintsLoading && (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm">
                  {(complaintsError as Error).message || ru.errors.loadComplaints}
                </p>
                <button
                  onClick={() => refetchComplaints()}
                  className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700"
                >
                  {ru.actions.retry}
                </button>
              </div>
            </div>
          </div>
        )}

        {!isComplaintsLoading && !complaintsError && (
          <div className="overflow-x-auto">
            {complaintsData?.complaints?.length ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ru.table.id}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ru.table.status}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ru.table.author}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ru.table.created}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {complaintsData.complaints.map((complaint) => (
                    <tr key={complaint.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        #{complaint.id}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${statusBadgeClasses(
                            complaint.status
                          )}`}
                        >
                          {complaintStatusLabel(complaint.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {complaint.author_login || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(complaint.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-gray-600">{ru.dashboard.noComplaints}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
