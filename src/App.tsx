import { Toaster } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Header } from '@/components/Header'
import { QuickAdd } from '@/components/QuickAdd'
import { TimelineView } from '@/features/timeline'
import { MonthView } from '@/features/month-view'
import { EventDialog, RecurringEventDialog } from '@/features/events'
import { TodoPanel } from '@/features/todos'
import { useUIStore } from '@/store/uiStore'

function App() {
  const viewMode = useUIStore((state) => state.viewMode)
  const theme = useUIStore((state) => state.theme)

  // Apply theme on mount and when it changes
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header with navigation */}
      <Header />

      {/* Main content */}
      <main className="flex-1 relative pt-12 pb-32 overflow-hidden bg-background">
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
  )
}

export default App
