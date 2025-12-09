import { request } from './client'

export type Workspace = {
  id: number
  name: string
  creator?: string
  tariff?: string
  role?: string
}

export type WorkspaceMember = {
  user_id: number
  login: string
  name: string
  surname: string
  role: number
  status: number
  joined_at: string
}

export type WorkspaceMembersResponse = {
  members: WorkspaceMember[]
  total: number
}

export const workspaceApi = {
  list: () => request<Workspace[]>('/workspaces'),
  users: (workspaceId: number) =>
    request<WorkspaceMembersResponse>(`/workspaces/${workspaceId}/members`),
}

