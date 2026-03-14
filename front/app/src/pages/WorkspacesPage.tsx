import { useQuery } from '@tanstack/react-query'
import { workspaceApi } from '../shared/api/workspaces'
import { useWorkspaceStore } from '../shared/state/workspace'

const WorkspacesPage = () => {
  const { selectedWorkspaceId, setSelectedWorkspace } = useWorkspaceStore()
  const { data, isLoading, error } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.list,
  })

  type WorkspaceView = { id: number; name: string; role?: number | string; tariff?: string }

  const raw = Array.isArray((data as any)?.workspaces) // if API returns object with workspaces property
    ? (data as any).workspaces
    : Array.isArray(data)
      ? data
      : []

  const workspaces: WorkspaceView[] = raw.map((item: any) => ({
    id: Number(item.id ?? item.workspacesid ?? 0),
    name: String(item.name ?? 'Рабочее пространство'),
    role: item.role ?? item.userRole,
    tariff: item.tariff ?? item.tariffsid ?? item.tariffName,
  }))

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Рабочие пространства</h2>
        <p className="text-sm text-slate-600">Выберите пространство для работы с чатами и задачами</p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="text-sm text-slate-600">Загрузка…</div>
          </div>
        ) : error ? (
          <div className="col-span-full text-center py-8">
            <div className="text-sm text-amber-700">Данные не загружены</div>
            <div className="text-xs text-slate-500 mt-1">Не удалось загрузить рабочие пространства</div>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <div className="text-sm text-slate-600">Нет рабочих пространств</div>
            <div className="text-xs text-slate-500 mt-1">Обратитесь к администратору для создания рабочего пространства</div>
          </div>
        ) : (
          workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() =>
                setSelectedWorkspace(
                  ws.id,
                  typeof ws.role === 'number' ? ws.role : parseInt(String(ws.role || '0'), 10) || null,
                  ws.name,
                )
              }
              className={`card text-left transition hover:shadow-md ${
                selectedWorkspaceId === ws.id ? 'border-slate-900 ring-1 ring-slate-900' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-slate-900">{ws.name}</div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  {(() => {
                    const roleNum = typeof ws.role === 'number' ? ws.role : parseInt(String(ws.role || '0'), 10)
                    if (roleNum === 2) return 'руководитель'
                    if (roleNum === 1) return 'участник'
                    return 'участник'
                  })()}
                </span>
              </div>
              {ws.tariff && <div className="mt-2 text-xs text-slate-500">Тариф: {ws.tariff}</div>}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default WorkspacesPage


