import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type WorkspaceState = {
  selectedWorkspaceId: number | null
  selectedWorkspaceName: string | null
  selectedWorkspaceRole: number | null
  setSelectedWorkspace: (id: number | null, role?: number | null, name?: string | null) => void
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedWorkspaceId: null,
      selectedWorkspaceName: null,
      selectedWorkspaceRole: null,
      setSelectedWorkspace: (id, role = null, name = null) =>
        set({
          selectedWorkspaceId: id,
          selectedWorkspaceRole: role,
          selectedWorkspaceName: name ?? null,
        }),
      reset: () =>
        set({
          selectedWorkspaceId: null,
          selectedWorkspaceName: null,
          selectedWorkspaceRole: null,
        }),
    }),
    { name: 'workspace-store' },
  ),
)

