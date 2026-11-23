// One task in a list, with one-click ✓ / ½ / ✗ buttons (see StatusButtons).
import { Link } from 'react-router-dom'
import type { Task } from '../data/types'
import StatusButtons from './StatusButtons'
import { useI18n } from '../i18n'
import { formatHours } from '../logic/metrics'

interface Props {
  task: Task
  /** e.g. "Fitness › Run" */
  context: string
  /** Show the planned date (off on Home's "today" list). */
  showDate?: boolean
  /** Highlight as overdue (planned date passed, still open). */
  overdue?: boolean
  /** The tactic's minimum version (what a ½ means), if any. */
  minimum?: string | null
  onEdit?: () => void
  onDelete?: () => void
}

export default function TaskRow({ task, context, showDate = true, overdue, minimum, onEdit, onDelete }: Props) {
  const { t, date } = useI18n()
  const hours =
    task.actual_hours !== null
      ? formatHours(task.actual_hours)
      : task.planned_hours !== null
        ? `${formatHours(task.planned_hours)} ${t.tasks.planned}`
        : null

  return (
    <li className={`task-row status-${task.status}`}>
      <StatusButtons task={task} minimum={minimum} />
      <div className="task-main">
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          {showDate && task.planned_date && (
            <span className={overdue ? 'bad' : undefined}>{date(task.planned_date)} · </span>
          )}
          {task.planned_date && task.start_time && <span>🕘 {task.start_time} · </span>}
          {context}
          {task.status === 'todo' && (
            <>
              {' · '}
              <Link className="focus-link" to={`/focus?task=${task.id}`} aria-label={t.focus.open(task.title)} title={t.focus.open(task.title)}>
                ▶ {t.nav.focus}
              </Link>
            </>
          )}
          {hours && ` · ${hours}`}
          {minimum && (task.status === 'todo' || task.status === 'partial') && (
            <span className="minimum"> · ½ = {minimum}</span>
          )}
        </span>
      </div>
      {(onEdit || onDelete) && (
        <div className="task-actions">
          {onEdit && (
            <button className="link" onClick={onEdit}>
              {t.common.edit}
            </button>
          )}
          {onDelete && (
            <button className="link danger" aria-label={t.tasks.deleteTask(task.title)} onClick={onDelete}>
              ✕
            </button>
          )}
        </div>
      )}
    </li>
  )
}
