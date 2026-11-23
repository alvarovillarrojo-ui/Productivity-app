// App layout: top navigation bar + the current screen.
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import TasksScreen from './screens/TasksScreen'
import CalendarScreen from './screens/CalendarScreen'
import GoalsScreen from './screens/GoalsScreen'
import TrackingScreen from './screens/TrackingScreen'
import DataScreen from './screens/DataScreen'
import AboutScreen from './screens/AboutScreen'
import SetupScreen from './screens/SetupScreen'
import HomeGate from './components/HomeGate'
import StorageStatus from './components/StorageStatus'
import AutoRecurring from './components/AutoRecurring'
import { LANGUAGES, useI18n, type Lang } from './i18n'

export default function App() {
  const { t, lang, setLang } = useI18n()

  // The pages shown in the navigation bar, in order.
  const navItems = [
    { to: '/', label: t.nav.home },
    { to: '/tasks', label: t.nav.tasks },
    { to: '/calendar', label: t.nav.calendar },
    { to: '/goals', label: t.nav.goals },
    { to: '/tracking', label: t.nav.tracking },
    { to: '/data', label: t.nav.data },
    { to: '/about', label: t.nav.about },
  ]

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">{t.appName}</span>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <select
          className="lang-select"
          aria-label={t.language}
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<HomeGate />} />
          <Route path="/tasks" element={<TasksScreen />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/goals" element={<GoalsScreen />} />
          <Route path="/tracking" element={<TrackingScreen />} />
          <Route path="/data" element={<DataScreen />} />
          <Route path="/about" element={<AboutScreen />} />
          <Route path="/setup" element={<SetupScreen />} />
          {/* Any unknown address goes back to Home. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <StorageStatus />
      <AutoRecurring />
    </div>
  )
}
