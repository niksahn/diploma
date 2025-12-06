import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { taskApi } from '../shared/api/tasks'
import { useWorkspaceStore } from '../shared/state/workspace'

const TasksPage = () => {
  const { selectedWorkspaceId } = useWorkspaceStore()
  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', selectedWorkspaceId],
    queryFn: () => taskApi.list(selectedWorkspaceId || ''),
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

  const tasks = data ?? [
    { id: 't1', title: 'Согласовать ТЗ', status: 'in_progress', assignees: ['demo'], updatedAt: new Date().toISOString() },
    { id: 't2', title: 'Подготовить отчёт', status: 'todo', assignees: ['you'], updatedAt: new Date().toISOString() },
  ]

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Задачи</h2>
          <p className="text-sm text-slate-600">Рабочее пространство: {selectedWorkspaceId}</p>
        </div>
        <Link
          to="/tasks/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Создать задачу
        </Link>
      </header>

      {isLoading && <div className="text-sm text-slate-600">Загрузка…</div>}
      {error && <div className="text-sm text-amber-700">API недоступно, показываем демо-данные.</div>}

      <div className="grid gap-3 md:grid-cols-2">
        {tasks.map((task) => (
          <Link key={task.id} to={`/tasks/${task.id}`} className="card hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">{task.title}</div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{task.status || '—'}</span>
            </div>
            {task.assignees && (
              <div className="mt-2 text-sm text-slate-600">Исполнители: {task.assignees.join(', ')}</div>
            )}
            {task.updatedAt && (
              <div className="text-xs text-slate-500 mt-1">Обновлено: {new Date(task.updatedAt).toLocaleString()}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default TasksPage

