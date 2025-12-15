import { request } from './client'

export type Workspace = {
  id: number
  name: string
  creator?: string
  tariff?: string
  role?: number | string
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
  addMember: (workspaceId: number, user_id: number, role: number) =>
    request(`/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id, role }),
    }),
  updateMemberRole: (workspaceId: number, user_id: number, role: number) =>
    request(`/workspaces/${workspaceId}/members/${user_id}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  removeMember: (workspaceId: number, user_id: number) =>
    request(`/workspaces/${workspaceId}/members/${user_id}`, {
      method: 'DELETE',
    }),
  changeLeader: (workspaceId: number, new_leader_id: number) =>
    request(`/workspaces/${workspaceId}/leader`, {
      method: 'PUT',
      body: JSON.stringify({ new_leader_id }),
    }),
}

