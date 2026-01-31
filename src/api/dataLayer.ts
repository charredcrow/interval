/**
 * Data layer: single entry point for all persistence/API operations.
 * Current implementation: localStorage (same keys as former Zustand persist).
 * When adding a backend: replace each implementation with fetch() to your API;
 * keep this interface and return shapes so the rest of the app stays unchanged.
 *
 * Optimized for future backend:
 * - Granular methods map 1:1 to REST (e.g. addEvent -> POST /events).
 * - getEventsInRange(from, to) for one request instead of many getEventsByDate.
 * - All mutations return the created/updated entity so the store can update once.
 */

import type { Event, RecurringEvent, EventTag, Todo } from '@/types'
import { compareTimeStrings } from '@/utils/date'

const TIMELINE_KEY = 'interval-timeline-storage'
const TODO_KEY = 'interval-todo-storage'

export interface TimelineState {
  eventsByDate: Record<string, Event[]>
  recurringEvents: RecurringEvent[]
  tags: EventTag[]
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const timeCompare = compareTimeStrings(a.time, b.time)
    if (timeCompare !== 0) return timeCompare
    return a.createdAt.localeCompare(b.createdAt)
  })
}

function getStoredTimeline(): TimelineState {
  try {
    const raw = localStorage.getItem(TIMELINE_KEY)
    if (!raw) return { eventsByDate: {}, recurringEvents: [], tags: [] }
    const parsed = JSON.parse(raw)
    const state = parsed?.state ?? parsed
    return {
      eventsByDate: state.eventsByDate ?? {},
      recurringEvents: state.recurringEvents ?? [],
      tags: state.tags ?? [],
    }
  } catch {
    return { eventsByDate: {}, recurringEvents: [], tags: [] }
  }
}

function setStoredTimeline(state: TimelineState): void {
  localStorage.setItem(
    TIMELINE_KEY,
    JSON.stringify({ state, version: 0 })
  )
}

function getStoredTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(TODO_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const state = parsed?.state ?? parsed
    return Array.isArray(state?.todos) ? state.todos : []
  } catch {
    return []
  }
}

function setStoredTodos(todos: Todo[]): void {
  localStorage.setItem(TODO_KEY, JSON.stringify({ state: { todos }, version: 0 }))
}

// --- Timeline (events, recurring, tags) ---

export async function getTimelineState(): Promise<TimelineState> {
  return getStoredTimeline()
}

/** Backend-ready: one request for a date range (e.g. GET /events?from=&to=) */
export async function getEventsInRange(
  fromDate: string,
  toDate: string
): Promise<Record<string, Event[]>> {
  const { eventsByDate } = getStoredTimeline()
  const out: Record<string, Event[]> = {}
  for (const [date, events] of Object.entries(eventsByDate)) {
    if (date >= fromDate && date <= toDate) out[date] = events
  }
  return out
}

export async function addEvent(
  date: string,
  data: Omit<Event, 'id' | 'createdAt'>
): Promise<Event> {
  const state = getStoredTimeline()
  const event: Event = {
    id: generateId(),
    ...data,
    createdAt: new Date().toISOString(),
  }
  const events = [...(state.eventsByDate[date] ?? []), event]
  state.eventsByDate[date] = sortEvents(events)
  setStoredTimeline(state)
  return event
}

export async function updateEvent(
  date: string,
  eventId: string,
  updates: Partial<Omit<Event, 'id' | 'createdAt'>>
): Promise<Event | null> {
  const state = getStoredTimeline()
  const events = state.eventsByDate[date]
  if (!events) return null
  const index = events.findIndex((e) => e.id === eventId)
  if (index === -1) return null
  const updated = { ...events[index], ...updates }
  const next = events.slice()
  next[index] = updated
  state.eventsByDate[date] = sortEvents(next)
  setStoredTimeline(state)
  return updated
}

export async function deleteEvent(
  date: string,
  eventId: string
): Promise<{ event: Event; date: string } | null> {
  const state = getStoredTimeline()
  const events = state.eventsByDate[date]
  if (!events) return null
  const event = events.find((e) => e.id === eventId)
  if (!event) return null
  const filtered = events.filter((e) => e.id !== eventId)
  if (filtered.length === 0) delete state.eventsByDate[date]
  else state.eventsByDate[date] = filtered
  setStoredTimeline(state)
  return { event, date }
}

