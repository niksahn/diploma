import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { taskApi, type TaskStatus } from '../shared/api/tasks'

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

  // States for assignees management
  const [showAddAssigneeModal, setShowAddAssigneeModal] = useState(false)
  const [newAssigneeLogin, setNewAssigneeLogin] = useState('')

  // States for chats management
  const [showAddChatModal, setShowAddChatModal] = useState(false)
  const [newChatId, setNewChatId] = useState('')

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
      setNewAssigneeLogin('')
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
      setNewChatId('')
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
    if (!newAssigneeLogin.trim()) return
    await addAssigneesMutation([parseInt(newAssigneeLogin) || 1])
  }

  const handleRemoveAssignee = async (userId: number) => {
    await removeAssigneeMutation(userId)
  }

  const handleAttachToChat = async () => {
    if (!newChatId.trim()) return
    await attachToChatMutation(parseInt(newChatId))
  }

  const handleDetachFromChat = async (chatId: number) => {
    await detachFromChatMutation(chatId)
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          {isEditing ? (
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="text-xl font-semibold text-slate-900 border-b border-slate-300 focus:border-slate-500 outline-none bg-transparent"
              placeholder="Название задачи"
            />
          ) : (
            <h2 className="text-xl font-semibold text-slate-900">{task.title}</h2>
          )}
          <p className="text-sm text-slate-600">ID: {task.id}</p>
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none resize-vertical"
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
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
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
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Добавить исполнителя</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ID пользователя или логин
                </label>
                <input
                  type="text"
                  value={newAssigneeLogin}
                  onChange={(e) => setNewAssigneeLogin(e.target.value)}
                  placeholder="Введите ID пользователя или логин"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowAddAssigneeModal(false)
                    setNewAssigneeLogin('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddAssignee}
                  disabled={!newAssigneeLogin.trim() || isAddingAssignee}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Прикрепить к чату</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ID чата
                </label>
                <input
                  type="number"
                  value={newChatId}
                  onChange={(e) => setNewChatId(e.target.value)}
                  placeholder="Введите ID чата"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowAddChatModal(false)
                    setNewChatId('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAttachToChat}
                  disabled={!newChatId.trim() || isAttachingChat}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-60"
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

