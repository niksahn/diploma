import { request } from './client'
import { useAuthStore } from '../state/auth'

export type Chat = {
  id: number
  name: string
  type?: number
  unread?: number
  members_count?: number
}

export type ChatDetails = {
  id: number
  name: string
  type: number
  workspace_id: number
  members_count: number
  created_at: string
  my_role: number
}

export type ChatMember = {
  id: number
  user_id: number
  login: string
  name: string
  surname: string
  role: number
  status: number
  joined_at: string
}

export type ChatTaskInfo = {
  attached_at: string
  creator: number
  creator_name: string
  date: string
  description?: string
  id: number
  status: number
  status_name: string
  title: string
  workspace_id: number
  workspace_name: string
}

export type ChatTasksResponse = {
  tasks: ChatTaskInfo[]
  total: number
}

export type ChatMembersResponse = {
  members: ChatMember[]
  total: number
}

export type AddMembersRequest = {
  user_ids: number[]
  role: number
}

export type AddMembersResponse = {
  added: number[]
  chat_id: number
}

export const CHAT_TYPES = {
  PERSONAL: 1,
  GROUP: 2,
  CHANNEL: 3,
} as const

export type Message = {
  chat_id: number
  date: number
  edited: boolean
  id: number
  status: string
  text: string
  user_id: number
  user_name: string
}

// WebSocket класс для real-time чатов
export class ChatWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private chatId: number | null = null
  private onMessage: ((message: Message) => void) | null = null
  private onError: ((error: Event) => void) | null = null
  private onClose: (() => void) | null = null

  connect(chatId: number) {
    console.log(`WebSocket: Starting connection to chat ${chatId}`)
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Already connected, skipping')
      return // Уже подключен
    }

    this.chatId = chatId
    const token = useAuthStore.getState().token

    if (!token) {
      console.error('WebSocket: No auth token for WebSocket connection')
      return
    }

    // Прямое подключение к чат-сервису
    const wsUrl = `ws://localhost:8084/ws/chats/ws?token=${token}`
    console.log(`WebSocket: Connecting via Vite proxy to ${wsUrl}`)
    console.log(`WebSocket: Token preview: ${token.substring(0, 20)}...`)
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log(`WebSocket connected to chat ${chatId}`)
      this.reconnectAttempts = 0

      // Отправляем команду на подписку к чату
      this.send({ type: 'join_chat', chat_id: chatId })
    }

    // WebSocket открыт и готов к работе

    this.ws.onmessage = (event) => {
      try {
        // Сервер может отправлять несколько JSON сообщений в одном фрейме, разделенных \n
        const messages = event.data.trim().split('\n').filter((msg: string) => msg.trim())

        for (const messageStr of messages) {
          try {
            const data = JSON.parse(messageStr)
            console.log('WebSocket message received:', data)

            switch (data.type) {
              case 'error':
                console.log('=== WEBSOCKET SERVER ERROR ===')
                console.error('WebSocket error from server:', data.error)
                console.log('WebSocket full error data:', data)
                // Не разрываем соединение при ошибке
                break
              case 'new_message':
                console.log('=== WEBSOCKET NEW MESSAGE ===')
                console.log('Received new message:', data.message)
                console.log('Full message data:', data)
                if (data.message && this.onMessage) {
                  this.onMessage(data.message)
                }
                break
              case 'joined_chat':
                console.log('Successfully joined chat:', data.chat_id)
                break
              case 'user_joined':
                console.log('User joined chat:', data.user_id, data.user_name)
                break
              case 'user_left':
                console.log('User left chat:', data.user_id)
                break
              case 'user_typing':
                console.log('User typing:', data.user_id, data.user_name)
                break
              case 'user_stopped_typing':
                console.log('User stopped typing:', data.user_id)
                break
              default:
                console.log('Unknown WebSocket message type:', data.type, data)
            }
          } catch (parseError) {
            console.error('Failed to parse individual WebSocket message:', parseError, 'Message:', messageStr)
          }
        }
      } catch (error) {
        console.error('Failed to process WebSocket message batch:', error, 'Raw data:', event.data)
      }
    }

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      })
      if (this.onClose) {
        this.onClose()
      }
      this.attemptReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error event:', error)
      if (this.onError) {
        this.onError(error)
      }
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.chatId = null
  }

  send(data: any) {
    console.log('=== WEBSOCKET FRONTEND SEND ===')
    console.log('WebSocket: Sending message:', data)
    console.log('WebSocket: Connection state:', this.ws?.readyState)
    console.log('WebSocket: Is connected:', this.isConnected)

    if (this.ws?.readyState === WebSocket.OPEN) {
      const messageString = JSON.stringify(data)
      console.log('WebSocket: Sending JSON string:', messageString)
      this.ws.send(messageString)
      console.log('WebSocket: Message sent successfully')
    } else {
      console.error('WebSocket: Not connected, cannot send:', data, 'State:', this.ws?.readyState)
      console.error('WebSocket: Available states: CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3')
    }
  }

  onMessageReceived(callback: (message: Message) => void) {
    this.onMessage = callback
  }

  onErrorReceived(callback: (error: Event) => void) {
    this.onError = callback
  }

  onConnectionClosed(callback: () => void) {
    this.onClose = callback
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.chatId) {
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      this.connect(this.chatId!)
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const chatApi = {
  list: (workspaceId: number) => request<Chat[]>(`/chats?workspace_id=${workspaceId}`),
  create: (payload: { name: string; workspace_id: number; type: number; members: number[] }) =>
    request<Chat>('/chats', { method: 'POST', body: JSON.stringify(payload) }),
  getDetails: (chatId: number) => request<ChatDetails>(`/chats/${chatId}`),
  members: (chatId: number) => request<ChatMembersResponse>(`/chats/${chatId}/members`),
  addMembers: (chatId: number, payload: AddMembersRequest) =>
    request<AddMembersResponse>(`/chats/${chatId}/members`, { method: 'POST', body: JSON.stringify(payload) }),
  messages: (chatId: number) => request<{ messages: Message[]; has_more: boolean; total: number }>(`/chats/${chatId}/messages`).then(res => res.messages),
  sendMessage: (chatId: number, text: string) =>
    request<Message>(`/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
  tasks: (chatId: number) => request<ChatTasksResponse>(`/chats/${chatId}/tasks`),
}

