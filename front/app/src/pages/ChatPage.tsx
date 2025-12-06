import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi, type Message } from '../shared/api/chats'

const ChatPage = () => {
  const { chatId } = useParams()
  const [text, setText] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => chatApi.messages(chatId || ''),
    enabled: Boolean(chatId),
  })

  const messages = useMemo<Message[]>(() => {
    return (
      data ?? [
        { id: 'm1', text: 'Добро пожаловать в чат', author: 'system', date: new Date().toISOString() },
        { id: 'm2', text: 'Это демо-сообщение', author: 'demo', date: new Date().toISOString() },
      ]
    )
  }, [data])

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: { chatId: string; text: string }) => chatApi.sendMessage(payload.chatId, payload.text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] })
      setText('')
    },
  })

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!chatId || !text.trim()) return
    await mutateAsync({ chatId, text })
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Чат</h2>
          <p className="text-sm text-slate-600">ID: {chatId}</p>
        </div>
      </header>

      {isLoading && <div className="text-sm text-slate-600">Загрузка сообщений…</div>}
      {error && <div className="text-sm text-amber-700">API недоступно, показываем демо-лента.</div>}

      <div className="card space-y-3 max-h-[60vh] overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="rounded-md border border-slate-100 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">{msg.author}</span>
              <span className="text-xs text-slate-500">{new Date(msg.date).toLocaleTimeString()}</span>
            </div>
            <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{msg.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ваше сообщение…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending || !text.trim()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? 'Отправка…' : 'Отправить'}
        </button>
      </form>
    </div>
  )
}

export default ChatPage

