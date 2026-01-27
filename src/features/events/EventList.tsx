import { AnimatePresence } from 'framer-motion'
import { EventCard } from './EventCard'
import type { Event } from '@/types'

interface EventListProps {
  events: Event[]
  date: string
  onEditEvent: (eventId: string, date: string) => void
  onDeleteEvent: (eventId: string, date: string) => void
}

export function EventList({
  events,
  date,
  onEditEvent,
  onDeleteEvent,
}: EventListProps) {
  if (events.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-1.5">
      <AnimatePresence mode="popLayout" initial={false}>
        {events.map((event) => (
          <EventCard
            key={`${event.id}-${event.time || 'no-time'}`}
            event={event}
            date={date}
            onEdit={() => onEditEvent(event.id, date)}
            onDelete={() => onDeleteEvent(event.id, date)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
