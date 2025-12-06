import { request } from './client'

export type Chat = {
  id: string
  name: string
  type?: string
  unread?: number
}

export type Message = {
  id: string
  text: string
  author: string
  date: string
}

export const chatApi = {
  list: (workspaceId: string) => request<Chat[]>(`/chats?workspaceId=${workspaceId}`),
  messages: (chatId: string) => request<Message[]>(`/chats/${chatId}/messages`),
  sendMessage: (chatId: string, text: string) =>
    request<Message>(`/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
}

