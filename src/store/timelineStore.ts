import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Event, DeletedEvent, RecurringEvent, DayOfWeek } from '@/types'
import { compareTimeStrings } from '@/utils/date'
import { parseISO, getDay } from 'date-fns'

/**
 * Generate a unique ID for events
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Sort events: events with time first (ascending), then events without time (by createdAt)
 */
function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const timeCompare = compareTimeStrings(a.time, b.time)
    if (timeCompare !== 0) return timeCompare
    return a.createdAt.localeCompare(b.createdAt)
  })
}

interface TimelineState {
  // Events stored by date (YYYY-MM-DD -> Event[])
  eventsByDate: Record<string, Event[]>
  
  // Stack of recently deleted events for undo
  deletedEvents: DeletedEvent[]
  
  // Recurring events that repeat daily
  recurringEvents: RecurringEvent[]
  
  // Actions
  addEvent: (date: string, event: Omit<Event, 'id' | 'createdAt'>) => string
  updateEvent: (date: string, eventId: string, updates: Partial<Omit<Event, 'id' | 'createdAt'>>) => void
  deleteEvent: (date: string, eventId: string) => void
  undoDelete: () => DeletedEvent | null
  getEventsForDate: (date: string) => Event[]
  getAllDatesWithEvents: () => string[]
  searchEvents: (query: string) => Array<{ event: Event; date: string }>
  clearDeletedStack: () => void
  
  // Recurring events actions
  addRecurringEvent: (event: Omit<RecurringEvent, 'id' | 'createdAt'>) => string
  updateRecurringEvent: (id: string, updates: Partial<Omit<RecurringEvent, 'id' | 'createdAt'>>) => void
  deleteRecurringEvent: (id: string) => void
  getRecurringEventsForDate: (date: string) => RecurringEvent[]
}

export const useTimelineStore = create<TimelineState>()(
  persist(
    (set, get) => ({
      eventsByDate: {},
      deletedEvents: [],
      recurringEvents: [],

      addEvent: (date, eventData) => {
        const id = generateId()
        const newEvent: Event = {
          id,
          title: eventData.title,
          description: eventData.description,
          time: eventData.time,
          color: eventData.color,
          createdAt: new Date().toISOString(),
        }

        set((state) => {
          const currentEvents = state.eventsByDate[date] || []
          return {
            eventsByDate: {
              ...state.eventsByDate,
              [date]: sortEvents([...currentEvents, newEvent]),
            },
          }
        })

        return id
      },

      updateEvent: (date, eventId, updates) => {
        set((state) => {
          const events = state.eventsByDate[date]
          if (!events) return state

          const updatedEvents = events.map((event) =>
            event.id === eventId ? { ...event, ...updates } : event
          )

          return {
            eventsByDate: {
              ...state.eventsByDate,
              [date]: sortEvents(updatedEvents),
            },
          }
        })
      },

      deleteEvent: (date, eventId) => {
        const state = get()
        const events = state.eventsByDate[date]
        if (!events) return

        const eventToDelete = events.find((e) => e.id === eventId)
        if (!eventToDelete) return

        set((state) => {
          const filteredEvents = events.filter((e) => e.id !== eventId)
          const newEventsByDate = { ...state.eventsByDate }

          // Remove empty date entries
          if (filteredEvents.length === 0) {
            delete newEventsByDate[date]
          } else {
            newEventsByDate[date] = filteredEvents
          }

          // Add to deleted stack (keep last 10)
          const newDeletedEvents: DeletedEvent[] = [
            { event: eventToDelete, date, timestamp: Date.now() },
            ...state.deletedEvents.slice(0, 9),
          ]

          return {
            eventsByDate: newEventsByDate,
            deletedEvents: newDeletedEvents,
          }
        })
      },

      undoDelete: () => {
        const state = get()
        if (state.deletedEvents.length === 0) return null

        const [lastDeleted, ...remaining] = state.deletedEvents

        set((state) => {
          const currentEvents = state.eventsByDate[lastDeleted.date] || []
          return {
            eventsByDate: {
              ...state.eventsByDate,
              [lastDeleted.date]: sortEvents([...currentEvents, lastDeleted.event]),
            },
            deletedEvents: remaining,
          }
        })

        return lastDeleted
      },

      getEventsForDate: (date) => {
        return get().eventsByDate[date] || []
      },

      getAllDatesWithEvents: () => {
        return Object.keys(get().eventsByDate).sort()
      },

      searchEvents: (query) => {
        const state = get()
        const results: Array<{ event: Event; date: string }> = []
        const trimmedQuery = query.trim()
        
        if (!trimmedQuery) return results
        
        const lowerQuery = trimmedQuery.toLowerCase()

        // Try to parse as date (YYYY-MM-DD format)
        let isDateSearch = false
        let dateSearchPattern: string | null = null
        const dateMatch = trimmedQuery.match(/^\d{4}-\d{2}-\d{2}$/)
        if (dateMatch) {
          isDateSearch = true
          dateSearchPattern = trimmedQuery
        }

        for (const [date, events] of Object.entries(state.eventsByDate)) {
          // If searching by date, check if date matches
          if (isDateSearch && dateSearchPattern) {
            if (date.includes(dateSearchPattern)) {
              // Add all events for this date
              events.forEach(event => {
                results.push({ event, date })
              })
              continue
            }
          }
          
          // Search in date string format
          if (date.includes(lowerQuery)) {
            events.forEach(event => {
              results.push({ event, date })
            })
            continue
          }

          // Search in event title and description
          for (const event of events) {
            if (
              event.title.toLowerCase().includes(lowerQuery) ||
              event.description?.toLowerCase().includes(lowerQuery)
            ) {
              results.push({ event, date })
            }
          }
        }

        // Sort by date descending
        return results.sort((a, b) => b.date.localeCompare(a.date))
      },

      clearDeletedStack: () => {
        set({ deletedEvents: [] })
      },

      addRecurringEvent: (eventData) => {
        const id = generateId()
        const newEvent: RecurringEvent = {
          id,
          title: eventData.title,
          description: eventData.description,
          time: eventData.time,
          enabledDays: eventData.enabledDays,
          createdAt: new Date().toISOString(),
        }

        set((state) => ({
          recurringEvents: [...state.recurringEvents, newEvent],
        }))

        return id
      },

      updateRecurringEvent: (id, updates) => {
        set((state) => ({
          recurringEvents: state.recurringEvents.map((event) =>
            event.id === id ? { ...event, ...updates } : event
          ),
        }))
      },

      deleteRecurringEvent: (id) => {
        set((state) => ({
          recurringEvents: state.recurringEvents.filter((event) => event.id !== id),
        }))
      },

      getRecurringEventsForDate: (date) => {
        const state = get()
        const dayOfWeek = getDay(parseISO(date)) as DayOfWeek
        return state.recurringEvents.filter((event) =>
          event.enabledDays.includes(dayOfWeek)
        )
      },
    }),
    {
      name: 'interval-timeline-storage',
      partialize: (state) => ({
        eventsByDate: state.eventsByDate,
        recurringEvents: state.recurringEvents,
      }),
    }
  )
)
