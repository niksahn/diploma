import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import MembersPage from './MembersPage'
import { useWorkspaceStore } from '../shared/state/workspace'
import { withProviders } from '../test/test-utils'

vi.mock('../shared/api/workspaces', () => ({
  workspaceApi: {
    users: vi.fn(() =>
      Promise.resolve({
        members: [
          {
            user_id: 1,
            login: 'ivan',
            name: 'Иван',
            surname: 'Иванов',
            role: 1,
            status: 1,
            joined_at: '2024-01-01',
          },
        ],
      }),
    ),
  },
}))

vi.mock('../shared/api/users', () => ({
  userApi: {
    search: vi.fn(() => Promise.resolve({ users: [], total: 0, limit: 20, offset: 0 })),
  },
}))

describe('MembersPage', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      selectedWorkspaceId: 1,
      selectedWorkspaceName: 'Тестовое РП',
      selectedWorkspaceRole: 2,
    })
  })

  it('does not ask for user ID; has search by name/login', async () => {
    render(withProviders(<MembersPage />))
    await screen.findByText(/Участники рабочего пространства/)
    expect(screen.queryByPlaceholderText(/Например, 42/)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Поиск: имя, фамилия, логин/)).toBeInTheDocument()
  })

  it('shows workspace name in header, not "Workspace ID"', async () => {
    render(
      <MemoryRouter>
        <MembersPage />
      </MemoryRouter>,
    )
    await screen.findByText('Тестовое РП')
    expect(screen.queryByText(/Workspace ID:/)).not.toBeInTheDocument()
  })

  it('table column is "Участник", not "ID"', async () => {
    render(
      <MemoryRouter>
        <MembersPage />
      </MemoryRouter>,
    )
    await screen.findByText('Иванов')
    expect(screen.getByRole('columnheader', { name: /Участник/ })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /^ID$/ })).not.toBeInTheDocument()
  })
})
