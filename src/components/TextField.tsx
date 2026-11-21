// A text input (or textarea) that saves when you leave the field or press
// Enter, instead of on every keystroke. Escape undoes the edit.
import { useEffect, useState } from 'react'

interface Props {
  value: string
  onSave: (value: string) => void
  /** If true, an empty value is not saved (the old value comes back). */
  required?: boolean
  multiline?: boolean
  rows?: number
  placeholder?: string
  ariaLabel?: string
  className?: string
}

export default function TextField({ value, onSave, required, multiline, rows = 3, placeholder, ariaLabel, className }: Props) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])

  const commit = () => {
    const trimmed = text.trim()
    if (required && trimmed === '') return setText(value)
    if (trimmed !== value) onSave(trimmed)
  }

  const common = {
    value: text,
    placeholder,
    'aria-label': ariaLabel,
    className,
    onBlur: commit,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(e.target.value),
  }

  return multiline ? (
    <textarea {...common} rows={rows} onKeyDown={(e) => e.key === 'Escape' && setText(value)} />
  ) : (
    <input
      {...common}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setText(value)
      }}
    />
  )
}
