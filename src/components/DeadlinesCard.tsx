// "Upcoming deadlines (3 weeks)": deadlines and subject exams with days left.
// Used on Home and in Day → Opening.
import { useI18n } from '../i18n'
import { deadlinesRadar } from '../logic/day'
import { todayISO } from '../logic/weeks'
import { useCalendarEvents } from './useCalendarEvents'

export default function DeadlinesCard({ max }: { max?: number }) {
  const { t, date } = useI18n()
  const d = t.day
  const { events } = useCalendarEvents()
  const all = deadlinesRadar(events, todayISO())
  const radar = max ? all.slice(0, max) : all
  return (
    <div className="card stack">
      <h2>📅 {d.deadlinesTitle}</h2>
      {radar.length === 0 ? (
        <p className="muted">{d.noDeadlines}</p>
      ) : (
        <ul className="radar">
          {radar.map((x) => (
            <li key={x.event.id} className={x.daysLeft <= 3 ? 'urgent' : x.daysLeft <= 7 ? 'soon' : undefined}>
              <span className="radar-days">{x.daysLeft === 0 ? d.today : x.daysLeft === 1 ? d.tomorrow : d.inDays(x.daysLeft)}</span>
              <span>
                {x.event.title}
                <span className="muted small-text">
                  {' '}
                  · {date(x.date)}
                  {x.event.start_time ? ` ${x.event.start_time}` : ''}
                </span>
              </span>
            </li>
          ))}
          {max && all.length > max && <li className="muted small-text">{t.calendar.more(all.length - max)}</li>}
        </ul>
      )}
    </div>
  )
}
