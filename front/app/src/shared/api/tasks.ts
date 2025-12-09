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
  detachFromChat: (taskId: number, chatId: number) =>
    request<{ message: string }>(`/tasks/${taskId}/chats/${chatId}`, { method: 'DELETE' }),
}

