import { useState, useCallback, useEffect } from 'react'
import { CalendarIcon, X } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
import { Button } from './button'
import { Calendar } from './calendar'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from './popover'
import { cn } from '@/utils/cn'

interface DatePickerProps {
  value?: string // Format: "YYYY-MM-DD"
  onChange: (value: string) => void
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
    return format(date, 'PPP') // e.g., "January 10, 2026"
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

interface DatePickerContentProps {
  value?: string
  onChange: (value: string) => void
  onClose?: () => void
  minDate?: Date
  maxDate?: Date
}

function DatePickerContent({ value, onChange, onClose, minDate, maxDate }: DatePickerContentProps) {
  const selectedDate = parseStringToDate(value || '')

  const handleSelect = useCallback((date: Date | undefined) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd')
      onChange(dateString)
      onClose?.()
    }
  }, [onChange, onClose])

  const handleClear = useCallback(() => {
    onChange('')
    onClose?.()
  }, [onChange, onClose])

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-medium">Select Date</span>
        {value && (
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
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={(date) => {
            if (minDate && date < minDate) return true
            if (maxDate && date > maxDate) return true
            return false
          }}
          initialFocus
        />
      </div>
      
      {/* Preview */}
      {selectedDate && (
        <div className="px-3 py-3 border-t bg-muted/30">
          <div className="flex items-center justify-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-lg font-medium">
              {formatDateDisplay(value || '')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export function DatePicker({ 
  value, 
  onChange, 
  placeholder = 'Select date',
  disabled = false,
  className,
  minDate,
  maxDate
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 640px)')

  const displayValue = value ? formatDateDisplay(value) : placeholder

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onChange('')
    setOpen(false)
  }, [onChange])

  // Mobile: native date input so OS opens date picker and keyboard
  if (isMobile) {
    return (
      <div className="relative w-full">
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          min={minDate ? format(minDate, 'yyyy-MM-dd') : undefined}
          max={maxDate ? format(maxDate, 'yyyy-MM-dd') : undefined}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50 pr-8',
            !value && 'text-muted-foreground',
            className
          )}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </Button>
        )}
      </div>
    )
  }

  // Desktop: use Popover
  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal pr-8',
              !value && 'text-muted-foreground',
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue}
          </Button>
        </PopoverTrigger>
        {value && (
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
      >
        <DatePickerContent
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
          minDate={minDate}
          maxDate={maxDate}
        />
      </PopoverContent>
    </Popover>
  )
}
