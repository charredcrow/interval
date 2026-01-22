import { memo, forwardRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventList } from '@/features/events/EventList'
import { RecurringEventCard } from '@/features/events/RecurringEventCard'
import { useTimelineStore } from '@/store/timelineStore'
import { useUIStore } from '@/store/uiStore'
import {
  formatDayNumber,
  formatMonthShort,
  formatWeekday,
  isDateToday,
} from '@/utils/date'
import { parseISO, getDay } from 'date-fns'
import type { DayOfWeek, Event, RecurringEvent } from '@/types'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'

interface DayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  date: string
  isFirst?: boolean
  isLast?: boolean
}

// Empty array constant to avoid re-renders
const EMPTY_EVENTS: Event[] = []

export const DayCard = memo(
  forwardRef<HTMLDivElement, DayCardProps>(function DayCard(
    { date, className, ...props },
    ref
  ) {
    const events: Event[] = useTimelineStore(
      (state) => state.eventsByDate[date] ?? EMPTY_EVENTS
    )
    const allRecurringEvents: RecurringEvent[] = useTimelineStore(
      (state) => state.recurringEvents
    )
    const deleteEvent = useTimelineStore((state) => state.deleteEvent)
    const deleteRecurringEvent = useTimelineStore((state) => state.deleteRecurringEvent)
    const undoDelete = useTimelineStore((state) => state.undoDelete)
    const openEventDialog = useUIStore((state) => state.openEventDialog)
    const openRecurringEventDialog = useUIStore((state) => state.openRecurringEventDialog)

    const isToday = useMemo(() => isDateToday(date), [date])
    const dayNumber = useMemo(() => formatDayNumber(date), [date])
    const monthShort = useMemo(() => formatMonthShort(date), [date])
    const weekday = useMemo(() => formatWeekday(date), [date])
    
    // Filter recurring events for this day of week
    const recurringEvents = useMemo(() => {
      const dayOfWeek = getDay(parseISO(date)) as DayOfWeek
      return allRecurringEvents.filter((event: RecurringEvent) => event.enabledDays.includes(dayOfWeek))
    }, [date, allRecurringEvents])

    const handleAddEvent = () => {
      openEventDialog(date, undefined)
    }

    const handleEditEvent = (eventId: string, eventDate: string) => {
      openEventDialog(eventDate, eventId)
    }

    const handleDeleteEvent = (eventId: string, eventDate: string) => {
      deleteEvent(eventDate, eventId)
      toast('Event deleted', {
        action: {
          label: 'Undo',
          onClick: () => {
            const restored = undoDelete()
            if (restored) {
              toast.success('Event restored')
            }
          },
        },
      })
    }

    const handleEditRecurringEvent = (eventId: string) => {
      openRecurringEventDialog(eventId)
    }

    const handleDeleteRecurringEvent = (eventId: string) => {
      deleteRecurringEvent(eventId)
      toast.success('Recurring event deleted')
    }

    // Calculate event summary
    const eventCount = events.length
    const recurringCount = recurringEvents.length
    const totalCount = eventCount + recurringCount
    const eventsWithTime = events.filter((e) => e.time).length
    const recurringWithTime = recurringEvents.filter((e) => e.time).length
    const totalWithTime = eventsWithTime + recurringWithTime
    const hasEvents = totalCount > 0

    return (
      <div
        ref={ref}
        className={cn(
          'pl-12 sm:pl-16 pr-4 pt-4 pb-6 relative',
          isToday && 'bg-primary/5',
          className
        )}
        {...props}
      >
        {/* Today indicator line */}
        {isToday && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
        )}
        
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col gap-3"
        >
          {/* Date header - Compact style */}
          <div className="flex items-baseline gap-2">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    'text-2xl sm:text-3xl font-semibold tracking-tight',
                    isToday ? 'text-primary' : hasEvents ? 'text-foreground' : 'text-foreground/50'
                  )}
                >
                  {dayNumber}
                </span>
                <span className={cn(
                  'text-xs font-medium uppercase tracking-wider',
                  isToday ? 'text-primary/70' : hasEvents ? 'text-muted-foreground' : 'text-muted-foreground/50'
                )}>
                  {monthShort}
                </span>
              </div>
              <span className={cn(
                'text-xs font-medium',
                isToday ? 'text-primary' : hasEvents ? 'text-muted-foreground' : 'text-muted-foreground/50'
              )}>
                {isToday ? 'Today' : weekday}
              </span>
            </div>
          </div>

          {/* Events container */}
          {totalCount > 0 ? (
            <div className="space-y-2">
              {/* Event summary */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {totalCount} event{totalCount !== 1 ? 's' : ''}
                  {recurringCount > 0 && ` · ${recurringCount} recurring`}
                  {totalWithTime > 0 && ` · ${totalWithTime} scheduled`}
                </span>
              </div>

              {/* Recurring events */}
              {recurringCount > 0 && (
                <div className="flex flex-col gap-1.5">
                  <AnimatePresence mode="popLayout">
                    {recurringEvents.map((event) => (
                      <RecurringEventCard
                        key={event.id}
                        event={event}
                        onEdit={() => handleEditRecurringEvent(event.id)}
                        onDelete={() => handleDeleteRecurringEvent(event.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Regular events list */}
              <EventList
                events={events}
                date={date}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
              />
            </div>
          ) : isToday ? (
            <div className="flex flex-col gap-2 py-1">
              <p className="text-xs text-muted-foreground/70">
                No events scheduled for today
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddEvent}
                className={cn(
                  'w-fit gap-1.5 text-xs font-medium h-7',
                  'border-border/50 hover:border-accent/50 hover:bg-accent/5',
                  'transition-all duration-200'
                )}
              >
                <Plus className="h-3 w-3" />
                Add your first event
              </Button>
            </div>
          ) : null}

          {/* Add event button - Always visible */}
          {(totalCount > 0 || !isToday) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddEvent}
              className={cn(
                'w-fit gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground h-7',
                'hover:bg-muted/50 transition-all duration-200',
                'border-0 shadow-none'
              )}
            >
              <Plus className="h-3 w-3" />
              Add event
            </Button>
          )}
        </motion.div>
      </div>
    )
  })
)
