import { memo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Pencil, Trash2, Repeat } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getEventColor } from '@/components/ui/color-picker'
import { useUIStore } from '@/store/uiStore'
import type { RecurringEvent } from '@/types'
import { formatTimeForUser } from '@/utils/date'
import { cn } from '@/utils/cn'

interface RecurringEventCardProps {
  event: RecurringEvent
  onEdit: () => void
  onDelete: () => void
}

export const RecurringEventCard = memo(function RecurringEventCard({
  event,
  onEdit,
  onDelete,
}: RecurringEventCardProps) {
  const eventColor = getEventColor(event.color)
  const timeFormat = useUIStore((state) => state.timeFormat)

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
          'relative rounded-md border border-dashed border-border bg-card/50 px-3 py-2.5 transition-all duration-200',
          'hover:border-accent/30 hover:shadow-sm',
          'cursor-pointer',
          eventColor && 'border-l-[3px] border-l-solid'
        )}
        style={eventColor ? { borderLeftColor: eventColor } : undefined}
        onClick={onEdit}
      >
        {/* Badges row */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {/* Recurring badge */}
          <Badge
            variant="outline"
            className="gap-1 text-[10px] font-medium px-1.5 py-0 border-dashed"
          >
            <Repeat className="h-2.5 w-2.5" />
            Recurring
          </Badge>

          {/* Time badge */}
          {event.time && (
            <Badge
              variant="muted"
              className="gap-1 text-[10px] font-medium px-1.5 py-0"
            >
              <Clock className="h-2.5 w-2.5" />
              {formatTimeForUser(event.time, timeFormat)}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h4 className="font-medium text-xs leading-snug pr-10 text-foreground">
          {event.title}
        </h4>

        {/* Description preview */}
        {event.description && (
          <p className="mt-1 text-[10px] text-muted-foreground line-clamp-1 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Hover actions - Hidden on mobile */}
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
})
