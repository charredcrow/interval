import {
  format,
  parseISO,
  isToday,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  eachDayOfInterval,
  isSameDay,
  getMonth,
  getYear,
} from 'date-fns'

/**
 * Format a date string to display format
 */
export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMMM d, yyyy')
}

/**
 * Format date for day card header (e.g., "8" for day number)
 */
export function formatDayNumber(dateStr: string): string {
  return format(parseISO(dateStr), 'd')
}

/**
 * Format date for day card month label (e.g., "Jan")
 */
export function formatMonthShort(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM')
}

/**
 * Format date for weekday (e.g., "Wednesday")
 */
export function formatWeekday(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE')
}

/**
 * Format date for month view (e.g., "March 2026")
 */
export function formatMonthYear(dateStr: string): string {
  return format(parseISO(dateStr), 'MMMM yyyy')
}

/**
 * Get date string in YYYY-MM-DD format
 */
export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Get today's date string
 */
export function getTodayString(): string {
  return toDateString(new Date())
}

/**
 * Check if a date string represents today
 */
export function isDateToday(dateStr: string): boolean {
  return isToday(parseISO(dateStr))
}

/**
 * Check if date is in the past (before today)
 */
export function isDatePast(dateStr: string): boolean {
  return isBefore(parseISO(dateStr), startOfDay(new Date()))
}

/**
 * Check if date is in the future (after today)
 */
export function isDateFuture(dateStr: string): boolean {
  return isAfter(parseISO(dateStr), endOfDay(new Date()))
}

/**
 * Get the number of days between a date and today
 * Returns negative number for past dates, positive for future dates, 0 for today
 */
export function getDaysFromToday(dateStr: string): number {
  const date = parseISO(dateStr)
  const today = startOfDay(new Date())
  const targetDate = startOfDay(date)
  const diffTime = targetDate.getTime() - today.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Generate a range of dates as strings
 */
export function generateDateRange(startDate: Date, endDate: Date): string[] {
  return eachDayOfInterval({ start: startDate, end: endDate }).map(toDateString)
}

/**
 * Get dates for initial timeline view
 * Returns 2 past days + today + 7 future days (for smoother scrolling)
 */
export function getInitialDateRange(): string[] {
  const today = new Date()
  const start = subDays(today, 2)
  const end = addDays(today, 7)
  return generateDateRange(start, end)
}

/**
 * Extend date range into the past
 * Generates exactly 'count' days before currentFirst (not including currentFirst)
 */
export function extendPastDates(currentFirst: string, count: number = 30): string[] {
  const firstDate = parseISO(currentFirst)
  // Generate exactly 'count' days: from (firstDate - count) to (firstDate - 1)
  // Example: if firstDate = Jan 8 and count = 5, we want: Jan 3, 4, 5, 6, 7 (5 days)
  const start = subDays(firstDate, count)
  const end = subDays(firstDate, 1)
  const dates = generateDateRange(start, end)
  // Ensure we return exactly 'count' days (in case of any edge cases)
  return dates.slice(0, count)
}

/**
 * Extend date range into the future
 */
export function extendFutureDates(currentLast: string, count: number = 30): string[] {
  const lastDate = parseISO(currentLast)
  const start = addDays(lastDate, 1)
  const end = addDays(lastDate, count)
  return generateDateRange(start, end)
}

/**
 * Check if two date strings are the same day
 */
export function isSameDayStr(date1: string, date2: string): boolean {
  return isSameDay(parseISO(date1), parseISO(date2))
}

/**
 * Check if a date string is in a given month/year
 */
export function isInMonth(dateStr: string, month: number, year: number): boolean {
  const date = parseISO(dateStr)
  return getMonth(date) === month && getYear(date) === year
}

/**
 * Get month and year from date string
 */
export function getMonthYear(dateStr: string): { month: number; year: number } {
  const date = parseISO(dateStr)
  return { month: getMonth(date), year: getYear(date) }
}

/**
 * Get the first day of a month as date string
 */
export function getFirstDayOfMonth(month: number, year: number): string {
  return toDateString(new Date(year, month, 1))
}

/**
 * Sort time strings (HH:mm format)
 */
export function compareTimeStrings(a?: string, b?: string): number {
  // Events without time go to the bottom
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}

/**
 * Parse and validate time string (HH:mm)
 */
export function isValidTimeString(time: string): boolean {
  const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/
  return regex.test(time)
}

/**
 * Format time for display (e.g., "9:30 AM")
 */
export function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Format time according to user preference.
 * Internal time format is always 'HH:mm'.
 */
export function formatTimeForUser(time: string, format: '12h' | '24h'): string {
  if (format === '24h') {
    // Ensure HH:mm with zero-padded hours
    const [hours, minutes] = time.split(':').map(Number)
    const hh = hours.toString().padStart(2, '0')
    const mm = minutes.toString().padStart(2, '0')
    return `${hh}:${mm}`
  }
  return formatTimeDisplay(time)
}

/**
 * Parse date string (YYYY-MM-DD) to Date object
 */
export function parseToDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined
  try {
    const date = parseISO(dateStr)
    return isNaN(date.getTime()) ? undefined : date
  } catch {
    return undefined
  }
}
