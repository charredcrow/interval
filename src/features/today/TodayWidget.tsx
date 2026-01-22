import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, CalendarDays, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTimelineStore } from '@/store/timelineStore'
import { useUIStore } from '@/store/uiStore'
import { getTodayString, formatTimeDisplay, formatDate } from '@/utils/date'
import { getEventColor } from '@/components/ui/color-picker'
import { cn } from '@/utils/cn'
import { parseISO, getDay } from 'date-fns'
import type { DayOfWeek } from '@/types'

export function TodayWidget() {
  const isTodayWidgetOpen = useUIStore((state) => state.isTodayWidgetOpen)
  const closeTodayWidget = useUIStore((state) => state.closeTodayWidget)
  const openEventDialog = useUIStore((state) => state.openEventDialog)
  
  const today = getTodayString()
  const events = useTimelineStore((state) => state.eventsByDate[today] || [])
  const recurringEvents = useTimelineStore((state) => state.recurringEvents)
  const tags = useTimelineStore((state) => state.tags)
  
  // Filter recurring events for today
  const todayRecurringEvents = useMemo(() => {
    const dayOfWeek = getDay(parseISO(today)) as DayOfWeek
    return recurringEvents.filter((event) => {
      if (!event.enabledDays.includes(dayOfWeek)) return false
      if (event.repeatUntil && event.repeatUntil < today) return false
      return true
    })
  }, [today, recurringEvents])
  
  // Combine and sort all events by time
  const allEvents = useMemo(() => {
    const combined = [
      ...events.map(e => ({ ...e, isRecurring: false })),
      ...todayRecurringEvents.map(e => ({ ...e, isRecurring: true })),
    ]
    
    return combined.sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })
  }, [events, todayRecurringEvents])
  
  // Separate events into upcoming and past
  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  
  const { upcoming, past } = useMemo(() => {
    const upcoming = allEvents.filter(e => !e.time || e.time >= currentTime)
    const past = allEvents.filter(e => e.time && e.time < currentTime)
    return { upcoming, past }
  }, [allEvents, currentTime])

  return (
    <AnimatePresence>
      {isTodayWidgetOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={closeTodayWidget}
          />
          
          {/* Widget Panel */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-background border-l shadow-2xl"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h2 className="text-lg font-semibold">Today</h2>
                  <p className="text-xs text-muted-foreground">{formatDate(today)}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={closeTodayWidget}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-auto p-4 space-y-6">
                {allEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">No events for today</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        openEventDialog(today, undefined)
                        closeTodayWidget()
                      }}
                    >
                      Add Event
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Upcoming events */}
                    {upcoming.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                          Upcoming ({upcoming.length})
                        </h3>
                        <div className="space-y-2">
                          {upcoming.map((event) => (
                            <TodayEventCard
                              key={event.id}
                              event={event}
                              tags={tags}
                              onClick={() => {
                                if (!event.isRecurring) {
                                  openEventDialog(today, event.id)
                                  closeTodayWidget()
                                }
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Past events */}
                    {past.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                          Earlier ({past.length})
                        </h3>
                        <div className="space-y-2 opacity-60">
                          {past.map((event) => (
                            <TodayEventCard
                              key={event.id}
                              event={event}
                              tags={tags}
                              isPast
                              onClick={() => {
                                if (!event.isRecurring) {
                                  openEventDialog(today, event.id)
                                  closeTodayWidget()
                                }
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Footer summary */}
              <div className="p-4 border-t bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{allEvents.length} event{allEvents.length !== 1 ? 's' : ''} today</span>
                  <span>{upcoming.length} upcoming</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Individual event card for the widget
interface TodayEventCardProps {
  event: {
    id: string
    title: string
    time?: string
    endTime?: string
    color?: string
    tags?: string[]
    isRecurring: boolean
  }
  tags: { id: string; name: string; color: string }[]
  isPast?: boolean
  onClick?: () => void
}

function TodayEventCard({ event, tags, isPast, onClick }: TodayEventCardProps) {
  const eventColor = getEventColor(event.color as any)
  const eventTags = event.tags?.map(id => tags.find(t => t.id === id)).filter(Boolean) || []
  
  return (
    <button
      onClick={onClick}
      disabled={event.isRecurring}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all',
        'hover:border-accent/30 hover:bg-accent/5',
        event.isRecurring && 'cursor-default border-dashed',
        eventColor && 'border-l-[3px]'
      )}
      style={eventColor ? { borderLeftColor: eventColor } : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Time indicator */}
        <div className="shrink-0 w-12 text-right">
          {event.time ? (
            <span className="text-xs font-medium">
              {formatTimeDisplay(event.time).replace(' ', '\n')}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">All day</span>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isPast ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className={cn('text-sm font-medium truncate', isPast && 'line-through')}>
              {event.title}
            </span>
          </div>
          
          {/* Duration */}
          {event.time && event.endTime && (
            <div className="flex items-center gap-1 mt-1 ml-5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {formatTimeDisplay(event.time)} – {formatTimeDisplay(event.endTime)}
              </span>
            </div>
          )}
          
          {/* Tags and recurring badge */}
          <div className="flex flex-wrap gap-1 mt-1.5 ml-5">
            {event.isRecurring && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-dashed">
                Recurring
              </Badge>
            )}
            {eventTags.map((tag) => (
              <span
                key={tag!.id}
                className="text-[9px] px-1.5 py-0 rounded-full"
                style={{
                  backgroundColor: getEventColor(tag!.color as any) + '20',
                  color: getEventColor(tag!.color as any),
                }}
              >
                {tag!.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}
