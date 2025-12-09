import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import AppLayout from "./shared/layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import WorkspacesPage from "./pages/WorkspacesPage";
import UsersPage from "./pages/UsersPage";
import WorkspaceDetailPage from "./pages/WorkspaceDetailPage";
import WorkspaceCreatePage from "./pages/WorkspaceCreatePage";
import ComplaintsPage from "./pages/ComplaintsPage";
import NotFoundPage from "./pages/NotFoundPage";

const SettingsPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-semibold mb-2">System Health</h1>
    <p className="text-gray-600">Check service status and configurations.</p>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="workspaces" element={<WorkspacesPage />} />
        <Route path="workspaces/new" element={<WorkspaceCreatePage />} />
        <Route path="workspaces/:id" element={<WorkspaceDetailPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
