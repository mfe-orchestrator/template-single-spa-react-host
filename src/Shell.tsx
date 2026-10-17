import { useEffect, useState, type MouseEvent } from 'react'
import { navigateToUrl } from 'single-spa'

const links = [
  { href: '/', label: 'Home' },
  { href: '/example', label: 'Example remote' }
]

const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault()
  navigateToUrl(event.currentTarget.href)
}

// The part of the page the root config owns: navigation, plus the home page
// shown on routes where no application is active.
export default function Shell() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onRoute = () => setPath(window.location.pathname)
    window.addEventListener('single-spa:routing-event', onRoute)
    return () => window.removeEventListener('single-spa:routing-event', onRoute)
  }, [])

  return (
    <>
      <nav>
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={navigate}
            aria-current={path === link.href ? 'page' : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>
      {path === '/' && (
        <p className="home">
          No application is active on this route. Open <em>Example remote</em> to
          mount it, then come back here to unmount it.
        </p>
      )}
    </>
  )
}
