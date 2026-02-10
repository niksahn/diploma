import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi, CHAT_TYPES } from '../shared/api/chats'
import { useWorkspaceStore } from '../shared/state/workspace'
import { useAuthStore } from '../shared/state/auth'
import { useState } from 'react'

const getChatTypeLabel = (type?: number) => {
  switch (type) {
    case CHAT_TYPES.PERSONAL:
      return 'личный'
    case CHAT_TYPES.GROUP:
      return 'групповой'
    case CHAT_TYPES.CHANNEL:
      return 'канал'
    default:
      return 'групповой'
  }
}

const ChatsPage = () => {
  const { selectedWorkspaceId } = useWorkspaceStore()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [chatName, setChatName] = useState('')
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [selectedChatForMembers, setSelectedChatForMembers] = useState<number | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['chats', selectedWorkspaceId],
    queryFn: () => chatApi.list(selectedWorkspaceId || 0),
    enabled: Boolean(selectedWorkspaceId),
  })

  const { data: chatMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['chat-members', selectedChatForMembers],
    queryFn: () => selectedChatForMembers ? chatApi.members(selectedChatForMembers) : Promise.reject(new Error('No chat selected')),
    enabled: Boolean(selectedChatForMembers),
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
      queryClient.invalidateQueries({ queryKey: ['chats', selectedWorkspaceId] })
    },
  })

  const openMembersModal = (chatId: number) => {
    setSelectedChatForMembers(chatId)
    setShowMembersModal(true)
  }

  const closeMembersModal = () => {
    setShowMembersModal(false)
    setSelectedChatForMembers(null)
  }

  if (!selectedWorkspaceId) {
    return (
      <div className="card">
        <div className="text-sm text-slate-700">
          Сначала выберите рабочее пространство. <Link to="/workspaces" className="text-slate-900 underline">Перейти к списку</Link>
        </div>
      </div>
    )
  }

  type ChatView = { id: number; name: string; type?: number; unread?: number; members_count?: number }

  const raw = Array.isArray((data as any)?.chats) // если API возвращает объект с chats
    ? (data as any).chats
    : Array.isArray(data)
      ? data
      : []

  const chats: ChatView[] = raw.map((c: any) => ({
    id: typeof c.id === 'number' ? c.id : parseInt(String(c.id ?? '0'), 10) || 0,
    name: String(c.name ?? 'Без названия'),
    type: typeof c.type === 'number' ? c.type : (c.chatType === 'group' ? CHAT_TYPES.GROUP : CHAT_TYPES.GROUP),
    unread: typeof c.unread === 'number' ? c.unread : c.unreadCount ?? 0,
    members_count: typeof c.members_count === 'number' ? c.members_count : 0,
  }))

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Чаты</h2>
          <p className="text-sm text-slate-600">Рабочее пространство: {selectedWorkspaceId}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            placeholder="Название чата"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-slate-200 focus:border-slate-500 focus:outline-none"
          />
          <button
            onClick={() => chatName.trim() && user && createChat()}
            disabled={!chatName.trim() || creating || !user}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {creating ? 'Создание…' : 'Создать чат'}
          </button>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="text-sm text-slate-600">Загрузка…</div>
          </div>
        ) : error ? (
          <div className="col-span-full text-center py-8">
            <div className="text-sm text-amber-700">Упс, тут пусто</div>
            <div className="text-xs text-slate-500 mt-1">Не удалось загрузить чаты</div>
          </div>
        ) : chats.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <div className="text-sm text-slate-600">Упс, тут пусто</div>
            <div className="text-xs text-slate-500 mt-1">У вас пока нет чатов</div>
          </div>
        ) : (
          chats.map((chat) => (
            <Link key={chat.id} to={`/chats/${chat.id}`} className="card hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-slate-900">{chat.name}</div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{getChatTypeLabel(chat.type)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                {chat.members_count !== undefined && chat.members_count > 0 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openMembersModal(chat.id)
                    }}
                    className="text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    👥 {chat.members_count}
                  </button>
                )}
              </div>
              {chat.unread !== undefined && chat.unread > 0 && (
                <div className="mt-1 text-xs text-emerald-700">Непрочитанные: {chat.unread}</div>
              )}
            </Link>
          ))
        )}
      </div>

      {/* Модальное окно участников чата */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-hidden text-slate-900 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Участники чата</h3>
              <button
                onClick={closeMembersModal}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto max-h-96">
              {membersLoading ? (
                <div className="text-center py-4">
                  <div className="text-sm text-slate-600">Загрузка участников…</div>
                </div>
              ) : chatMembers?.members && chatMembers.members.length > 0 ? (
                <div className="space-y-3">
                  {chatMembers.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {member.name} {member.surname}
                        </div>
                        <div className="text-xs text-slate-500">{member.login}</div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {member.role === 1 ? 'Участник' : member.role === 2 ? 'Админ' : 'Неизвестно'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-slate-600">Участники не найдены</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatsPage


