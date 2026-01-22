import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { TimePicker } from '@/components/ui/time-picker'
import { DatePicker } from '@/components/ui/date-picker'
import { ColorPicker } from '@/components/ui/color-picker'
import { Trash2, ChevronDown, CalendarOff } from 'lucide-react'
import { useTimelineStore } from '@/store/timelineStore'
import { useUIStore } from '@/store/uiStore'
import { isValidTimeString, getTodayString, parseToDate } from '@/utils/date'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'
import type { DayOfWeek, EventColor } from '@/types'

const DAYS_OF_WEEK: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

export function RecurringEventDialog() {
  const {
    isRecurringEventDialogOpen,
    editingRecurringEventId,
    closeRecurringEventDialog,
  } = useUIStore()

  const recurringEvents = useTimelineStore((state) => state.recurringEvents)
  const addRecurringEvent = useTimelineStore((state) => state.addRecurringEvent)
  const updateRecurringEvent = useTimelineStore((state) => state.updateRecurringEvent)
  const deleteRecurringEvent = useTimelineStore((state) => state.deleteRecurringEvent)

  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<EventColor | undefined>(undefined)
  const [enabledDays, setEnabledDays] = useState<DayOfWeek[]>([0, 1, 2, 3, 4, 5, 6])
  const [repeatUntil, setRepeatUntil] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Collapsible sections state
  const [showTime, setShowTime] = useState(false)
  const [showEndTime, setShowEndTime] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [showColor, setShowColor] = useState(false)
  const [showRepeatUntil, setShowRepeatUntil] = useState(false)

  // Load existing recurring event data when editing
  useEffect(() => {
    if (editingRecurringEventId) {
      const event = recurringEvents.find((e) => e.id === editingRecurringEventId)
      if (event) {
        setTitle(event.title)
        setTime(event.time || '')
        setEndTime(event.endTime || '')
        setDescription(event.description || '')
        setColor(event.color)
        setEnabledDays(event.enabledDays)
        setRepeatUntil(event.repeatUntil || '')
        // Expand sections if they have data
        setShowTime(!!event.time)
        setShowEndTime(!!event.endTime)
        setShowDescription(!!event.description)
        setShowColor(!!event.color)
        setShowRepeatUntil(!!event.repeatUntil)
      }
    } else {
      // Reset form for new recurring event
      setTitle('')
      setTime('')
      setEndTime('')
      setDescription('')
      setColor(undefined)
      setEnabledDays([0, 1, 2, 3, 4, 5, 6]) // All days enabled by default
      setRepeatUntil('')
      // Collapse sections for new events
      setShowTime(false)
      setShowEndTime(false)
      setShowDescription(false)
      setShowColor(false)
      setShowRepeatUntil(false)
    }
  }, [editingRecurringEventId, recurringEvents])

  const toggleDay = useCallback((day: DayOfWeek) => {
    setEnabledDays((prev) => {
      if (prev.includes(day)) {
        // Don't allow disabling all days
        if (prev.length === 1) {
          toast.error('At least one day must be selected')
          return prev
        }
        return prev.filter((d) => d !== day)
      }
      return [...prev, day].sort((a, b) => a - b)
    })
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!title.trim()) {
        toast.error('Title is required')
        return
      }

      if (time && !isValidTimeString(time)) {
        toast.error('Invalid start time format. Use HH:mm')
        return
      }

      if (endTime && !isValidTimeString(endTime)) {
        toast.error('Invalid end time format. Use HH:mm')
        return
      }

      if (time && endTime && endTime <= time) {
        toast.error('End time must be after start time')
        return
      }

      if (enabledDays.length === 0) {
        toast.error('At least one day must be selected')
        return
      }

      setIsSubmitting(true)

      try {
        if (editingRecurringEventId) {
          // Update existing recurring event
          updateRecurringEvent(editingRecurringEventId, {
            title: title.trim(),
            time: time || undefined,
            endTime: endTime || undefined,
            description: description.trim() || undefined,
            color,
            enabledDays,
            repeatUntil: repeatUntil || undefined,
          })
          toast.success('Recurring event updated')
        } else {
          // Create new recurring event
          addRecurringEvent({
            title: title.trim(),
            time: time || undefined,
            endTime: endTime || undefined,
            description: description.trim() || undefined,
            color,
            enabledDays,
            repeatUntil: repeatUntil || undefined,
          })
          toast.success('Recurring event added')
        }

        closeRecurringEventDialog()
      } catch {
        toast.error('Failed to save recurring event')
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      title,
      time,
      endTime,
      description,
      color,
      enabledDays,
      repeatUntil,
      editingRecurringEventId,
      addRecurringEvent,
      updateRecurringEvent,
      closeRecurringEventDialog,
    ]
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeRecurringEventDialog()
      }
    },
    [closeRecurringEventDialog]
  )

  const handleDelete = useCallback(() => {
    if (editingRecurringEventId) {
      deleteRecurringEvent(editingRecurringEventId)
      closeRecurringEventDialog()
      toast.success('Recurring event deleted')
    }
  }, [editingRecurringEventId, deleteRecurringEvent, closeRecurringEventDialog])

  return (
    <Dialog open={isRecurringEventDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {editingRecurringEventId ? 'Edit Recurring Event' : 'New Recurring Event'}
          </DialogTitle>
          <DialogDescription>
            Create an event that repeats every day. You can disable specific days of the week.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="recurring-title" className="text-sm font-medium">
              Title *
            </Label>
            <Input
              id="recurring-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Daily standup, Morning routine..."
              autoFocus
              required
              className="text-sm"
            />
          </div>

          {/* Collapsible Time */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowTime(!showTime)}
              className={cn(
                'flex items-center gap-2 text-sm font-medium w-full text-left',
                'text-muted-foreground hover:text-foreground transition-colors'
              )}
            >
              <ChevronDown 
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  !showTime && '-rotate-90'
                )} 
              />
              Start Time (optional)
            </button>
            <AnimatePresence>
              {showTime && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <TimePicker
                    value={time}
                    onChange={setTime}
                    placeholder="Select start time"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Collapsible End Time - only show when start time is set */}
          {time && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowEndTime(!showEndTime)}
                className={cn(
                  'flex items-center gap-2 text-sm font-medium w-full text-left',
                  'text-muted-foreground hover:text-foreground transition-colors'
                )}
              >
                <ChevronDown 
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    !showEndTime && '-rotate-90'
                  )} 
                />
                End Time (optional)
              </button>
              <AnimatePresence>
                {showEndTime && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <TimePicker
                      value={endTime}
                      onChange={setEndTime}
                      placeholder="Select end time"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Active Days
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select which days of the week this event should appear
            </p>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(({ value, short }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleDay(value)}
                  className={cn(
                    'h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200',
                    'border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    enabledDays.includes(value)
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/50'
                  )}
                >
                  {short}
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible Description */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowDescription(!showDescription)}
              className={cn(
                'flex items-center gap-2 text-sm font-medium w-full text-left',
                'text-muted-foreground hover:text-foreground transition-colors'
              )}
            >
              <ChevronDown 
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  !showDescription && '-rotate-90'
                )} 
              />
              Description (optional)
            </button>
            <AnimatePresence>
              {showDescription && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Textarea
                    id="recurring-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add more details..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Collapsible Color */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowColor(!showColor)}
              className={cn(
                'flex items-center gap-2 text-sm font-medium w-full text-left',
                'text-muted-foreground hover:text-foreground transition-colors'
              )}
            >
              <ChevronDown 
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  !showColor && '-rotate-90'
                )} 
              />
              Color (optional)
            </button>
            <AnimatePresence>
              {showColor && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 pb-1">
                    <ColorPicker value={color} onChange={setColor} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Collapsible Repeat Until */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowRepeatUntil(!showRepeatUntil)}
              className={cn(
                'flex items-center gap-2 text-sm font-medium w-full text-left',
                'text-muted-foreground hover:text-foreground transition-colors'
              )}
            >
              <ChevronDown 
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  !showRepeatUntil && '-rotate-90'
                )} 
              />
              <CalendarOff className="h-4 w-4" />
              Repeat Until (optional)
            </button>
            <AnimatePresence>
              {showRepeatUntil && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground mb-2">
                      Leave empty to repeat forever
                    </p>
                    <DatePicker
                      value={repeatUntil}
                      onChange={setRepeatUntil}
                      placeholder="Select end date"
                      minDate={parseToDate(getTodayString())}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            {/* Delete button - only show when editing */}
            {editingRecurringEventId && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="w-full sm:w-auto sm:mr-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={closeRecurringEventDialog}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
                {isSubmitting
                  ? 'Saving...'
                  : editingRecurringEventId
                    ? 'Save Changes'
                    : 'Add Recurring Event'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
