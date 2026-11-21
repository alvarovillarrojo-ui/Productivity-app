import Placeholder from './Placeholder'
import { useI18n } from '../i18n'

export default function DataScreen() {
  const { t, lang } = useI18n()
  return <Placeholder title={t.nav.data} step={lang === 'es' ? 'el paso 9' : 'step 9'} />
}
