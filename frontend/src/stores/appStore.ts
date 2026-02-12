import { create } from 'zustand'

interface AppState {
  sidebarOpen: boolean
  currentUav: string | null
  toggleSidebar: () => void
  setCurrentUav: (uavId: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  currentUav: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCurrentUav: (uavId) => set({ currentUav: uavId }),
}))
