// Small footer line: reminds that data stays on this device and shows
// whether the browser granted "persistent storage".
import { useEffect } from 'react'
import { getSetting, requestPersistentStorage } from '../data/repo'
import { useLiveMaybe } from '../data/useLive'

const LABELS = {
  granted: { text: 'Storage: persistent ✓', className: 'ok' },
  'not-granted': {
    text: 'Storage: not persistent. The browser may clear data when disk is low, so back up regularly.',
    className: 'warn',
  },
  unsupported: {
    text: 'Storage: this browser cannot guarantee persistence, so back up regularly.',
    className: 'warn',
  },
} as const

export default function StorageStatus() {
  // Ask once when the app opens (the browser remembers the answer).
  useEffect(() => {
    requestPersistentStorage().catch(() => {})
  }, [])

  const status = useLiveMaybe(() => getSetting('storagePersisted'), [])
  const label = status ? LABELS[status] : null

  return (
    <footer className="storage-status">
      <span>Your data stays on this device. Nothing is sent anywhere.</span>
      {label && <span className={label.className}>{label.text}</span>}
    </footer>
  )
}
