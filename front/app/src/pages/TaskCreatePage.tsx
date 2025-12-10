import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { taskApi, type CreateTaskRequest, type TaskStatus } from '../shared/api/tasks'
import { workspaceApi, type WorkspaceMember } from '../shared/api/workspaces'
import { chatApi, type Chat } from '../shared/api/chats'
import { useWorkspaceStore } from '../shared/state/workspace'

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 1, label: 'К выполнению' },
  { value: 2, label: 'В работе' },
  { value: 3, label: 'На проверке' },
  { value: 4, label: 'Выполнена' },
  { value: 5, label: 'Отменена' },
]

const TaskCreatePage = () => {
  const navigate = useNavigate()
  const { selectedWorkspaceId } = useWorkspaceStore()

  const [formData, setFormData] = useState<CreateTaskRequest>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    workspace_id: selectedWorkspaceId || 0,
    description: '',
    status: 1,
    assigned_users: [],
    chat_id: undefined,
  })

  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([])

  // Загружаем пользователей рабочего пространства
  const { data: membersData } = useQuery({
    queryKey: ['workspace-members', selectedWorkspaceId],
    queryFn: () => workspaceApi.users(selectedWorkspaceId || 0),
    enabled: Boolean(selectedWorkspaceId),
  })

  // Загружаем чаты рабочего пространства
  const { data: chatsData } = useQuery({
    queryKey: ['workspace-chats', selectedWorkspaceId],
    queryFn: () => chatApi.list(selectedWorkspaceId || 0),
    enabled: Boolean(selectedWorkspaceId),
  })

  const members = membersData?.members || []

  // Обрабатываем ответ API чатов (может быть массивом или объектом с полем chats)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawChats = Array.isArray((chatsData as any)?.chats)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (chatsData as any).chats
    : Array.isArray(chatsData)
      ? chatsData
      : []

   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chats: Chat[] = rawChats.map((c: any) => ({
    id: typeof c.id === 'number' ? c.id : parseInt(String(c.id ?? '0'), 10) || 0,
    name: String(c.name ?? 'Без названия'),
    type: typeof c.type === 'number' ? c.type : 2, // по умолчанию групповой
    unread: typeof c.unread === 'number' ? c.unread : 0,
    members_count: typeof c.members_count === 'number' ? c.members_count : 0,
  }))

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (data: CreateTaskRequest) => taskApi.create(data),
    onSuccess: () => {
      navigate('/tasks')
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.date || !selectedWorkspaceId) {
      return
    }

    const dataToSend: CreateTaskRequest = {
      ...formData,
      workspace_id: selectedWorkspaceId,
      assigned_users: selectedAssignees.length > 0 ? selectedAssignees : undefined,
      chat_id: formData.chat_id || undefined,
    }

    await mutateAsync(dataToSend)
  }

  const handleAssigneeToggle = (userId: number) => {
    setSelectedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  if (!selectedWorkspaceId) {
    return (
      <div className="card">
        <div className="text-sm text-slate-700">
          Сначала выберите рабочее пространство для создания задачи.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Создание задачи</h2>
        <p className="text-sm text-slate-600">Заполните информацию о новой задаче</p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {/* Название задачи */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
            Название задачи *
          </label>
          <input
            id="title"
            type="text"
            required
            minLength={3}
            maxLength={100}
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="Введите название задачи"
          />
        </div>

        {/* Дата выполнения */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1">
            Дата выполнения *
          </label>
          <input
            id="date"
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        {/* Описание */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
            Описание
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="Опишите задачу подробно"
          />
        </div>

        {/* Статус */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">
            Начальный статус
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: Number(e.target.value) as TaskStatus }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Исполнители */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Исполнители
          </label>
          <div className="max-h-32 overflow-y-auto border border-slate-300 rounded-md p-2">
            {members.length === 0 ? (
              <div className="text-sm text-slate-500">Загрузка пользователей...</div>
            ) : (
              members.map((member: WorkspaceMember) => (
                <label key={member.user_id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedAssignees.includes(member.user_id)}
                    onChange={() => handleAssigneeToggle(member.user_id)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">
                    {member.name} {member.surname} ({member.login})
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Привязка к чату */}
        <div>
          <label htmlFor="chat" className="block text-sm font-medium text-slate-700 mb-1">
            Привязать к чату
          </label>
          <select
            id="chat"
            value={formData.chat_id || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              chat_id: e.target.value ? Number(e.target.value) : undefined
            }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">Не привязывать</option>
            {chats.map((chat: Chat) => (
              <option key={chat.id} value={chat.id}>
                {chat.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            Произошла ошибка при создании задачи
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={isPending || !formData.title.trim() || !formData.date}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending ? 'Создаём…' : 'Создать задачу'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}

export default TaskCreatePage
