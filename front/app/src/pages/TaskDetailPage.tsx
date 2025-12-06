import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { taskApi } from '../shared/api/tasks'

const statuses = ['todo', 'in_progress', 'done']

const TaskDetailPage = () => {
  const { taskId } = useParams()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.byId(taskId || ''),
    enabled: Boolean(taskId),
  })

  const task = data ?? {
    id: taskId || 'demo-task',
    title: 'Демо-задача',
    description: 'Описание задачи заглушка',
    status: 'todo',
    assignees: ['demo'],
    updatedAt: new Date().toISOString(),
  }

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (next: string) => taskApi.updateStatus(task.id, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
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
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">Статус: {task.status}</span>
          {task.assignees && <span>Исполнители: {task.assignees.join(', ')}</span>}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Сменить статус</option>
            {statuses.map((st) => (
              <option key={st} value={st}>
                {st}
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

