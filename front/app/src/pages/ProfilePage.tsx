import { useMutation } from '@tanstack/react-query'
import { authApi, USER_STATUS_LABELS } from '../shared/api/auth'
import { useAuthStore } from '../shared/state/auth'

const ProfilePage = () => {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: authApi.me,
    onSuccess: (profile) => setUser(profile),
  })

  const { mutate: changeStatus, isPending: isChangingStatus } = useMutation({
    mutationFn: (status: number) => authApi.updateStatus(status),
    onSuccess: (res) => setUser(user ? { ...user, status: res.status } : user),
  })

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Профиль</h2>
        <p className="text-sm text-slate-600">Управление вашей учетной записью</p>
      </header>

      <div className="card space-y-4">
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Логин</div>
          <div className="text-sm font-medium text-slate-900">{user?.login || 'Не указан'}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">ФИО</div>
          <div className="text-sm font-medium text-slate-900">
            {[user?.surname, user?.name, user?.patronymic].filter(Boolean).join(' ') || 'Не указано'}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Статус</div>
          <select
            value={user?.status ?? ''}
            onChange={(e) => changeStatus(Number(e.target.value))}
            disabled={isChangingStatus}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white disabled:opacity-50"
          >
            {!user?.status && <option value="" disabled>Не указан</option>}
            {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="pt-2">
          <button
            onClick={() => mutateAsync()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
            disabled={isPending}
          >
            {isPending ? 'Загрузка...' : 'Обновить'}
          </button>
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">Ошибка при обновлении данных. Попробуйте позже.</div>}
      </div>
    </div>
  )
}

export default ProfilePage



















