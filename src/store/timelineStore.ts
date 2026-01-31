import { create } from 'zustand'
import type { Event, DeletedEvent, RecurringEvent, DayOfWeek, EventTag } from '@/types'
import { compareTimeStrings } from '@/utils/date'
import { parseISO, getDay, isAfter, startOfDay } from 'date-fns'
import * as api from '@/api/dataLayer'

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
  eventsByDate: Record<string, Event[]>
  deletedEvents: DeletedEvent[]
  recurringEvents: RecurringEvent[]
  tags: EventTag[]
  _hydrated: boolean

  hydrate: () => Promise<void>

  addEvent: (date: string, event: Omit<Event, 'id' | 'createdAt'>) => Promise<string>
  updateEvent: (date: string, eventId: string, updates: Partial<Omit<Event, 'id' | 'createdAt'>>) => Promise<void>
  deleteEvent: (date: string, eventId: string) => Promise<void>
  moveEvent: (fromDate: string, toDate: string, eventId: string) => Promise<void>
  undoDelete: () => Promise<DeletedEvent | null>
  getEventsForDate: (date: string) => Event[]
  getAllDatesWithEvents: () => string[]
  searchEvents: (query: string) => Array<{ event: Event; date: string }>
  clearDeletedStack: () => void
  markReminderSent: (date: string, eventId: string) => Promise<void>

  addRecurringEvent: (event: Omit<RecurringEvent, 'id' | 'createdAt'>) => Promise<string>
  updateRecurringEvent: (id: string, updates: Partial<Omit<RecurringEvent, 'id' | 'createdAt'>>) => Promise<void>
  deleteRecurringEvent: (id: string) => Promise<void>
  getRecurringEventsForDate: (date: string) => RecurringEvent[]

  addTag: (tag: Omit<EventTag, 'id'>) => Promise<string>
  updateTag: (id: string, updates: Partial<Omit<EventTag, 'id'>>) => Promise<void>
  deleteTag: (id: string) => Promise<void>
}

