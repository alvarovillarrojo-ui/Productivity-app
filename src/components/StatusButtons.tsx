// The one-click status buttons of a task: ✓ done · ½ minimum version · ✗ missed.
// Clicking the button that is already on puts the task back to "to do".
import { setTaskStatus } from '../data/repo'
import type { Task, TaskStatus } from '../data/types'
import { useI18n } from '../i18n'

export default function StatusButtons({ task, minimum }: { task: Task; minimum?: string | null }) {
  const { t } = useI18n()
  const toggle = (status: TaskStatus) => setTaskStatus(task.id, task.status === status ? 'todo' : status)
  const button = (status: Exclude<TaskStatus, 'todo'>, symbol: string, label: string, undo: string) => (
    <button
      className={task.status === status ? `sb ${status} on` : `sb ${status}`}
      title={task.status === status ? undo : label}
      aria-label={label}
      aria-pressed={task.status === status}
      onClick={() => toggle(status)}
    >
      {symbol}
    </button>
  )
  return (
    <div className="status-buttons">
      {button('done', '✓', t.tasks.markDone(task.title), t.tasks.doneUndo)}
      {button('partial', '½', t.tasks.markPartial(task.title, minimum ?? null), t.tasks.partialUndo)}
      {button('missed', '✗', t.tasks.markMissed(task.title), t.tasks.missedUndo)}
    </div>
  )
}

/** The status shown without buttons (blocks outside the closing). */
export function StatusBadge({ status }: { status: Task['status'] }) {
  const { t } = useI18n()
  const symbol = { todo: '·', done: '✓', partial: '½', missed: '✗' }[status]
  return (
    <span className={`status-badge ${status}`} title={t.blocks.markInClosing}>
      {symbol}
    </span>
  )
}
