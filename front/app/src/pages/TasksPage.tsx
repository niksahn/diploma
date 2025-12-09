import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { taskApi, type Task } from '../shared/api/tasks'
import { useWorkspaceStore } from '../shared/state/workspace'

const TasksPage = () => {
  const { selectedWorkspaceId } = useWorkspaceStore()
  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', selectedWorkspaceId],
    queryFn: () => taskApi.list(selectedWorkspaceId || 0),
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

  const tasks = data?.tasks || []

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

      <div className="grid gap-3 md:grid-cols-2">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="text-sm text-slate-600">Загрузка…</div>
          </div>
        ) : error ? (
          <div className="col-span-full text-center py-8">
            <div className="text-sm text-amber-700">Упс, тут пусто</div>
            <div className="text-xs text-slate-500 mt-1">Не удалось загрузить задачи</div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <div className="text-sm text-slate-600">Упс, тут пусто</div>
            <div className="text-xs text-slate-500 mt-1">У вас пока нет задач</div>
          </div>
        ) : (
          tasks.map((task: Task) => (
            <Link key={task.id} to={`/tasks/${task.id}`} className="card hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-slate-900">{task.title}</div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{task.status_name || '—'}</span>
              </div>
              {task.description && (
                <div className="mt-2 text-sm text-slate-600 line-clamp-2">{task.description}</div>
              )}
              <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                <span>Создал: {task.creator_name}</span>
                <span>Исполнителей: {task.assignee_count || 0}</span>
              </div>
              {task.created_at && (
                <div className="text-xs text-slate-500 mt-1">Создано: {new Date(task.created_at).toLocaleString()}</div>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export default TasksPage




