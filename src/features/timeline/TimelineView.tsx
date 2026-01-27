import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { getDay, parseISO } from 'date-fns'
import { DayCard } from './DayCard'
import { useTimelineStore } from '@/store/timelineStore'
import { useUIStore } from '@/store/uiStore'
import {
  getTodayString,
  getInitialDateRange,
  extendPastDates,
  extendFutureDates,
  isDatePast,
  isDateToday,
  getDaysFromToday,
} from '@/utils/date'
import type { DayOfWeek } from '@/types'
import { cn } from '@/utils/cn'

// Estimated height per day card for virtualization
const ESTIMATED_DAY_HEIGHT = 120

// Scroll threshold for loading more dates (in pixels)
const SCROLL_LOAD_THRESHOLD = 150 // Reduced from 300 for earlier loading
const SCROLL_LOAD_THRESHOLD_PAST = 50 // Reduced from 100 for earlier loading

// Debounce delay for scroll handler (in ms)
const SCROLL_DEBOUNCE_MS = 50 // Reduced from 100ms for faster response

// Number of days to load at once
const PAST_DAYS_LOAD_COUNT = 15 // Increased from 5 for more days per load
const FUTURE_DAYS_LOAD_COUNT = 50 // Increased from 30 for more days per load

// Number of past days to always show (even without events)
const ALWAYS_SHOW_PAST_DAYS = 10

// Maximum number of days in the past to show days with events
// This prevents showing events from years ago
const MAX_PAST_DAYS_WITH_EVENTS = 90

