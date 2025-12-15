import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type WorkspaceState = {
  selectedWorkspaceId: number | null
  selectedWorkspaceRole: number | null
  setSelectedWorkspace: (id: number | null, role?: number | null) => void
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedWorkspaceId: null,
      selectedWorkspaceRole: null,
      setSelectedWorkspace: (id, role = null) => set({ selectedWorkspaceId: id, selectedWorkspaceRole: role }),
      reset: () => set({ selectedWorkspaceId: null, selectedWorkspaceRole: null }),
    }),
    { name: 'workspace-store' },
  ),
)

