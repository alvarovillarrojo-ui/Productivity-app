// One task in a list, with one-click Done / Missed buttons.
// Clicking the button that is already on puts the task back to "to do".
import { setTaskStatus } from '../data/repo'
import type { Task, TaskStatus } from '../data/types'
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
  onEdit?: () => void
  onDelete?: () => void
}

export default function TaskRow({ task, context, showDate = true, overdue, onEdit, onDelete }: Props) {
  const { t, date } = useI18n()
  const toggle = (status: TaskStatus) => setTaskStatus(task.id, task.status === status ? 'todo' : status)

  const hours =
    task.actual_hours !== null
      ? formatHours(task.actual_hours)
      : task.planned_hours !== null
        ? `${formatHours(task.planned_hours)} ${t.tasks.planned}`
        : null

  return (
    <li className={`task-row status-${task.status}`}>
      <div className="status-buttons">
        <button
          className={task.status === 'done' ? 'sb done on' : 'sb done'}
          title={task.status === 'done' ? t.tasks.doneUndo : t.tasks.markDone(task.title)}
          aria-label={t.tasks.markDone(task.title)}
          aria-pressed={task.status === 'done'}
          onClick={() => toggle('done')}
        >
          ✓
        </button>
        <button
          className={task.status === 'missed' ? 'sb missed on' : 'sb missed'}
          title={task.status === 'missed' ? t.tasks.missedUndo : t.tasks.markMissed(task.title)}
          aria-label={t.tasks.markMissed(task.title)}
          aria-pressed={task.status === 'missed'}
          onClick={() => toggle('missed')}
        >
          ✗
        </button>
      </div>
      <div className="task-main">
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          {showDate && task.planned_date && (
            <span className={overdue ? 'bad' : undefined}>{date(task.planned_date)} · </span>
          )}
          {context}
          {hours && ` · ${hours}`}
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
