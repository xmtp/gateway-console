import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedMessageCounterProps {
  value: number
  className?: string
}

export function AnimatedMessageCounter({ value, className }: AnimatedMessageCounterProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const previousValue = useRef(value)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const prev = previousValue.current
    const diff = value - prev

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // If value decreased, animate down with visual effect
    if (diff < 0) {
      // Trigger the pulse animation
      setIsAnimating(true)

      const startTime = performance.now()
      const duration = 400 // ms

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Ease out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const current = Math.round(prev + diff * easeOut)

        setDisplayValue(current)

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          setDisplayValue(value)
          // End pulse animation after the number finishes
          setTimeout(() => setIsAnimating(false), 200)
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    } else {
      // For increases or no change, update immediately
      setDisplayValue(value)
    }

    previousValue.current = value

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value])

  // Format with thousands separators
  const formattedValue = displayValue.toLocaleString()

  // Determine font size based on magnitude
  // Billions (10+ chars with commas like "1,234,567,890") need smaller font
  const isBillions = displayValue >= 1_000_000_000

  return (
    <span
      className={cn(
        'font-mono font-bold tabular-nums inline-block',
        isBillions ? 'text-lg' : 'text-2xl',
        isAnimating && 'animate-message-sent',
        className
      )}
    >
      {formattedValue}
    </span>
  )
}
