import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../shared/api/client";

type WorkspaceSummary = {
  id: string;
  name: string;
  joined_at: string;
  role: string;
};

type UserWorkspacesResponse = {
  total: number;
  workspaces: WorkspaceSummary[];
};

function WorkspacesPage() {
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch
  } = useQuery<UserWorkspacesResponse>({
    queryKey: ["workspaces"],
    queryFn: () => apiFetch<UserWorkspacesResponse>("/api/v1/workspaces"),
    staleTime: 30_000
  });

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="text-gray-600">List and manage workspaces.</p>
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
          <div className="flex items-center justify-between">
            <p>{(error as Error).message || "Failed to load workspaces."}</p>
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
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {data?.workspaces?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.workspaces.map((workspace) => (
                    <tr key={workspace.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          to={`/workspaces/${workspace.id}`}
                          className="text-sm font-medium text-indigo-600 hover:underline"
                        >
                          {workspace.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{workspace.role}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(workspace.joined_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-600">No workspaces yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default WorkspacesPage;
