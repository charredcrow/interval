import { create } from 'zustand'

interface DragState {
  // Currently dragged event
  draggedEvent: {
    eventId: string
    fromDate: string
  } | null
  
  // Drop target date
  dropTargetDate: string | null
  
  // Actions
  startDrag: (eventId: string, fromDate: string) => void
  setDropTarget: (date: string | null) => void
  endDrag: () => void
}

export const useDragStore = create<DragState>((set) => ({
  draggedEvent: null,
  dropTargetDate: null,

  startDrag: (eventId, fromDate) => {
    set({ draggedEvent: { eventId, fromDate } })
  },

  setDropTarget: (date) => {
    set({ dropTargetDate: date })
  },

  endDrag: () => {
    set({ draggedEvent: null, dropTargetDate: null })
  },
}))
