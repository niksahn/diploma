import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { taskApi, type Task } from '../shared/api/tasks'
import { useWorkspaceStore } from '../shared/state/workspace'

const getStatusColor = (status?: string) => {
  if (!status) return 'bg-slate-100 text-slate-700'
  switch (status) {
    case 'TODO':
    case 'TODO - К выполнению':
      return 'bg-blue-100 text-blue-700'
    case 'IN_PROGRESS':
    case 'IN_PROGRESS - В работе':
      return 'bg-amber-100 text-amber-700'
    case 'REVIEW':
    case 'REVIEW - На проверке':
      return 'bg-purple-100 text-purple-700'
    case 'DONE':
    case 'DONE - Выполнено':
      return 'bg-green-100 text-green-700'
    case 'CANCELLED':
    case 'CANCELLED - Отменено':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

const getRussianStatus = (status?: string) => {
  if (!status) return 'Не указано'
  return status.replace(/^[A-Z_]+ - /, '')
}

const formatAssigneeCount = (count: number) => {
  const lastTwo = count % 100
  const lastOne = count % 10
  if (lastTwo >= 11 && lastTwo <= 19) {
    return `${count} исполнителей`
  }
  if (lastOne === 1) {
    return `${count} исполнитель`
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return `${count} исполнителя`
  }
  return `${count} исполнителей`
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return `сегодня, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (diffDays === 1) {
    return `вчера, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (diffDays < 7) {
    return `${diffDays} дн. назад, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  }
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const TasksPage = () => {
  const { selectedWorkspaceId, selectedWorkspaceName } = useWorkspaceStore()
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
  const workspaceTitle = tasks[0]?.workspace_name || selectedWorkspaceName || `РП #${selectedWorkspaceId}`

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Задачи</h2>
          <p className="text-sm text-slate-600">{workspaceTitle}</p>
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
            <div className="text-sm text-slate-600">Загрузка задач…</div>
          </div>
        ) : error ? (
          <div className="col-span-full text-center py-8">
            <div className="text-sm text-red-700">Ошибка загрузки</div>
            <div className="text-xs text-slate-500 mt-1">Не удалось получить список задач. Попробуйте позже.</div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-base text-slate-600 mb-2">Задач пока нет</div>
            <div className="text-sm text-slate-500 mb-4">Создайте первую задачу для этого рабочего пространства</div>
            <Link
              to="/tasks/new"
              className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Создать задачу
            </Link>
          </div>
        ) : (
          tasks.map((task: Task) => (
            <Link key={task.id} to={`/tasks/${task.id}`} className="card hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-slate-900 flex-1 pr-3">{task.title}</div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(task.status_name)}`}>
                  {getRussianStatus(task.status_name)}
                </span>
              </div>
              {task.description && (
                <div className="mt-2 text-sm text-slate-600 line-clamp-2">{task.description}</div>
              )}
              <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                <span>Создатель: {task.creator_name}</span>
                <span>{formatAssigneeCount(task.assignee_count || 0)}</span>
              </div>
              {task.created_at && (
                <div className="text-xs text-slate-500 mt-2">Создано {formatDate(task.created_at)}</div>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export default TasksPage




