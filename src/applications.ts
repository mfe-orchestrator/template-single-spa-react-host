import { remoteUrl } from '@mfe-orchestrator-hub/client'
import { registerApplication } from 'single-spa'

const domElementGetter = () => document.getElementById('applications') as HTMLElement

// One registerApplication() per microfrontend this root config mounts.
//
// The string passed to remoteUrl() is the *slug* of the microfrontend in the
// orchestrator. remoteUrl() resolves it to the URL of the application's entry
// module, already pinned to the version (stable or canary) the backend picked for
// this page. Use it verbatim and never write a URL here.
//
// The entry is a native ES module: its bare imports of react / react-dom resolve
// through the import map of index.html, to this root config's React.
export function registerApplications() {
  registerApplication({
    name: 'example-remote',
    app: async () => {
      // Resolve the URL first, then import it. Inlining the await inside import()
      // breaks the build: Vite wraps every dynamic import in a non-async preload
      // callback.
      const url = await remoteUrl('example-remote')
      return import(/* @vite-ignore */ url)
    },
    activeWhen: '/example',
    customProps: { domElementGetter }
  })
}
