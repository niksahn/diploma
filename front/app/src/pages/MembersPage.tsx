import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { workspaceApi } from '../shared/api/workspaces'
import { useWorkspaceStore } from '../shared/state/workspace'

const MembersPage = () => {
  const { selectedWorkspaceId } = useWorkspaceStore()
  const { data, isLoading, error } = useQuery({
    queryKey: ['members', selectedWorkspaceId],
    queryFn: () => workspaceApi.users(selectedWorkspaceId || 0),
    enabled: Boolean(selectedWorkspaceId),
  })

  if (!selectedWorkspaceId) {
    return (
      <div className="card">
        <div className="text-sm text-slate-700">
          Сначала выберите рабочее пространство. <Link to="/workspaces" className="text-slate-900 underline">Перейти к списку</Link>
        </div>
      </div>
    )
  }

  const members = data?.members || []

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Участники рабочего пространства</h2>
        <p className="text-sm text-slate-600">Workspace ID: {selectedWorkspaceId}</p>
      </header>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-sm text-slate-600">Загрузка…</div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-sm text-amber-700">Упс, тут пусто</div>
          <div className="text-xs text-slate-500 mt-1">Не удалось загрузить участников</div>
        </div>
      ) : !Array.isArray(members) || members.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-sm text-slate-600">Упс, тут пусто</div>
          <div className="text-xs text-slate-500 mt-1">{!Array.isArray(members) ? 'Не удалось загрузить участников' : 'В этом пространстве пока нет участников'}</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Логин</th>
                <th className="px-4 py-2">Роль</th>
              </tr>
            </thead>
            <tbody>
              {members.map((user) => (
                <tr key={user.user_id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-700">{user.user_id}</td>
                  <td className="px-4 py-2 text-slate-900">{user.login}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                      {user.role === 1 ? 'Участник' : user.role === 2 ? 'Админ' : 'Неизвестно'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default MembersPage




