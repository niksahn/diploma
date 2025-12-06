import { request } from './client'

export type Workspace = {
  id: string
  name: string
  creator?: string
  tariff?: string
  role?: string
}

export const workspaceApi = {
  list: () => request<Workspace[]>('/workspaces'),
  users: (workspaceId: string) =>
    request<Array<{ id: string; login: string; role: string }>>(`/workspaces/${workspaceId}/members`),
}

