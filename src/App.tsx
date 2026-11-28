// App layout.
//   Computer: a sidebar on the left (all sections) + the current screen.
//   Phone: a top bar + a bottom bar with the main sections and "More".
import { useEffect, useState } from 'react'
import * as repo from './data/repo'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  Database,
  FolderKanban,
  GraduationCap,
  HelpCircle,
  Home,
  MoreHorizontal,
  Sun,
  Target,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import TasksScreen from './screens/TasksScreen'
import DayScreen from './screens/DayScreen'
import CalendarScreen from './screens/CalendarScreen'
import FocusScreen from './screens/FocusScreen'
import StudentsScreen from './screens/StudentsScreen'
import ProjectsScreen from './screens/ProjectsScreen'
import FocusRunner, { FocusBadge } from './components/FocusRunner'
import GoalsScreen from './screens/GoalsScreen'
import TrackingScreen from './screens/TrackingScreen'
import DataScreen from './screens/DataScreen'
import AboutScreen from './screens/AboutScreen'
import SetupScreen from './screens/SetupScreen'
import HomeGate from './components/HomeGate'
import StorageStatus from './components/StorageStatus'
import AutoRecurring from './components/AutoRecurring'
import { LANGUAGES, useI18n, type Lang } from './i18n'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Shown in the phone's bottom bar (the rest go under "More"). */
  main?: boolean
}

export default function App() {
  const { t } = useI18n()
  // The fixed colour areas (Uni, Day to day, Travel, Exams, Deadlines) always exist.
  useEffect(() => {
    void repo.ensureFixedAreas(t.calendar.areaNames)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()

  // All sections, in order.
  const nav: NavItem[] = [
    { to: '/', label: t.nav.home, icon: Home, main: true },
    { to: '/day', label: t.nav.day, icon: Sun, main: true },
    { to: '/tasks', label: t.nav.tasks, icon: CheckSquare, main: true },
    { to: '/calendar', label: t.nav.calendar, icon: CalendarDays, main: true },
    { to: '/students', label: t.nav.students, icon: GraduationCap, main: true },
    { to: '/projects', label: t.nav.projects, icon: FolderKanban },
    { to: '/focus', label: t.nav.focus, icon: Timer },
    { to: '/goals', label: t.nav.goals, icon: Target },
    { to: '/tracking', label: t.nav.tracking, icon: BarChart3 },
    { to: '/data', label: t.nav.data, icon: Database },
    { to: '/about', label: t.nav.about, icon: HelpCircle },
  ]
  const more = nav.filter((n) => !n.main)
  const moreActive = more.some((n) => pathname.startsWith(n.to))

  const link = (n: NavItem, onClick?: () => void) => (
    <NavLink key={n.to} to={n.to} end={n.to === '/'} className="nav-link" onClick={onClick}>
      <n.icon aria-hidden /> {n.label}
    </NavLink>
  )

  return (
    <div className="app">
      {/* computer */}
      <aside className="sidebar">
        <Brand />
        <nav className="stack-tight">{nav.map((n) => link(n))}</nav>
        <div className="sidebar-bottom">
          <FocusBadge />
          <LanguageSelect />
        </div>
      </aside>

      <div className="main">
        {/* phone */}
        <header className="mobile-top">
          <Brand />
          <div className="row">
            <FocusBadge />
            <LanguageSelect />
          </div>
        </header>

        <main className="content">
          <Routes>
            <Route path="/" element={<HomeGate />} />
            <Route path="/day" element={<DayScreen />} />
            <Route path="/tasks" element={<TasksScreen />} />
            <Route path="/calendar" element={<CalendarScreen />} />
            <Route path="/focus" element={<FocusScreen />} />
            <Route path="/students" element={<StudentsScreen />} />
            <Route path="/students/:id" element={<StudentsScreen />} />
            <Route path="/projects" element={<ProjectsScreen />} />
            <Route path="/projects/:id" element={<ProjectsScreen />} />
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
      </div>

      {/* phone: bottom bar + "More" sheet */}
      <nav className="bottombar" aria-label={t.nav.more}>
        {nav
          .filter((n) => n.main)
          .map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setMoreOpen(false)}>
              <n.icon aria-hidden />
              {n.label}
            </NavLink>
          ))}
        <button className={moreActive || moreOpen ? 'active' : undefined} aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}>
          <MoreHorizontal aria-hidden />
          {t.nav.more}
        </button>
      </nav>
      {moreOpen && (
        <>
          <div className="more-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="more-sheet">{more.map((n) => link(n, () => setMoreOpen(false)))}</div>
        </>
      )}

      <FocusRunner />
      <AutoRecurring />
    </div>
  )
}

function Brand() {
  const { t } = useI18n()
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden>
        12
      </span>
      {t.appName}
    </span>
  )
}

function LanguageSelect() {
  const { t, lang, setLang } = useI18n()
  return (
    <select className="lang-select" aria-label={t.language} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  )
}

