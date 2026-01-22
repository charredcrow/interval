/**
 * Notification service for event reminders
 */

import type { Event, RecurringEvent, ReminderTime } from '@/types'

// Check if browser supports notifications
export function isNotificationSupported(): boolean {
  return 'Notification' in window
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false
  
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

// Get current notification permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

// Format reminder time for display
export function formatReminderTime(minutes: ReminderTime): string {
  switch (minutes) {
    case 0: return 'At time of event'
    case 5: return '5 minutes before'
    case 10: return '10 minutes before'
    case 15: return '15 minutes before'
    case 30: return '30 minutes before'
    case 60: return '1 hour before'
    case 120: return '2 hours before'
    case 1440: return '1 day before'
    default: return `${minutes} minutes before`
  }
}

// Available reminder options
export const REMINDER_OPTIONS: { value: ReminderTime; label: string }[] = [
  { value: 0, label: 'At time of event' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
]

// Show a notification
export function showNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null
  }
  
  return new Notification(title, {
    icon: '/interval.svg',
    badge: '/interval.svg',
    ...options,
  })
}

// Calculate when to show reminder
export function calculateReminderTime(eventDate: string, eventTime: string, reminderMinutes: ReminderTime): Date {
  const [hours, minutes] = eventTime.split(':').map(Number)
  const date = new Date(eventDate)
  date.setHours(hours, minutes, 0, 0)
  date.setMinutes(date.getMinutes() - reminderMinutes)
  return date
}

// Check if reminder should be shown now
export function shouldShowReminder(
  eventDate: string,
  eventTime: string | undefined,
  reminderMinutes: ReminderTime | undefined,
  reminderSent: boolean | undefined
): boolean {
  if (!eventTime || reminderMinutes === undefined || reminderSent) return false
  
  const reminderTime = calculateReminderTime(eventDate, eventTime, reminderMinutes)
  const now = new Date()
  
  // Show reminder if we're within 1 minute of the reminder time
  const diff = reminderTime.getTime() - now.getTime()
  return diff >= 0 && diff <= 60000 // Within 1 minute
}

// Notification scheduler interval ID
let schedulerInterval: ReturnType<typeof setInterval> | null = null

// Start the notification scheduler
export function startNotificationScheduler(
  getEvents: () => { events: Event[]; date: string }[],
  getRecurringEvents: (date: string) => RecurringEvent[],
  markReminderSent: (date: string, eventId: string) => void
): void {
  if (schedulerInterval) return
  
  // Check every 30 seconds
  schedulerInterval = setInterval(() => {
    if (Notification.permission !== 'granted') return
    
    const today = new Date().toISOString().split('T')[0]
    const eventsData = getEvents()
    
    // Check regular events
    for (const { events, date } of eventsData) {
      if (date !== today) continue // Only check today's events
      
      for (const event of events) {
        if (shouldShowReminder(date, event.time, event.reminder, event.reminderSent)) {
          showNotification(`🔔 ${event.title}`, {
            body: event.time ? `Starting at ${event.time}` : 'Starting now',
            tag: event.id,
          })
          markReminderSent(date, event.id)
        }
      }
    }
    
    // Check recurring events for today
    const recurringEvents = getRecurringEvents(today)
    for (const event of recurringEvents) {
      if (event.time && event.reminder !== undefined) {
        // Note: recurring events don't have reminderSent tracking per day
        // This is a simplified implementation
        const reminderTime = calculateReminderTime(today, event.time, event.reminder)
        const now = new Date()
        const diff = reminderTime.getTime() - now.getTime()
        
        if (diff >= 0 && diff <= 60000) {
          showNotification(`🔔 ${event.title}`, {
            body: `Recurring event starting at ${event.time}`,
            tag: `recurring-${event.id}`,
          })
        }
      }
    }
  }, 30000) // Check every 30 seconds
}

// Stop the notification scheduler
export function stopNotificationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
}
