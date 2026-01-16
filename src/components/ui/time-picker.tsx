import { useState, useCallback, useEffect } from 'react'
import { Clock, X } from 'lucide-react'
import { Button } from './button'
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

interface TimePickerProps {
  value?: string // Format: "HH:mm"
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Generate hours array (00-23)
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))

// Generate minutes array (00-55, step 5)
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'))

function formatTimeDisplay(time: string): string {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
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

interface TimePickerContentProps {
  value?: string
  onChange: (value: string) => void
  onClose?: () => void
}

function TimePickerContent({ value, onChange, onClose }: TimePickerContentProps) {
  const [selectedHour, setSelectedHour] = useState<string>(() => {
    if (value) {
      const [h] = value.split(':')
      return h.padStart(2, '0')
    }
    return ''
  })
  
  const [selectedMinute, setSelectedMinute] = useState<string>(() => {
    if (value) {
      const [, m] = value.split(':')
      return m.padStart(2, '0')
    }
    return ''
  })

  const handleHourSelect = useCallback((hour: string) => {
    setSelectedHour(hour)
    if (selectedMinute) {
      onChange(`${hour}:${selectedMinute}`)
    }
  }, [selectedMinute, onChange])

  const handleMinuteSelect = useCallback((minute: string) => {
    setSelectedMinute(minute)
    if (selectedHour) {
      onChange(`${selectedHour}:${minute}`)
      onClose?.()
    }
  }, [selectedHour, onChange, onClose])

  const handleClear = useCallback(() => {
    setSelectedHour('')
    setSelectedMinute('')
    onChange('')
    onClose?.()
  }, [onChange, onClose])

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-medium">Select Time</span>
        {(selectedHour || selectedMinute) && (
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
      
      <div className="flex">
        {/* Hours column */}
        <div className="flex-1 border-r">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
            Hour
          </div>
          <div 
            className="h-[200px] overflow-y-auto overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="p-2">
              {HOURS.map((hour) => {
                const displayHour = parseInt(hour) % 12 || 12
                const period = parseInt(hour) >= 12 ? 'PM' : 'AM'
                return (
                  <button
                    key={hour}
                    onClick={() => handleHourSelect(hour)}
                    className={cn(
                      'w-full px-3 py-2 text-sm rounded-md text-left transition-colors',
                      'hover:bg-muted focus:bg-muted focus:outline-none',
                      selectedHour === hour && 'bg-foreground text-background hover:bg-foreground'
                    )}
                  >
                    {displayHour} {period}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Minutes column */}
        <div className="flex-1">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
            Minute
          </div>
          <div 
            className="h-[200px] overflow-y-auto overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="p-2">
              {MINUTES.map((minute) => (
                <button
                  key={minute}
                  onClick={() => handleMinuteSelect(minute)}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-md text-left transition-colors',
                    'hover:bg-muted focus:bg-muted focus:outline-none',
                    selectedMinute === minute && 'bg-foreground text-background hover:bg-foreground',
                    !selectedHour && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={!selectedHour}
                >
                  :{minute}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Preview */}
      {selectedHour && selectedMinute && (
        <div className="px-3 py-3 border-t bg-muted/30">
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-lg font-medium">
              {formatTimeDisplay(`${selectedHour}:${selectedMinute}`)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export function TimePicker({ 
  value, 
  onChange, 
  placeholder = 'Select time',
  disabled = false,
  className 
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 640px)')

  const displayValue = value ? formatTimeDisplay(value) : placeholder

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onChange('')
    setOpen(false)
  }, [onChange])

  // Mobile: use Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <div className="relative w-full">
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                'w-full justify-start text-left font-normal pr-8',
                !value && 'text-muted-foreground',
                className
              )}
            >
              <Clock className="mr-2 h-4 w-4" />
              {displayValue}
            </Button>
          </DrawerTrigger>
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
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Select Time</DrawerTitle>
          </DrawerHeader>
          <TimePickerContent
            value={value}
            onChange={onChange}
            onClose={() => setOpen(false)}
          />
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
            <Clock className="mr-2 h-4 w-4" />
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
        className="w-[280px] p-0 z-[200]" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <TimePickerContent
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}
