import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { workspaceApi } from '../shared/api/workspaces'
import { useWorkspaceStore } from '../shared/state/workspace'
import { useAuthStore } from '../shared/state/auth'

const MembersPage = () => {
  const { selectedWorkspaceId, selectedWorkspaceRole } = useWorkspaceStore()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [newMemberId, setNewMemberId] = useState('')
  const [newMemberRole, setNewMemberRole] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['members', selectedWorkspaceId],
    queryFn: () => workspaceApi.users(selectedWorkspaceId || 0),
    enabled: Boolean(selectedWorkspaceId),
  })

  const isLeader = selectedWorkspaceRole === 2
  const currentUserId = useMemo(() => (user ? parseInt(user.id, 10) || 0 : 0), [user])

  const { mutateAsync: addMember, isPending: adding } = useMutation({
    mutationFn: () => workspaceApi.addMember(selectedWorkspaceId!, parseInt(newMemberId, 10), newMemberRole),
    onSuccess: () => {
      setNewMemberId('')
      setNewMemberRole(1)
      queryClient.invalidateQueries({ queryKey: ['members', selectedWorkspaceId] })
    },
  })

  const { mutateAsync: updateRole } = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: number }) =>
      workspaceApi.updateMemberRole(selectedWorkspaceId!, userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', selectedWorkspaceId] }),
  })

  const { mutateAsync: removeMember, isPending: removing } = useMutation({
    mutationFn: (userId: number) => workspaceApi.removeMember(selectedWorkspaceId!, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', selectedWorkspaceId] }),
  })

  const { mutateAsync: changeLeader, isPending: changingLeader } = useMutation({
    mutationFn: (newLeaderId: number) => workspaceApi.changeLeader(selectedWorkspaceId!, newLeaderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', selectedWorkspaceId] }),
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

  const handleRoleChange = async (userId: number, newRole: number, currentRole: number) => {
    if (!isLeader || newRole === currentRole) return
    if (newRole === 2) {
      await changeLeader(userId)
      return
    }
    await updateRole({ userId, role: newRole })
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Участники рабочего пространства</h2>
        <p className="text-sm text-slate-600">Workspace ID: {selectedWorkspaceId}</p>
        <p className="text-xs text-slate-500">
          Ваша роль: {isLeader ? 'руководитель (можете управлять участниками)' : 'участник (только просмотр)'}
        </p>
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
        <div className="space-y-4">
          {isLeader && (
            <div className="card space-y-3">
              <div className="text-sm font-medium text-slate-900">Добавить участника</div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="flex-1 text-sm text-slate-700">
                  ID пользователя
                  <input
                    type="number"
                    min={1}
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    placeholder="Например, 42"
                  />
                </label>
                <label className="sm:w-48 text-sm text-slate-700">
                  Роль
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(parseInt(e.target.value, 10))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    <option value={1}>Участник</option>
                    <option value={2}>Руководитель</option>
                  </select>
                </label>
                <button
                  disabled={!newMemberId.trim() || adding || changingLeader}
                  onClick={() => {
                    if (!newMemberId.trim()) return
                    if (newMemberRole === 2) {
                      changeLeader(parseInt(newMemberId, 10))
                    } else {
                      addMember()
                    }
                  }}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {adding || changingLeader ? 'Сохраняем…' : 'Добавить'}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Примечание: назначение руководителя переводит текущего руководителя в роль участника.
              </p>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Логин</th>
                  <th className="px-4 py-2">Роль</th>
                  {isLeader && <th className="px-4 py-2 text-right">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((user) => (
                  <tr key={user.user_id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-700">{user.user_id}</td>
                    <td className="px-4 py-2 text-slate-900">{user.login}</td>
                    <td className="px-4 py-2">
                      {isLeader ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.user_id, parseInt(e.target.value, 10), user.role)}
                          disabled={user.user_id === currentUserId && user.role === 2}
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 focus:border-slate-500 focus:outline-none"
                        >
                          <option value={1}>Участник</option>
                          <option value={2}>Руководитель</option>
                        </select>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                          {user.role === 1 ? 'Участник' : user.role === 2 ? 'Руководитель' : 'Неизвестно'}
                        </span>
                      )}
                    </td>
                    {isLeader && (
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => removeMember(user.user_id)}
                          disabled={removing || (user.user_id === currentUserId && user.role === 2)}
                          className="text-xs text-red-600 hover:text-red-700 disabled:opacity-60"
                        >
                          Удалить
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default MembersPage




