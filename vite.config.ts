import { createRequire } from 'node:module'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The packages this root config shares with its applications. Each one becomes an
// entry of the import map in index.html, so an application that keeps
// `import ... from 'react'` as a bare import (see the externals of the remote
// template) gets this root config's copy instead of shipping its own.
const shared = ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime']

const VIRTUAL_PREFIX = 'virtual:shared/'
const require = createRequire(import.meta.url)

// React is published as CommonJS, and a browser can only import named exports
// that an ES module declares statically. So every shared package gets a small
// generated ES module that re-exports it name by name; its export list is read
// off the installed package, so it follows React upgrades by itself.
//
// In the build those modules are extra entries of the same bundle as the root
// config, so they and the root config's own code point at one React chunk: one
// React instance for the whole page. In dev they are served by the Vite server.
function sharedImportMap(): Plugin {
  const exportNames = (specifier: string) =>
    Object.keys(require(specifier)).filter(
      (key) => key !== 'default' && /^[A-Za-z_$][\w$]*$/.test(key)
    )

  let base = '/'

  return {
    name: 'shared-import-map',
    configResolved: (config) => {
      base = config.base
    },
    config: () => ({
      build: {
        rolldownOptions: {
          input: {
            index: 'index.html',
            ...Object.fromEntries(
              shared.map((specifier) => [
                `shared-${specifier.replace(/\W/g, '-')}`,
                VIRTUAL_PREFIX + specifier
              ])
            )
          },
          // Keep the exports of the shared entries: nothing in this bundle imports
          // them, they exist for the applications.
          preserveEntrySignatures: 'strict'
        }
      }
    }),
    resolveId: (id) => (id.startsWith(VIRTUAL_PREFIX) ? '\0' + id : undefined),
    load(id) {
      if (!id.startsWith('\0' + VIRTUAL_PREFIX)) return
      const specifier = id.slice(VIRTUAL_PREFIX.length + 1)
      const names = exportNames(specifier)
      return [
        `import m from ${JSON.stringify(specifier)}`,
        'export default m',
        `export const { ${names.join(', ')} } = m`
      ].join('\n')
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const imports: Record<string, string> = {}
        for (const specifier of shared) {
          const id = VIRTUAL_PREFIX + specifier
          if (ctx.bundle) {
            const chunk = Object.values(ctx.bundle).find(
              (c) => c.type === 'chunk' && c.isEntry && c.facadeModuleId === '\0' + id
            )
            if (!chunk) throw new Error(`shared-import-map: no chunk for ${specifier}`)
            imports[specifier] = base + chunk.fileName
          } else {
            imports[specifier] = base + '@id/__x00__' + id
          }
        }
        return [
          {
            tag: 'script',
            attrs: { type: 'importmap' },
            children: JSON.stringify({ imports }, null, 2),
            injectTo: 'head-prepend'
          }
        ]
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), sharedImportMap()],
  build: {
    target: 'esnext'
  }
})
