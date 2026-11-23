// About / How to use: the method, the daily and weekly routine, how the
// numbers are calculated, and how your data is kept. Texts live in i18n.
import { version } from '../../package.json'
import { useI18n } from '../i18n'

const SOURCE_URL = 'https://github.com/alvarovillarrojo-ui/Productivity-app'

export default function AboutScreen() {
  const { t } = useI18n()
  const a = t.about
  return (
    <section className="stack about">
      <h1>{a.title}</h1>
      <p className="lead">{a.intro}</p>
      {a.sections.map((s) => (
        <div key={s.title} className="card">
          <h2>{s.title}</h2>
          <ul>
            {s.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      <p className="muted small-text">
        {t.appName} · {a.version(version)} · {a.license}{' '}
        <a href={SOURCE_URL} target="_blank" rel="noreferrer">
          {a.source}
        </a>
      </p>
    </section>
  )
}
