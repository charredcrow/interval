import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Clock, Pencil, Trash2, CalendarRange, Bell, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getEventColor } from '@/components/ui/color-picker'
import { useDragStore } from '@/store/dragStore'
import { useTimelineStore } from '@/store/timelineStore'
import type { Event } from '@/types'
import { formatTimeDisplay, formatDate } from '@/utils/date'
import { cn } from '@/utils/cn'

interface EventCardProps {
  event: Event
  date: string
  onEdit: () => void
  onDelete: () => void
}

export const EventCard = memo(function EventCard({
  event,
  date,
  onEdit,
  onDelete,
}: EventCardProps) {
  const eventColor = getEventColor(event.color)
  const tags = useTimelineStore((state) => state.tags)
  const startDrag = useDragStore((state) => state.startDrag)
  const endDrag = useDragStore((state) => state.endDrag)
  const draggedEvent = useDragStore((state) => state.draggedEvent)
  
  const isDragging = draggedEvent?.eventId === event.id
  
  // Get event tags
  const eventTags = event.tags?.map(tagId => tags.find(t => t.id === tagId)).filter(Boolean) || []
  const isSameDayEnd = event.endDate && event.endDate === date

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', event.id)
    startDrag(event.id, date)
  }, [event.id, date, startDrag])

  const handleDragEnd = useCallback(() => {
    endDrag()
  }, [endDrag])

  return (
    <motion.div
      layout
      layoutId={`event-${event.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="group relative"
    >
      <div
        draggable
        onDragStart={handleDragStart as unknown as React.DragEventHandler}
        onDragEnd={handleDragEnd}
        className={cn(
          'relative rounded-md border border-border bg-card px-3 py-2.5 transition-all duration-200',
          'hover:border-accent/30 hover:shadow-sm',
          'cursor-grab active:cursor-grabbing',
          eventColor && 'border-l-[3px]',
          isDragging && 'opacity-50 border-dashed'
        )}
        style={eventColor ? { borderLeftColor: eventColor } : undefined}
        onClick={onEdit}
      >
        {/* Drag handle indicator */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity hidden sm:block">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
        {/* Time and End Date/Time badges */}
        {(event.time || event.endDate || event.endTime) && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {event.time && (
              <Badge
                variant="muted"
                className="gap-1 text-[10px] font-medium px-1.5 py-0"
              >
                <Clock className="h-2.5 w-2.5" />
                {formatTimeDisplay(event.time)}
                {/* When end is the same day (or no explicit endDate), show a pure time range */}
                {event.endTime && (!event.endDate || isSameDayEnd) && ` – ${formatTimeDisplay(event.endTime)}`}
              </Badge>
            )}
            {/* Only show separate end date badge when end date is different from the event date */}
            {event.endDate && !isSameDayEnd && (
              <Badge
                variant="outline"
                className="gap-1 text-[10px] font-medium px-1.5 py-0"
              >
                <CalendarRange className="h-2.5 w-2.5" />
                → {formatDate(event.endDate!).split(',')[0]}
                {event.endTime && `, ${formatTimeDisplay(event.endTime)}`}
              </Badge>
            )}
          </div>
        )}

        {/* Title with reminder indicator */}
        <div className="flex items-start gap-1">
          <h4 className="font-medium text-xs leading-snug pr-10 text-foreground flex-1">
            {event.title}
          </h4>
          {event.reminder !== undefined && (
            <Bell className="h-2.5 w-2.5 text-muted-foreground shrink-0 mt-0.5" />
          )}
        </div>

        {/* Tags */}
        {eventTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {eventTags.map((tag) => (
              <span
                key={tag!.id}
                className="text-[9px] px-1.5 py-0 rounded-full"
                style={{
                  backgroundColor: getEventColor(tag!.color) + '20',
                  color: getEventColor(tag!.color),
                }}
              >
                {tag!.name}
              </span>
            ))}
          </div>
        )}

        {/* Description preview */}
        {event.description && (
          <p className="mt-1 text-[10px] text-muted-foreground line-clamp-1 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Hover actions - Hidden on mobile, visible on hover for desktop */}
        <div
          className={cn(
            'absolute top-2 right-2 gap-0.5',
            'hidden sm:flex', // Hide on mobile
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
          )}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}, (prevProps, nextProps) => {
  // Re-render when key event fields change (including color so UI updates)
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.event.time === nextProps.event.time &&
    prevProps.event.title === nextProps.event.title &&
    prevProps.event.description === nextProps.event.description &&
    prevProps.event.color === nextProps.event.color &&
    prevProps.date === nextProps.date
  )
})
