import { request } from './client'

export type UserSearchItem = {
  id: number
  login: string
  surname: string
  name: string
  patronymic?: string
  status?: number
}

export type UserSearchResponse = {
  users: UserSearchItem[]
  total: number
  limit: number
  offset: number
}

export const userApi = {
  search: (params: { search?: string; workspace_id?: number; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams()
    if (params.search?.trim()) sp.set('search', params.search.trim())
    if (params.workspace_id != null) sp.set('workspace_id', String(params.workspace_id))
    if (params.limit != null) sp.set('limit', String(params.limit))
    if (params.offset != null) sp.set('offset', String(params.offset))
    const q = sp.toString()
    return request<UserSearchResponse>(`/users${q ? `?${q}` : ''}`)
  },
}
