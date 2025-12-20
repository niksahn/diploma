import { useMutation } from '@tanstack/react-query'
import { authApi } from '../shared/api/auth'
import { useAuthStore } from '../shared/state/auth'

const ProfilePage = () => {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: authApi.me,
    onSuccess: (profile) => setUser(profile),
  })

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Профиль</h2>
        <p className="text-sm text-slate-600">Данные пользователя из gateway</p>
      </header>

      <div className="card space-y-2">
        <div className="text-sm text-slate-700">Логин: {user?.login || '—'}</div>
        <div className="text-sm text-slate-700">
          ФИО: {[user?.surname, user?.name, user?.patronymic].filter(Boolean).join(' ') || '—'}
        </div>
        <div className="text-sm text-slate-700">Статус: {user?.status || '—'}</div>
        <button
          onClick={() => mutateAsync()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          disabled={isPending}
        >
          {isPending ? 'Обновляем…' : 'Обновить из API'}
        </button>
        {error && <div className="text-sm text-amber-700">Не удалось обновить профиль: {(error as Error).message}</div>}
      </div>
    </div>
  )
}

export default ProfilePage



















