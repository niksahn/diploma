import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { taskApi, type CreateTaskRequest, TaskStatus } from '../shared/api/tasks'
import { workspaceApi, type WorkspaceMember } from '../shared/api/workspaces'
import { chatApi, type Chat } from '../shared/api/chats'
import { useWorkspaceStore } from '../shared/state/workspace'

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: TaskStatus.TODO, label: 'К выполнению' },
  { value: TaskStatus.IN_PROGRESS, label: 'В работе' },
  { value: TaskStatus.REVIEW, label: 'На проверке' },
  { value: TaskStatus.DONE, label: 'Выполнена' },
  { value: TaskStatus.CANCELLED, label: 'Отменена' },
]

const TaskCreatePage = () => {
  const navigate = useNavigate()
  const { selectedWorkspaceId } = useWorkspaceStore()

  const [formData, setFormData] = useState<CreateTaskRequest>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    workspace_id: selectedWorkspaceId || 0,
    description: '',
    status: TaskStatus.TODO,
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
  const rawChats = Array.isArray((chatsData as any)?.chats)
    ? (chatsData as any).chats
    : Array.isArray(chatsData)
      ? chatsData
      : []

  const chats: Chat[] = rawChats.map((c: any) => ({
    id: typeof c.id === 'number' ? c.id : parseInt(String(c.id ?? '0'), 10) || 0,
    name: String(c.name ?? 'Без названия'),
    type: typeof c.type === 'number' ? c.type : 2, // default to group chat type
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

  const inputBase = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none'
  const labelBase = 'block text-sm font-medium text-slate-700 mb-1.5'

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Создание задачи</h2>
        <p className="text-sm text-slate-600 mt-1">Заполните основные поля — название и срок обязательны. Исполнители и чат можно выбрать по желанию.</p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Блок: основная информация */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">Основная информация</h3>
          <div>
            <label htmlFor="title" className={labelBase}>Название задачи *</label>
            <input
              id="title"
              type="text"
              required
              minLength={3}
              maxLength={100}
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={inputBase}
              placeholder="Кратко сформулируйте задачу"
            />
          </div>
          <div>
            <label htmlFor="description" className={labelBase}>Описание</label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`${inputBase} resize-y min-h-[80px]`}
              placeholder="Опишите задачу подробно (необязательно)"
            />
          </div>
        </section>

        {/* Блок: срок и статус */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">Срок и статус</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className={labelBase}>Дата выполнения *</label>
              <input
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className={`${inputBase} [color-scheme:light]`}
              />
            </div>
            <div>
              <label htmlFor="status" className={labelBase}>Начальный статус</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: Number(e.target.value) as TaskStatus }))}
                className={`${inputBase} cursor-pointer`}
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Блок: исполнители и чат */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">Исполнители и чат (необязательно)</h3>
          <div>
            <label className={labelBase}>Исполнители</label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              {members.length === 0 ? (
                <div className="text-sm text-slate-500">Загрузка участников пространства…</div>
              ) : (
                <ul className="space-y-2">
                  {members.map((member: WorkspaceMember) => (
                    <label key={member.user_id} className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAssignees.includes(member.user_id)}
                        onChange={() => handleAssigneeToggle(member.user_id)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                      <span className="text-sm text-slate-700">
                        {member.surname} {member.name} ({member.login})
                      </span>
                    </label>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="chat" className={labelBase}>Привязать к чату</label>
            <select
              id="chat"
              value={formData.chat_id || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                chat_id: e.target.value ? Number(e.target.value) : undefined
              }))}
              className={`${inputBase} cursor-pointer`}
            >
              <option value="">Без чата</option>
              {chats.map((chat: Chat) => (
                <option key={chat.id} value={chat.id}>
                  {chat.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
            Произошла ошибка при создании задачи. Проверьте данные и попробуйте снова.
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
          <button
            type="submit"
            disabled={isPending || !formData.title.trim() || !formData.date}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Создаём…' : 'Создать задачу'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}

export default TaskCreatePage
