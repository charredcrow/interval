import { motion } from 'framer-motion'
import { useUIStore } from '@/store/uiStore'

// Custom Interval logo icon
function IntervalIcon({ className }: { className?: string }) {
  return (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="4" y="7" width="18" height="4" rx="2" fill="currentColor"/>
      <rect x="4" y="14" width="24" height="4" rx="2" fill="currentColor"/>
      <rect x="4" y="21" width="12" height="4" rx="2" fill="currentColor"/>
    </svg>
  )
}

export function Header() {
  const navigateToToday = useUIStore((state) => state.navigateToToday)

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background via-background/95 to-transparent pt-1.5 pb-2 px-4"
    >
      <div className="flex items-center justify-start h-7">
        {/* Logo - Framer style */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={navigateToToday}
          className="flex items-center gap-2 group"
        >
          <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center transition-all duration-200 group-hover:scale-105">
            <IntervalIcon className="h-3.5 w-3.5 text-accent-foreground" />
          </div>
          <span className="font-semibold text-base tracking-tight text-foreground">
            Interval
          </span>
        </motion.button>
      </div>
    </motion.header>
  )
}
