import { useMemo, useState, useCallback } from 'react'
import { addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, getDay } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTimelineStore } from '@/store/timelineStore'
import { useUIStore } from '@/store/uiStore'
import { toDateString, getTodayString } from '@/utils/date'
import type { DayOfWeek } from '@/types'
import { cn } from '@/utils/cn'

export function MonthView() {
  const eventsByDate = useTimelineStore((state) => state.eventsByDate)
  const recurringEvents = useTimelineStore((state) => state.recurringEvents)
  const openDayWidget = useUIStore((state) => state.openDayWidget)

  // Currently visible month
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date())

  const todayStr = getTodayString()

  // Build calendar grid for current month
  const { weeks, dayEventCounts } = useMemo(() => {
    const monthStart = startOfMonth(currentMonthDate)
    const monthEnd = endOfMonth(currentMonthDate)

    // Week starts on Monday (1) for a more standard layout
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

    // Group into weeks of 7 days
    const weeks: Date[][] = []
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7))
    }

    // Precompute event counts per day (including recurring events)
    const dayEventCounts: Record<string, number> = {}
    const recurring = recurringEvents

    allDays.forEach((d) => {
      const dateStr = toDateString(d)
      let count = eventsByDate[dateStr]?.length ?? 0

      if (recurring.length > 0) {
        const dayOfWeek = getDay(d) as DayOfWeek
        recurring.forEach((event) => {
          if (!event.enabledDays.includes(dayOfWeek)) return
          if (event.repeatUntil && event.repeatUntil < dateStr) return
          count += 1
        })
      }

      dayEventCounts[dateStr] = count
    })

    return { weeks, dayEventCounts }
  }, [currentMonthDate, eventsByDate, recurringEvents])

  const handlePrevMonth = useCallback(() => {
    setCurrentMonthDate((prev) => addMonths(prev, -1))
  }, [])

  const handleNextMonth = useCallback(() => {
    setCurrentMonthDate((prev) => addMonths(prev, 1))
  }, [])

  const handleDayClick = useCallback(
    (dateStr: string) => {
      openDayWidget(dateStr)
    },
    [openDayWidget]
  )

  // Empty state
  if (Object.keys(eventsByDate).length === 0 && recurringEvents.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2 text-foreground">No events yet</h3>
          <p className="text-sm text-muted-foreground">
            Add some events to see them in the monthly calendar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="absolute inset-0 overflow-auto px-4 sm:px-8 pt-10 sm:pt-12 pb-32 sm:pb-10"
      style={{
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      }}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header with month navigation */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Month Overview
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tap a day to see its events.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 sm:p-5 md:p-6 shadow-sm max-w-3xl mx-auto">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {format(currentMonthDate, 'MMMM yyyy')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1.5 mb-2 text-[10px] sm:text-[11px] font-medium text-muted-foreground">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
              <div key={label} className="text-center">
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid gap-y-1 sm:gap-y-1.5">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day) => {
                  const dateStr = toDateString(day)
                  const dayNumber = day.getDate()
                  const inCurrentMonth = isSameMonth(day, currentMonthDate)
                  const isToday = dateStr === todayStr
                  const eventCount = dayEventCounts[dateStr] ?? 0
                  const hasEvents = eventCount > 0

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => handleDayClick(dateStr)}
                      className={cn(
                        'relative flex flex-col items-center justify-center rounded-md aspect-square w-full max-w-[64px] max-h-[64px] p-1.5 text-[11px] sm:text-xs md:text-sm transition-colors',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        inCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40',
                        hasEvents && inCurrentMonth && 'bg-accent/5 hover:bg-accent/10 border border-accent/30',
                        !hasEvents && inCurrentMonth && 'hover:bg-muted/60',
                        !inCurrentMonth && 'hover:bg-muted/40',
                        isToday && 'ring-1 ring-accent bg-accent/10'
                      )}
                    >
                      <span className="font-medium leading-none">
                        {dayNumber}
                      </span>
                      {hasEvents && (
                        <span className="mt-1 inline-flex items-center justify-center rounded-full bg-primary/10 text-[9px] sm:text-[10px] px-1.5 py-0.5 text-primary">
                          {eventCount} evt
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
