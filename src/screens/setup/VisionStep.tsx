// Step c) Vision — optional, private free text.
import { useI18n } from '../../i18n'
import type { StepProps } from './stepProps'

export default function VisionStep({ draft, change }: StepProps) {
  const { t } = useI18n()
  return (
    <div className="stack">
      <textarea
        className="textarea"
        rows={8}
        value={draft.vision}
        placeholder={t.setup.vision.placeholder}
        onChange={(e) => change({ vision: e.target.value })}
      />
      <p className="note">{t.setup.vision.privacy}</p>
    </div>
  )
}
