// Date and time fields that keep what you are typing.
//
// The browser's own date/time fields are typed piece by piece (16 → 30). Many
// of ours save on every change and get the value back from the database a
// moment later; meanwhile React put the OLD value back in the field, which
// cut the typing short (16:30 became 16:03). These fields keep their own copy
// while you type and only pass on complete values (a year like 0002, typed on
// the way to 2027, is not passed on).
import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { isPlausibleDate } from '../logic/numbers'
import { isValidTime } from '../logic/calendar'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string | null | undefined
  /** The new value, or '' when the field was emptied. */
  onChange: (value: string) => void
}

function useBuffered(value: string | null | undefined, onChange: (v: string) => void, complete: (v: string) => boolean) {
  const outside = value ?? ''
  const [text, setText] = useState(outside)
  const focused = useRef(false)
  // A change from outside (another screen, a reset) shows up unless you are typing here.
  useEffect(() => {
    if (!focused.current) setText(outside)
  }, [outside])
  return {
    value: text,
    onFocus: () => {
      focused.current = true
    },
    onBlur: () => {
      focused.current = false
      setText(outside)
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setText(v)
      if ((v === '' || complete(v)) && v !== outside) onChange(v)
    },
  }
}

export function DateInput({ value, onChange, onBlur, onFocus, ...rest }: Props) {
  const b = useBuffered(value, onChange, isPlausibleDate)
  return (
    <input
      {...rest}
      type="date"
      value={b.value}
      onChange={b.onChange}
      onFocus={(e) => (b.onFocus(), onFocus?.(e))}
      onBlur={(e) => (b.onBlur(), onBlur?.(e))}
    />
  )
}

export function TimeInput({ value, onChange, onBlur, onFocus, step = 900, ...rest }: Props) {
  const b = useBuffered(value, onChange, isValidTime)
  return (
    <input
      {...rest}
      type="time"
      step={step}
      value={b.value}
      onChange={b.onChange}
      onFocus={(e) => (b.onFocus(), onFocus?.(e))}
      onBlur={(e) => (b.onBlur(), onBlur?.(e))}
    />
  )
}
