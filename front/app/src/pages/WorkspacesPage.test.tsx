import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WorkspacesPage from './WorkspacesPage'
import { useWorkspaceStore } from '../shared/state/workspace'

vi.mock('../shared/api/workspaces', () => ({
  workspaceApi: {
    list: vi.fn(() =>
      Promise.resolve({
        workspaces: [
          { id: 1, name: 'Тестовое РП', role: 2, tariff: 'Базовый' },
        ],
      }),
    ),
  },
}))

describe('WorkspacesPage', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      selectedWorkspaceId: null,
      selectedWorkspaceName: null,
      selectedWorkspaceRole: null,
    })
  })

  it('shows workspace name, not only ID', async () => {
    render(
      <MemoryRouter>
        <WorkspacesPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Тестовое РП')).toBeInTheDocument()
    expect(screen.queryByText(/^ID: 1$/)).not.toBeInTheDocument()
  })

  it('has no prominent ID-only label on cards', async () => {
    render(
      <MemoryRouter>
        <WorkspacesPage />
      </MemoryRouter>,
    )
    await screen.findByText('Тестовое РП')
    const idOnly = screen.queryByText(/^ID: \d+$/)
    expect(idOnly).not.toBeInTheDocument()
  })
})
