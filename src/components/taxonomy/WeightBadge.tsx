import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface WeightBadgeProps {
  /** Current weight value */
  value: number
  /** Whether this is a node override (vs level default) */
  isOverride: boolean
  /** Called when weight changes */
  onChange: (value: number) => void
  /** Called to clear override (only available when isOverride) */
  onClear?: () => void
  /** Disable editing */
  disabled?: boolean
}

export function WeightBadge({
  value,
  isOverride,
  onChange,
  onClear,
  disabled = false,
}: WeightBadgeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value.toFixed(1))
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus and select input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Sync local value when prop changes
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value.toFixed(1))
    }
  }, [value, isEditing])

  const handleSave = () => {
    const parsed = parseFloat(localValue)
    if (!isNaN(parsed) && parsed >= 0.1 && parsed <= 5.0) {
      // Round to 1 decimal place
      onChange(Math.round(parsed * 10) / 10)
    } else {
      // Reset to original value if invalid
      setLocalValue(value.toFixed(1))
    }
    setIsEditing(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClear?.()
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.1"
        min="0.1"
        max="5.0"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          e.stopPropagation() // Prevent tree navigation
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') {
            setLocalValue(value.toFixed(1))
            setIsEditing(false)
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'w-14 px-1 py-0.5 text-xs text-center rounded',
          'bg-surface-overlay border border-accent-500',
          'text-text-primary',
          'focus:outline-none focus:ring-1 focus:ring-accent-500'
        )}
      />
    )
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) setIsEditing(true)
      }}
      className={clsx(
        'inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded transition-colors',
        isOverride
          ? 'bg-accent-500/30 text-accent-300 border border-accent-500/50'
          : 'bg-surface-overlay text-text-muted border border-transparent hover:border-surface-border',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      )}
      title={
        isOverride
          ? 'Custom weight override (click to edit)'
          : 'Level default weight (click to override)'
      }
    >
      <span>{value.toFixed(1)}x</span>
      {isOverride && onClear && !disabled && (
        <button
          onClick={handleClear}
          className="p-0.5 -mr-0.5 rounded hover:bg-surface-elevated transition-colors"
          title="Clear override (use level default)"
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}
