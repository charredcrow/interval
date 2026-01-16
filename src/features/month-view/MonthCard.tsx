import { memo } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { MonthSummary } from '@/types'

interface MonthCardProps {
  month: MonthSummary
  onClick: () => void
  isCurrentMonth: boolean
}

export const MonthCard = memo(function MonthCard({
  month,
  onClick,
  isCurrentMonth,
}: MonthCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.998 }}
      onClick={onClick}
      className={cn(
        'w-full text-left p-6 rounded-xl border border-border bg-card transition-all duration-200',
        'hover:shadow-md hover:border-accent/30',
        'group',
        isCurrentMonth && 'border-accent/40 bg-accent/5'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'h-12 w-12 rounded-lg flex items-center justify-center transition-all duration-200',
              isCurrentMonth
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
            )}
          >
            <Calendar className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-semibold text-lg tracking-tight text-foreground">
              {month.label}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {month.eventCount} event{month.eventCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <ChevronRight
          className={cn(
            'h-5 w-5 text-muted-foreground transition-all duration-200',
            'group-hover:text-foreground group-hover:translate-x-1'
          )}
        />
      </div>
    </motion.button>
  )
})
