// Temporary screen used until each real screen is built.
import { useI18n } from '../i18n'

export default function Placeholder({ title, step }: { title: string; step: string }) {
  const { t } = useI18n()
  return (
    <section>
      <h1>{title}</h1>
      <p className="muted">{t.common.placeholder(step)}</p>
    </section>
  )
}
