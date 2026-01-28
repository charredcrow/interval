import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Zap, 
  Menu, 
  Search, 
  CalendarPlus, 
  Layers, 
  CalendarDays, 
  Eye, 
  EyeOff,
  X,
  Calendar,
  Moon,
  Sun,
  Repeat,
  ListTodo,
  ChevronDown,
  Clock,
  Pencil,
  Download,
  Upload,
  Sunrise
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover'
import { DateRangePicker, type DateRangeValue } from '@/components/ui/date-range-picker'
import { useTimelineStore } from '@/store/timelineStore'
import { useUIStore } from '@/store/uiStore'
import { useTodoStore } from '@/store/todoStore'
import { getTodayString, formatDate, formatTimeForUser } from '@/utils/date'
import { getEventColor } from '@/components/ui/color-picker'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'
import type { Event } from '@/types'

export function QuickAdd() {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [dateRange, setDateRange] = useState<DateRangeValue>({})
  const [selectedColorFilter, setSelectedColorFilter] = useState<string | null>(null)
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addEvent = useTimelineStore((state) => state.addEvent)
  const searchEvents = useTimelineStore((state) => state.searchEvents)
  const getAllDatesWithEvents = useTimelineStore((state) => state.getAllDatesWithEvents)
  const eventsByDate = useTimelineStore((state) => state.eventsByDate)
  const recurringEvents = useTimelineStore((state) => state.recurringEvents)
  const tags = useTimelineStore((state) => state.tags)
  const todos = useTodoStore((state) => state.todos)
  
  const { 
    navigateToToday, 
    setQuickAddFocused,
    viewMode,
    toggleViewMode,
    hideEmptyDays,
    setHideEmptyDays,
    openEventDialogWithDatePicker,
    openEventDialog,
    theme,
    toggleTheme,
    openRecurringEventDialog,
    openTodoPanel,
    openTodayWidget,
    timeFormat,
    setTimeFormat,
  } = useUIStore()

  // Get dates with events for search
  const allDatesWithEvents = getAllDatesWithEvents().sort((a, b) => b.localeCompare(a))
  
  // Filter dates by date range if selected
  const datesWithEvents = useMemo(() => {
    if (!dateRange.from && !dateRange.to) {
      return allDatesWithEvents
    }
    
    return allDatesWithEvents.filter((date) => {
      if (dateRange.from && dateRange.to) {
        // Both dates selected - filter by range
        return date >= dateRange.from && date <= dateRange.to
      } else if (dateRange.from) {
        // Only from date selected
        return date >= dateRange.from
      }
      return true
    })
  }, [allDatesWithEvents, dateRange])
  
  // Get search results and filter by date range, color, and tags
  const allSearchResults = searchInput ? searchEvents(searchInput) : []
  const searchResults = useMemo(() => {
    let filtered = allSearchResults
    
    // Filter by date range
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(({ date }) => {
        if (dateRange.from && dateRange.to) {
          return date >= dateRange.from && date <= dateRange.to
        } else if (dateRange.from) {
          return date >= dateRange.from
        }
        return true
      })
    }
    
    // Filter by color
    if (selectedColorFilter) {
      filtered = filtered.filter(({ event }) => event.color === selectedColorFilter)
    }
    
    // Filter by tags
    if (selectedTagFilters.length > 0) {
      filtered = filtered.filter(({ event }) => {
        if (!event.tags || event.tags.length === 0) return false
        return selectedTagFilters.some(tagId => event.tags?.includes(tagId))
      })
    }
    
    return filtered.slice(0, 10) // Show more results when filtering
  }, [allSearchResults, dateRange, selectedColorFilter, selectedTagFilters])
  
  // Check if any filters are active
  const hasActiveFilters = dateRange.from || dateRange.to || selectedColorFilter || selectedTagFilters.length > 0

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Quick focus on "/" key
      if (e.key === '/' && !isFocused && !isSearchOpen && !e.metaKey && !e.ctrlKey) {
        const activeElement = document.activeElement
        const isInputFocused =
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement

        if (!isInputFocused) {
          e.preventDefault()
          inputRef.current?.focus()
        }
      }
      
      // Search shortcut (Cmd/Ctrl + K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
        setIsMenuOpen(false)
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
      
      // Close search on Escape
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false)
        setSearchInput('')
        setExpandedEvents(new Set())
        setExpandedDates(new Set())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFocused, isSearchOpen])

  // Clear expanded states when search modal closes
  useEffect(() => {
    if (!isSearchOpen) {
      setExpandedEvents(new Set())
      setExpandedDates(new Set())
    }
  }, [isSearchOpen])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!value.trim()) return

      const today = getTodayString()
      addEvent(today, { title: value.trim() })
      setValue('')
      toast.success('Event added to today')
      navigateToToday()
    },
    [value, addEvent, navigateToToday]
  )

  const handleFocus = () => {
    setIsFocused(true)
    setQuickAddFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
    setQuickAddFocused(false)
  }

  const handleNewEvent = () => {
    openEventDialogWithDatePicker()
    setIsMenuOpen(false)
  }

  const handleNewRecurringEvent = () => {
    openRecurringEventDialog()
    setIsMenuOpen(false)
  }

  const handleOpenTodoPanel = () => {
    openTodoPanel()
    setIsMenuOpen(false)
  }

  const handleOpenTodayWidget = () => {
    openTodayWidget()
    setIsMenuOpen(false)
  }

  const handleToggleHideEmpty = () => {
    setHideEmptyDays(!hideEmptyDays)
  }

  const handleOpenSearch = () => {
    setIsSearchOpen(true)
    setIsMenuOpen(false)
    setTimeout(() => searchInputRef.current?.focus(), 100)
  }


  const toggleEventExpanded = useCallback((eventId: string, date: string) => {
    const key = `${eventId}-${date}`
    setExpandedEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }, [])

  const toggleDateExpanded = useCallback((date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(date)) {
        newSet.delete(date)
      } else {
        newSet.add(date)
      }
      return newSet
    })
  }, [])

  // Export data as JSON
  const handleExportData = useCallback(() => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        eventsByDate,
        recurringEvents,
        todos,
      }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `interval-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Data exported successfully')
    setIsMenuOpen(false)
  }, [eventsByDate, recurringEvents, todos])

  // Import data from JSON
  const handleImportData = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const importData = JSON.parse(content)

        // Validate the import data structure
        if (!importData.data || typeof importData.data !== 'object') {
          throw new Error('Invalid file format')
        }

        const { eventsByDate: importedEvents, recurringEvents: importedRecurring, todos: importedTodos } = importData.data

        // Import events
        if (importedEvents && typeof importedEvents === 'object') {
          localStorage.setItem('interval-timeline-storage', JSON.stringify({
            state: {
              eventsByDate: importedEvents,
              recurringEvents: importedRecurring || [],
            },
            version: 0,
          }))
        }

        // Import todos
        if (importedTodos && Array.isArray(importedTodos)) {
          localStorage.setItem('interval-todo-storage', JSON.stringify({
            state: {
              todos: importedTodos,
            },
            version: 0,
          }))
        }

        toast.success('Data imported successfully! Refreshing page...')
        setIsMenuOpen(false)
        
        // Reload the page to apply imported data
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } catch {
        toast.error('Failed to import data. Please check the file format.')
      }
    }
    
    reader.readAsText(file)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const today = getTodayString()

  return (
    <>
      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card border rounded-xl shadow-2xl overflow-hidden mx-4">
                {/* Search header */}
                <div className="p-4 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search events..."
                      className="pl-9 pr-8 h-11"
                    />
                    {searchInput && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setSearchInput('')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Date navigation */}
                  <div className="mt-3">
                    <DateRangePicker
                      value={dateRange}
                      onChange={setDateRange}
                      placeholder="Select date range"
                    />
                  </div>
                  
                  {/* Filter toggle and quick actions */}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { navigateToToday(); setIsSearchOpen(false) }}
                        className="text-xs"
                      >
                        Today
                      </Button>
                      {datesWithEvents.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center">
                          {datesWithEvents.length} days with events
                        </span>
                      )}
                    </div>
                    <Button
                      variant={showFilters || hasActiveFilters ? 'outline' : 'ghost'}
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className={cn(
                        'text-xs gap-1',
                        hasActiveFilters && 'border-accent text-accent'
                      )}
                    >
                      <Layers className="h-3 w-3" />
                      Filters
                      {hasActiveFilters && (
                        <span className="ml-1 px-1.5 py-0.5 bg-accent text-accent-foreground rounded-full text-[10px]">
                          {(selectedColorFilter ? 1 : 0) + selectedTagFilters.length + (dateRange.from ? 1 : 0)}
                        </span>
                      )}
                    </Button>
                  </div>
                  
                  {/* Expanded Filters */}
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 mt-3 border-t space-y-3">
                          {/* Color filter */}
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                              Filter by color
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'] as const).map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setSelectedColorFilter(selectedColorFilter === color ? null : color)}
                                  className={cn(
                                    'w-6 h-6 rounded-full transition-all border-2',
                                    selectedColorFilter === color 
                                      ? 'ring-2 ring-offset-2 ring-offset-background border-background'
                                      : 'border-transparent hover:scale-110'
                                  )}
                                  style={{ 
                                    backgroundColor: getEventColor(color),
                                    // @ts-expect-error CSS custom property for ring color
                                    '--tw-ring-color': getEventColor(color),
                                  }}
                                />
                              ))}
                              {selectedColorFilter && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setSelectedColorFilter(null)}
                                  className="h-6 w-6"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Tag filter */}
                          {tags.length > 0 && (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                Filter by tags
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {tags.map((tag) => {
                                  const isSelected = selectedTagFilters.includes(tag.id)
                                  return (
                                    <button
                                      key={tag.id}
                                      type="button"
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedTagFilters(selectedTagFilters.filter(id => id !== tag.id))
                                        } else {
                                          setSelectedTagFilters([...selectedTagFilters, tag.id])
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
                              </div>
                            </div>
                          )}
                          
                          {/* Clear all filters */}
                          {hasActiveFilters && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDateRange({})
                                setSelectedColorFilter(null)
                                setSelectedTagFilters([])
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground w-full"
                            >
                              Clear all filters
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Results */}
                <div className="max-h-[300px] overflow-y-auto">
                  {searchInput && searchResults.length > 0 && (
                    <div className="p-2">
                      <p className="text-xs text-muted-foreground px-2 py-1 mb-1">
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                      </p>
                      {searchResults.map(({ event, date }) => {
                        const eventKey = `${event.id}-${date}`
                        const isExpanded = expandedEvents.has(eventKey)
                        const eventColor = getEventColor(event.color)
                        
                        return (
                          <motion.div
                            key={eventKey}
                            layout
                            className={cn(
                              'rounded-md border border-border bg-card/50 mb-2 overflow-hidden',
                              'transition-all duration-200',
                              isExpanded && 'shadow-sm',
                              eventColor && 'border-l-4'
                            )}
                            style={eventColor ? { borderLeftColor: eventColor } : undefined}
                          >
                            <motion.button
                              layout
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleEventExpanded(event.id, date)
                              }}
                              className={cn(
                                'w-full text-left p-2.5 rounded-md',
                                'hover:bg-muted/50 transition-colors',
                                'flex items-center justify-between gap-2 group/event'
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{event.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
                                  {event.time && (
                                    <>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                          {formatTimeForUser(event.time, timeFormat)}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.25 }}
                              >
                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              </motion.div>
                            </motion.button>
                            
                            {/* Expanded content */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ 
                                    duration: 0.25,
                                    ease: [0.4, 0, 0.2, 1]
                                  }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 pb-3 pt-1 space-y-3">
                                    {/* Date and time info */}
                                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>{formatDate(date)}</span>
                                      </div>
                                      {event.time && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <Clock className="h-3.5 w-3.5" />
                                          <span>{formatTimeForUser(event.time, timeFormat)}</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Description */}
                                    {event.description && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                                          Description:
                                        </p>
                                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                          {event.description}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {/* Edit button */}
                                    <div className="flex items-center gap-2 pt-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openEventDialog(date, event.id)
                                        }}
                                        className="h-7 text-xs gap-1.5"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Edit
                                      </Button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                  
                  {searchInput && searchResults.length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        {hasActiveFilters 
                          ? 'No events found matching filters' 
                          : 'No events found'}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDateRange({})
                            setSelectedColorFilter(null)
                            setSelectedTagFilters([])
                          }}
                          className="mt-2 text-xs"
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {!searchInput && datesWithEvents.length > 0 && (
                    <div className="p-2">
                      <p className="text-xs text-muted-foreground px-2 py-1 mb-1">All days with events</p>
                      {datesWithEvents.slice(0, 10).map((date) => {
                        const events = eventsByDate[date] || []
                        const isToday = date === today
                        const isDateExpanded = expandedDates.has(date)
                        
                        return (
                          <motion.div
                            key={date}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-2 last:mb-0"
                          >
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                toggleDateExpanded(date)
                              }}
                              className={cn(
                                'w-full text-left p-2 rounded-md mb-1',
                                'hover:bg-muted transition-colors',
                                'flex items-center justify-between group'
                              )}
                            >
                              <div>
                                <p className={cn('font-medium text-sm', isToday && 'text-accent')}>
                                  {formatDate(date)}
                                  {isToday && <span className="ml-2 text-xs text-muted-foreground">(Today)</span>}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {events.length} event{events.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <motion.div
                                animate={{ rotate: isDateExpanded ? 90 : 0 }}
                                transition={{ duration: 0.25 }}
                              >
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-opacity group-hover:opacity-100" />
                              </motion.div>
                            </motion.button>
                            
                            {/* Events list */}
                            <AnimatePresence initial={false}>
                              {isDateExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ 
                                    duration: 0.25,
                                    ease: [0.4, 0, 0.2, 1]
                                  }}
                                  className="overflow-hidden ml-5 space-y-1"
                                >
                                  {events.map((event: Event) => {
                                    const eventKey = `${event.id}-${date}`
                                    const isExpanded = expandedEvents.has(eventKey)
                                    const eventColor = getEventColor(event.color)
                                    
                                    return (
                                      <motion.div
                                        key={eventKey}
                                        layout
                                        className={cn(
                                          'rounded-md border border-border bg-card/50',
                                          'overflow-hidden',
                                          'transition-all duration-200',
                                          isExpanded && 'shadow-sm',
                                          eventColor && 'border-l-4'
                                        )}
                                        style={eventColor ? { borderLeftColor: eventColor } : undefined}
                                      >
                                        <motion.button
                                          layout
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toggleEventExpanded(event.id, date)
                                          }}
                                          className={cn(
                                            'w-full text-left p-2.5 rounded-md',
                                            'hover:bg-muted/50 transition-colors',
                                            'flex items-center justify-between gap-2 group/event'
                                          )}
                                        >
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">
                                              {event.title}
                                            </p>
                                            {event.time && (
                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">
                                                  {formatTimeForUser(event.time, timeFormat)}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          <motion.div
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.25 }}
                                          >
                                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                          </motion.div>
                                        </motion.button>
                                        
                                        {/* Expanded content */}
                                        <AnimatePresence initial={false}>
                                          {isExpanded && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: 'auto', opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={{ 
                                                duration: 0.25,
                                                ease: [0.4, 0, 0.2, 1]
                                              }}
                                              className="overflow-hidden"
                                            >
                                              <div className="px-3 pb-3 pt-1 space-y-3">
                                                {/* Date and time info */}
                                                <div className="flex items-center gap-3 pt-2 border-t border-border">
                                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span>{formatDate(date)}</span>
                                                  </div>
                                                  {event.time && (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                      <Clock className="h-3.5 w-3.5" />
                                                      <span>{formatTimeForUser(event.time, timeFormat)}</span>
                                                    </div>
                                                  )}
                                                </div>
                                                
                                                {/* Description */}
                                                {event.description && (
                                                  <div>
                                                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                                                      Description:
                                                    </p>
                                                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                                      {event.description}
                                                    </p>
                                                  </div>
                                                )}
                                                
                                                {/* Edit button */}
                                                <div className="flex items-center gap-2 pt-1">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      openEventDialog(date, event.id)
                                                    }}
                                                    className="h-7 text-xs gap-1.5"
                                                  >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                    Edit
                                                  </Button>
                                                </div>
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </motion.div>
                                    )
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                  
                  {!searchInput && datesWithEvents.length === 0 && (
                    <div className="p-8 text-center">
                      <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {dateRange.from || dateRange.to 
                          ? 'No events found in selected date range' 
                          : 'Search by event title'}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Close button */}
                <div className="p-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(false)}
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QuickAdd Bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40',
          'bg-gradient-to-t from-background via-background/95 to-transparent',
          'pb-4 pt-6 px-4'
        )}
      >
        <form
          onSubmit={handleSubmit}
          className={cn('max-w-2xl mx-auto relative')}
        >
          <div
            className={cn(
              'flex items-center gap-2.5 p-2.5 rounded-lg border bg-card shadow-lg transition-all duration-200',
              isFocused && 'ring-2 ring-accent/20 border-accent/50 shadow-xl'
            )}
          >
            <div
              className={cn(
                'h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200',
                isFocused
                  ? 'bg-accent text-accent-foreground scale-105'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Zap className="h-3.5 w-3.5" />
            </div>

            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Quick add event to today..."
              className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-xs h-8"
            />

            <Button
              type="submit"
              size="sm"
              disabled={!value.trim()}
              className="flex-shrink-0 gap-1 font-medium h-7 text-xs px-3"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>

            {/* Menu Dropdown */}
            <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="flex-shrink-0 h-8 w-8"
                >
                  <Menu className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-56 p-2" 
                align="end" 
                sideOffset={8}
              >
                <div className="space-y-1">
                  {/* Create section: Event / Recurring */}
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground mb-2">Create</p>
                    <div className="flex items-center rounded-lg border border-border bg-muted/30 p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNewEvent}
                        className="flex-1 h-7 text-xs gap-1.5 font-medium justify-center transition-all"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                        Event
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNewRecurringEvent}
                        className="flex-1 h-7 text-xs gap-1.5 font-medium justify-center transition-all"
                      >
                        <Repeat className="h-3.5 w-3.5" />
                        Recurring
                      </Button>
                    </div>
                  </div>

                  {/* Today Widget */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenTodayWidget}
                    className="w-full justify-start gap-2 font-normal"
                  >
                    <Sunrise className="h-4 w-4" />
                    Today
                  </Button>

                  {/* Todo List */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenTodoPanel}
                    className="w-full justify-start gap-2 font-normal"
                  >
                    <ListTodo className="h-4 w-4" />
                    Todo List
                  </Button>

                  {/* Search */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenSearch}
                    className="w-full justify-start gap-2 font-normal"
                  >
                    <Search className="h-4 w-4" />
                    Search
                    <kbd className="hidden sm:inline ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      ⌘K
                    </kbd>
                  </Button>

                  <div className="h-px bg-border my-2" />

                  {/* View Toggle */}
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground mb-2">View</p>
                    <div className="flex items-center rounded-lg border border-border bg-muted/30 p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { if (viewMode !== 'timeline') toggleViewMode(); setIsMenuOpen(false) }}
                        className={cn(
                          'flex-1 h-7 text-xs gap-1.5 font-medium transition-all',
                          viewMode === 'timeline'
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Timeline
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { if (viewMode !== 'month') toggleViewMode(); setIsMenuOpen(false) }}
                        className={cn(
                          'flex-1 h-7 text-xs gap-1.5 font-medium transition-all',
                          viewMode === 'month'
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        Months
                      </Button>
                    </div>
                  </div>

                  <div className="h-px bg-border my-2" />

                  {/* Display section: Theme + Hide empty days + Time format */}
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground mb-2">Display</p>
                    <div className="space-y-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { toggleTheme(); setIsMenuOpen(false) }}
                        className="w-full justify-start gap-2 font-normal"
                      >
                        {theme === 'dark' ? (
                          <Sun className="h-4 w-4" />
                        ) : (
                          <Moon className="h-4 w-4" />
                        )}
                        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToggleHideEmpty}
                        className="w-full justify-start gap-2 font-normal"
                      >
                        {hideEmptyDays ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        {hideEmptyDays ? 'Show empty days' : 'Hide empty days'}
                      </Button>

                      {/* Time format toggle */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-muted-foreground">
                          Time format
                        </span>
                        <div className="flex items-center rounded-full border border-border bg-muted/30 p-0.5 gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setTimeFormat('12h')}
                            className={cn(
                              'h-6 px-2 text-[10px] rounded-full',
                              timeFormat === '12h'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            12h
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setTimeFormat('24h')}
                            className={cn(
                              'h-6 px-2 text-[10px] rounded-full',
                              timeFormat === '24h'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            24h
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border my-2" />

                  {/* Data section: Export / Import */}
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground mb-2">Data</p>
                    <div className="flex items-center rounded-lg border border-border bg-muted/30 p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExportData}
                        className="flex-1 h-7 text-xs gap-1.5 font-medium justify-center transition-all"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleImportData}
                        className="flex-1 h-7 text-xs gap-1.5 font-medium justify-center transition-all"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Import
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Hidden file input for import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Keyboard hint - hidden on mobile */}
          <div className="hidden sm:flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span>
              Press <kbd className="px-1 py-0.5 rounded border bg-muted font-mono text-[9px]">/</kbd> to focus
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border bg-muted font-mono text-[9px]">Enter</kbd> to add
            </span>
          </div>
        </form>
      </motion.div>
    </>
  )
}
