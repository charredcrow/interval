import { Toaster } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Header } from '@/components/Header'
import { QuickAdd } from '@/components/QuickAdd'
import { TimelineView } from '@/features/timeline'
import { MonthView } from '@/features/month-view'
import { EventDialog, RecurringEventDialog } from '@/features/events'
import { TodoPanel } from '@/features/todos'
import { TodayWidget } from '@/features/today'
import { useUIStore } from '@/store/uiStore'
import { useTimelineStore } from '@/store/timelineStore'
import { startNotificationScheduler, stopNotificationScheduler, getNotificationPermission } from '@/utils/notifications'

function App() {
  const viewMode = useUIStore((state) => state.viewMode)
  const theme = useUIStore((state) => state.theme)
  
  // Get store functions directly - these are stable references
  const getRecurringEventsForDate = useTimelineStore((state) => state.getRecurringEventsForDate)
  const markReminderSent = useTimelineStore((state) => state.markReminderSent)

  // Use refs to store stable references that don't trigger re-renders
  const getRecurringEventsForDateRef = useRef(getRecurringEventsForDate)
  const markReminderSentRef = useRef(markReminderSent)

  // Keep refs updated with latest values
  useEffect(() => {
    getRecurringEventsForDateRef.current = getRecurringEventsForDate
    markReminderSentRef.current = markReminderSent
  }, [getRecurringEventsForDate, markReminderSent])

  // Apply theme on mount and when it changes
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  // Initialize notification scheduler - only once on mount
  useEffect(() => {
    // Request permission on first load if not already decided
    const permission = getNotificationPermission()
    if (permission === 'default') {
      // Don't auto-request, wait for user to enable reminders
    } else if (permission === 'granted') {
      // Start the scheduler - access store directly via getState() to avoid subscriptions
      const getEvents = () => {
        const state = useTimelineStore.getState()
        return Object.entries(state.eventsByDate).map(([date, events]) => ({ date, events }))
      }
      startNotificationScheduler(
        getEvents,
        getRecurringEventsForDateRef.current,
        markReminderSentRef.current
      )
    }

    return () => {
      stopNotificationScheduler()
    }
    // Empty dependency array - only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ErrorBoundary>
      <div className="h-screen bg-background flex flex-col overflow-hidden touch-none">
        {/* Header with navigation */}
        <Header />

      {/* Main content */}
      <main className="flex-1 relative pt-10 pb-24 overflow-hidden bg-background">
        <AnimatePresence mode="wait">
          {viewMode === 'timeline' ? (
            <motion.div
              key="timeline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0"
            >
              <TimelineView />
            </motion.div>
          ) : (
            <motion.div
              key="month"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0"
            >
              <MonthView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Quick add bar */}
      <QuickAdd />

      {/* Event dialog */}
      <EventDialog />

      {/* Recurring event dialog */}
      <RecurringEventDialog />

      {/* Todo panel */}
      <TodoPanel />

      {/* Today widget */}
      <TodayWidget />

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-foreground)',
            borderRadius: '0.75rem',
          },
        }}
      />
      </div>
    </ErrorBoundary>
  )
}

export default App
