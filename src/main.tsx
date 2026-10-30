import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/rubik'
import './styles/app.css'
import { requestPersistentStorage } from './db/db'
import { Navigator } from './nav/Navigator'
import { Analytics } from './screens/Analytics'
import { Home } from './screens/Home'
import { ToastProvider } from './ui/Toast'

registerSW({ immediate: true })
requestPersistentStorage()

const screens = { home: Home, analytics: Analytics }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <Navigator screens={screens} initial="home" />
    </ToastProvider>
  </StrictMode>,
)
