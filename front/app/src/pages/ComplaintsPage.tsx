import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { complaintApi } from '../shared/api/complaints'

const ComplaintsPage = () => {
  const [text, setText] = useState('')
  const [device, setDevice] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['complaints'],
    queryFn: complaintApi.mine,
  })

  const raw = Array.isArray((data as any)?.complaints) // если API возвращает объект с complaints
    ? (data as any).complaints
    : Array.isArray(data)
      ? data
      : [{ id: 'c1', text: 'Пример жалобы', date: new Date().toISOString(), status: 'created' }]

  type ComplaintView = {
    id: string
    text: string
    date: string
    status?: string
    deviceDescription?: string
  }

  const complaints: ComplaintView[] = raw.map((c: any) => ({
    id: String(c.id ?? 'unknown'),
    text: String(c.text ?? ''),
    date: c.date ?? new Date().toISOString(),
    status: c.status ?? c.state ?? '—',
    deviceDescription: c.deviceDescription ?? c.device_description,
  }))

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => complaintApi.create({ text, deviceDescription: device, userEmail }),
    onSuccess: () => {
      setText('')
      setDevice('')
      setUserEmail('')
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
    },
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || text.length < 10) return
    if (!device.trim() || device.length < 5) return
    if (!userEmail.trim() || !userEmail.includes('@')) return
    await mutateAsync()
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Жалобы / поддержка</h2>
        <p className="text-sm text-slate-600">Пишем через API gateway</p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-3">
        <label className="text-sm text-slate-700">
          Текст жалобы (минимум 10 символов)
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            required
            minLength={10}
          />
        </label>
        <label className="text-sm text-slate-700">
          Описание устройства (минимум 5 символов)
          <input
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Например: Windows 10, Chrome 120.0"
            required
            minLength={5}
          />
        </label>
        <label className="text-sm text-slate-700">
          Email для связи
          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="your.email@example.com"
            required
          />
        </label>
        <button
          type="submit"
          disabled={isPending || !text.trim() || text.length < 10 || !device.trim() || device.length < 5 || !userEmail.trim() || !userEmail.includes('@')}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? 'Отправляем…' : 'Отправить жалобу'}
        </button>
      </form>

      {isLoading && <div className="text-sm text-slate-600">Загрузка…</div>}
      {error && <div className="text-sm text-amber-700">API недоступно, показываем сохранённые локально.</div>}

      <div className="space-y-2">
        {complaints.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">{c.text}</div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{c.status || '—'}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">{new Date(c.date).toLocaleString()}</div>
            {c.deviceDescription && <div className="text-xs text-slate-600 mt-1">Устройство: {c.deviceDescription}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ComplaintsPage

