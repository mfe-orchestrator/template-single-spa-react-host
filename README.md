# single-spa & React: root config template

Starter template for the [MFE Orchestrator](https://github.com/mfe-orchestrator): a
[single-spa](https://single-spa.js.org) **root config** built with Vite and React 19. It registers
single-spa applications, gets their URLs from the orchestrator through
[`@mfe-orchestrator-hub/client`](https://www.npmjs.com/package/@mfe-orchestrator-hub/client), and
shares its React with them through an import map.

It pairs with
[template-single-spa-react-remote](https://github.com/mfe-orchestrator/template-single-spa-react-remote),
which is registered here as `example-remote`.

## Requirements

- Node.js 24 (LTS)
- [pnpm](https://pnpm.io) 12 (pinned through `packageManager`; `corepack enable` picks it up)

> [!NOTE]
> The client SDK is required at `^0.3.0`. A caret on a `0.x` version is deliberately narrow. It
> accepts `0.3.x` only, **not** `0.4.0`, so widen it yourself when the SDK moves on.

## Getting started

```bash
cp .env.example .env    # fill in the backend URL and the project id
pnpm install
pnpm dev                # http://localhost:5173
pnpm typecheck
pnpm build              # production build into dist/
pnpm preview            # serves dist/
```

Routes:

| route | what is mounted |
| --- | --- |
| `/` | nothing. The root config's own home text. Navigating here unmounts `example-remote` |
| `/example` | `example-remote` |

## Project structure

```
.
├── Dockerfile            # nginx, non-root, port 8080
├── nginx/default.conf
├── index.html            # #shell (root config UI), #applications (mount point)
├── src/
│   ├── main.tsx          # configure(), then the shell, registerApplications(), start()
│   ├── applications.ts   # one registerApplication() per microfrontend
│   ├── Shell.tsx         # navigation + home page (React)
│   └── index.css
├── .env.example
├── package.json
└── vite.config.ts        # the shared import map
```

## How the orchestrator is wired in

**The root config never decides which version of an application it gets.** It passes over the
identities it holds and uses the URL it receives, verbatim. The backend decides which version that
URL points at, whether stable or canary.

**1. `configure()`, at the very top of `src/main.tsx`, synchronously, before anything asks for an
application:**

```ts
import { configure } from '@mfe-orchestrator-hub/client'

const environment = import.meta.env.VITE_MFE_ENVIRONMENT?.trim()

configure({
  backendUrl: import.meta.env.VITE_MFE_BACKEND_URL,
  projectId: import.meta.env.VITE_MFE_PROJECT_ID,
  ...(environment ? { environment } : {})
})
```

`environment` is optional. When it is absent, the backend resolves the environment from the domain
the page is served from. The spread drops the key when the variable is unset or empty, instead of
sending an empty slug.

**2. Each application's loading function resolves its URL with `remoteUrl()` (`src/applications.ts`):**

```ts
import { remoteUrl } from '@mfe-orchestrator-hub/client'
import { registerApplication } from 'single-spa'

registerApplication({
  name: 'example-remote',
  app: async () => {
    const url = await remoteUrl('example-remote')
    return import(/* @vite-ignore */ url)
  },
  activeWhen: '/example',
  customProps: { domElementGetter }
})
```

`remoteUrl(slug)` takes the **slug** of the microfrontend in the orchestrator and returns the URL of
its entry module, already pinned to a version. The application is a native ES module, so a plain
`import()` loads it. `/* @vite-ignore */` tells Vite the URL is only known at runtime. The URL is
resolved first and imported on the next line, not with `import(await remoteUrl(...))`, because Vite
wraps every dynamic import in a non-async preload callback and an `await` inside it breaks the
build.

single-spa calls `app` the first time `activeWhen` matches, then mounts and unmounts the
application as the route changes. `domElementGetter` points every application at
`<main id="applications">`.

## Shared React: the import map

Applications keep `react`, `react-dom`, `react-dom/client` and `react/jsx-runtime` as bare imports
(see the remote template's externals). This root config provides them through an import map that
`vite.config.ts` injects into `index.html`:

```html
<script type="importmap">
{ "imports": {
    "react": "/assets/shared-react-<hash>.js",
    "react-dom": "/assets/shared-react-dom-<hash>.js",
    "react-dom/client": "/assets/shared-react-dom-client-<hash>.js",
    "react/jsx-runtime": "/assets/shared-react-jsx-runtime-<hash>.js"
} }
</script>
```

Each of those files is a generated ES module that re-exports the package name by name. React is
CommonJS, and a browser can only import named exports that an ES module declares statically. The
export list is read from the installed package at build time, so it follows React upgrades without
changes. The files are extra entries of the same Vite build as the root config, so they and the
root config's own code share one React chunk. The whole page runs **one React**: the root config's
shell and every application render through the same `react` and `react-dom`. In `pnpm dev` the
same map points at the Vite dev server.

To share another package, add it to `shared` in `vite.config.ts` and mark it external in the
applications.

The map uses absolute paths (`/assets/...`), so the root config must be served from the root of its
domain. Set Vite's `base` if it is not; the map follows `base`.

## How to add an application

1. Publish it to the orchestrator. Its build must be an ES module exporting single-spa lifecycles,
   with React external (start from template-single-spa-react-remote).
2. Add a `registerApplication()` to `src/applications.ts` with its slug in `remoteUrl('<slug>')`
   and an `activeWhen` route.
3. Add a link to `src/Shell.tsx` if it needs one. Use `navigateToUrl` (as `Shell` does) so single-spa
   handles the navigation.

Never write an application URL in this repo. `remoteUrl()` is the only source.

## Environment variables

Copy `.env.example` to `.env`. Vite injects these at build time.

| variable | required | what it is |
| --- | --- | --- |
| `VITE_MFE_BACKEND_URL` | yes | orchestrator backend, including the `/api` suffix |
| `VITE_MFE_PROJECT_ID` | yes | id of your project in the orchestrator |
| `VITE_MFE_ENVIRONMENT` | no | environment slug, ex. `DEV`. If omitted or empty, the backend resolves it from the domain |

`.env` is gitignored. Never commit real values.

## Deploying

```bash
pnpm build
docker build -t my-root-config .
docker run -p 8080:8080 my-root-config
```

The image is `nginx:stable-alpine` running as the unprivileged `nginx` user on port **8080**.
`nginx/default.conf` serves `index.html` for every unknown path, because single-spa routes live in
the browser. `index.html` carries the import map and the hashed names of everything else, so it is
never cached. The hashed files under `assets/` are cached for a year.

## License

MIT
