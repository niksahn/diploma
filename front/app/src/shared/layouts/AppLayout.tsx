import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../state/auth'
import { useWorkspaceStore } from '../state/workspace'
import SidebarChats from '../components/SidebarChats'

const navItems = [
  { to: '/workspaces', label: 'Рабочие пространства' },
  { to: '/tasks', label: 'Задачи' },
  { to: '/members', label: 'Участники' },
  { to: '/complaints', label: 'Жалобы' },
  { to: '/profile', label: 'Профиль' },
]

const AppLayout = () => {
  const { user, logout } = useAuthStore()
  const { selectedWorkspaceId, reset } = useWorkspaceStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    reset()
    navigate('/auth', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="bg-slate-900 text-white flex flex-col w-72 p-4 gap-4">
        <div className="text-lg font-semibold">Корп. мессенджер</div>
        <nav className="flex flex-col gap-1 text-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 ${isActive ? 'bg-slate-700 text-white' : 'text-slate-200 hover:bg-slate-800'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <SidebarChats />

        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="w-full rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="min-h-screen bg-slate-50">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Текущее рабочее пространство</span>
            <span className="text-sm font-semibold text-slate-800">
              {selectedWorkspaceId ? `ID: ${selectedWorkspaceId}` : 'Не выбрано'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-900">{user?.login || 'Неизвестный пользователь'}</div>
            {user?.status && <div className="text-xs text-slate-500">{user.status}</div>}
          </div>
        </header>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AppLayout

