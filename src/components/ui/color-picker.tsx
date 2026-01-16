import { cn } from '@/utils/cn'
import type { EventColor } from '@/types'

interface ColorPickerProps {
  value?: EventColor
  onChange: (color: EventColor | undefined) => void
  className?: string
}

const COLORS: { value: EventColor; bg: string; ring: string }[] = [
  { value: 'red', bg: 'bg-red-500', ring: 'ring-red-500' },
  { value: 'orange', bg: 'bg-orange-500', ring: 'ring-orange-500' },
  { value: 'yellow', bg: 'bg-yellow-500', ring: 'ring-yellow-500' },
  { value: 'green', bg: 'bg-green-500', ring: 'ring-green-500' },
  { value: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-500' },
  { value: 'purple', bg: 'bg-purple-500', ring: 'ring-purple-500' },
  { value: 'pink', bg: 'bg-pink-500', ring: 'ring-pink-500' },
  { value: 'gray', bg: 'bg-gray-500', ring: 'ring-gray-500' },
]

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const handleClick = (color: EventColor) => {
    // Toggle off if clicking the same color
    if (value === color) {
      onChange(undefined)
    } else {
      onChange(color)
    }
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {COLORS.map(({ value: colorValue, bg, ring }) => (
        <button
          key={colorValue}
          type="button"
          onClick={() => handleClick(colorValue)}
          className={cn(
            'h-6 w-6 rounded-full transition-all duration-200',
            'hover:scale-110 focus:outline-none',
            bg,
            value === colorValue && `ring-2 ring-offset-2 ring-offset-background ${ring}`
          )}
          aria-label={colorValue}
        />
      ))}
    </div>
  )
}

// Color hex values for inline styles (Tailwind can't generate dynamic classes)
const COLOR_VALUES: Record<EventColor, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  gray: '#6b7280',
}

// Helper to get color value for displaying on cards
export function getEventColor(color?: EventColor): string | undefined {
  if (!color) return undefined
  return COLOR_VALUES[color]
}
