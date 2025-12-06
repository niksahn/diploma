import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { complaintApi } from '../shared/api/complaints'

const ComplaintsPage = () => {
  const [text, setText] = useState('')
  const [device, setDevice] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['complaints'],
    queryFn: complaintApi.mine,
  })

  const complaints = data ?? [
    { id: 'c1', text: 'Пример жалобы', date: new Date().toISOString(), status: 'created' },
  ]

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => complaintApi.create({ text, deviceDescription: device }),
    onSuccess: () => {
      setText('')
      setDevice('')
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
    },
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
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
          Текст жалобы
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            required
          />
        </label>
        <label className="text-sm text-slate-700">
          Описание устройства (опционально)
          <input
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Например: Windows 10, Chrome"
          />
        </label>
        <button
          type="submit"
          disabled={isPending || !text.trim()}
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

