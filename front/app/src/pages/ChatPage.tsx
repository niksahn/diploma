import { useMemo, useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi, type Message, ChatWebSocket, type ChatTaskInfo } from '../shared/api/chats'
import { workspaceApi } from '../shared/api/workspaces'
import { taskApi } from '../shared/api/tasks'

const ChatPage = () => {
  const { chatId: chatIdParam } = useParams()
  const chatId = chatIdParam ? parseInt(chatIdParam, 10) : null
  const [text, setText] = useState('')
  const [isWsConnected, setIsWsConnected] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [showMembersModal, setShowMembersModal] = useState(false)
  const queryClient = useQueryClient()
  const wsRef = useRef<ChatWebSocket | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => chatId ? chatApi.messages(chatId) : Promise.reject(new Error('Invalid chat ID')),
    enabled: Boolean(chatId && !isNaN(chatId)),
  })

  const { data: chatDetails } = useQuery({
    queryKey: ['chat-details', chatId],
    queryFn: () => chatId ? chatApi.getDetails(chatId) : Promise.reject(new Error('Invalid chat ID')),
    enabled: Boolean(chatId && !isNaN(chatId)),
  })

  const { data: chatMembers } = useQuery({
    queryKey: ['chat-members', chatId],
    queryFn: () => chatId ? chatApi.members(chatId) : Promise.reject(new Error('Invalid chat ID')),
    enabled: Boolean(chatId && !isNaN(chatId)),
  })

  const { data: workspaceMembers } = useQuery({
    queryKey: ['workspace-members', chatDetails?.workspace_id],
    queryFn: () => chatDetails?.workspace_id ? workspaceApi.users(chatDetails.workspace_id) : Promise.reject(new Error('No workspace ID')),
    enabled: Boolean(chatDetails?.workspace_id),
  })

  const { data: chatTasks } = useQuery({
    queryKey: ['chat-tasks', chatId],
    queryFn: () => chatId ? chatApi.tasks(chatId) : Promise.reject(new Error('Invalid chat ID')),
    enabled: Boolean(chatId && !isNaN(chatId)),
  })

  // WebSocket соединение
  useEffect(() => {
    if (!chatId || isNaN(chatId)) return

    // Создаем WebSocket соединение
    wsRef.current = new ChatWebSocket()

    // Обработчик новых сообщений
    wsRef.current.onMessageReceived((newMessage) => {
      console.log('New message received via WebSocket:', newMessage)

      // Обновляем кэш React Query, добавляя новое сообщение
      queryClient.setQueryData<Message[]>(['chat', chatId], (oldMessages = []) => {
        // Проверяем, нет ли уже такого сообщения (чтобы избежать дубликатов)
        const messageExists = oldMessages && oldMessages.some(msg => msg.id === newMessage.id)
        if (messageExists) return oldMessages

        return [...oldMessages, newMessage]
      })
    })

    wsRef.current.onConnectionClosed(() => {
      setIsWsConnected(false)
    })

    wsRef.current.onErrorReceived(() => {
      setIsWsConnected(false)
    })

    // Подключаемся к чату
    wsRef.current.connect(chatId)

    // Очистка при размонтировании
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect()
        wsRef.current = null
      }
      setIsWsConnected(false)
    }
  }, [chatId, queryClient])

  const messages = useMemo<Message[]>(() => {
    const msgs = data || []
    // Сортируем по времени (старые сверху)
    return msgs.sort((a, b) => a.date - b.date)
  }, [data])

  // Авто-прокрутка к последнему сообщению
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: { chatId: number; text: string }) => chatApi.sendMessage(payload.chatId, payload.text),
    onSuccess: (newMessage) => {
      // Добавляем отправленное сообщение в кэш немедленно
      queryClient.setQueryData<Message[]>(['chat', chatId], (oldMessages = []) => {
        // Проверяем, нет ли уже такого сообщения
        const messageExists = oldMessages && oldMessages.some(msg => msg.id === newMessage.id)
        if (messageExists) return oldMessages

        return [...oldMessages, newMessage]
      })
      setText('')
    },
  })

  const { mutateAsync: addMembers, isPending: isAddingMembers } = useMutation({
    mutationFn: (userIds: number[]) => chatId ? chatApi.addMembers(chatId, { user_ids: userIds, role: 1 }) : Promise.reject(new Error('Invalid chat ID')),
    onSuccess: () => {
      // Обновляем список участников чата
      queryClient.invalidateQueries({ queryKey: ['chat-members', chatId] })
      setSelectedUsers([])
      setShowAddMembers(false)
    },
  })

  const { mutateAsync: detachTask, isPending: isDetachingTask } = useMutation({
    mutationFn: (taskId: number) => chatId ? taskApi.detachFromChat(taskId, chatId) : Promise.reject(new Error('Invalid chat ID')),
    onSuccess: () => {
      // Обновляем список задач чата
      queryClient.invalidateQueries({ queryKey: ['chat-tasks', chatId] })
    },
  })

  const handleDetachTask = async (taskId: number) => {
    if (isDetachingTask) return
    await detachTask(taskId)
  }

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!chatId || !text.trim()) return
    await mutateAsync({ chatId, text })
  }

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return
    await addMembers(selectedUsers)
  }

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  // Получаем список пользователей рабочего пространства, которые еще не в чате
  const availableUsers = useMemo(() => {
    if (!workspaceMembers?.members || !chatMembers?.members) return []

    const chatMemberIds = new Set(chatMembers.members.map(member => member.user_id))
    return workspaceMembers.members.filter(member => !chatMemberIds.has(member.user_id))
  }, [workspaceMembers, chatMembers])

  const isAdmin = chatDetails?.my_role === 2

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Чат</h2>
          <p className="text-sm text-slate-600">ID: {chatId}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-slate-500">
              {isWsConnected ? 'Подключен' : 'Отключен'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMembersModal(true)}
            className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700"
          >
            👥 Участники ({chatMembers?.total || 0})
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAddMembers(true)}
              className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700"
            >
              Добавить участников
            </button>
          )}
        </div>
      </header>

      {/* Блок с прикрепленными задачами */}
      {chatTasks?.tasks && chatTasks.tasks.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            📋 Прикрепленные задачи ({chatTasks.total})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {chatTasks.tasks.map((task: ChatTaskInfo) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">{task.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      task.status === 1 ? 'bg-gray-100 text-gray-700' :
                      task.status === 2 ? 'bg-blue-100 text-blue-700' :
                      task.status === 3 ? 'bg-yellow-100 text-yellow-700' :
                      task.status === 4 ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {task.status_name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Создал: {task.creator_name} • Срок: {new Date(task.date).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDetachTask(task.id)}
                  disabled={isDetachingTask}
                  className="text-slate-400 hover:text-red-500 ml-2 text-sm disabled:opacity-50"
                  title="Открепить задачу"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card space-y-3 max-h-[60vh] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-sm text-slate-600">Загрузка сообщений…</div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-sm text-amber-700">Упс, тут пусто</div>
            <div className="text-xs text-slate-500 mt-1">Не удалось загрузить сообщения</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm text-slate-600">Упс, тут пусто</div>
            <div className="text-xs text-slate-500 mt-1">В этом чате пока нет сообщений</div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className="rounded-md border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{msg.user_name}</span>
                  <span className="text-xs text-slate-500">{new Date(msg.date * 1000).toLocaleTimeString()}</span>
                </div>
                <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{msg.text}</p>
                {msg.edited && <span className="text-xs text-slate-500">(изменено)</span>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ваше сообщение…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending || !text.trim()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? 'Отправка…' : 'Отправить'}
        </button>
      </form>

      {/* Модальное окно для добавления участников */}
      {showAddMembers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Добавить участников</h3>
              <button
                onClick={() => setShowAddMembers(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {availableUsers.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Все пользователи рабочего пространства уже в чате
                </p>
              ) : (
                availableUsers.map((user) => (
                  <label key={user.user_id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.user_id)}
                      onChange={() => toggleUserSelection(user.user_id)}
                      className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {user.name} {user.surname}
                      </div>
                      <div className="text-xs text-slate-500">{user.login}</div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddMembers(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
              >
                Отмена
              </button>
              <button
                onClick={handleAddMembers}
                disabled={selectedUsers.length === 0 || isAddingMembers}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-md"
              >
                {isAddingMembers ? 'Добавление…' : `Добавить (${selectedUsers.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно со списком участников */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Участники чата ({chatMembers?.total || 0})</h3>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto max-h-96">
              {chatMembers?.members && chatMembers.members.length > 0 ? (
                <div className="space-y-3">
                  {chatMembers.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {member.name} {member.surname}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{member.login}</div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ml-2 ${
                        member.role === 2
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {member.role === 1 ? 'Участник' : member.role === 2 ? 'Админ' : 'Неизвестно'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-slate-500">Участники не найдены</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatPage

