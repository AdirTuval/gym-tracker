import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/rubik'
import './styles/app.css'
import { requestPersistentStorage } from './db/db'
import { Navigator } from './nav/Navigator'
import { Analytics } from './screens/Analytics'
import { Exercise } from './screens/Exercise'
import { Home } from './screens/Home'
import { Settings } from './screens/Settings'
import { Summary } from './screens/Summary'
import { Workout } from './screens/Workout'
import { SheetProvider } from './ui/Sheet'
import { ToastProvider } from './ui/Toast'

registerSW({ immediate: true })
requestPersistentStorage()

const screens = { home: Home, workout: Workout, exercise: Exercise, summary: Summary, settings: Settings, analytics: Analytics }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <SheetProvider>
        <Navigator screens={screens} initial="home" />
      </SheetProvider>
    </ToastProvider>
  </StrictMode>,
)
