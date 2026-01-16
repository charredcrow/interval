import { memo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getEventColor } from '@/components/ui/color-picker'
import type { Event } from '@/types'
import { formatTimeDisplay } from '@/utils/date'
import { cn } from '@/utils/cn'

interface EventCardProps {
  event: Event
  onEdit: () => void
  onDelete: () => void
}

export const EventCard = memo(function EventCard({
  event,
  onEdit,
  onDelete,
}: EventCardProps) {
  const eventColor = getEventColor(event.color)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="group relative"
    >
      <div
        className={cn(
          'relative rounded-lg border border-border bg-card p-4 transition-all duration-200',
          'hover:border-accent/30 hover:shadow-sm',
          'cursor-pointer',
          eventColor && 'border-l-4'
        )}
        style={eventColor ? { borderLeftColor: eventColor } : undefined}
        onClick={onEdit}
      >
        {/* Time badge */}
        {event.time && (
          <Badge
            variant="muted"
            className="mb-2.5 gap-1.5 text-xs font-medium px-2 py-0.5"
          >
            <Clock className="h-3 w-3" />
            {formatTimeDisplay(event.time)}
          </Badge>
        )}

        {/* Title */}
        <h4 className="font-medium text-sm leading-snug pr-12 text-foreground">
          {event.title}
        </h4>

        {/* Description preview */}
        {event.description && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Hover actions - Hidden on mobile, visible on hover for desktop */}
        <div
          className={cn(
            'absolute top-3 right-3 gap-1',
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
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
})
