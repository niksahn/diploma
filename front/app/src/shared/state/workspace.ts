import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type WorkspaceState = {
  selectedWorkspaceId: string | null
  setSelectedWorkspace: (id: string | null) => void
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

