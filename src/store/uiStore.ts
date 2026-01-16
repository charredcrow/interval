import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ViewMode } from '@/types'
import { getTodayString } from '@/utils/date'

export type Theme = 'light' | 'dark'

interface UIState {
  // Current view mode
  viewMode: ViewMode
  
  // Search state
  searchQuery: string
  isSearchOpen: boolean
  
  // Date navigation
  targetDate: string | null // Date to scroll to
  
  // Quick add state
  isQuickAddFocused: boolean
  
  // Event dialog state
  editingEvent: { id: string; date: string } | null
  isEventDialogOpen: boolean
  eventDialogDate: string | null
  
  // Recurring event dialog state
  isRecurringEventDialogOpen: boolean
  editingRecurringEventId: string | null
  
  // Todo panel state
  isTodoPanelOpen: boolean
  
  // Settings
  hideEmptyDays: boolean
  theme: Theme
  
  // Actions
  setViewMode: (mode: ViewMode) => void
  toggleViewMode: () => void
  setSearchQuery: (query: string) => void
  setSearchOpen: (open: boolean) => void
  navigateToDate: (date: string) => void
  clearTargetDate: () => void
  setQuickAddFocused: (focused: boolean) => void
  openEventDialog: (date?: string, eventId?: string) => void
  closeEventDialog: () => void
  navigateToToday: () => void
  setHideEmptyDays: (hide: boolean) => void
  openEventDialogWithDatePicker: () => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  
  // Recurring event dialog actions
  openRecurringEventDialog: (eventId?: string) => void
  closeRecurringEventDialog: () => void
  
  // Todo panel actions
  openTodoPanel: () => void
  closeTodoPanel: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      viewMode: 'timeline',
      searchQuery: '',
      isSearchOpen: false,
      targetDate: null,
      isQuickAddFocused: false,
      editingEvent: null,
      isEventDialogOpen: false,
      eventDialogDate: null,
      isRecurringEventDialogOpen: false,
      editingRecurringEventId: null,
      isTodoPanelOpen: false,
      hideEmptyDays: false,
      theme: 'light',

      setViewMode: (mode) => {
        set({ viewMode: mode })
      },

      toggleViewMode: () => {
        set((state) => ({
          viewMode: state.viewMode === 'timeline' ? 'month' : 'timeline',
        }))
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query })
      },

      setSearchOpen: (open) => {
        set({ isSearchOpen: open, searchQuery: open ? '' : '' })
      },

      navigateToDate: (date) => {
        set({ targetDate: date, viewMode: 'timeline' })
      },

      clearTargetDate: () => {
        set({ targetDate: null })
      },

      setQuickAddFocused: (focused) => {
        set({ isQuickAddFocused: focused })
      },

      openEventDialog: (date, eventId) => {
        set({
          isEventDialogOpen: true,
          eventDialogDate: date || getTodayString(),
          editingEvent: eventId && date ? { id: eventId, date } : null,
        })
      },

      openEventDialogWithDatePicker: () => {
        set({
          isEventDialogOpen: true,
          eventDialogDate: getTodayString(),
          editingEvent: null,
        })
      },

      closeEventDialog: () => {
        set({
          isEventDialogOpen: false,
          eventDialogDate: null,
          editingEvent: null,
        })
      },

      navigateToToday: () => {
        set({ targetDate: getTodayString(), viewMode: 'timeline' })
      },

      setHideEmptyDays: (hide) => {
        set({ hideEmptyDays: hide })
      },

      setTheme: (theme) => {
        set({ theme })
        // Apply theme to HTML element
        const root = document.documentElement
        if (theme === 'dark') {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      },

      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light'
          // Apply theme to HTML element
          const root = document.documentElement
          if (newTheme === 'dark') {
            root.classList.add('dark')
          } else {
            root.classList.remove('dark')
          }
          return { theme: newTheme }
        })
      },

      openRecurringEventDialog: (eventId) => {
        set({
          isRecurringEventDialogOpen: true,
          editingRecurringEventId: eventId || null,
        })
      },

      closeRecurringEventDialog: () => {
        set({
          isRecurringEventDialogOpen: false,
          editingRecurringEventId: null,
        })
      },

      openTodoPanel: () => {
        set({ isTodoPanelOpen: true })
      },

      closeTodoPanel: () => {
        set({ isTodoPanelOpen: false })
      },
    }),
    {
      name: 'interval-ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        hideEmptyDays: state.hideEmptyDays,
      }),
    }
  )
)
