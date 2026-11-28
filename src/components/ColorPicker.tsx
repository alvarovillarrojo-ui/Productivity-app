// A row of colour swatches to choose from. `null` = the automatic colour.
import { PICKER_COLORS } from './colors'

export default function ColorPicker({
  value,
  auto,
  onChange,
  label,
  autoLabel,
  hideAuto,
}: {
  value: string | null
  /** The colour used when nothing is chosen (shown on the "auto" swatch). */
  auto: string
  onChange: (color: string | null) => void
  label: string
  autoLabel: string
  /** Don't offer the automatic colour (a colour must be chosen). */
  hideAuto?: boolean
}) {
  return (
    <div className="color-picker" role="radiogroup" aria-label={label}>
      {!hideAuto && (
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          aria-label={autoLabel}
          title={autoLabel}
          className={value === null ? 'swatch-btn auto on' : 'swatch-btn auto'}
          style={{ background: auto }}
          onClick={() => onChange(null)}
        >
          A
        </button>
      )}
      {PICKER_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          title={c}
          className={value === c ? 'swatch-btn on' : 'swatch-btn'}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  )
}
