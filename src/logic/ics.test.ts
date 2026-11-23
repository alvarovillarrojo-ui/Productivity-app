// Times are checked as seen from Madrid (the app shows local time).
process.env.TZ = 'Europe/Madrid'

import { describe, expect, it } from 'vitest'
import { parseIcs } from './ics'

const wrap = (...events: string[]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events.flatMap((e) => ['BEGIN:VEVENT', e, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n')

const FROM = '2026-11-01'

describe('reading .ics files', () => {
  it('reads a UTC event as local time, with place and description as notes', () => {
    const r = parseIcs(
      wrap('UID:a1\r\nSUMMARY:Reunión\\, equipo\r\nDTSTART:20261124T080000Z\r\nDTEND:20261124T093000Z\r\nLOCATION:Aula 3\r\nDESCRIPTION:Traer\\ndatos'),
      FROM,
    )
    expect(r.events).toEqual([
      {
        ics_uid: 'a1', title: 'Reunión, equipo', date: '2026-11-24', start_time: '09:00', end_time: '10:30',
        repeat_weekly: false, repeat_until: null, notes: 'Aula 3 · Traer\ndatos',
      },
    ])
  })

  it('converts times given in another time zone', () => {
    const r = parseIcs(wrap('UID:ny\r\nSUMMARY:Call NY\r\nDTSTART;TZID=America/New_York:20261124T090000\r\nDURATION:PT45M'), FROM)
    expect(r.events[0]).toMatchObject({ start_time: '15:00', end_time: '15:45' })
  })

  it('reads all-day events and joins folded lines', () => {
    const r = parseIcs(wrap('UID:x\r\nSUMMARY:Examen de\r\n  Finanzas\r\nDTSTART;VALUE=DATE:20261201\r\nDTEND;VALUE=DATE:20261202'), FROM)
    expect(r.events[0]).toMatchObject({ title: 'Examen de Finanzas', date: '2026-12-01', start_time: null, end_time: null })
  })

  it('turns a weekly class on Mon and Wed into two weekly events until its end', () => {
    const r = parseIcs(
      wrap('UID:class\r\nSUMMARY:Valoración\r\nDTSTART;TZID=Europe/Madrid:20261109T100000\r\nDTEND;TZID=Europe/Madrid:20261109T113000\r\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261218T230000Z'),
      FROM,
    )
    expect(r.events.map((e) => [e.ics_uid, e.date, e.start_time, e.end_time, e.repeat_weekly, e.repeat_until])).toEqual([
      ['class#1', '2026-11-09', '10:00', '11:30', true, '2026-12-19'],
      ['class#3', '2026-11-11', '10:00', '11:30', true, '2026-12-19'],
    ])
  })

  it('a weekly series with COUNT ends after that many weeks', () => {
    const r = parseIcs(wrap('UID:c\r\nSUMMARY:Tutoría\r\nDTSTART:20261103T150000Z\r\nRRULE:FREQ=WEEKLY;COUNT=4'), FROM)
    expect(r.events[0]).toMatchObject({ date: '2026-11-03', repeat_weekly: true, repeat_until: '2026-11-30' })
  })

  it('simplifies other repeats to their first date and reports it', () => {
    const r = parseIcs(wrap('UID:m\r\nSUMMARY:Monthly\r\nDTSTART:20261105T090000Z\r\nRRULE:FREQ=MONTHLY'), FROM)
    expect(r.events).toHaveLength(1)
    expect(r.events[0].repeat_weekly).toBe(false)
    expect(r.notes.repeatsSimplified).toBe(1)
  })

  it('skips cancelled events, changed single dates, and anything before the "from" date', () => {
    const r = parseIcs(
      wrap(
        'UID:old\r\nSUMMARY:Old\r\nDTSTART:20250101T090000Z',
        'UID:oldseries\r\nSUMMARY:Old series\r\nDTSTART:20250105T090000Z\r\nRRULE:FREQ=WEEKLY;UNTIL=20250301T000000Z',
        'UID:cx\r\nSUMMARY:Cancelled\r\nSTATUS:CANCELLED\r\nDTSTART:20261124T090000Z',
        'UID:class\r\nRECURRENCE-ID:20261116T090000Z\r\nSUMMARY:Moved class\r\nDTSTART:20261117T090000Z',
        'UID:keep\r\nSUMMARY:Keep\r\nDTSTART:20261124T090000Z',
      ),
      FROM,
    )
    expect(r.events.map((e) => e.title)).toEqual(['Keep'])
    expect(r.notes).toMatchObject({ skippedBefore: 2, skippedCancelled: 1, skippedExceptions: 1 })
  })

  it('an older weekly series that is still running is kept', () => {
    const r = parseIcs(wrap('UID:long\r\nSUMMARY:Gym\r\nDTSTART:20260105T070000Z\r\nRRULE:FREQ=WEEKLY'), FROM)
    expect(r.events[0]).toMatchObject({ date: '2026-01-05', repeat_weekly: true, repeat_until: null })
  })
})
