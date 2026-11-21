// Decides what the start page shows: the setup wizard on first run (no cycles
// yet), otherwise the Home screen.
import { Navigate } from 'react-router-dom'
import { isEmpty } from '../data/repo'
import { useLiveMaybe } from '../data/useLive'
import HomeScreen from '../screens/HomeScreen'

export default function HomeGate() {
  const empty = useLiveMaybe(isEmpty, [])
  if (empty === undefined) return null // still loading (a few milliseconds)
  return empty ? <Navigate to="/setup" replace /> : <HomeScreen />
}
