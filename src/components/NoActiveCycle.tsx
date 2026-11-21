// Shown on screens that need an active cycle when there isn't one.
import { Link } from 'react-router-dom'

export default function NoActiveCycle() {
  return (
    <div className="card stack">
      <p>There is no active cycle.</p>
      <Link className="btn primary" to="/setup" style={{ alignSelf: 'flex-start' }}>
        Start new cycle
      </Link>
    </div>
  )
}
