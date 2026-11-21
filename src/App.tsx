// App layout: top navigation bar + the current screen.
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import HomeScreen from './screens/HomeScreen'
import TasksScreen from './screens/TasksScreen'
import GoalsScreen from './screens/GoalsScreen'
import TrackingScreen from './screens/TrackingScreen'
import DataScreen from './screens/DataScreen'
import AboutScreen from './screens/AboutScreen'
import SetupScreen from './screens/SetupScreen'
import StorageStatus from './components/StorageStatus'

// The pages shown in the navigation bar, in order.
const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/goals', label: 'Goals' },
  { to: '/tracking', label: 'Tracking' },
  { to: '/data', label: 'Data' },
  { to: '/about', label: 'About' },
]

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">12 Week Tracker</span>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/tasks" element={<TasksScreen />} />
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
  )
}
