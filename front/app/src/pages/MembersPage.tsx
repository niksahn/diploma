import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { workspaceApi } from '../shared/api/workspaces'
import { userApi, type UserSearchItem } from '../shared/api/users'
import { useWorkspaceStore } from '../shared/state/workspace'
import { useAuthStore } from '../shared/state/auth'

const DEBOUNCE_MS = 300

const MembersPage = () => {
  const { selectedWorkspaceId, selectedWorkspaceName, selectedWorkspaceRole } = useWorkspaceStore()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserSearchItem | null>(null)
  const [newMemberRole, setNewMemberRole] = useState(1)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchQuery])

  const { data, isLoading, error } = useQuery({
    queryKey: ['members', selectedWorkspaceId],
    queryFn: () => workspaceApi.users(selectedWorkspaceId || 0),
    enabled: Boolean(selectedWorkspaceId),
  })

  const memberIds = useMemo(() => new Set((data?.members ?? []).map((m) => m.user_id)), [data?.members])

  const { data: searchResult, isLoading: searchLoading } = useQuery({
    queryKey: ['user-search', debouncedQuery],
    queryFn: () => userApi.search({ search: debouncedQuery || undefined, limit: 20 }),
    enabled: debouncedQuery.length >= 2,
  })

  const searchUsers = useMemo(() => {
    const list = searchResult?.users ?? []
    return list.filter((u) => !memberIds.has(u.id))
  }, [searchResult?.users, memberIds])

  const isLeader = selectedWorkspaceRole === 2
  const currentUserId = useMemo(() => (user ? parseInt(user.id, 10) || 0 : 0), [user])

  const { mutateAsync: addMember, isPending: adding } = useMutation({
    mutationFn: (userId: number) => workspaceApi.addMember(selectedWorkspaceId!, userId, newMemberRole),
    onSuccess: () => {
      setSearchQuery('')
      setSelectedUser(null)
      setNewMemberRole(1)
      setShowDropdown(false)
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
        <p className="text-sm text-slate-600">
          {selectedWorkspaceName ?? `Пространство #${selectedWorkspaceId}`}
        </p>
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
          <div className="text-sm text-slate-600">
            {isLeader ? 'Добавьте первого участника через форму ниже.' : 'В этом пространстве пока нет участников'}
          </div>
        </div>
      ) : null}
      {(isLeader || (Array.isArray(members) && members.length > 0)) && (
        <div className="space-y-4">
          {isLeader && (
            <div className="card space-y-3">
              <div className="text-sm font-medium text-slate-900">Добавить участника</div>
              <p className="text-xs text-slate-600">Найдите пользователя по имени, фамилии или логину</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end flex-wrap">
                <div className="flex-1 min-w-[200px] relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setSelectedUser(null)
                      setShowDropdown(true)
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    placeholder="Поиск: имя, фамилия, логин…"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none"
                  />
                  {selectedUser && (
                    <div className="mt-1 text-sm text-slate-700">
                      Выбран: {selectedUser.surname} {selectedUser.name} ({selectedUser.login})
                    </div>
                  )}
                  {showDropdown && (searchQuery.trim().length >= 2 || searchUsers.length > 0) && (
                    <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                      {searchLoading ? (
                        <li className="px-3 py-2 text-sm text-slate-500">Поиск…</li>
                      ) : searchUsers.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-slate-500">
                          {debouncedQuery.length < 2 ? 'Введите минимум 2 символа' : 'Никого не найдено'}
                        </li>
                      ) : (
                        searchUsers.map((u) => (
                          <li
                            key={u.id}
                            className="px-3 py-2 text-sm text-slate-900 hover:bg-slate-100 cursor-pointer"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setSelectedUser(u)
                              setSearchQuery('')
                              setShowDropdown(false)
                            }}
                          >
                            {u.surname} {u.name} ({u.login})
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
                <label className="sm:w-40 text-sm text-slate-700">
                  Роль
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(parseInt(e.target.value, 10))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                  >
                    <option value={1}>Участник</option>
                    <option value={2}>Руководитель</option>
                  </select>
                </label>
                <button
                  disabled={!selectedUser || adding || changingLeader}
                  onClick={() => {
                    if (!selectedUser) return
                    if (newMemberRole === 2) {
                      changeLeader(selectedUser.id)
                    } else {
                      addMember(selectedUser.id)
                    }
                  }}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {adding || changingLeader ? 'Сохраняем…' : 'Добавить'}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Назначение руководителя переводит текущего руководителя в роль участника.
              </p>
            </div>
          )}

          {Array.isArray(members) && members.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-2">Участник</th>
                    <th className="px-4 py-2">Логин</th>
                    <th className="px-4 py-2">Роль</th>
                    {isLeader && <th className="px-4 py-2 text-right">Действия</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                  <tr key={member.user_id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-900">
                      {member.surname} {member.name}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{member.login}</td>
                    <td className="px-4 py-2">
                      {isLeader ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user_id, parseInt(e.target.value, 10), member.role)}
                          disabled={member.user_id === currentUserId && member.role === 2}
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 focus:border-slate-500 focus:outline-none"
                        >
                          <option value={1}>Участник</option>
                          <option value={2}>Руководитель</option>
                        </select>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                          {member.role === 1 ? 'Участник' : member.role === 2 ? 'Руководитель' : 'Неизвестно'}
                        </span>
                      )}
                    </td>
                    {isLeader && (
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => removeMember(member.user_id)}
                          disabled={removing || (member.user_id === currentUserId && member.role === 2)}
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
          )}
        </div>
      )}
    </div>
  )
}

export default MembersPage




