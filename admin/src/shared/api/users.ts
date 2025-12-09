import { apiFetch } from "./client";

export type UserListItem = {
  id: number;
  login: string;
  surname?: string;
  name?: string;
  patronymic?: string;
  status?: number;
};

export type SearchUsersResponse = {
  limit: number;
  offset: number;
  total: number;
  users: UserListItem[];
};

export type SearchUsersParams = {
  search?: string;
  workspace_id?: number;
  status?: number;
  limit?: number;
  offset?: number;
};

export async function fetchUsers(params: SearchUsersParams) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (typeof params.workspace_id === "number") qs.set("workspace_id", String(params.workspace_id));
  if (typeof params.status === "number") qs.set("status", String(params.status));
  qs.set("limit", String(params.limit ?? 20));
  qs.set("offset", String(params.offset ?? 0));
  return apiFetch<SearchUsersResponse>(`/api/v1/users?${qs.toString()}`);
}



