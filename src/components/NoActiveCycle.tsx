// Shown on screens that need an active cycle when there isn't one.
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'

export default function NoActiveCycle() {
  const { t } = useI18n()
  return (
    <div className="card stack">
      <p>{t.common.noActiveCycle}</p>
      <Link className="btn primary" to="/setup" style={{ alignSelf: 'flex-start' }}>
        {t.common.startNewCycle}
      </Link>
    </div>
  )
}
