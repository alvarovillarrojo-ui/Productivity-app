// "Import subjects": a JSON file with your subjects, their topics and their
// exams/projects, usually written by Claude in another chat from your course
// guides (see logic/subjectsPrompt.ts for the instructions it gets).
//
// FORMAT
//   { "format": "12wt-subjects", "version": "1.0" (also read as "schema_version"
//     or "schemaVersion"; it may be left out),
//     "subjects": [ { "name", "info"?, "weekly_hours_target"?,
//       "topics"?: [ "Topic name" | { "name", "notes"? } ],
//       "exams"?: [ { "kind", "title"?, "date", "time"?, "weight"?, "notes"?,
//                     "deliverables"?: [ { "title", "date", "time"? } ] } ] } ] }
//
// Importing only ADDS. A subject whose name already exists is not changed,
// but its new topics and exams are added. Topics and exams that already exist
// (same name, ignoring capitals) are skipped, so importing twice is harmless.
// Pure functions (no database), tested in subjectsImport.test.ts.
import { EXAM_KINDS, type Exam, type ExamKind, type ISODate, type Subject, type Topic } from '../data/types'
import { nameKey, SUBJECTS_FORMAT, type DataIssue } from './exchange'
import { isValidDate } from './weeks'
import { isValidTime } from './calendar'

export { SUBJECTS_FORMAT }
export const SUBJECTS_VERSION = '1.0'

export interface FileTopic {
  name: string
  notes: string
}

export interface FileExam {
  kind: ExamKind
  title: string
  date: ISODate
  time: string | null
  weight: number | null
  notes: string
  deliverables: { title: string; date: ISODate; time: string | null }[]
}

export interface FileSubject {
  name: string
  info: string
  weekly_hours_target: number | null
  topics: FileTopic[]
  exams: FileExam[]
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const MAX_ISSUES = 30

/** Checks a subjects file and turns it into clean data (or a list of problems). */
export function parseSubjectsFile(input: unknown): { issues: DataIssue[]; subjects: FileSubject[] | null } {
  const issues: DataIssue[] = []
  const add = (code: DataIssue['code'], path?: string, detail?: string) => {
    if (issues.length < MAX_ISSUES) issues.push({ code, path, detail })
  }
  if (!isObj(input)) return { issues: [{ code: 'notObject' }], subjects: null }
  if (input.format !== SUBJECTS_FORMAT || !Array.isArray(input.subjects)) return { issues: [{ code: 'notSubjects' }], subjects: null }
  // The prompt writes "version"; other spellings are accepted too. No version at all is fine.
  const version = input.version ?? input.schema_version ?? input.schemaVersion
  if (version !== undefined && version !== null && !['1', '1.0'].includes(String(version))) {
    return { issues: [{ code: 'version', detail: String(version) }], subjects: null }
  }

  const text = (v: unknown, path: string, required = false): string => {
    if (v === undefined || v === null) {
      if (required) add('required', path)
      return ''
    }
    if (typeof v !== 'string') {
      add('text', path)
      return ''
    }
    if (required && !v.trim()) add('required', path)
    return v.trim()
  }
  const num = (v: unknown, path: string, max?: number): number | null => {
    if (v === undefined || v === null || v === '') return null
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || (max !== undefined && v > max)) {
      add('number', path)
      return null
    }
    return v
  }
  const date = (v: unknown, path: string): ISODate => {
    if (typeof v !== 'string' || !isValidDate(v)) add('date', path, v === undefined ? undefined : String(v))
    return typeof v === 'string' ? v : ''
  }
  const time = (v: unknown, path: string): string | null => {
    if (v === undefined || v === null || v === '') return null
    if (typeof v !== 'string' || !isValidTime(v)) {
      add('time', path)
      return null
    }
    return v
  }
  const list = (v: unknown, path: string): unknown[] => {
    if (v === undefined || v === null) return []
    if (!Array.isArray(v)) {
      add('list', path)
      return []
    }
    return v
  }

