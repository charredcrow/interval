import { useMemo, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { MonthCard } from './MonthCard'
import { useTimelineStore } from '@/store/timelineStore'
import { useUIStore } from '@/store/uiStore'
import { getMonthYear, formatMonthYear } from '@/utils/date'
import type { MonthSummary } from '@/types'

export function MonthView() {
  const parentRef = useRef<HTMLDivElement>(null)
  const eventsByDate = useTimelineStore((state) => state.eventsByDate)
  const navigateToDate = useUIStore((state) => state.navigateToDate)

  // Group events by month
  const monthSummaries = useMemo(() => {
    const monthMap = new Map<string, MonthSummary>()

    for (const [date, events] of Object.entries(eventsByDate)) {
      if (events.length === 0) continue

      const { month, year } = getMonthYear(date)
      const key = `${year}-${month}`

      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month,
          year,
          label: formatMonthYear(date),
          eventCount: 0,
          firstDate: date,
        })
      }

      const summary = monthMap.get(key)!
      summary.eventCount += events.length
      if (date < summary.firstDate) {
        summary.firstDate = date
      }
    }

    // Sort by year and month (descending - newest first)
    return Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })
  }, [eventsByDate])

  // Get current month for highlighting
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Virtualizer for long month lists
  const virtualizer = useVirtualizer({
    count: monthSummaries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 3,
  })

  const handleMonthClick = useCallback(
    (month: MonthSummary) => {
      // Navigate to first day of the month with events
      navigateToDate(month.firstDate)
    },
    [navigateToDate]
  )

  const virtualItems = virtualizer.getVirtualItems()

  // Empty state
  if (monthSummaries.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="text-center max-w-sm"
        >
          <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2 text-foreground">No events yet</h3>
          <p className="text-sm text-muted-foreground">
            Add some events to see them organized by month here.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div 
      ref={parentRef} 
      className="absolute inset-0 overflow-auto px-6 sm:px-8 py-8"
      style={{
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Month Overview</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {monthSummaries.length} month{monthSummaries.length !== 1 ? 's' : ''} with events
          </p>
        </div>

        {/* Months list */}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <AnimatePresence>
            {virtualItems.map((virtualItem) => {
              const month = monthSummaries[virtualItem.index]
              const isCurrentMonth =
                month.month === currentMonth && month.year === currentYear

              return (
                <div
                  key={`${month.year}-${month.month}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="pb-4"
                >
                  <MonthCard
                    month={month}
                    onClick={() => handleMonthClick(month)}
                    isCurrentMonth={isCurrentMonth}
                  />
                </div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
