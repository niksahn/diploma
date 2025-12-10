import { Link, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { chatApi, type Chat, CHAT_TYPES } from '../api/chats'
import { useWorkspaceStore } from '../state/workspace'
import { useAuthStore } from '../state/auth'

const getChatTypeIcon = (type?: number) => {
  switch (type) {
    case CHAT_TYPES.PERSONAL:
      return '👤'
    case CHAT_TYPES.GROUP:
      return '👥'
    case CHAT_TYPES.CHANNEL:
      return '📢'
    default:
      return '💬'
  }
}

const SidebarChats = () => {
  const { selectedWorkspaceId } = useWorkspaceStore()
  const { user } = useAuthStore()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [chatName, setChatName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['chats', selectedWorkspaceId],
    queryFn: () => chatApi.list(selectedWorkspaceId || 0),
    enabled: Boolean(selectedWorkspaceId),
  })

  const { mutateAsync: createChat, isPending: creating } = useMutation({
    mutationFn: () =>
      chatApi.create({
        name: chatName.trim(),
        workspace_id: selectedWorkspaceId!,
        type: CHAT_TYPES.GROUP,
        members: user ? [parseInt(user.id)] : []
      }),
    onSuccess: () => {
      setChatName('')
      setShowCreateModal(false)
      queryClient.invalidateQueries({ queryKey: ['chats', selectedWorkspaceId] })
    },
  })

  const raw = Array.isArray((data as any)?.chats) // если API возвращает объект с chats
    ? (data as any).chats
    : Array.isArray(data)
      ? data
      : []

  const chats: Chat[] = raw.map((c: any) => ({
    id: typeof c.id === 'number' ? c.id : parseInt(String(c.id ?? '0'), 10) || 0,
    name: String(c.name ?? 'Без названия'),
    type: typeof c.type === 'number' ? c.type : (c.chatType === 'group' ? CHAT_TYPES.GROUP : CHAT_TYPES.GROUP),
    unread: typeof c.unread === 'number' ? c.unread : c.unreadCount ?? 0,
    members_count: typeof c.members_count === 'number' ? c.members_count : 0,
  })).slice(0, 6) // Показываем максимум 6 чатов

  if (!selectedWorkspaceId) {
    return null
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Чаты
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-6 h-6 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-md flex items-center justify-center text-sm font-medium transition-all duration-200 shadow-sm"
            title="Создать чат"
          >
            +
          </button>
          <Link
            to="/chats"
            className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            Все
          </Link>
        </div>
      </div>

      <div className="space-y-1">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-700 rounded-md animate-pulse" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">
            Нет чатов
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = location.pathname === `/chats/${chat.id}`
            return (
              <Link
                key={chat.id}
                to={`/chats/${chat.id}`}
                className={`group flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex-shrink-0 text-sm">
                  {getChatTypeIcon(chat.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${
                    isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'
                  }`}>
                    {chat.name}
                  </div>
                  {chat.members_count && chat.members_count > 0 && (
                    <div className="text-xs text-slate-500 group-hover:text-slate-400">
                      {chat.members_count} участников
                    </div>
                  )}
                </div>

                {chat.unread && chat.unread > 0 && (
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">
                        {chat.unread > 9 ? '9+' : chat.unread}
                      </span>
                    </div>
                  </div>
                )}
              </Link>
            )
          })
        )}
      </div>

      {/* Модальное окно создания чата */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Создать новый чат</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Название чата
                </label>
                <input
                  type="text"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  placeholder="Введите название чата"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && chatName.trim() && user) {
                      createChat()
                    }
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={() => chatName.trim() && user && createChat()}
                  disabled={!chatName.trim() || creating || !user}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-md transition-colors"
                >
                  {creating ? 'Создание…' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SidebarChats
