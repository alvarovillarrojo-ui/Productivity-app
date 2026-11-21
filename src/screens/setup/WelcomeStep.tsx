// Step a) Welcome — first run only.
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'

export default function WelcomeStep({ onStart }: { onStart: () => void }) {
  const { t } = useI18n()
  const w = t.setup.welcome
  return (
    <div className="stack">
      <div className="card">
        <ul className="welcome-list">
          <li>{w.line1}</li>
          <li>{w.line2}</li>
          <li>{w.line3}</li>
        </ul>
        <p className="note">{w.privacy}</p>
      </div>
      <button className="btn primary big" onClick={onStart}>
        {w.start}
      </button>
      <p className="muted">
        {w.alreadyHaveData} <Link to="/data?action=import">{w.importFile}</Link> {w.or}{' '}
        <Link to="/data?action=restore">{w.restoreBackup}</Link>.
      </p>
    </div>
  )
}
