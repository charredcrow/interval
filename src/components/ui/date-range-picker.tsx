import { useState, useCallback, useEffect } from 'react'
import { CalendarIcon, X } from 'lucide-react'
import { format, parse, isValid, isAfter, isBefore } from 'date-fns'
import { type DateRange } from 'react-day-picker'
import { Button } from './button'
import { Calendar } from './calendar'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from './popover'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './drawer'
import { cn } from '@/utils/cn'

export interface DateRangeValue {
  from?: string // Format: "YYYY-MM-DD"
  to?: string   // Format: "YYYY-MM-DD"
}

interface DateRangePickerProps {
  value?: DateRangeValue
  onChange: (value: DateRangeValue) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

function formatDateDisplay(dateString: string): string {
  if (!dateString) return ''
  try {
    const date = parse(dateString, 'yyyy-MM-dd', new Date())
    if (!isValid(date)) return dateString
    return format(date, 'MMM d, yyyy') // e.g., "Jan 10, 2026"
  } catch {
    return dateString
  }
}

function parseStringToDate(dateString: string): Date | undefined {
  if (!dateString) return undefined
  try {
    const date = parse(dateString, 'yyyy-MM-dd', new Date())
    return isValid(date) ? date : undefined
  } catch {
    return undefined
  }
}

function formatRangeDisplay(value?: DateRangeValue): string {
  if (!value) return ''
  const { from, to } = value
  
  if (from && to) {
    if (from === to) {
      return formatDateDisplay(from)
    }
    return `${formatDateDisplay(from)} - ${formatDateDisplay(to)}`
  }
  
  if (from) {
    return `From ${formatDateDisplay(from)}`
  }
  
  return ''
}

interface DateRangePickerContentProps {
  value?: DateRangeValue
  onChange: (value: DateRangeValue) => void
  onClose?: () => void
  minDate?: Date
  maxDate?: Date
}

function DateRangePickerContent({ 
  value, 
  onChange, 
  onClose, 
  minDate, 
  maxDate 
}: DateRangePickerContentProps) {
  const selectedRange: DateRange | undefined = value
    ? {
        from: parseStringToDate(value.from || ''),
        to: parseStringToDate(value.to || ''),
      }
    : undefined

  const handleSelect = useCallback((range: DateRange | undefined) => {
    if (range) {
      const newValue: DateRangeValue = {
        from: range.from ? format(range.from, 'yyyy-MM-dd') : undefined,
        to: range.to ? format(range.to, 'yyyy-MM-dd') : undefined,
      }
      onChange(newValue)
      
      // Close when both dates are selected
      if (newValue.from && newValue.to) {
        // Small delay to ensure state is updated
        setTimeout(() => {
          onClose?.()
        }, 100)
      }
    } else {
      onChange({})
    }
  }, [onChange, onClose])

  const handleClear = useCallback(() => {
    onChange({})
  }, [onChange])

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-medium">Select Date Range</span>
        {value && (value.from || value.to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>
      
      <div className="flex justify-center">
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleSelect}
          disabled={(date) => {
            if (minDate && isBefore(date, minDate)) return true
            if (maxDate && isAfter(date, maxDate)) return true
            return false
          }}
          numberOfMonths={1}
          initialFocus
        />
      </div>
      
      {/* Preview */}
      {(value?.from || value?.to) && (
        <div className="px-3 py-3 border-t bg-muted/30">
          <div className="flex flex-col items-center justify-center gap-1">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-center">
              {formatRangeDisplay(value)}
            </span>
            {value.from && !value.to && (
              <span className="text-xs text-muted-foreground">
                Select end date
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function DateRangePicker({ 
  value, 
  onChange, 
  placeholder = 'Select date range',
  disabled = false,
  className,
  minDate,
  maxDate
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 640px)')

  const displayValue = formatRangeDisplay(value) || placeholder

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onChange({})
    setOpen(false)
  }, [onChange])

  const handleDrawerOpenChange = useCallback((newOpen: boolean) => {
    // Only allow closing if both dates are selected or user explicitly closes via Cancel
    if (!newOpen && value?.from && !value?.to) {
      // Don't close if only first date is selected
      return
    }
    setOpen(newOpen)
  }, [value])

  const handlePopoverOpenChange = useCallback((newOpen: boolean) => {
    // Only allow closing if both dates are selected or user explicitly closes
    if (!newOpen && value?.from && !value?.to) {
      // Don't close if only first date is selected
      return
    }
    setOpen(newOpen)
  }, [value])

  // Mobile: use Drawer
  if (isMobile) {

    return (
      <Drawer open={open} onOpenChange={handleDrawerOpenChange}>
        <div className="relative w-full">
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                'w-full justify-start text-left font-normal pr-8',
                !value?.from && !value?.to && 'text-muted-foreground',
                className
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span className="truncate">{displayValue}</span>
            </Button>
          </DrawerTrigger>
          {(value?.from || value?.to) && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={handleClear}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
        </div>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Select Date Range</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-x-auto">
            <DateRangePickerContent
              value={value}
              onChange={onChange}
              onClose={() => {
                // Only close if both dates are selected
                if (value?.from && value?.to) {
                  setOpen(false)
                }
              }}
              minDate={minDate}
              maxDate={maxDate}
            />
          </div>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  // Desktop: use Popover
  return (
    <Popover open={open} onOpenChange={handlePopoverOpenChange} modal={false}>
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal pr-8',
              !value?.from && !value?.to && 'text-muted-foreground',
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">{displayValue}</span>
          </Button>
        </PopoverTrigger>
        {(value?.from || value?.to) && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </Button>
        )}
      </div>
      <PopoverContent 
        className="w-auto p-0 z-[200]" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Prevent closing when only first date is selected
          if (value?.from && !value?.to) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing with Escape when only first date is selected
          if (value?.from && !value?.to) {
            e.preventDefault()
          }
        }}
        onPointerDownOutside={(e) => {
          // Prevent closing when only first date is selected
          if (value?.from && !value?.to) {
            e.preventDefault()
          }
        }}
      >
        <DateRangePickerContent
          value={value}
          onChange={onChange}
          onClose={() => {
            // Only close if both dates are selected
            if (value?.from && value?.to) {
              setOpen(false)
            }
          }}
          minDate={minDate}
          maxDate={maxDate}
        />
      </PopoverContent>
    </Popover>
  )
}