export async function moveEvent(
  fromDate: string,
  toDate: string,
  eventId: string
): Promise<Event | null> {
  const state = getStoredTimeline()
  const fromEvents = state.eventsByDate[fromDate]
  if (!fromEvents) return null
  const event = fromEvents.find((e) => e.id === eventId)
  if (!event) return null
  const fromFiltered = fromEvents.filter((e) => e.id !== eventId)
  if (fromFiltered.length === 0) delete state.eventsByDate[fromDate]
  else state.eventsByDate[fromDate] = fromFiltered
  const toEvents = state.eventsByDate[toDate] ?? []
  state.eventsByDate[toDate] = sortEvents([...toEvents, event])
  setStoredTimeline(state)
  return event
}

/** Restore a deleted event (e.g. undo). Uses existing event.id */
export async function restoreEvent(date: string, event: Event): Promise<Event> {
  const state = getStoredTimeline()
  const events = [...(state.eventsByDate[date] ?? []), event]
  state.eventsByDate[date] = sortEvents(events)
  setStoredTimeline(state)
  return event
}

export async function markReminderSent(date: string, eventId: string): Promise<Event | null> {
  return updateEvent(date, eventId, { reminderSent: true })
}

// --- Recurring events ---

export async function getRecurringEvents(): Promise<RecurringEvent[]> {
  return getStoredTimeline().recurringEvents
}

export async function addRecurringEvent(
  data: Omit<RecurringEvent, 'id' | 'createdAt'>
): Promise<RecurringEvent> {
  const state = getStoredTimeline()
  const event: RecurringEvent = {
    id: generateId(),
    ...data,
    createdAt: new Date().toISOString(),
  }
  state.recurringEvents = [...state.recurringEvents, event]
  setStoredTimeline(state)
  return event
}

export async function updateRecurringEvent(
  id: string,
  updates: Partial<Omit<RecurringEvent, 'id' | 'createdAt'>>
): Promise<RecurringEvent | null> {
  const state = getStoredTimeline()
  const index = state.recurringEvents.findIndex((e) => e.id === id)
  if (index === -1) return null
  const updated = { ...state.recurringEvents[index], ...updates }
  state.recurringEvents = state.recurringEvents.slice()
  state.recurringEvents[index] = updated
  setStoredTimeline(state)
  return updated
}

export async function deleteRecurringEvent(id: string): Promise<void> {
  const state = getStoredTimeline()
  state.recurringEvents = state.recurringEvents.filter((e) => e.id !== id)
  setStoredTimeline(state)
}

// --- Tags ---

export async function getTags(): Promise<EventTag[]> {
  return getStoredTimeline().tags
}

export async function addTag(data: Omit<EventTag, 'id'>): Promise<EventTag> {
  const state = getStoredTimeline()
  const tag: EventTag = { id: generateId(), ...data }
  state.tags = [...state.tags, tag]
  setStoredTimeline(state)
  return tag
}

export async function updateTag(
  id: string,
  updates: Partial<Omit<EventTag, 'id'>>
): Promise<EventTag | null> {
  const state = getStoredTimeline()
  const index = state.tags.findIndex((t) => t.id === id)
  if (index === -1) return null
  const updated = { ...state.tags[index], ...updates }
  state.tags = state.tags.slice()
  state.tags[index] = updated
  setStoredTimeline(state)
  return updated
}

export async function deleteTag(id: string): Promise<void> {
  const state = getStoredTimeline()
  state.tags = state.tags.filter((t) => t.id !== id)
  setStoredTimeline(state)
}

// --- Todos ---

export async function getTodoState(): Promise<Todo[]> {
  return getStoredTodos()
}

export async function addTodo(data: Omit<Todo, 'id' | 'createdAt'>): Promise<Todo> {
  const todos = getStoredTodos()
  const todo: Todo = {
    id: generateId(),
    ...data,
    createdAt: new Date().toISOString(),
  }
  const next = [todo, ...todos]
  setStoredTodos(next)
  return todo
}

export async function updateTodo(
  id: string,
  updates: Partial<Pick<Todo, 'title' | 'completed'>>
): Promise<Todo | null> {
  const todos = getStoredTodos()
  const index = todos.findIndex((t) => t.id === id)
  if (index === -1) return null
  const updated = { ...todos[index], ...updates }
  const next = todos.slice()
  next[index] = updated
  setStoredTodos(next)
  return updated
}

export async function deleteTodo(id: string): Promise<void> {
  const todos = getStoredTodos().filter((t) => t.id !== id)
  setStoredTodos(todos)
}