export function TimelineView() {
  const parentRef = useRef<HTMLDivElement>(null)
  const [dates, setDates] = useState<string[]>(() => getInitialDateRange())
  const [isInitialScrollDone, setIsInitialScrollDone] = useState(false)

  const eventsByDate = useTimelineStore((state) => state.eventsByDate)
  const recurringEvents = useTimelineStore((state) => state.recurringEvents)
  const targetDate = useUIStore((state) => state.targetDate)
  const clearTargetDate = useUIStore((state) => state.clearTargetDate)
  const searchQuery = useUIStore((state) => state.searchQuery)
  const hideEmptyDays = useUIStore((state) => state.hideEmptyDays)

  // Loading state refs to prevent race conditions
  const isLoadingPastRef = useRef(false)
  const isLoadingFutureRef = useRef(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastLoadTimeRef = useRef<number>(0)
  
  // Ref to store anchor information when loading past dates
  const scrollAnchorRef = useRef<{
    date: string
    offset: number
    timestamp?: number
  } | null>(null)

  // Filter dates based on search query and visibility rules
  const visibleDates = useMemo(() => {
    const today = getTodayString()

    // Find the earliest loaded date (to determine how many past days to show)
    const earliestDate = dates.length > 0 ? dates[0] : today
    const daysFromEarliest = getDaysFromToday(earliestDate)

    const filtered = dates.filter((date) => {
      // Check for regular events
      const regularEventsCount = eventsByDate[date]?.length ?? 0
      
      // Check for recurring events for this day of week
      const dayOfWeek = getDay(parseISO(date)) as DayOfWeek
      const hasRecurringEvents = recurringEvents.some((event) =>
        event.enabledDays.includes(dayOfWeek)
      )
      
      // Day has events if it has regular events OR recurring events
      const hasEvents = regularEventsCount > 0 || hasRecurringEvents

      // If searching, only show days with matching events
      if (searchQuery) {
        const events = eventsByDate[date] || []
        const lowerQuery = searchQuery.toLowerCase()
        return events.some(
          (e) =>
            e.title.toLowerCase().includes(lowerQuery) ||
            e.description?.toLowerCase().includes(lowerQuery)
        )
      }

      // Always show today
      if (isDateToday(date)) return true

      const isPast = isDatePast(date)
      const daysFromToday = getDaysFromToday(date)

      if (isPast) {
        // Don't show days older than MAX_PAST_DAYS_WITH_EVENTS
        if (daysFromToday < -MAX_PAST_DAYS_WITH_EVENTS) {
          return false
        }
        
        // Show first 10 past days from today (even without events) if hideEmptyDays is off
        const isWithinFirst10FromToday = daysFromToday >= -ALWAYS_SHOW_PAST_DAYS

        if (isWithinFirst10FromToday) {
          // First 10 days from today: show based on hideEmptyDays setting
          if (hideEmptyDays) {
            return hasEvents
          }
          return true
        }

        // For all other past days: use the same logic as future days
        // Show all loaded days if hideEmptyDays is off, or only with events if on
        // This ensures consistency and prevents days from disappearing when new past days are loaded
        if (hideEmptyDays) {
          // Hide past days without events
          if (!hasEvents) return false
          // Show days with events
          return true
        }

        // Show all past days (always show for adding events and to prevent gaps)
        return true
      }

      // Future days
      if (hideEmptyDays) {
        // Hide future days without events
        if (!hasEvents) return false
        // Show days with events
        return true
      }

      // Show future days (always show for adding events)
      return true
    })

    // Debug logging
    if (filtered.length !== dates.length) {
      console.log(`[Timeline] Filtered dates: ${filtered.length} of ${dates.length} visible`)
      console.log(`[Timeline] Earliest date: ${earliestDate}, days from today: ${daysFromEarliest}`)
      const pastFiltered = filtered.filter(d => isDatePast(d))
      const pastAll = dates.filter(d => isDatePast(d))
      console.log(`[Timeline] Past dates visible: ${pastFiltered.length} of ${pastAll.length}`)
      if (pastAll.length > 0) {
        console.log(`[Timeline] First 5 past dates in dates:`, pastAll.slice(0, 5))
        console.log(`[Timeline] First 5 past dates in visible:`, pastFiltered.slice(0, 5))
      }
    }

    return filtered
  }, [dates, eventsByDate, recurringEvents, searchQuery, hideEmptyDays])

  // Find today's index for initial scroll
  const todayIndex = useMemo(() => {
    const today = getTodayString()
    return visibleDates.findIndex((d) => d === today)
  }, [visibleDates])

  // Virtualizer setup with dynamic size measurement
  const virtualizer = useVirtualizer({
    count: visibleDates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const date = visibleDates[index]
      const hasEvents = eventsByDate[date]?.length > 0
      // Estimate height based on whether there are events
      if (hasEvents) {
        const eventCount = eventsByDate[date]?.length || 0
        // Base height + event cards (each ~60px) + spacing
        return 80 + eventCount * 60
      }
      return ESTIMATED_DAY_HEIGHT
    },
    // Increase overscan significantly to prevent flickering when loading past dates
    // Higher overscan means more elements are rendered outside viewport, reducing flicker
    overscan: 20,
    // Enable dynamic measurement for accurate heights
    measureElement: (element) => {
      if (!element) return ESTIMATED_DAY_HEIGHT
      const height = element.getBoundingClientRect().height
      // Cache measured height to avoid unnecessary recalculations
      return height || ESTIMATED_DAY_HEIGHT
    },
    // Enable gap support for better spacing calculation
    gap: 0,
  })

  // Reset dates when switching from hideEmptyDays to show all days
  const prevHideEmptyDaysRef = useRef(hideEmptyDays)
  useEffect(() => {
    // If switching from hide empty days (true) to show all days (false)
    if (prevHideEmptyDaysRef.current === true && hideEmptyDays === false) {
      // Reset to initial date range
      setDates(getInitialDateRange())
      // Reset initial scroll state so it scrolls to today again
      setIsInitialScrollDone(false)
    }
    prevHideEmptyDaysRef.current = hideEmptyDays
  }, [hideEmptyDays])

  // Initial scroll to today
  useEffect(() => {
    if (!isInitialScrollDone && todayIndex >= 0 && parentRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        // Scroll to top of today's card, not center, so past days don't show
        virtualizer.scrollToIndex(todayIndex, { align: 'start', behavior: 'auto' })
        setIsInitialScrollDone(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [todayIndex, isInitialScrollDone, virtualizer])

  // Handle navigation to specific date
  useEffect(() => {
    if (targetDate) {
      const index = visibleDates.findIndex((d) => d === targetDate)
      if (index >= 0) {
        const isTodayTarget = targetDate === getTodayString()
        const align = isTodayTarget ? 'start' : 'center'
        const behavior = isTodayTarget ? 'auto' : 'smooth'

        virtualizer.scrollToIndex(index, { align, behavior })

        clearTargetDate()
        if (isTodayTarget) {
          const retry = setTimeout(() => {
            virtualizer.scrollToIndex(index, { align: 'start', behavior: 'auto' })
          }, 80)
          return () => clearTimeout(retry)
        }
      } else {
        // Date not in visible range, extend dates and try again
        const allDates = new Set(dates)
        if (!allDates.has(targetDate)) {
          // Extend dates to include target
          const targetDateObj = new Date(targetDate)
          
          if (targetDateObj < new Date(dates[0])) {
            // Target is in the past, extend past dates
            const newPastDates = extendPastDates(dates[0], PAST_DAYS_LOAD_COUNT)
            setDates((prev) => {
              const combined = [...newPastDates, ...prev]
              const unique = Array.from(new Set(combined)).sort()
              return unique
            })
          } else {
            // Target is in the future, extend future dates
            const newFutureDates = extendFutureDates(dates[dates.length - 1], FUTURE_DAYS_LOAD_COUNT)
            setDates((prev) => {
              const combined = [...prev, ...newFutureDates]
              const unique = Array.from(new Set(combined)).sort()
              return unique
            })
          }
        } else {
          clearTargetDate()
        }
      }
    }
  }, [targetDate, visibleDates, dates, virtualizer, clearTargetDate])

  // Effect to restore scroll position after past dates are loaded
  useEffect(() => {
    if (!scrollAnchorRef.current) return
    
    const { date: anchorDate, offset: anchorOffset } = scrollAnchorRef.current
    const scrollElement = parentRef.current
    
    if (!scrollElement) {
      scrollAnchorRef.current = null
      isLoadingPastRef.current = false
      return
    }

    // Set a timeout to clear scrollAnchorRef if restoration takes too long
    // This prevents blocking future loads - reduced timeout for faster response
    const timeoutId = setTimeout(() => {
      if (scrollAnchorRef.current) {
        scrollAnchorRef.current = null
        isLoadingPastRef.current = false
      }
    }, 300) // Reduced to 300ms for faster unblocking

    // Find anchor date in updated visible dates immediately
    const newAnchorIndex = visibleDates.findIndex((d) => d === anchorDate)
    
    if (newAnchorIndex >= 0) {
      // Restore scroll position with minimal delay to prevent flickering
      const restoreScroll = (attempt = 0) => {
        const updatedItems = virtualizer.getVirtualItems()
        const updatedAnchorItem = updatedItems.find((item) => item.index === newAnchorIndex)
        
        if (updatedAnchorItem && scrollElement) {
          // Calculate new scroll position
          const newScrollTop = updatedAnchorItem.start + anchorOffset
          
          // Only update if position changed significantly to avoid unnecessary repaints
          if (Math.abs(scrollElement.scrollTop - newScrollTop) > 1) {
            // Use direct assignment for instant scroll (no animation)
            scrollElement.scrollTop = newScrollTop
          }
          
          clearTimeout(timeoutId)
          scrollAnchorRef.current = null
          isLoadingPastRef.current = false
        } else if (attempt < 3) {
          // Reduced retries from 5 to 3 for faster unblocking
          requestAnimationFrame(() => restoreScroll(attempt + 1))
        } else {
          // Fallback: give up after 3 attempts to avoid blocking too long
          clearTimeout(timeoutId)
          scrollAnchorRef.current = null
          isLoadingPastRef.current = false
        }
      }

      // Start restoration immediately
      requestAnimationFrame(() => {
        restoreScroll()
      })
    } else {
      clearTimeout(timeoutId)
      scrollAnchorRef.current = null
      isLoadingPastRef.current = false
    }

    return () => {
      clearTimeout(timeoutId)
    }
  }, [dates, visibleDates, virtualizer])

  // Load past dates when scrolling near the top
  const loadPastDates = useCallback(() => {
    if (isLoadingPastRef.current || dates.length === 0) return
    
    isLoadingPastRef.current = true
    const firstDate = dates[0]
    
    // Get current scroll position and anchor item before updating
    const scrollElement = parentRef.current
    if (!scrollElement) {
      isLoadingPastRef.current = false
      return
    }

    const virtualItems = virtualizer.getVirtualItems()
    const firstVisibleItem = virtualItems[0]
    
    if (!firstVisibleItem) {
      isLoadingPastRef.current = false
      return
    }

    // Store anchor information for scroll restoration
    // Use the first visible date as anchor to maintain visual continuity
    const anchorDate = visibleDates[firstVisibleItem.index]
    const currentScrollTop = scrollElement.scrollTop
    const anchorOffset = currentScrollTop - firstVisibleItem.start

    scrollAnchorRef.current = {
      date: anchorDate,
      offset: anchorOffset,
      timestamp: Date.now(),
    }

    // Load exactly PAST_DAYS_LOAD_COUNT days (currently 5)
    const newPastDates = extendPastDates(firstDate, PAST_DAYS_LOAD_COUNT)
    
    if (newPastDates.length > 0) {
      // Use flushSync-like approach: update state and restore scroll in same frame
      // Prevent duplicates
      setDates((prev) => {
        const dateSet = new Set(prev)
        newPastDates.forEach(date => dateSet.add(date))
        return Array.from(dateSet).sort()
      })
      // Scroll restoration will happen in useEffect
    } else {
      // No more past dates to load
      scrollAnchorRef.current = null
      isLoadingPastRef.current = false
    }
  }, [dates, virtualizer, visibleDates])

  // Load future dates when scrolling near the bottom
  const loadFutureDates = useCallback(() => {
    if (isLoadingFutureRef.current || dates.length === 0) return
    
    isLoadingFutureRef.current = true
    const lastDate = dates[dates.length - 1]
    const newFutureDates = extendFutureDates(lastDate, FUTURE_DAYS_LOAD_COUNT)
    
    if (newFutureDates.length > 0) {
      // Prevent duplicates
      setDates((prev) => {
        const dateSet = new Set(prev)
        newFutureDates.forEach(date => dateSet.add(date))
        return Array.from(dateSet).sort()
      })
    }
    
    // Reset loading state after virtualizer updates
    setTimeout(() => {
      isLoadingFutureRef.current = false
    }, 50)
  }, [dates])

  // Debounced scroll handler
  const handleScroll = useCallback(() => {
    const scrollElement = parentRef.current
    if (!scrollElement) return

    const { scrollTop } = scrollElement
    
    // Aggressive check for loading past dates when user is clearly at the top
    // If scrollTop is 0 or very close (within 5px), user has reached the top
    const isAtVeryTop = scrollTop <= 5
    
    const now = Date.now()
    const timeSinceLastLoad = now - lastLoadTimeRef.current
    
    // If user is at the very top, be more aggressive with loading
    // Ignore scrollAnchorRef if user is clearly trying to load more (at very top)
    if (isAtVeryTop && !isLoadingPastRef.current && timeSinceLastLoad >= 200) {
      // Force load if at very top, even if scrollAnchorRef is set
      // This handles the case where user keeps scrolling up at the top
      if (scrollAnchorRef.current) {
        // Clear the anchor if it's been there too long (user wants to load more)
        const anchorAge = now - (scrollAnchorRef.current.timestamp || 0)
        if (anchorAge > 500) {
          scrollAnchorRef.current = null
        }
      }
      
      if (!scrollAnchorRef.current || timeSinceLastLoad >= 500) {
        lastLoadTimeRef.current = now
        loadPastDates()
        return // Don't continue with debounced handler
      }
    }

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Debounce scroll handling for near-top checks
    scrollTimeoutRef.current = setTimeout(() => {
      const { scrollTop: currentScrollTop, scrollHeight: currentScrollHeight, clientHeight: currentClientHeight } = scrollElement
      const currentVirtualItems = virtualizer.getVirtualItems()
      const currentIsAtTop = currentVirtualItems.length > 0 && currentVirtualItems[0]?.index === 0
      const currentDistanceFromTop = currentScrollTop
      const currentIsNearTop = currentScrollTop <= SCROLL_LOAD_THRESHOLD_PAST || 
        (currentIsAtTop && currentDistanceFromTop <= SCROLL_LOAD_THRESHOLD_PAST)
      
      const currentTime = Date.now()
      const currentTimeSinceLastLoad = currentTime - lastLoadTimeRef.current
      const minLoadInterval = 200 // Reduced further for faster response
      
      // More lenient check - allow loading if near top and not actively restoring scroll
      const canLoadPast = !isLoadingPastRef.current && 
        (!scrollAnchorRef.current || currentTimeSinceLastLoad >= 800)
      
      const shouldLoadPast = 
        currentIsNearTop &&
        canLoadPast &&
        currentTimeSinceLastLoad >= minLoadInterval
      
      if (shouldLoadPast) {
        lastLoadTimeRef.current = currentTime
        loadPastDates()
      }

      // Load future dates when near bottom
      const currentDistanceFromBottom = currentScrollHeight - currentScrollTop - currentClientHeight
      if (currentDistanceFromBottom < SCROLL_LOAD_THRESHOLD && !isLoadingFutureRef.current) {
        loadFutureDates()
      }
    }, SCROLL_DEBOUNCE_MS)
  }, [loadPastDates, loadFutureDates, virtualizer])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className="absolute inset-0 overflow-auto"
      style={{ 
        contain: 'strict',
        scrollBehavior: 'auto', // Instant scroll to prevent flickering
        willChange: 'scroll-position', // Optimize for scroll performance
        overscrollBehavior: 'contain', // Prevent scroll chaining on mobile
        WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
        touchAction: 'pan-y', // Allow vertical scrolling only
      }}
    >
      <div className="relative max-w-4xl mx-auto px-2 py-4">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem, idx) => {
            const date = visibleDates[virtualItem.index]
            const isToday = date === getTodayString()
            const isPast = isDatePast(date)
            const isLast = idx === virtualItems.length - 1
            
            return (
              <div
                key={date}
                data-index={virtualItem.index}
                ref={(node) => {
                  if (node) {
                    virtualizer.measureElement(node)
                  }
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                  willChange: 'transform', // Optimize transform for smoother rendering
                }}
              >
                {/* Timeline dot */}
                <div className="absolute left-8 sm:left-12 top-4 -translate-x-1/2 z-10">
                  <div
                    className={cn(
                      'absolute left-1/2 -translate-x-1/2 rounded-full transition-all duration-200',
                      isToday
                        ? 'w-3 h-3 bg-accent border-2 border-accent shadow-[0_0_0_3px_oklch(0.4_0.12_250_/_0.1)]'
                        : isPast
                          ? 'w-2 h-2 bg-border border-2 border-border'
                          : 'w-2 h-2 bg-background border-2 border-border'
                    )}
                  />
                </div>
                
                {/* Connecting line to next item (except last) */}
                {!isLast && (
                  <div
                    className="absolute left-8 sm:left-12 top-10 w-px bg-border"
                    style={{
                      height: `${Math.max(0, virtualItem.size - 24)}px`,
                    }}
                  />
                )}
                
                <DayCard
                  date={date}
                  isFirst={idx === 0}
                  isLast={isLast}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Empty state when searching */}
      {searchQuery && visibleDates.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-8">
            <p className="text-lg font-medium text-muted-foreground">
              No events found
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try a different search term
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
