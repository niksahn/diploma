import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { workspaceApi, type AcceptInviteResponse } from '../shared/api/workspaces'
import { authApi, extractToken, extractRefreshToken, type LoginResponse } from '../shared/api/auth'
import { useAuthStore } from '../shared/state/auth'
import { useWorkspaceStore } from '../shared/state/workspace'

type Mode = 'login' | 'register'

const roleLabel = (role: number) => (role === 2 ? 'Руководитель' : 'Участник')

const reasonLabel = (reason?: string) => {
  switch (reason) {
    case 'invite already used':
      return 'Эта ссылка уже была использована.'
    case 'invite has expired':
      return 'Срок действия этой ссылки истёк.'
    default:
      return 'Приглашение недействительно.'
  }
}

const InvitePage = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const authToken = useAuthStore((s) => s.token)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setUser = useAuthStore((s) => s.setUser)
  const setSelectedWorkspace = useWorkspaceStore((s) => s.setSelectedWorkspace)

  const [mode, setMode] = useState<Mode>('login')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    data: inviteInfo,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['invite-info', token],
    queryFn: () => workspaceApi.getInviteInfo(token!),
    enabled: !!token,
    retry: false,
  })

  const finalizeJoin = (res: AcceptInviteResponse) => {
    setSelectedWorkspace(res.workspace_id, res.role, res.workspace_name)
    navigate('/workspaces', { replace: true })
  }

  const acceptMutation = useMutation({
    mutationFn: () => workspaceApi.acceptInvite(token!),
    onSuccess: finalizeJoin,
  })

  const authAndAcceptMutation = useMutation({
    mutationFn: async (): Promise<AcceptInviteResponse> => {
      let data: LoginResponse
      if (mode === 'login') {
        data = await authApi.login({ login, password })
      } else {
        await authApi.register({ login, password, name, surname })
        data = await authApi.login({ login, password })
      }
      const accessToken = extractToken(data)
      const refreshTokenValue = extractRefreshToken(data)
      setAuth(accessToken, refreshTokenValue, data.user ?? null)
      if (!data.user) {
        const profile = await authApi.me()
        setUser(profile)
      }
      return workspaceApi.acceptInvite(token!)
    },
    onSuccess: finalizeJoin,
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    try {
      await authAndAcceptMutation.mutateAsync()
    } catch (err) {
      setFormError((err as Error).message)
    }
  }

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] sm:max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Загрузка…</p>
        </div>
      </div>
    )
  }

  if (isError || !inviteInfo?.valid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] sm:max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold mb-2">Приглашение недействительно</h1>
          <p className="text-sm text-slate-600 mb-4">{reasonLabel(inviteInfo?.reason)}</p>
          <a href="/auth" className="text-sm text-slate-600 hover:text-slate-900">
            Перейти на страницу входа
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] sm:max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-1">Приглашение в рабочее пространство</h1>
        <p className="text-sm text-slate-600 mb-4">
          «{inviteInfo.workspace_name}» · роль: {roleLabel(inviteInfo.role ?? 1)}
        </p>

        {authToken ? (
          <>
            {acceptMutation.error && (
              <div className="text-sm text-red-600 mb-3">{(acceptMutation.error as Error).message}</div>
            )}
            <button
              type="button"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {acceptMutation.isPending ? 'Присоединение…' : 'Присоединиться'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-4">
              Чтобы присоединиться, войдите в существующий аккаунт или зарегистрируйтесь.
            </p>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <label htmlFor="login" className="text-sm text-slate-700">
                Логин
                <input
                  id="login"
                  name="login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Введите логин"
                  required
                />
              </label>
              <label htmlFor="password" className="text-sm text-slate-700">
                Пароль
                <div className="relative mt-1">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm pr-10"
                    placeholder="Введите пароль"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </label>
              {mode === 'register' && (
                <div className="grid grid-cols-2 gap-3">
                  <label htmlFor="name" className="text-sm text-slate-700">
                    Имя
                    <input
                      id="name"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Иван"
                    />
                  </label>
                  <label htmlFor="surname" className="text-sm text-slate-700">
                    Фамилия
                    <input
                      id="surname"
                      name="surname"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Иванов"
                    />
                  </label>
                </div>
              )}
              {(authAndAcceptMutation.error || formError) && (
                <div className="text-sm text-red-600">
                  {(authAndAcceptMutation.error as Error)?.message || formError}
                </div>
              )}
              <button
                type="submit"
                disabled={authAndAcceptMutation.isPending}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {authAndAcceptMutation.isPending
                  ? 'Обработка…'
                  : mode === 'login'
                    ? 'Войти и присоединиться'
                    : 'Создать аккаунт и присоединиться'}
              </button>
            </form>
            <button onClick={toggleMode} className="mt-4 w-full text-sm text-slate-600 hover:text-slate-900 text-center">
              {mode === 'login' ? 'Нет аккаунта? Создайте его' : 'Уже есть аккаунт? Войти'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default InvitePage
