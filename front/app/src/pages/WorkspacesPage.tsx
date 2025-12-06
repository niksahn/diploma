import { useQuery } from '@tanstack/react-query'
import { workspaceApi } from '../shared/api/workspaces'
import { useWorkspaceStore } from '../shared/state/workspace'

const WorkspacesPage = () => {
  const { selectedWorkspaceId, setSelectedWorkspace } = useWorkspaceStore()
  const { data, isLoading, error } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.list,
  })

  const workspaces = data ?? [
    { id: 'demo-ws', name: 'Демо РП', role: 'member', tariff: 'free' },
    { id: 'team-ops', name: 'Операционный', role: 'owner', tariff: 'pro' },
  ]

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Рабочие пространства</h2>
        <p className="text-sm text-slate-600">Выберите РП для работы с чатами и задачами</p>
      </header>

      {isLoading && <div className="text-sm text-slate-600">Загрузка…</div>}
      {error && <div className="text-sm text-amber-700">Не удалось загрузить из API, показываем заглушку.</div>}

      <div className="grid gap-3 md:grid-cols-2">
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => setSelectedWorkspace(ws.id)}
            className={`card text-left transition hover:shadow-md ${
              selectedWorkspaceId === ws.id ? 'border-slate-900 ring-1 ring-slate-900' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">{ws.name}</div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{ws.role || 'участник'}</span>
            </div>
            <div className="mt-2 text-sm text-slate-600">ID: {ws.id}</div>
            {ws.tariff && <div className="text-xs text-slate-500 mt-1">Тариф: {ws.tariff}</div>}
          </button>
        ))}
      </div>
    </div>
  )
}

export default WorkspacesPage