export const useTimelineStore = create<TimelineState>()((set, get) => ({
  eventsByDate: {},
  deletedEvents: [],
  recurringEvents: [],
  tags: [],
  _hydrated: false,

  hydrate: async () => {
    const state = await api.getTimelineState()
    set({
      eventsByDate: state.eventsByDate,
      recurringEvents: state.recurringEvents,
      tags: state.tags,
      _hydrated: true,
    })
  },

  addEvent: async (date, eventData) => {
    const event = await api.addEvent(date, eventData)
    set((state) => ({
      eventsByDate: {
        ...state.eventsByDate,
        [date]: sortEvents([...(state.eventsByDate[date] ?? []), event]),
      },
    }))
    return event.id
  },

  updateEvent: async (date, eventId, updates) => {
    const updated = await api.updateEvent(date, eventId, updates)
    if (!updated) return
    set((state) => {
      const events = state.eventsByDate[date]
      if (!events) return state
      const next = events.map((e) => (e.id === eventId ? updated : e))
      return {
        eventsByDate: {
          ...state.eventsByDate,
          [date]: sortEvents(next),
        },
      }
    })
  },

  deleteEvent: async (date, eventId) => {
    const result = await api.deleteEvent(date, eventId)
    if (!result) return
    const { event: eventToDelete } = result
    set((state) => {
      const events = state.eventsByDate[date] ?? []
      const filtered = events.filter((e) => e.id !== eventId)
      const newEventsByDate = { ...state.eventsByDate }
      if (filtered.length === 0) delete newEventsByDate[date]
      else newEventsByDate[date] = filtered
      const newDeleted: DeletedEvent[] = [
        { event: eventToDelete, date, timestamp: Date.now() },
        ...state.deletedEvents.slice(0, 9),
      ]
      return { eventsByDate: newEventsByDate, deletedEvents: newDeleted }
    })
  },

  moveEvent: async (fromDate, toDate, eventId) => {
    if (fromDate === toDate) return
    const event = await api.moveEvent(fromDate, toDate, eventId)
    if (!event) return
    set((state) => {
      const fromEvents = (state.eventsByDate[fromDate] ?? []).filter((e) => e.id !== eventId)
      const toEvents = state.eventsByDate[toDate] ?? []
      const newEventsByDate = { ...state.eventsByDate }
      if (fromEvents.length === 0) delete newEventsByDate[fromDate]
      else newEventsByDate[fromDate] = fromEvents
      newEventsByDate[toDate] = sortEvents([...toEvents, event])
      return { eventsByDate: newEventsByDate }
    })
  },

  undoDelete: async () => {
    const state = get()
    if (state.deletedEvents.length === 0) return null
    const [lastDeleted, ...remaining] = state.deletedEvents
    await api.restoreEvent(lastDeleted.date, lastDeleted.event)
    set((s) => ({
      eventsByDate: {
        ...s.eventsByDate,
        [lastDeleted.date]: sortEvents([...(s.eventsByDate[lastDeleted.date] ?? []), lastDeleted.event]),
      },
      deletedEvents: remaining,
    }))
    return lastDeleted
  },

  getEventsForDate: (date) => get().eventsByDate[date] ?? [],

  getAllDatesWithEvents: () => Object.keys(get().eventsByDate).sort(),

  searchEvents: (query) => {
    const state = get()
    const results: Array<{ event: Event; date: string }> = []
    const trimmed = query.trim()
    if (!trimmed) return results
    const lower = trimmed.toLowerCase()
    const isDateSearch = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    for (const [date, events] of Object.entries(state.eventsByDate)) {
      if (isDateSearch && date.includes(trimmed)) {
        events.forEach((event) => results.push({ event, date }))
        continue
      }
      if (date.includes(lower)) {
        events.forEach((event) => results.push({ event, date }))
        continue
      }
      for (const event of events) {
        if (
          event.title.toLowerCase().includes(lower) ||
          event.description?.toLowerCase().includes(lower)
        ) {
          results.push({ event, date })
        }
      }
    }
    return results.sort((a, b) => b.date.localeCompare(a.date))
  },

  clearDeletedStack: () => set({ deletedEvents: [] }),

  markReminderSent: async (date, eventId) => {
    const updated = await api.markReminderSent(date, eventId)
    if (!updated) return
    set((state) => {
      const events = state.eventsByDate[date]
      if (!events) return state
      return {
        eventsByDate: {
          ...state.eventsByDate,
          [date]: events.map((e) => (e.id === eventId ? updated : e)),
        },
      }
    })
  },

  addRecurringEvent: async (eventData) => {
    const event = await api.addRecurringEvent(eventData)
    set((state) => ({ recurringEvents: [...state.recurringEvents, event] }))
    return event.id
  },

  updateRecurringEvent: async (id, updates) => {
    const updated = await api.updateRecurringEvent(id, updates)
    if (!updated) return
    set((state) => ({
      recurringEvents: state.recurringEvents.map((e) => (e.id === id ? updated : e)),
    }))
  },

  deleteRecurringEvent: async (id) => {
    await api.deleteRecurringEvent(id)
    set((state) => ({
      recurringEvents: state.recurringEvents.filter((e) => e.id !== id),
    }))
  },

  getRecurringEventsForDate: (date) => {
    const state = get()
    const dayOfWeek = getDay(parseISO(date)) as DayOfWeek
    const dateObj = startOfDay(parseISO(date))
    return state.recurringEvents.filter((event) => {
      if (!event.enabledDays.includes(dayOfWeek)) return false
      if (event.repeatUntil && isAfter(dateObj, startOfDay(parseISO(event.repeatUntil)))) return false
      return true
    })
  },

  addTag: async (tagData) => {
    const tag = await api.addTag(tagData)
    set((state) => ({ tags: [...state.tags, tag] }))
    return tag.id
  },

  updateTag: async (id, updates) => {
    const updated = await api.updateTag(id, updates)
    if (!updated) return
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? updated : t)),
    }))
  },

  deleteTag: async (id) => {
    await api.deleteTag(id)
    set((state) => ({ tags: state.tags.filter((t) => t.id !== id) }))
  },
}))
