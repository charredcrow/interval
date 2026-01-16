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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { TimePicker } from '@/components/ui/time-picker'
import { DatePicker } from '@/components/ui/date-picker'
import { ColorPicker } from '@/components/ui/color-picker'
import { Trash2, ChevronDown } from 'lucide-react'
import { useTimelineStore } from '@/store/timelineStore'
import { useUIStore } from '@/store/uiStore'
import { formatDate, isValidTimeString, getTodayString } from '@/utils/date'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'
import type { EventColor } from '@/types'

export function EventDialog() {
  const {
    isEventDialogOpen,
    eventDialogDate,
    editingEvent,
    closeEventDialog,
  } = useUIStore()

  const addEvent = useTimelineStore((state) => state.addEvent)
  const updateEvent = useTimelineStore((state) => state.updateEvent)
  const deleteEvent = useTimelineStore((state) => state.deleteEvent)
  const undoDelete = useTimelineStore((state) => state.undoDelete)
  const eventsByDate = useTimelineStore((state) => state.eventsByDate)
  const navigateToDate = useUIStore((state) => state.navigateToDate)

  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [color, setColor] = useState<EventColor | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Collapsible sections state
  const [showTime, setShowTime] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [showColor, setShowColor] = useState(false)

  // Load existing event data when editing
  useEffect(() => {
    if (editingEvent && eventDialogDate) {
      const events = eventsByDate[eventDialogDate] || []
      const event = events.find((e) => e.id === editingEvent.id)
      if (event) {
        setTitle(event.title)
        setTime(event.time || '')
        setDescription(event.description || '')
        setColor(event.color)
        setDate(eventDialogDate)
        // Expand sections if they have data
        setShowTime(!!event.time)
        setShowDescription(!!event.description)
        setShowColor(!!event.color)
      }
    } else {
      // Reset form for new event
      setTitle('')
      setTime('')
      setDescription('')
      setColor(undefined)
      setDate(eventDialogDate || getTodayString())
      // Collapse sections for new events
      setShowTime(false)
      setShowDescription(false)
      setShowColor(false)
    }
  }, [editingEvent, eventDialogDate, eventsByDate])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!title.trim()) {
        toast.error('Title is required')
        return
      }

      if (time && !isValidTimeString(time)) {
        toast.error('Invalid time format. Use HH:mm')
        return
      }

      if (!date) return

      setIsSubmitting(true)

      try {
        if (editingEvent && eventDialogDate) {
          // Update existing event
          updateEvent(eventDialogDate, editingEvent.id, {
            title: title.trim(),
            time: time || undefined,
            description: description.trim() || undefined,
            color,
          })
          toast.success('Event updated')
        } else {
          // Create new event
          addEvent(date, {
            title: title.trim(),
            time: time || undefined,
            description: description.trim() || undefined,
            color,
          })
          toast.success('Event added')
          // Navigate to the date if it's not today
          if (date !== getTodayString()) {
            navigateToDate(date)
          }
        }

        closeEventDialog()
      } catch {
        toast.error('Failed to save event')
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      title,
      time,
      description,
      date,
      color,
      eventDialogDate,
      editingEvent,
      addEvent,
      updateEvent,
      closeEventDialog,
      navigateToDate,
    ]
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeEventDialog()
      }
    },
    [closeEventDialog]
  )

  const handleDelete = useCallback(() => {
    if (editingEvent && eventDialogDate) {
      deleteEvent(eventDialogDate, editingEvent.id)
      closeEventDialog()
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
  }, [editingEvent, eventDialogDate, deleteEvent, undoDelete, closeEventDialog])

  return (
    <Dialog open={isEventDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {editingEvent ? 'Edit Event' : 'New Event'}
          </DialogTitle>
          <DialogDescription>
            {editingEvent
              ? formatDate(eventDialogDate || getTodayString())
              : 'Add a new event to your timeline'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date picker - only show for new events */}
          {!editingEvent && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Date *
              </Label>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder="Select date"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's happening?"
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
              Time (optional)
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
                    placeholder="Select time"
                  />
                </motion.div>
              )}
            </AnimatePresence>
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
                    id="description"
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

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            {/* Delete button - only show when editing */}
            {editingEvent && (
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
                onClick={closeEventDialog}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
                {isSubmitting
                  ? 'Saving...'
                  : editingEvent
                    ? 'Save Changes'
                    : 'Add Event'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
