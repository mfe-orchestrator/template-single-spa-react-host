// configure() must run at the very top of the entry point, synchronously, before
// anything asks for a remote. It is idempotent.
import { configure } from '@mfe-orchestrator-hub/client'

// VITE_MFE_ENVIRONMENT is optional. An unset variable arrives as undefined, one
// declared empty in .env arrives as an empty string, and neither is a usable
// environment slug: in both cases the key is left out of configure() entirely and
// the backend resolves the environment from the domain the request comes from.
const environment = import.meta.env.VITE_MFE_ENVIRONMENT?.trim()

configure({
  backendUrl: import.meta.env.VITE_MFE_BACKEND_URL,
  projectId: import.meta.env.VITE_MFE_PROJECT_ID,
  ...(environment ? { environment } : {})
})

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { start } from 'single-spa'
import { registerApplications } from './applications'
import Shell from './Shell'
import './index.css'

createRoot(document.getElementById('shell') as HTMLElement).render(
  <StrictMode>
    <Shell />
  </StrictMode>
)

registerApplications()
start()
