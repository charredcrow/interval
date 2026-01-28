/**
 * Core type definitions for Interval application
 */

/**
 * Available event colors
 */
export type EventColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'gray'

/**
 * Reminder time options (minutes before event)
 */
export type ReminderTime = 0 | 5 | 10 | 15 | 30 | 60 | 120 | 1440 // 0 = at time, 1440 = 1 day

/**
 * Event tag/category
 */
export type EventTag = {
  id: string
  name: string
  color: EventColor
}

/**
 * Represents a single event in the timeline
 */
export type Event = {
  id: string
  title: string
  description?: string
  time?: string // Format: "HH:mm" - start time
  endDate?: string // Format: "YYYY-MM-DD" - optional end date for multi-day events
  endTime?: string // Format: "HH:mm" - optional end time
  color?: EventColor // Optional color tag
  tags?: string[] // Array of tag IDs
  links?: string[] // Attached URL links
  reminder?: ReminderTime // Minutes before event to remind
  reminderSent?: boolean // Whether reminder has been sent
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
  endTime?: string // Format: "HH:mm" - optional end time
  color?: EventColor // Optional color tag
  tags?: string[] // Array of tag IDs
  enabledDays: DayOfWeek[] // Which days of the week this event is active
  repeatUntil?: string // Format: "YYYY-MM-DD" - optional end date for recurring
  reminder?: ReminderTime // Minutes before event to remind
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
