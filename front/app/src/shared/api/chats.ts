import { request } from './client'
import { useAuthStore } from '../state/auth'

const DEBUG = import.meta.env.DEV

const log = {
  debug: (...args: unknown[]) => DEBUG && console.log('[ChatWS]', ...args),
  error: (...args: unknown[]) => console.error('[ChatWS]', ...args),
}

function getWebSocketBaseUrl(): string {
  const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL as string | undefined
  if (wsBaseUrl && wsBaseUrl.trim().length > 0) {
    return wsBaseUrl.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined') {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsProtocol}//${window.location.host}`
  }

  return 'ws://localhost:8080'
}

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
  private connectedCallback: (() => void) | null = null

  connect(chatId: number) {
    log.debug(`Starting connection to chat ${chatId}`)
    if (this.ws?.readyState === WebSocket.OPEN) {
      log.debug('Already connected, skipping')
      return // Already connected
    }

    this.chatId = chatId
    const token = useAuthStore.getState().token

    if (!token) {
      log.error('No auth token for WebSocket connection')
      return
    }

    const wsUrl = `${getWebSocketBaseUrl()}/ws/chats/ws?token=${token}`
    log.debug(`Connecting to ${wsUrl}`)
    log.debug(`Token preview: ${token.substring(0, 20)}...`)
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      log.debug(`Connected to chat ${chatId}`)
      this.reconnectAttempts = 0

      // Отправляем команду на подписку к чату
      this.send({ type: 'join_chat', chat_id: chatId })

      // Notify that the connection is established
      if (this.connectedCallback) {
        this.connectedCallback()
      }
    }

    // WebSocket открыт и готов к работе

    this.ws.onmessage = (event) => {
      try {
        // Сервер может отправлять несколько JSON сообщений в одном фрейме, разделенных \n
        const messages = event.data.trim().split('\n').filter((msg: string) => msg.trim())

        for (const messageStr of messages) {
          try {
            const data = JSON.parse(messageStr)
            log.debug('Message received:', data)

            switch (data.type) {
              case 'error':
                log.error('Error from server:', data.error)
                break
              case 'new_message':
                log.debug('New message:', data.message)
                if (data.message && this.onMessage) {
                  this.onMessage(data.message)
                }
                break
              case 'joined_chat':
                log.debug('Successfully joined chat:', data.chat_id)
                break
              case 'user_joined':
                log.debug('User joined chat:', data.user_id, data.user_name)
                break
              case 'user_left':
                log.debug('User left chat:', data.user_id)
                break
              case 'user_typing':
                log.debug('User typing:', data.user_id, data.user_name)
                break
              case 'user_stopped_typing':
                log.debug('User stopped typing:', data.user_id)
                break
              default:
                log.debug('Unknown message type:', data.type, data)
            }
          } catch (parseError) {
            log.error('Failed to parse message:', parseError, 'Message:', messageStr)
          }
        }
      } catch (error) {
        log.error('Failed to process message batch:', error, 'Raw data:', event.data)
      }
    }

    this.ws.onclose = (event) => {
      log.debug('Disconnected:', {
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
      log.error('Error event:', error)
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
    log.debug('Sending message:', data)
    log.debug('Connection state:', this.ws?.readyState)
    log.debug('Is connected:', this.isConnected)

    if (this.ws?.readyState === WebSocket.OPEN) {
      const messageString = JSON.stringify(data)
      this.ws.send(messageString)
    } else {
      log.error('Not connected, cannot send:', data, 'State:', this.ws?.readyState)
    }
  }

  onMessageReceived(callback: (message: Message) => void) {
    this.onMessage = callback
  }

  onConnected(callback: () => void) {
    this.connectedCallback = callback
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
    log.debug(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

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

