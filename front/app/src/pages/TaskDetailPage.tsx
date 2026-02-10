import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { taskApi, type TaskStatus } from '../shared/api/tasks'
import { workspaceApi } from '../shared/api/workspaces'
import { chatApi } from '../shared/api/chats'

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 1, label: 'К выполнению' },
  { value: 2, label: 'В работе' },
  { value: 3, label: 'На проверке' },
  { value: 4, label: 'Выполнена' },
  { value: 5, label: 'Отменена' },
]

interface TaskFormData {
  title: string
  description: string
  date: string
}

const TaskDetailPage = () => {
  const { taskId } = useParams()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<TaskStatus | ''>('')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    date: '',
  })

  const [showAddAssigneeModal, setShowAddAssigneeModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('')

  const [showAddChatModal, setShowAddChatModal] = useState(false)
  const [selectedChatId, setSelectedChatId] = useState<number | ''>('')
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [chatSearch, setChatSearch] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.byId(Number(taskId) || 0),
    enabled: Boolean(taskId),
  })

  const { data: assigneesData, isLoading: assigneesLoading } = useQuery({
    queryKey: ['task-assignees', taskId],
    queryFn: () => taskApi.getAssignees(Number(taskId) || 0),
    enabled: Boolean(taskId),
  })

  const { data: chatsData, isLoading: chatsLoading } = useQuery({
    queryKey: ['task-chats', taskId],
    queryFn: () => taskApi.getChats(Number(taskId) || 0),
    enabled: Boolean(taskId),
  })

  const workspaceId = data?.workspace_id ?? 0

  const { data: workspaceMembersData } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => workspaceApi.users(workspaceId),
    enabled: workspaceId > 0 && showAddAssigneeModal,
  })

  const { data: workspaceChatsData } = useQuery({
    queryKey: ['workspace-chats', workspaceId],
    queryFn: () => chatApi.list(workspaceId),
    enabled: workspaceId > 0 && showAddChatModal,
  })

  const workspaceMembers = workspaceMembersData?.members ?? []
  type WorkspaceChatItem = { id: number; name: string }
  const workspaceChats: WorkspaceChatItem[] = (() => {
    const raw = Array.isArray((workspaceChatsData as any)?.chats)
      ? (workspaceChatsData as any).chats
      : Array.isArray(workspaceChatsData)
        ? workspaceChatsData
        : []
    return raw.map((c: { id?: number; name?: string }) => ({
      id: typeof c.id === 'number' ? c.id : parseInt(String(c.id ?? '0'), 10) || 0,
      name: String(c.name ?? 'Без названия'),
    }))
  })()
  const assignedUserIds = new Set((assigneesData?.assignees ?? []).map((a) => a.user_id))
  const attachedChatIds = new Set((chatsData?.chats ?? []).map((c) => c.chat_id))
  const membersToAdd = workspaceMembers.filter((m) => !assignedUserIds.has(m.user_id))
  const chatsToAdd = workspaceChats.filter((c) => !attachedChatIds.has(c.id))
  const assigneeSearchLower = assigneeSearch.trim().toLowerCase()
  const chatSearchLower = chatSearch.trim().toLowerCase()
  const membersToAddFiltered =
    assigneeSearchLower === ''
      ? membersToAdd
      : membersToAdd.filter(
          (m) =>
            `${m.surname} ${m.name} ${m.login}`.toLowerCase().includes(assigneeSearchLower) ||
            m.login.toLowerCase().includes(assigneeSearchLower),
        )
  const chatsToAddFiltered: WorkspaceChatItem[] =
    chatSearchLower === ''
      ? chatsToAdd
      : chatsToAdd.filter((c: WorkspaceChatItem) => c.name.toLowerCase().includes(chatSearchLower))

  const task = data ?? {
    id: Number(taskId) || 0,
    title: 'Демо-задача',
    description: 'Описание задачи заглушка',
    status: 1 as TaskStatus,
    status_name: 'К выполнению',
    date: new Date().toISOString().split('T')[0],
    creator: 0,
    creator_name: 'Демо пользователь',
    workspace_id: 0,
    workspace_name: 'Демо пространство',
    assignee_count: 0,
    chat_count: 0,
    created_at: new Date().toISOString(),
  }

  const { mutateAsync: updateStatus, isPending: isStatusPending } = useMutation({
    mutationFn: (next: TaskStatus) => taskApi.updateStatus(task.id, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      setStatus('')
    },
  })

  const { mutateAsync: updateTask, isPending: isUpdatePending } = useMutation({
    mutationFn: (data: TaskFormData) => taskApi.update(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      setIsEditing(false)
    },
  })

  const { mutateAsync: addAssigneesMutation, isPending: isAddingAssignee } = useMutation({
    mutationFn: (userIds: number[]) => taskApi.addAssignees(task.id, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-assignees', taskId] })
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      setShowAddAssigneeModal(false)
      setSelectedUserId('')
      setAssigneeSearch('')
    },
  })

  const { mutateAsync: removeAssigneeMutation, isPending: isRemovingAssignee } = useMutation({
    mutationFn: (userId: number) => taskApi.removeAssignee(task.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-assignees', taskId] })
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    },
  })

  const { mutateAsync: attachToChatMutation, isPending: isAttachingChat } = useMutation({
    mutationFn: (chatId: number) => taskApi.attachToChat(task.id, chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-chats', taskId] })
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      setShowAddChatModal(false)
      setSelectedChatId('')
      setChatSearch('')
    },
  })

  const { mutateAsync: detachFromChatMutation, isPending: isDetachingChat } = useMutation({
    mutationFn: (chatId: number) => taskApi.detachFromChat(task.id, chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-chats', taskId] })
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    },
  })

  const handleUpdateStatus = async () => {
    if (!status) return
    await updateStatus(status)
  }

  const handleEdit = () => {
    setFormData({
      title: task.title,
      description: task.description || '',
      date: task.date,
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({ title: '', description: '', date: '' })
  }

  const handleSave = async () => {
    if (!formData.title.trim()) return
    await updateTask(formData)
  }

  const handleInputChange = (field: keyof TaskFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddAssignee = async () => {
    if (selectedUserId === '') return
    await addAssigneesMutation([selectedUserId])
  }

  const handleRemoveAssignee = async (userId: number) => {
    await removeAssigneeMutation(userId)
  }

  const handleAttachToChat = async () => {
    if (selectedChatId === '') return
    await attachToChatMutation(selectedChatId)
  }

  const handleDetachFromChat = async (chatId: number) => {
    await detachFromChatMutation(chatId)
  }

  const inputBase = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none'

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`${inputBase} text-lg font-semibold`}
              placeholder="Название задачи"
            />
          ) : (
            <h2 className="text-xl font-semibold text-slate-900">{task.title}</h2>
          )}
          {!isEditing && (
            <p className="text-sm text-slate-600 mt-1">Задача #{task.id}</p>
          )}
        </div>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            ✏️ Редактировать
          </button>
        )}
      </header>

      {isLoading && <div className="text-sm text-slate-600">Загрузка…</div>}
      {error && <div className="text-sm text-amber-700">API недоступно, показываем демо-данные.</div>}

      <div className="card space-y-4">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Описание</label>
          {isEditing ? (
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className={`${inputBase} resize-y`}
              placeholder="Опишите задачу подробно..."
            />
          ) : (
            <div className="text-sm text-slate-800 whitespace-pre-wrap min-h-[60px] bg-slate-50 rounded-md p-3">
              {task.description || 'Описание не указано'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Дата выполнения</label>
            {isEditing ? (
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={`${inputBase} [color-scheme:light]`}
              />
            ) : (
              <div className="text-sm text-slate-600 bg-slate-50 rounded-md px-3 py-2">
                📅 {new Date(task.date).toLocaleDateString('ru-RU')}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Статус</label>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {task.status_name}
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(Number(e.target.value) as TaskStatus)}
                className={`${inputBase} w-auto min-w-[180px]`}
              >
                <option value="">Изменить статус</option>
                {statusOptions.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleUpdateStatus}
                disabled={!status || isStatusPending}
                className="rounded-md bg-slate-600 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {isStatusPending ? '...' : '✓'}
              </button>
            </div>
          </div>
        </div>

        {/* Assignees Section */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700">👥 Исполнители</h3>
            <button
              onClick={() => setShowAddAssigneeModal(true)}
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-200"
            >
              + Добавить
            </button>
          </div>
          {assigneesLoading ? (
            <div className="text-sm text-slate-600">Загрузка исполнителей…</div>
          ) : (
            <div className="space-y-2">
              {assigneesData?.assignees?.length ? (
                assigneesData.assignees.map((assignee) => (
                  <div key={assignee.user_id} className="flex items-center justify-between bg-slate-50 rounded-md p-3">
                    <div className="text-sm">
                      <div className="font-medium text-slate-900">
                        {assignee.surname} {assignee.name} {assignee.patronymic}
                      </div>
                      <div className="text-slate-600">@{assignee.login}</div>
                      <div className="text-xs text-slate-500">
                        Назначен: {new Date(assignee.assigned_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAssignee(assignee.user_id)}
                      disabled={isRemovingAssignee}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                      title="Удалить исполнителя"
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 bg-slate-50 rounded-md p-3">
                  Исполнители не назначены
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chats Section */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700">💬 Прикрепленные чаты</h3>
            <button
              onClick={() => setShowAddChatModal(true)}
              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md hover:bg-green-200"
            >
              + Прикрепить
            </button>
          </div>
          {chatsLoading ? (
            <div className="text-sm text-slate-600">Загрузка чатов…</div>
          ) : (
            <div className="space-y-2">
              {chatsData?.chats?.length ? (
                chatsData.chats.map((chat) => (
                  <div key={chat.chat_id} className="flex items-center justify-between bg-slate-50 rounded-md p-3">
                    <div className="text-sm">
                      <div className="font-medium text-slate-900">{chat.chat_name}</div>
                      <div className="text-xs text-slate-500">
                        Тип: {chat.chat_type === 1 ? 'Личный' : chat.chat_type === 2 ? 'Групповой' : 'Канал'}
                      </div>
                      <div className="text-xs text-slate-500">
                        Прикреплен: {new Date(chat.attached_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDetachFromChat(chat.chat_id)}
                      disabled={isDetachingChat}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                      title="Открепить от чата"
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 bg-slate-50 rounded-md p-3">
                  Задача не прикреплена ни к одному чату
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task Metadata */}
        <div className="border-t border-slate-200 pt-4 space-y-2">
          <div className="text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span>👤</span>
              <span>Создатель: {task.creator_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🏢</span>
              <span>Рабочее пространство: {task.workspace_name}</span>
            </div>
            {task.created_at && (
              <div className="flex items-center gap-2">
                <span>📝</span>
                <span>Создана: {new Date(task.created_at).toLocaleString('ru-RU')}</span>
              </div>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
            <button
              onClick={handleSave}
              disabled={!formData.title.trim() || isUpdatePending}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {isUpdatePending ? 'Сохраняем…' : '💾 Сохранить'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isUpdatePending}
              className="rounded-md bg-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-400 disabled:opacity-60"
            >
              ❌ Отмена
            </button>
          </div>
        )}
      </div>

      {/* Add Assignee Modal */}
      {showAddAssigneeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-slate-900 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Добавить исполнителя</h3>
            <p className="text-sm text-slate-600 mb-4">Найдите по имени или логину и выберите участника</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Поиск</label>
                <input
                  type="text"
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  placeholder="Имя, фамилия или логин…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none mb-2"
                />
                <label className="block text-sm font-medium text-slate-700 mb-2">Участник</label>
                <select
                  value={selectedUserId === '' ? '' : selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none"
                >
                  <option value="">Выберите пользователя</option>
                  {membersToAddFiltered.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.surname} {m.name} ({m.login})
                    </option>
                  ))}
                </select>
                {workspaceMembers.length > 0 && membersToAdd.length === 0 && (
                  <p className="text-sm text-slate-500 mt-2">Все участники уже назначены на задачу.</p>
                )}
                {assigneeSearch.trim() && membersToAddFiltered.length === 0 && membersToAdd.length > 0 && (
                  <p className="text-sm text-slate-500 mt-2">По запросу никого не найдено. Измените поиск.</p>
                )}
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowAddAssigneeModal(false)
                    setSelectedUserId('')
                    setAssigneeSearch('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddAssignee}
                  disabled={selectedUserId === '' || isAddingAssignee}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {isAddingAssignee ? 'Добавляем…' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Chat Modal */}
      {showAddChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-slate-900 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Прикрепить к чату</h3>
            <p className="text-sm text-slate-600 mb-4">Найдите по названию и выберите чат</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Поиск по названию</label>
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Название чата…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none mb-2"
                />
                <label className="block text-sm font-medium text-slate-700 mb-2">Чат</label>
                <select
                  value={selectedChatId === '' ? '' : selectedChatId}
                  onChange={(e) => setSelectedChatId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none"
                >
                  <option value="">Выберите чат</option>
                  {chatsToAddFiltered.map((c: WorkspaceChatItem) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {workspaceChats.length > 0 && chatsToAdd.length === 0 && (
                  <p className="text-sm text-slate-500 mt-2">Задача уже прикреплена ко всем чатам.</p>
                )}
                {chatSearch.trim() && chatsToAddFiltered.length === 0 && chatsToAdd.length > 0 && (
                  <p className="text-sm text-slate-500 mt-2">По запросу чатов не найдено.</p>
                )}
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowAddChatModal(false)
                    setSelectedChatId('')
                    setChatSearch('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAttachToChat}
                  disabled={selectedChatId === '' || isAttachingChat}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
                >
                  {isAttachingChat ? 'Прикрепляем…' : 'Прикрепить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskDetailPage

