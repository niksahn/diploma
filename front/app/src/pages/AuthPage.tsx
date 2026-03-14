import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi, extractToken, extractRefreshToken, type LoginResponse } from '../shared/api/auth'
import { useAuthStore } from '../shared/state/auth'

type Mode = 'login' | 'register'

const AuthPage = () => {
  const [mode, setMode] = useState<Mode>('login')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const setUser = useAuthStore((s) => s.setUser)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async (): Promise<LoginResponse> => {
      if (mode === 'login') {
        return authApi.login({ login, password })
      }
      await authApi.register({ login, password, name, surname })
      return authApi.login({ login, password })
    },
    onSuccess: async (data) => {
      try {
        const token = extractToken(data)
        const refreshToken = extractRefreshToken(data)
        setAuth(token, refreshToken, data.user ?? null)
        if (!data.user) {
          const profile = await authApi.me()
          setUser(profile)
        }
        const from = (location.state as { from?: Location })?.from?.pathname || '/workspaces'
        navigate(from, { replace: true })
      } catch (err) {
        setTokenError((err as Error).message)
      }
    },
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTokenError(null)
    await mutateAsync()
  }

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'))
  }

  const handleDemoLogin = () => {
    setAuth('demo-token', null, { id: '1', login: 'demo', name: 'Demo User' })
    navigate('/workspaces', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] sm:max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-4">{mode === 'login' ? 'Вход в систему' : 'Регистрация'}</h1>
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
          {(error || tokenError) && (
            <div className="text-sm text-red-600">
              {(error as Error)?.message || tokenError}
            </div>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? 'Обработка…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>
        <button onClick={toggleMode} className="mt-4 w-full text-sm text-slate-600 hover:text-slate-900 text-center">
          {mode === 'login' ? 'Нет аккаунта? Создайте его' : 'Уже есть аккаунт? Войти'}
        </button>
        <button
          onClick={handleDemoLogin}
          className="mt-2 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          type="button"
        >
          Демо-доступ
        </button>
      </div>
    </div>
  )
}

export default AuthPage

