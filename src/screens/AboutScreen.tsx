import Placeholder from './Placeholder'
import { useI18n } from '../i18n'

export default function AboutScreen() {
  const { t, lang } = useI18n()
  return <Placeholder title={t.nav.about} step={lang === 'es' ? 'el paso 10' : 'step 10'} />
}
