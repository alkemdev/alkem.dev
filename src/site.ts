export const SITE = {
  name: 'Alkemical Development',
  tagline: 'Research Laboratory',
  description:
    'Alkemical Development is a research laboratory exploring the boundaries of computation.',
  url: 'https://alkem.dev',
  socials: {
    github: 'https://github.com/alkemdev',
  },
  wordmark: [
    { text: 'Alkemical', accent: 'green' },
    { text: 'Development', accent: 'purple' },
  ] as const,
  pages: {
    blog: {
      title: 'Blog',
      description: 'Technical writing from Alkemical Development.',
    },
    code: {
      title: 'Code',
      description: 'Open source projects from Alkemical Development.',
    },
    info: {
      title: 'Team',
      description: 'The people behind Alkemical Development.',
    },
  },
} as const

export const NAV_LINKS = [
  { label: 'Blog', href: '/blog' },
  { label: 'Code', href: '/code' },
  { label: 'Team', href: '/info' },
] as const

/**
 * With `build.format: 'file'`, `Astro.url.pathname` reflects the on-disk
 * file path during the static build (e.g. `/blog.html`, `/index.html`).
 * Canonical URLs, og:url, and JSON-LD all want the clean public URL
 * — strip the `.html` suffix and collapse `/index` to `/`.
 */
export function canonicalPath(pathname: string): string {
  const stripped = pathname.replace(/\.html$/, '').replace(/^\/index$/, '/')
  return stripped || '/'
}
