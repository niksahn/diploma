import { request } from './client'

export type TaskStatus = 1 | 2 | 3 | 4 | 5 // Согласно swagger: статус от 1 до 5

export type Task = {
  id: number
  title: string
  description?: string
  status?: TaskStatus
  status_name?: string
  date: string
  creator: number
  creator_name: string
  workspace_id: number
  workspace_name: string
  assignee_count?: number
  chat_count?: number
  created_at?: string
}

export type CreateTaskRequest = {
  title: string
  date: string
  workspace_id: number
  description?: string
  status?: TaskStatus
  assigned_users?: number[]
  chat_id?: number
}

export type TaskListResponse = {
  tasks: Task[]
  total: number
}

export type TaskResponse = Task

export type TaskAssigneeResponse = {
  user_id: number
  login: string
  name: string
  surname: string
  patronymic?: string
  assigned_at: string
}

export type TaskAssigneesResponse = {
  assignees: TaskAssigneeResponse[]
  total: number
}

export type TaskChatResponse = {
  chat_id: number
  chat_name: string
  chat_type: number
  workspace_id: number
  attached_at: string
}

export type TaskChatsResponse = {
  chats: TaskChatResponse[]
  total: number
}

export const taskApi = {
  list: (workspaceId: number) => request<TaskListResponse>(`/tasks?workspace_id=${workspaceId}`),
  byId: (taskId: number) => request<TaskResponse>(`/tasks/${taskId}`),
  create: (data: CreateTaskRequest) =>
    request<TaskResponse>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (taskId: number, data: Partial<CreateTaskRequest>) =>
    request<TaskResponse>(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (taskId: number) =>
    request<void>(`/tasks/${taskId}`, { method: 'DELETE' }),
  updateStatus: (taskId: number, status: TaskStatus) =>
    request<{ message: string }>(`/tasks/${taskId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  // Assignees
  getAssignees: (taskId: number) => request<TaskAssigneesResponse>(`/tasks/${taskId}/assignees`),
  addAssignees: (taskId: number, userIds: number[]) =>
    request<{ message: string }>(`/tasks/${taskId}/assignees`, { method: 'POST', body: JSON.stringify({ user_ids: userIds }) }),
  removeAssignee: (taskId: number, userId: number) =>
    request<{ message: string }>(`/tasks/${taskId}/assignees/${userId}`, { method: 'DELETE' }),
  // Chats
  getChats: (taskId: number) => request<TaskChatsResponse>(`/tasks/${taskId}/chats`),
  attachToChat: (taskId: number, chatId: number) =>
    request<{ message: string }>(`/tasks/${taskId}/chats`, { method: 'POST', body: JSON.stringify({ chat_id: chatId }) }),
  detachFromChat: (taskId: number, chatId: number) =>
    request<{ message: string }>(`/tasks/${taskId}/chats/${chatId}`, { method: 'DELETE' }),
}

