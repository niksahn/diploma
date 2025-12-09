import classNames from "classnames";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../state/auth";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/workspaces", label: "Workspaces" },
  { to: "/users", label: "Users" },
  { to: "/complaints", label: "Complaints" },
  { to: "/settings", label: "Settings/Health" }
];

function AppLayout() {
  const navigate = useNavigate();
  const admin = useAuthStore((s) => s.admin);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-100 text-gray-900">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 text-xl font-semibold border-b border-gray-200">Admin Panel</div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                classNames(
                  "block px-3 py-2 rounded-md text-sm font-medium",
                  isActive ? "bg-indigo-50 text-indigo-600" : "hover:bg-gray-100"
                )
              }
              end={item.to === "/"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
          <div className="text-lg font-semibold">Corporate Messenger Admin</div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-700">
              {admin?.login ?? "Admin"} {admin?.email ? `(${admin.email})` : ""}
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-md bg-red-500 text-white text-sm hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;

