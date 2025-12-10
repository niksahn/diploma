import { useQuery } from '@tanstack/react-query'
import { workspaceApi } from '../shared/api/workspaces'
import { useWorkspaceStore } from '../shared/state/workspace'

const WorkspacesPage = () => {
  const { selectedWorkspaceId, setSelectedWorkspace } = useWorkspaceStore()
  const { data, isLoading, error } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.list,
  })

  type WorkspaceView = { id: number; name: string; role?: string; tariff?: string }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = Array.isArray((data as any)?.workspaces) // если API возвращает { workspaces: [...] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (data as any).workspaces
    : Array.isArray(data)
      ? data
      : []

   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaces: WorkspaceView[] = raw.map((item: any) => ({
    id: Number(item.id ?? item.workspacesid ?? 0),
    name: String(item.name ?? 'Без названия'),
    role: item.role ?? item.userRole,
    tariff: item.tariff ?? item.tariffsid ?? item.tariffName,
  }))

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Рабочие пространства</h2>
        <p className="text-sm text-slate-600">Выберите РП для работы с чатами и задачами</p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="text-sm text-slate-600">Загрузка…</div>
          </div>
        ) : error ? (
          <div className="col-span-full text-center py-8">
            <div className="text-sm text-amber-700">Упс, тут пусто</div>
            <div className="text-xs text-slate-500 mt-1">Не удалось загрузить рабочие пространства</div>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <div className="text-sm text-slate-600">Упс, тут пусто</div>
            <div className="text-xs text-slate-500 mt-1">У вас пока нет рабочих пространств</div>
          </div>
        ) : (
          workspaces.map((ws) => (
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
          ))
        )}
      </div>
    </div>
  )
}

export default WorkspacesPage


