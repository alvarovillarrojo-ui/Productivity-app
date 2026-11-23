// Reads calendar files (.ics / iCalendar), as exported by Google Calendar,
// Outlook, Apple Calendar or a university timetable, into calendar events.
// Pure functions: no files, no network. Everything happens on this device.
//
// What is kept:
//   - title, date, start/end time (converted to this device's time zone),
//     all-day events, place + description (as notes)
//   - WEEKLY repeats (also several weekdays, e.g. Mon + Wed → two weekly
//     events), with their end date (UNTIL or COUNT)
// Simplified (and reported in the preview):
//   - other repeats (daily, monthly, yearly, every 2 weeks…) → first date only
//   - events lasting several days → their first day
//   - moved/cancelled single dates of a series → ignored
import type { ISODate } from '../data/types'
import { addDays, daysBetween, todayISO, weekday } from './weeks'

/** An event read from the file, ready to be saved. */
export interface IcsEvent {
  /** The calendar's own id (plus the weekday for split repeats): avoids duplicates on re-import. */
  ics_uid: string
  title: string
  date: ISODate
  start_time: string | null
  end_time: string | null
  repeat_weekly: boolean
  repeat_until: ISODate | null
  notes: string
}

export interface IcsResult {
  events: IcsEvent[]
  /** Things simplified or skipped, for the preview. */
  notes: {
    repeatsSimplified: number
    multiDay: number
    skippedCancelled: number
    skippedExceptions: number
    skippedBefore: number
  }
}

const DAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

// ---------- low-level reading ----------

/** Lines of the file, with folded (continued) lines joined back together. */
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n')
}

interface Prop {
  name: string
  params: Record<string, string>
  value: string
}

function parseLine(line: string): Prop | null {
  // NAME;PARAM=a;PARAM2="b:c":VALUE  (the first ":" outside quotes splits)
  let inQuotes = false
  let split = -1
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') inQuotes = !inQuotes
    else if (ch === ':' && !inQuotes) {
      split = i
      break
    }
  }
  if (split < 0) return null
  const [name, ...rawParams] = line.slice(0, split).split(';')
  const params: Record<string, string> = {}
  for (const p of rawParams) {
    const eq = p.indexOf('=')
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '')
  }
  return { name: name.toUpperCase(), params, value: line.slice(split + 1) }
}

/** Undo iCalendar text escaping: \n, \, \; \\ */
const unescapeText = (v: string) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim()

// ---------- dates and time zones ----------

const pad = (n: number) => String(n).padStart(2, '0')

/** Offset of a time zone from UTC at a given moment, in minutes. */
function tzOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return (asUtc - utcMs) / 60000
}

