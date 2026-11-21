import Placeholder from './Placeholder'
import { useI18n } from '../i18n'

export default function HomeScreen() {
  const { t, lang } = useI18n()
  return <Placeholder title={t.nav.home} step={lang === 'es' ? 'el paso 7' : 'step 7'} />
}
