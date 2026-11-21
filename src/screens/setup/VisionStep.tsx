// Step c) Vision — optional, private free text.
import type { StepProps } from './stepProps'

export default function VisionStep({ draft, change }: StepProps) {
  return (
    <div className="stack">
      <textarea
        className="textarea"
        rows={8}
        value={draft.vision}
        placeholder="In 3–5 years I want to… (you can leave this empty)"
        onChange={(e) => change({ vision: e.target.value })}
      />
      <p className="note">🔒 Your vision stays on this device. It is never included in exports unless you choose to.</p>
    </div>
  )
}
