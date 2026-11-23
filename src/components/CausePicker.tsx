// Shown under a task marked ✗: one click on why it failed (P/I/E/S).
// Clicking the chosen cause again clears it.
import { setMissReason } from '../data/repo'
import { MISS_CAUSES, type Task } from '../data/types'
import { useI18n } from '../i18n'

export default function CausePicker({ task }: { task: Task }) {
  const { t } = useI18n()
  if (task.status !== 'missed') return null
  return (
    <div className="cause-picker" role="group" aria-label={t.causes.why}>
      <span className="muted small-text">{t.causes.why}</span>
      {MISS_CAUSES.map((cause) => (
        <button
          key={cause}
          type="button"
          className={task.miss_reason === cause ? 'chip small on' : 'chip small'}
          aria-pressed={task.miss_reason === cause}
          onClick={() => setMissReason(task.id, task.miss_reason === cause ? null : cause)}
        >
          {t.causes.names[cause]}
        </button>
      ))}
    </div>
  )
}
