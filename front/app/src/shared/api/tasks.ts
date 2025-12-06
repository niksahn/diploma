import { request } from './client'

export type Task = {
  id: string
  title: string
  description?: string
  status?: string
  assignees?: string[]
  chatId?: string
  updatedAt?: string
}

export const taskApi = {
  list: (workspaceId: string) => request<Task[]>(`/tasks?workspaceId=${workspaceId}`),
  byId: (taskId: string) => request<Task>(`/tasks/${taskId}`),
  updateStatus: (taskId: string, status: string) =>
    request<Task>(`/tasks/${taskId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
}

