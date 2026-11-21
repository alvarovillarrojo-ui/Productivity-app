// Small footer line: reminds that data stays on this device and shows
// whether the browser granted "persistent storage".
import { useEffect } from 'react'
import { getSetting, requestPersistentStorage } from '../data/repo'
import { useLiveMaybe } from '../data/useLive'
import { useI18n } from '../i18n'

export default function StorageStatus() {
  const { t } = useI18n()

  // Ask once when the app opens (the browser remembers the answer).
  useEffect(() => {
    requestPersistentStorage().catch(() => {})
  }, [])

  const status = useLiveMaybe(() => getSetting('storagePersisted'), [])
  const label =
    status === 'granted'
      ? { text: t.storage.granted, className: 'ok' }
      : status === 'not-granted'
        ? { text: t.storage.notGranted, className: 'warn' }
        : status === 'unsupported'
          ? { text: t.storage.unsupported, className: 'warn' }
          : null

  return (
    <footer className="storage-status">
      <span>{t.storage.local}</span>
      {label && <span className={label.className}>{label.text}</span>}
    </footer>
  )
}
