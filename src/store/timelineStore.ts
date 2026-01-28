import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Event, DeletedEvent, RecurringEvent, DayOfWeek, EventTag } from '@/types'
import { compareTimeStrings } from '@/utils/date'
import { parseISO, getDay, isAfter, startOfDay } from 'date-fns'

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
  
  // Tags/Categories
  tags: EventTag[]
  
  // Actions
  addEvent: (date: string, event: Omit<Event, 'id' | 'createdAt'>) => string
  updateEvent: (date: string, eventId: string, updates: Partial<Omit<Event, 'id' | 'createdAt'>>) => void
  deleteEvent: (date: string, eventId: string) => void
  moveEvent: (fromDate: string, toDate: string, eventId: string) => void
  undoDelete: () => DeletedEvent | null
  getEventsForDate: (date: string) => Event[]
  getAllDatesWithEvents: () => string[]
  searchEvents: (query: string) => Array<{ event: Event; date: string }>
  clearDeletedStack: () => void
  markReminderSent: (date: string, eventId: string) => void
  
  // Recurring events actions
  addRecurringEvent: (event: Omit<RecurringEvent, 'id' | 'createdAt'>) => string
  updateRecurringEvent: (id: string, updates: Partial<Omit<RecurringEvent, 'id' | 'createdAt'>>) => void
  deleteRecurringEvent: (id: string) => void
  getRecurringEventsForDate: (date: string) => RecurringEvent[]
  
  // Tag actions
  addTag: (tag: Omit<EventTag, 'id'>) => string
  updateTag: (id: string, updates: Partial<Omit<EventTag, 'id'>>) => void
  deleteTag: (id: string) => void
}

export const useTimelineStore = create<TimelineState>()(
  persist(
    (set, get) => ({
      eventsByDate: {},
      deletedEvents: [],
      recurringEvents: [],
      tags: [],

      addEvent: (date, eventData) => {
        const id = generateId()
        const newEvent: Event = {
          id,
          title: eventData.title,
          description: eventData.description,
          time: eventData.time,
          endDate: eventData.endDate,
          endTime: eventData.endTime,
          color: eventData.color,
          tags: eventData.tags,
          links: eventData.links,
          reminder: eventData.reminder,
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

          // Create a new array with updated event
          const updatedEvents = events.map((event) =>
            event.id === eventId ? { ...event, ...updates } : event
          )

          // Sort events and create new array reference to ensure React re-renders
          const sortedEvents = sortEvents(updatedEvents)

          return {
            eventsByDate: {
              ...state.eventsByDate,
              [date]: sortedEvents,
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

      moveEvent: (fromDate, toDate, eventId) => {
        if (fromDate === toDate) return
        
        const state = get()
        const events = state.eventsByDate[fromDate]
        if (!events) return

        const eventToMove = events.find((e) => e.id === eventId)
        if (!eventToMove) return

        set((state) => {
          const fromEvents = state.eventsByDate[fromDate]?.filter((e) => e.id !== eventId) || []
          const toEvents = state.eventsByDate[toDate] || []
          
          const newEventsByDate = { ...state.eventsByDate }
          
          // Remove from original date
          if (fromEvents.length === 0) {
            delete newEventsByDate[fromDate]
          } else {
            newEventsByDate[fromDate] = fromEvents
          }
          
          // Add to new date
          newEventsByDate[toDate] = sortEvents([...toEvents, eventToMove])

          return { eventsByDate: newEventsByDate }
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

      markReminderSent: (date, eventId) => {
        set((state) => {
          const events = state.eventsByDate[date]
          if (!events) return state

          const updatedEvents = events.map((event) =>
            event.id === eventId ? { ...event, reminderSent: true } : event
          )

          return {
            eventsByDate: {
              ...state.eventsByDate,
              [date]: updatedEvents,
            },
          }
        })
      },

      addRecurringEvent: (eventData) => {
        const id = generateId()
        const newEvent: RecurringEvent = {
          id,
          title: eventData.title,
          description: eventData.description,
          time: eventData.time,
          endTime: eventData.endTime,
          color: eventData.color,
          tags: eventData.tags,
          enabledDays: eventData.enabledDays,
          repeatUntil: eventData.repeatUntil,
          reminder: eventData.reminder,
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
        const dateObj = startOfDay(parseISO(date))
        
        return state.recurringEvents.filter((event) => {
          // Check if day of week is enabled
          if (!event.enabledDays.includes(dayOfWeek)) return false
          
          // Check if repeatUntil is set and date is after it
          if (event.repeatUntil) {
            const repeatUntilDate = startOfDay(parseISO(event.repeatUntil))
            if (isAfter(dateObj, repeatUntilDate)) return false
          }
          
          return true
        })
      },

      // Tag actions
      addTag: (tagData) => {
        const id = generateId()
        const newTag: EventTag = {
          id,
          name: tagData.name,
          color: tagData.color,
        }

        set((state) => ({
          tags: [...state.tags, newTag],
        }))

        return id
      },

      updateTag: (id, updates) => {
        set((state) => ({
          tags: state.tags.map((tag) =>
            tag.id === id ? { ...tag, ...updates } : tag
          ),
        }))
      },

      deleteTag: (id) => {
        set((state) => ({
          tags: state.tags.filter((tag) => tag.id !== id),
        }))
      },
    }),
    {
      name: 'interval-timeline-storage',
      partialize: (state) => ({
        eventsByDate: state.eventsByDate,
        recurringEvents: state.recurringEvents,
        tags: state.tags,
      }),
    }
  )
)
