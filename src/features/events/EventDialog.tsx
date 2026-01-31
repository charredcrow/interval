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
import { ColorPicker, getEventColor } from '@/components/ui/color-picker'
import { Trash2, ChevronDown, Bell, Tag, Plus } from 'lucide-react'
import { useTimelineStore } from '@/store/timelineStore'
import { useUIStore } from '@/store/uiStore'
import { formatDate, isValidTimeString, getTodayString } from '@/utils/date'
import { REMINDER_OPTIONS, requestNotificationPermission, getNotificationPermission } from '@/utils/notifications'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'
import type { EventColor, ReminderTime } from '@/types'

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
  const tags = useTimelineStore((state) => state.tags)
  const addTag = useTimelineStore((state) => state.addTag)
  const navigateToDate = useUIStore((state) => state.navigateToDate)

  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [color, setColor] = useState<EventColor | undefined>(undefined)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [links, setLinks] = useState<string[]>([])
  const [reminder, setReminder] = useState<ReminderTime | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState<EventColor>('blue')
  const [showNewTagForm, setShowNewTagForm] = useState(false)
  const [shouldAutoFocusTitle, setShouldAutoFocusTitle] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  
  // Collapsible sections state - accordion behavior: only one open at a time
  const [openSection, setOpenSection] = useState<string | null>(null)
  
  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])
  
  // Helper functions for accordion behavior
  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }
  
  const showTime = openSection === 'time'
  const showDescription = openSection === 'description'
  const showColor = openSection === 'color'
  const showTags = openSection === 'tags'
  const showReminder = openSection === 'reminder'

  // Determine whether to autofocus title (desktop only, no autofocus on mobile/tablet)
  useEffect(() => {
    // Run only in browser
    if (typeof window === 'undefined') {
      setShouldAutoFocusTitle(false)
      return
    }

    // Simple heuristic: treat widths < 768px as mobile/tablet
    const isSmallScreen = window.innerWidth < 768

    // Additionally check pointer type: coarse usually means touch devices
    const hasCoarsePointer =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches

    setShouldAutoFocusTitle(!isSmallScreen && !hasCoarsePointer)
  }, [])

  // Load existing event data when editing
  useEffect(() => {
    setFieldErrors({})
    if (editingEvent && eventDialogDate) {
      const events = eventsByDate[eventDialogDate] || []
      const event = events.find((e) => e.id === editingEvent.id)
      if (event) {
        setTitle(event.title)
        setTime(event.time || '')
        setDescription(event.description || '')
        setEndDate(event.endDate || '')
        setEndTime(event.endTime || '')
        setColor(event.color)
        setSelectedTags(event.tags || [])
        setLinks(event.links || [])
        setReminder(event.reminder)
        setDate(eventDialogDate)
        // All sections closed by default, even when editing
        setOpenSection(null)
      }
    } else {
      // Reset form for new event
      setTitle('')
      setTime('')
      setDescription('')
      setEndDate('')
      setEndTime('')
      setColor(undefined)
      setSelectedTags([])
      setLinks([])
      setReminder(undefined)
      setDate(eventDialogDate || getTodayString())
      // All sections closed by default
      setOpenSection(null)
      setShowNewTagForm(false)
      setNewTagName('')
    }
  }, [editingEvent, eventDialogDate, eventsByDate])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const errors: Record<string, string> = {}

      if (!title.trim()) {
        errors.title = 'Title is required'
      }
      if (time && !isValidTimeString(time)) {
        errors.time = 'Invalid start time. Use HH:mm'
      }
      if (endTime && !isValidTimeString(endTime)) {
        errors.endTime = 'Invalid end time. Use HH:mm'
      }
      if (!editingEvent && !date) {
        errors.date = 'Date is required'
      }
      if (time && endTime && endTime <= time) {
        errors.endTime = errors.endTime || 'End time must be after start time'
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        const first = Object.values(errors)[0]
        if (first) toast.error(first)
        return
      }
      setFieldErrors({})
      setIsSubmitting(true)

      try {
        if (editingEvent && eventDialogDate) {
          await updateEvent(eventDialogDate, editingEvent.id, {
            title: title.trim(),
            time: time || undefined,
            endDate: endDate || undefined,
            endTime: endTime || undefined,
            description: description.trim() || undefined,
            color,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            links: links.length > 0 ? links : undefined,
            reminder,
          })
          toast.success('Event updated')
        } else {
          await addEvent(date, {
            title: title.trim(),
            time: time || undefined,
            endDate: endDate || undefined,
            endTime: endTime || undefined,
            description: description.trim() || undefined,
            color,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            links: links.length > 0 ? links : undefined,
            reminder,
          })
          toast.success('Event added')
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
      endDate,
      endTime,
      description,
      date,
      color,
      selectedTags,
      reminder,
      links,
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

  const handleDelete = useCallback(async () => {
    if (editingEvent && eventDialogDate) {
      await deleteEvent(eventDialogDate, editingEvent.id)
      closeEventDialog()
      toast('Event deleted', {
        action: {
          label: 'Undo',
          onClick: async () => {
            const restored = await undoDelete()
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
      <DialogContent
        className="sm:max-w-md"
        // Prevent automatic focus on inputs when editing (Radix default behavior),
        // so on mobile/tablet клавиатура не всплывает сама.
        onOpenAutoFocus={(event) => {
          if (editingEvent) {
            event.preventDefault()
          }
        }}
      >
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

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Date picker - only show for new events */}
          {!editingEvent && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Date *
              </Label>
              <DatePicker
                value={date}
                onChange={(v) => { setDate(v); clearFieldError('date') }}
                placeholder="Select date"
              />
              {fieldErrors.date && (
                <p className="text-xs text-destructive">{fieldErrors.date}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); clearFieldError('title') }}
              placeholder="What's happening?"
              autoFocus={shouldAutoFocusTitle && !editingEvent}
              required
              className={cn('text-sm', fieldErrors.title && 'border-destructive')}
            />
            {fieldErrors.title && (
              <p className="text-xs text-destructive">{fieldErrors.title}</p>
            )}
          </div>

          {/* Collapsible Time (with optional End Time) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => toggleSection('time')}
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
              Time
            </button>
            <AnimatePresence>
              {showTime && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-3"
                >
                  <div className="space-y-1.5">
                    <TimePicker
                      value={time}
                      onChange={(v) => { setTime(v); clearFieldError('time') }}
                      placeholder="Select start time"
                    />
                    {fieldErrors.time && (
                      <p className="text-xs text-destructive">{fieldErrors.time}</p>
                    )}
                  </div>

                  {/* End time appears only when start time is set */}
                  {time && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">End Time</Label>
                      <TimePicker
                        value={endTime}
                        onChange={(v) => { setEndTime(v); clearFieldError('endTime') }}
                        placeholder="Select end time"
                      />
                      {fieldErrors.endTime && (
                        <p className="text-xs text-destructive">{fieldErrors.endTime}</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Collapsible Description */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => toggleSection('description')}
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
              Description
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
                    onBlur={() => {
                      const urlRegex = /(https?:\/\/[^\s]+)/g
                      const found: string[] = []
                      const cleaned = (description || '').replace(urlRegex, (match) => {
                        found.push(match)
                        return ''
                      })
                      if (found.length) {
                        setDescription(cleaned.trim())
                        setLinks((prev) => Array.from(new Set([...prev, ...found])))
                      }
                    }}
                    placeholder="Add more details..."
                    rows={3}
                    className="text-sm resize-none max-h-40 overflow-y-auto"
                  />
                  {links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {links.map((url) => {
                        let label = url
                        try {
                          const parsed = new URL(url)
                          label = parsed.hostname
                        } catch {
                          // ignore parse errors, fallback to raw url
                        }
                        return (
                          <div
                            key={url}
                            className="flex items-center gap-1 rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground max-w-full"
                          >
                            <span className="truncate max-w-[160px] sm:max-w-[220px]">
                              {label}
                            </span>
                            <button
                              type="button"
                              className="ml-1 text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setLinks((prev) => prev.filter((l) => l !== url))
                              }
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Collapsible Color */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => toggleSection('color')}
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
              Color
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

          {/* Collapsible Tags */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => toggleSection('tags')}
              className={cn(
                'flex items-center gap-2 text-sm font-medium w-full text-left',
                'text-muted-foreground hover:text-foreground transition-colors'
              )}
            >
              <ChevronDown 
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  !showTags && '-rotate-90'
                )} 
              />
              <Tag className="h-4 w-4" />
              Tags
            </button>
            <AnimatePresence>
              {showTags && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-2"
                >
                  {/* Existing tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTags(selectedTags.filter(id => id !== tag.id))
                            } else {
                              setSelectedTags([...selectedTags, tag.id])
                            }
                          }}
                          className={cn(
                            'text-xs px-2 py-1 rounded-full border transition-all',
                            isSelected
                              ? 'border-transparent'
                              : 'border-border hover:border-accent/50'
                          )}
                          style={{
                            backgroundColor: isSelected ? getEventColor(tag.color) + '20' : undefined,
                            color: isSelected ? getEventColor(tag.color) : undefined,
                            borderColor: isSelected ? getEventColor(tag.color) : undefined,
                          }}
                        >
                          {tag.name}
                        </button>
                      )
                    })}
                    {/* Add new tag button */}
                    <button
                      type="button"
                      onClick={() => setShowNewTagForm(!showNewTagForm)}
                      className="text-xs px-2 py-1 rounded-full border border-dashed border-border hover:border-accent/50 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      New
                    </button>
                  </div>
                  
                  {/* New tag form */}
                  <AnimatePresence>
                    {showNewTagForm && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex gap-2 items-end pt-2 border-t">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Tag name</Label>
                            <Input
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              placeholder="e.g. Work, Personal"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Color</Label>
                            <div className="flex gap-1">
                              {(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'] as EventColor[]).map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setNewTagColor(c)}
                                  className={cn(
                                    'w-6 h-6 rounded-full transition-all',
                                    newTagColor === c && 'ring-2 ring-offset-2 ring-offset-background'
                                  )}
                                  style={{
                                    backgroundColor: getEventColor(c),
                                    // @ts-expect-error CSS custom property for ring color
                                    '--tw-ring-color': getEventColor(c),
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            disabled={!newTagName.trim()}
                            onClick={async () => {
                              if (newTagName.trim()) {
                                const newId = await addTag({ name: newTagName.trim(), color: newTagColor })
                                setSelectedTags([...selectedTags, newId])
                                setNewTagName('')
                                setShowNewTagForm(false)
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Collapsible Reminder - only show when time is set */}
          {time && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  if (openSection !== 'reminder') {
                    // Request permission when opening
                    const permission = getNotificationPermission()
                    if (permission === 'default') {
                      const granted = await requestNotificationPermission()
                      if (!granted) {
                        toast.error('Notification permission denied')
                        return
                      }
                    } else if (permission === 'denied') {
                      toast.error('Notifications are blocked. Please enable them in browser settings.')
                      return
                    }
                  }
                  toggleSection('reminder')
                }}
                className={cn(
                  'flex items-center gap-2 text-sm font-medium w-full text-left',
                  'text-muted-foreground hover:text-foreground transition-colors'
                )}
              >
                <ChevronDown 
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    !showReminder && '-rotate-90'
                  )} 
                />
                <Bell className="h-4 w-4" />
                Reminder
              </button>
              <AnimatePresence>
                {showReminder && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {REMINDER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setReminder(reminder === option.value ? undefined : option.value)}
                          className={cn(
                            'text-xs px-2 py-1 rounded-md border transition-all',
                            reminder === option.value
                              ? 'bg-accent text-accent-foreground border-accent'
                              : 'border-border hover:border-accent/50'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

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
