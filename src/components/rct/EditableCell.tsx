import { memo, useCallback, useState, useEffect } from 'react'

interface EditableCellProps {
  value: string | number | null
  onChange: (value: string | number | null) => void
  type: 'text' | 'number' | 'date'
  disabled?: boolean
}

export const EditableCell = memo(function EditableCell({ value, onChange, type, disabled = false }: EditableCellProps) {
  // Local state for responsive typing - only commits on blur
  const [localValue, setLocalValue] = useState<string>(value?.toString() ?? '')

  // Sync from prop when value changes externally (e.g., undo, external update)
  useEffect(() => {
    setLocalValue(value?.toString() ?? '')
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }, [])

  const handleBlur = useCallback(() => {
    // Commit value on blur
    if (type === 'number') {
      onChange(localValue ? Number(localValue) : null)
    } else {
      onChange(localValue || null)
    }
  }, [onChange, type, localValue])

  const baseClass = type === 'date'
    ? 'w-full px-2 py-1 bg-surface-overlay border border-surface-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed'
    : `w-full px-2 py-1 bg-transparent border border-transparent hover:border-surface-border focus:border-accent-500 rounded text-sm text-text-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-transparent ${type === 'number' ? 'text-right' : ''}`

  return (
    <input
      type={type}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      className={baseClass}
    />
  )
})
