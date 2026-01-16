/**
 * Core type definitions for Interval application
 */

/**
 * Available event colors
 */
export type EventColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'gray'

/**
 * Represents a single event in the timeline
 */
export type Event = {
  id: string
  title: string
  description?: string
  time?: string // Format: "HH:mm"
  color?: EventColor // Optional color tag
  createdAt: string // ISO date string
}

/**
 * Represents a day in the timeline with its events
 */
export type DayTimeline = {
  date: string // Format: YYYY-MM-DD
  events: Event[]
}

/**
 * View modes for the application
 */
export type ViewMode = 'timeline' | 'month'

/**
 * Month summary for month view
 */
export type MonthSummary = {
  month: number // 0-11
  year: number
  label: string // "March 2026"
  eventCount: number
  firstDate: string // YYYY-MM-DD of first day with events
}

/**
 * Search result item
 */
export type SearchResult = {
  event: Event
  date: string
  matchedField: 'title' | 'description'
}

/**
 * Deleted event for undo functionality
 */
export type DeletedEvent = {
  event: Event
  date: string
  timestamp: number
}

/**
 * Days of the week for recurring events
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 // Sunday = 0, Saturday = 6

/**
 * Recurring event that repeats daily with optional day exclusions
 */
export type RecurringEvent = {
  id: string
  title: string
  description?: string
  time?: string // Format: "HH:mm"
  color?: EventColor // Optional color tag
  enabledDays: DayOfWeek[] // Which days of the week this event is active
  createdAt: string // ISO date string
}

/**
 * Todo item not tied to any specific date
 */
export type Todo = {
  id: string
  title: string
  completed: boolean
  createdAt: string // ISO date string
}
