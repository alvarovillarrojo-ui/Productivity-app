// One task in a list, with one-click ✓ / ½ / ✗ buttons (see StatusButtons).
import { Link } from 'react-router-dom'
import type { Task } from '../data/types'
import StatusButtons, { StatusBadge } from './StatusButtons'
import CausePicker from './CausePicker'
import { SubjectTag } from './SubjectSelect'
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
  /** Blocks of the plan: show the status, don't offer ✓ ½ ✗ (they are marked in the closing). */
  readOnly?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export default function TaskRow({ task, context, showDate = true, overdue, minimum, readOnly, onEdit, onDelete }: Props) {
  const { t, date } = useI18n()
  const hours =
    task.actual_hours !== null
      ? formatHours(task.actual_hours)
      : task.planned_hours !== null
        ? `${formatHours(task.planned_hours)} ${t.tasks.planned}`
        : null

  return (
    <li className={`task-row status-${task.status}`}>
      {readOnly ? <StatusBadge status={task.status} /> : <StatusButtons task={task} minimum={minimum} />}
      <div className="task-main">
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          {showDate && task.planned_date && (
            <span className={overdue ? 'bad' : undefined}>{date(task.planned_date)} · </span>
          )}
          {task.planned_date && task.start_time && <span>🕘 {task.start_time} · </span>}
          {context}
          {task.subject_id && <SubjectTag id={task.subject_id} />}
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
        {!readOnly && <CausePicker task={task} />}
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
