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

const TaskDetailPage = () => {
  const { taskId } = useParams()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<TaskStatus | ''>('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.byId(Number(taskId) || 0),
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

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (next: TaskStatus) => taskApi.updateStatus(task.id, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      setStatus('')
    },
  })

  const handleUpdateStatus = async () => {
    if (!status) return
    await mutateAsync(status)
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{task.title}</h2>
          <p className="text-sm text-slate-600">ID: {task.id}</p>
        </div>
      </header>

      {isLoading && <div className="text-sm text-slate-600">Загрузка…</div>}
      {error && <div className="text-sm text-amber-700">API недоступно, показываем демо-данные.</div>}

      <div className="card space-y-3">
        <div className="text-sm text-slate-800 whitespace-pre-wrap">{task.description}</div>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">Статус: {task.status_name}</span>
          <span>Исполнителей: {task.assignee_count}</span>
        </div>
        <div className="text-sm text-slate-600">
          <div>Создатель: {task.creator_name}</div>
          <div>Рабочее пространство: {task.workspace_name}</div>
          <div>Дата выполнения: {new Date(task.date).toLocaleDateString()}</div>
          {task.created_at && <div>Создана: {new Date(task.created_at).toLocaleString()}</div>}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(Number(e.target.value) as TaskStatus)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Сменить статус</option>
            {statusOptions.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleUpdateStatus}
            disabled={!status || isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending ? 'Сохраняем…' : 'Обновить'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TaskDetailPage

