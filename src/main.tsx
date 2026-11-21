// Entry point: mounts the React app into <div id="root"> in index.html.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { I18nProvider } from './i18n'
import './styles.css'

// HashRouter keeps the page path after a "#" (e.g. /#/tasks). That way the app
// works on any static host, including a GitHub Pages sub-path, without a
// server that knows about our pages.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </I18nProvider>
  </StrictMode>,
)
