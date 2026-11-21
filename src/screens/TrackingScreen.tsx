import Placeholder from './Placeholder'
import { useI18n } from '../i18n'

export default function TrackingScreen() {
  const { t, lang } = useI18n()
  return <Placeholder title={t.nav.tracking} step={lang === 'es' ? 'el paso 8' : 'step 8'} />
}