  const subjects: FileSubject[] = []
  const seen = new Set<string>()
  input.subjects.forEach((raw, i) => {
    const p = `subjects[${i}]`
    if (!isObj(raw)) return add('notObject', p)
    const name = text(raw.name, `${p}.name`, true)
    if (name && seen.has(nameKey(name))) add('duplicateName', `${p}.name`, name)
    seen.add(nameKey(name))
    const topics = list(raw.topics, `${p}.topics`).flatMap((tp, j): FileTopic[] => {
      const tPath = `${p}.topics[${j}]`
      if (typeof tp === 'string') return tp.trim() ? [{ name: tp.trim(), notes: '' }] : (add('required', tPath), [])
      if (!isObj(tp)) return (add('notObject', tPath), [])
      return [{ name: text(tp.name, `${tPath}.name`, true), notes: text(tp.notes, `${tPath}.notes`) }]
    })
    const exams = list(raw.exams, `${p}.exams`).flatMap((ex, j): FileExam[] => {
      const ePath = `${p}.exams[${j}]`
      if (!isObj(ex)) return (add('notObject', ePath), [])
      const kind = (ex.kind ?? 'other') as ExamKind
      if (!EXAM_KINDS.includes(kind)) add('examKind', `${ePath}.kind`, String(ex.kind))
      const deliverables = list(ex.deliverables, `${ePath}.deliverables`).flatMap((d, k) => {
        const dPath = `${ePath}.deliverables[${k}]`
        if (!isObj(d)) return (add('notObject', dPath), [])
        return [{ title: text(d.title, `${dPath}.title`, true), date: date(d.date, `${dPath}.date`), time: time(d.time, `${dPath}.time`) }]
      })
      return [
        {
          kind,
          title: text(ex.title, `${ePath}.title`),
          date: date(ex.date, `${ePath}.date`),
          time: time(ex.time, `${ePath}.time`),
          weight: num(ex.weight, `${ePath}.weight`, 100),
          notes: text(ex.notes, `${ePath}.notes`),
          deliverables,
        },
      ]
    })
    subjects.push({
      name,
      info: text(raw.info, `${p}.info`),
      weekly_hours_target: num(raw.weekly_hours_target, `${p}.weekly_hours_target`),
      topics,
      exams,
    })
  })
  if (subjects.length === 0 && issues.length === 0) add('notSubjects')
  return issues.length ? { issues, subjects: null } : { issues: [], subjects }
}

/** What an import will do, shown before you confirm. */
export interface SubjectsPlan {
  /** Subjects that don't exist yet (with all their topics and exams). */
  newSubjects: FileSubject[]
  /** Subjects that exist already: only their new topics and exams are added. */
  additions: { subject: Subject; topics: FileTopic[]; exams: FileExam[] }[]
  /** Topics and exams skipped because they already exist. */
  skipped: number
}

/** How an exam is recognised: its title, or (without a title) its type and date. */
const examKey = (e: { kind: ExamKind; title: string; date: ISODate }) => (e.title.trim() ? nameKey(e.title) : `${e.kind}|${e.date}`)

/** Compares the file with what the app has, by name. Nothing is changed or deleted. */
export function planSubjectsImport(file: FileSubject[], existing: { subjects: Subject[]; topics: Topic[]; exams: Exam[] }): SubjectsPlan {
  const plan: SubjectsPlan = { newSubjects: [], additions: [], skipped: 0 }
  const byName = new Map(existing.subjects.map((s) => [nameKey(s.name), s]))
  for (const fs of file) {
    const subject = byName.get(nameKey(fs.name))
    if (!subject) {
      // Repeated names inside the file itself are kept only once.
      const uniqTopics = uniqueBy(fs.topics, (t) => nameKey(t.name))
      const uniqExams = uniqueBy(fs.exams, examKey)
      plan.skipped += fs.topics.length - uniqTopics.length + fs.exams.length - uniqExams.length
      plan.newSubjects.push({ ...fs, topics: uniqTopics, exams: uniqExams })
      continue
    }
    const haveTopics = new Set(existing.topics.filter((t) => t.subject_id === subject.id).map((t) => nameKey(t.name)))
    const haveExams = new Set(existing.exams.filter((e) => e.subject_id === subject.id).map(examKey))
    const topics = uniqueBy(fs.topics, (t) => nameKey(t.name)).filter((t) => !haveTopics.has(nameKey(t.name)))
    const exams = uniqueBy(fs.exams, examKey).filter((e) => !haveExams.has(examKey(e)))
    plan.skipped += fs.topics.length - topics.length + fs.exams.length - exams.length
    if (topics.length || exams.length) plan.additions.push({ subject, topics, exams })
  }
  return plan
}

function uniqueBy<T>(list: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>()
  return list.filter((x) => {
    const k = key(x)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Counts for the preview. */
export function planCounts(plan: SubjectsPlan): { subjects: number; topics: number; exams: number } {
  const all = [...plan.newSubjects, ...plan.additions]
  return {
    subjects: plan.newSubjects.length,
    topics: all.reduce((s, x) => s + x.topics.length, 0),
    exams: all.reduce((s, x) => s + x.exams.length, 0),
  }
}
