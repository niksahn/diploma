import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { chatApi } from '../shared/api/chats'
import { useWorkspaceStore } from '../shared/state/workspace'

const ChatsPage = () => {
  const { selectedWorkspaceId } = useWorkspaceStore()

  const { data, isLoading, error } = useQuery({
    queryKey: ['chats', selectedWorkspaceId],
    queryFn: () => chatApi.list(selectedWorkspaceId || ''),
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

  const chats = data ?? [
    { id: 'general', name: 'Общий', type: 'group', unread: 2 },
    { id: 'ops', name: 'Операции', type: 'group', unread: 0 },
  ]

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Чаты</h2>
          <p className="text-sm text-slate-600">Рабочее пространство: {selectedWorkspaceId}</p>
        </div>
        <Link
          to="/chats/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Создать чат
        </Link>
      </header>

      {isLoading && <div className="text-sm text-slate-600">Загрузка…</div>}
      {error && <div className="text-sm text-amber-700">Не удалось загрузить чаты из API, показываем заглушку.</div>}

      <div className="grid gap-3 md:grid-cols-2">
        {chats.map((chat) => (
          <Link key={chat.id} to={`/chats/${chat.id}`} className="card hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">{chat.name}</div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{chat.type || 'group'}</span>
            </div>
            <div className="mt-2 text-sm text-slate-600">ID: {chat.id}</div>
            {chat.unread !== undefined && chat.unread > 0 && (
              <div className="mt-1 text-xs text-emerald-700">Непрочитанные: {chat.unread}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default ChatsPage

