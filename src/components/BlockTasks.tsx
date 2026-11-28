// The tasks placed inside a block of the plan: what you will actually do in
// that session (e.g. block "Study 2h" → "Finish DCF exercise"). They can be
// ticked here; with `canAdd`, tasks can also be added, created or taken out.
import { useState } from 'react'
import * as repo from '../data/repo'
import type { Tactic, Task } from '../data/types'
import { useI18n } from '../i18n'
import { attachableTasks, tasksInBlock } from '../logic/taskActions'
import StatusButtons from './StatusButtons'
import { minimumOf } from './TacticSelect'

export default function BlockTasks({ block, tasks, tactics, canAdd }: { block: Task; tasks: Task[]; tactics: Tactic[]; canAdd?: boolean }) {
  const { t } = useI18n()
  const b = t.blocks
  const inside = tasksInBlock(block.id, tasks)
  const free = canAdd ? attachableTasks(block, tasks, tactics) : []
  const [title, setTitle] = useState('')

  if (!canAdd && inside.length === 0) return null

  const create = async () => {
    const name = title.trim()
    if (!name) return
    setTitle('') // at once, so typing the next one right away isn't mixed in
    await repo.createTask({
      cycle_id: block.cycle_id,
      week_number: block.week_number,
      title: name,
      tactic_id: block.tactic_id,
      planned_date: block.planned_date,
      subject_id: block.subject_id ?? null,
      block_id: block.id,
    })
  }

  return (
    <div className="block-tasks">
      {canAdd && <h3>{b.insideTitle}</h3>}
      {inside.length === 0 ? (
        <p className="muted small-text">{b.insideEmpty}</p>
      ) : (
        <ul className="block-task-list">
          {inside.map((x) => (
            <li key={x.id} className={`status-${x.status}`}>
              <StatusButtons task={x} minimum={minimumOf(x.tactic_id, tactics)} />
              <span className="grow">{x.title}</span>
              {canAdd && (
                <button className="link" aria-label={b.takeOut(x.title)} title={b.takeOut(x.title)} onClick={() => repo.updateTask(x.id, { block_id: null })}>
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <div className="stack-tight">
          {free.length > 0 && (
            <select
              value=""
              aria-label={b.addExisting}
              onChange={(e) => e.target.value && repo.updateTask(e.target.value, { block_id: block.id })}
            >
              <option value="">{b.addExisting}</option>
              {free.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
          )}
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault()
              create()
            }}
          >
            <input className="grow" value={title} placeholder={b.newInside} aria-label={b.newInside} onChange={(e) => setTitle(e.target.value)} />
            <button className="btn" type="submit">
              + {t.common.add}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

/** "☑ 1/2": done / total tasks inside a block (empty when there are none). */
export function blockBadge(blockId: string, tasks: Task[]): string {
  const inside = tasksInBlock(blockId, tasks)
  if (inside.length === 0) return ''
  return `☑ ${inside.filter((x) => x.status === 'done').length}/${inside.length}`
}
