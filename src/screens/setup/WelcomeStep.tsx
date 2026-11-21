// Step a) Welcome — first run only.
import { Link } from 'react-router-dom'

export default function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="stack">
      <div className="card">
        <ul className="welcome-list">
          <li>Plan a 12-week cycle: a few goals, and the tactics that make them happen.</li>
          <li>Each week, list your tasks and tick them off every evening.</li>
          <li>See your execution % and hours, and aim for 85% or more.</li>
        </ul>
        <p className="note">🔒 Your data stays on this device. No account, nothing is sent anywhere.</p>
      </div>
      <button className="btn primary big" onClick={onStart}>
        Set up my first cycle
      </button>
      <p className="muted">
        Already have data? <Link to="/data?action=import">Import a cycle from file</Link> or{' '}
        <Link to="/data?action=restore">restore from backup</Link>.
      </p>
    </div>
  )
}
