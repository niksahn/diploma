import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUsers } from "../shared/api/users";
import { apiFetch } from "../shared/api/client";

vi.mock("../shared/api/client", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

function getRequestedUrl(): string {
  const firstCall = mockedApiFetch.mock.calls[0];
  if (!firstCall || typeof firstCall[0] !== "string") {
    throw new Error("apiFetch was not called with URL");
  }
  return firstCall[0];
}

describe("fetchUsers", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it("подставляет limit=20 и offset=0 по умолчанию", async () => {
    mockedApiFetch.mockResolvedValueOnce({ users: [], total: 0, limit: 20, offset: 0 });

    await fetchUsers({});

    const url = getRequestedUrl();
    expect(url).toContain("/api/v1/users?");
    expect(url).toContain("limit=20");
    expect(url).toContain("offset=0");
  });

  it("добавляет search в URL, если параметр передан", async () => {
    mockedApiFetch.mockResolvedValueOnce({ users: [], total: 0, limit: 20, offset: 0 });

    await fetchUsers({ search: "ivanov" });

    const url = getRequestedUrl();
    expect(url).toContain("search=ivanov");
  });

  it("добавляет workspace_id в URL, если передано число", async () => {
    mockedApiFetch.mockResolvedValueOnce({ users: [], total: 0, limit: 20, offset: 0 });

    await fetchUsers({ workspace_id: 42 });

    const url = getRequestedUrl();
    expect(url).toContain("workspace_id=42");
  });

  it("не добавляет workspace_id при отсутствии или нечисловом значении", async () => {
    mockedApiFetch.mockResolvedValue({ users: [], total: 0, limit: 20, offset: 0 });

    await fetchUsers({});
    expect(getRequestedUrl()).not.toContain("workspace_id=");

    mockedApiFetch.mockClear();
    await fetchUsers({ workspace_id: "abc" as unknown as number });
    expect(getRequestedUrl()).not.toContain("workspace_id=");
  });

  it("добавляет status в URL, если передано число", async () => {
    mockedApiFetch.mockResolvedValueOnce({ users: [], total: 0, limit: 20, offset: 0 });

    await fetchUsers({ status: 3 });

    const url = getRequestedUrl();
    expect(url).toContain("status=3");
  });

  it("не включает status в URL при отсутствии или нечисловом значении", async () => {
    mockedApiFetch.mockResolvedValue({ users: [], total: 0, limit: 20, offset: 0 });

    await fetchUsers({});
    expect(getRequestedUrl()).not.toContain("status=");

    mockedApiFetch.mockClear();
    await fetchUsers({ status: "bad" as unknown as number });
    expect(getRequestedUrl()).not.toContain("status=");
  });

  it("корректно передает все параметры одновременно", async () => {
    mockedApiFetch.mockResolvedValueOnce({ users: [], total: 1, limit: 50, offset: 10 });

    await fetchUsers({
      search: "petrov",
      workspace_id: 7,
      status: 2,
      limit: 50,
      offset: 10,
    });

    const url = getRequestedUrl();
    expect(url).toContain("search=petrov");
    expect(url).toContain("workspace_id=7");
    expect(url).toContain("status=2");
    expect(url).toContain("limit=50");
    expect(url).toContain("offset=10");
  });

  it("возвращает объект, полученный от apiFetch", async () => {
    const result = { users: [{ id: 1, login: "admin" }], total: 1, limit: 20, offset: 0 };
    mockedApiFetch.mockResolvedValueOnce(result);

    const response = await fetchUsers({ search: "admin" });

    expect(response).toBe(result);
  });

  it("пробрасывает ошибку от apiFetch без перехвата", async () => {
    const error = new Error("network failed");
    mockedApiFetch.mockRejectedValueOnce(error);

    await expect(fetchUsers({ search: "admin" })).rejects.toThrow("network failed");
  });
});

