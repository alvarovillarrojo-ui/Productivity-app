import type { WizardDraft } from './draft'

/** What every wizard step receives: the draft and a function to change it. */
export interface StepProps {
  draft: WizardDraft
  change: (patch: Partial<WizardDraft>) => void
}
