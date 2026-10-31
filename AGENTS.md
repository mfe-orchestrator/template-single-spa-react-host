# AGENTS.md

A single-spa root config (Vite and React 19) for the MFE Orchestrator. It registers single-spa
applications whose URLs come from `@mfe-orchestrator-hub/client`, and it shares React with them
through an import map.

## Commands

- `pnpm install`: pnpm 12, pinned in `packageManager`. Node 24.
- `pnpm typecheck`: `tsc -b`.
- `pnpm build`: typecheck, then `vite build` into `dist/`.
- `pnpm dev` / `pnpm preview`.
- `docker build .`: nginx, non-root, port 8080. Needs `dist/` built first.

There is no linter and no test suite. `pnpm build` is the check. It needs `VITE_MFE_BACKEND_URL` and
`VITE_MFE_PROJECT_ID` (`.env`, see `.env.example`) for a page that works.

## Invariants: do not break these

- **`configure()` runs first.** It is the first statement of `src/main.tsx`, synchronous, before
  `registerApplications()` and `start()`.
- `window.appInsights` is a contract with the applications: `src/telemetry.ts` sets it only when the
  environment's global variables carry `APPLICATIONINSIGHTS_CONNECTION_STRING`. Keep the SDK behind
  its dynamic `import()`: a static import puts it in every bundle, used or not.
- **Application URLs come only from `remoteUrl('<slug>')`.** Never hardcode a URL, never parse or
  rewrite the one returned, and never strip its version segment. Resolve it first, then
  `import(/* @vite-ignore */ url)` on its own line: Vite's preload wrapper breaks
  `import(await ...)`.
- **One React.** `vite.config.ts` (`sharedImportMap`) generates ES module re-exports of `react`,
  `react-dom`, `react-dom/client` and `react/jsx-runtime` as extra entries of the same build, and
  injects their hashed URLs as an import map at the top of `<head>`. Do not move them to a separate
  build or a CDN, because that loads a second React. Applications keep these packages external. A
  package added to `shared` must be external in the applications too.
- The import map must come before any module script. It is injected with `head-prepend`.
- `index.html` must never be cached (`nginx/default.conf`), because it holds the hashed names.
- The Docker image runs as `nginx` on port 8080. Keep it unprivileged.
- Never commit `.env` or real backend URLs or project ids. The template keeps generic defaults in
  `.env.example`.

## Layout

- `src/main.tsx`: configure, render `Shell`, register, start.
- `src/telemetry.ts`: Application Insights, started from `src/main.tsx` when the environment asks.
- `src/applications.ts`: `registerApplication()` calls. The example is `example-remote` on
  `/example`, and `/` mounts nothing, so navigating there unmounts it.
- `src/Shell.tsx`: navigation (with `navigateToUrl`) and the home page.
- `vite.config.ts`: the shared import map plugin.