/** A point in time, as a local date + time on this device. */
function toLocal(ms: number): { date: ISODate; time: string } {
  const d = new Date(ms)
  return { date: todayISO(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }
}

/**
 * DTSTART/DTEND value → local date (+ time, unless all-day).
 * Handles "20261124" (all day), "20261124T090000Z" (UTC),
 * "20261124T090000" with TZID=Europe/Madrid, and floating local times.
 */
export function readDateTime(prop: Prop): { date: ISODate; time: string | null } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(prop.value.trim())
  if (!m) return null
  const [, y, mo, d, h, mi, , z] = m
  if (h === undefined || prop.params.VALUE === 'DATE') return { date: `${y}-${mo}-${d}`, time: null }
  const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi)
  if (z) return toLocal(wall)
  const tz = prop.params.TZID
  if (tz) {
    try {
      // Wall time in that zone → UTC (two passes handle daylight-saving edges).
      let utc = wall - tzOffsetMinutes(wall, tz) * 60000
      utc = wall - tzOffsetMinutes(utc, tz) * 60000
      return toLocal(utc)
    } catch {
      // Unknown zone name: treat as local time below.
    }
  }
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}` }
}

/** "PT1H30M" → 90 minutes ("P1D" → 1440). */
function durationMinutes(v: string): number | null {
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?)?$/.exec(v.trim())
  if (!m) return null
  const [, w, d, h, mi] = m.map((x) => (x === undefined ? 0 : Number(x)))
  return w * 7 * 1440 + d * 1440 + h * 60 + mi
}

const addMinutesToTime = (time: string, minutes: number) => {
  const total = Math.min(23 * 60 + 59, Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + minutes)
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

// ---------- the whole file ----------

/**
 * Reads an .ics file. Events that end before `from` are left out (Google
 * exports can contain years of history).
 */
export function parseIcs(text: string, from: ISODate): IcsResult {
  const notes = { repeatsSimplified: 0, multiDay: 0, skippedCancelled: 0, skippedExceptions: 0, skippedBefore: 0 }
  const events: IcsEvent[] = []
  let current: Prop[] | null = null

  for (const line of unfold(text)) {
    if (/^BEGIN:VEVENT$/i.test(line.trim())) current = []
    else if (/^END:VEVENT$/i.test(line.trim())) {
      if (current) events.push(...readEvent(current, from, notes))
      current = null
    } else if (current) {
      const p = parseLine(line)
      if (p) current.push(p)
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''))
  return { events, notes }
}

function readEvent(props: Prop[], from: ISODate, notes: IcsResult['notes']): IcsEvent[] {
  const get = (name: string) => props.find((p) => p.name === name)
  if ((get('STATUS')?.value ?? '').toUpperCase() === 'CANCELLED') {
    notes.skippedCancelled++
    return []
  }
  if (get('RECURRENCE-ID')) {
    notes.skippedExceptions++ // a single changed date of a series
    return []
  }
  const startProp = get('DTSTART')
  const start = startProp && readDateTime(startProp)
  if (!start) return []

  // End time: DTEND, or DTSTART + DURATION, or 1 hour.
  let endTime: string | null = null
  const endProp = get('DTEND')
  const end = endProp ? readDateTime(endProp) : null
  if (start.time) {
    if (end?.time && end.date === start.date && end.time > start.time) endTime = end.time
    else if (end?.time && end.date > start.date) {
      notes.multiDay++
      endTime = '23:59'
    } else {
      const dur = get('DURATION') ? durationMinutes(get('DURATION')!.value) : null
      endTime = addMinutesToTime(start.time, dur ?? 60)
    }
  } else if (end && daysBetween(start.date, end.date) > 1) {
    notes.multiDay++ // all-day over several days (DTEND is the day after)
  }

  const title = unescapeText(get('SUMMARY')?.value ?? '') || '—'
  const place = unescapeText(get('LOCATION')?.value ?? '')
  const description = unescapeText(get('DESCRIPTION')?.value ?? '')
  const base = {
    title,
    start_time: start.time,
    end_time: endTime,
    notes: [place, description].filter(Boolean).join(' · ').slice(0, 500),
  }
  const uid = get('UID')?.value.trim() || `${start.date}|${start.time}|${title}`

  // ----- repeats -----
  const rrule = get('RRULE')?.value
  if (rrule) {
    const rule = Object.fromEntries(rrule.split(';').map((part) => part.split('=') as [string, string]))
    const weekly = rule.FREQ === 'WEEKLY' && (!rule.INTERVAL || rule.INTERVAL === '1')
    if (weekly) {
      const days = (rule.BYDAY ? rule.BYDAY.split(',') : [DAY_CODES[weekday(start.date) - 1]])
        .map((code) => DAY_CODES.indexOf(code.replace(/^[+-]?\d+/, '')) + 1)
        .filter((d) => d >= 1)
      let until: ISODate | null = null
      if (rule.UNTIL) until = readDateTime({ name: 'UNTIL', params: {}, value: rule.UNTIL })?.date ?? null
      else if (rule.COUNT) until = addDays(start.date, Math.ceil(Number(rule.COUNT) / Math.max(1, days.length)) * 7 - 1)
      if (until && until < from) {
        notes.skippedBefore++
        return []
      }
      return [...new Set(days)].map((d) => {
        // First date on that weekday on or after the series start.
        const first = addDays(start.date, (d - weekday(start.date) + 7) % 7)
        return { ...base, ics_uid: days.length > 1 ? `${uid}#${d}` : uid, date: first, repeat_weekly: true, repeat_until: until }
      })
    }
    notes.repeatsSimplified++ // daily / monthly / yearly / every N weeks → first date only
  }

  if (start.date < from) {
    notes.skippedBefore++
    return []
  }
  return [{ ...base, ics_uid: uid, date: start.date, repeat_weekly: false, repeat_until: null }]
}
