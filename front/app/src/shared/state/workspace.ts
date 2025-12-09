import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type WorkspaceState = {
  selectedWorkspaceId: number | null
  setSelectedWorkspace: (id: number | null) => void
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedWorkspaceId: null,
      setSelectedWorkspace: (id) => set({ selectedWorkspaceId: id }),
      reset: () => set({ selectedWorkspaceId: null }),
    }),
    { name: 'workspace-store' },
  ),
)

