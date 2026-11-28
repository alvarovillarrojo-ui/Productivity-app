// A number input where "empty" means null (e.g. "no minimum").
//
// It is a text field (with the number keyboard on phones) rather than the
// browser's number field: that one dropped the comma, so "3,5" became 35 or
// was emptied. Here "3,5" and "3.5" both mean three and a half.
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { formatDecimal, isDecimalDraft, parseDecimal } from '../logic/numbers'

interface Props {
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  ariaLabel?: string
  className?: string
  disabled?: boolean
}

export default function NumberField({ value, onChange, min = 0, max, placeholder, ariaLabel, className, disabled }: Props) {
  const { lang } = useI18n()
  // Keep the typed text locally so "3," or "" can be typed without jumping.
  const [text, setText] = useState(formatDecimal(value, lang))
  useEffect(() => {
    if (value !== parseDecimal(text)) setText(formatDecimal(value, lang))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const outOfRange = (n: number | null) => n !== null && (n < min || (max !== undefined && n > max))

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={className ?? 'num'}
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={outOfRange(parseDecimal(text)) || undefined}
      disabled={disabled}
      onChange={(e) => {
        const typed = e.target.value.replace(/\s/g, '')
        if (!isDecimalDraft(typed)) return // ignore letters, a second comma…
        setText(typed)
        onChange(parseDecimal(typed))
      }}
      onBlur={() => setText(formatDecimal(parseDecimal(text), lang))}
    />
  )
}
