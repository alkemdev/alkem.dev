// Tagline options (not open-source–centric). Pick one for SITE.tagline:
// - 'Research Laboratory'
// - 'Software Research Laboratory'
// - 'Software Research Lab'
// - 'Exploring the Boundaries of Computation'
// - 'Where Ideas Take Shape'
// - 'Research · Build · Ship'
// - 'Computation, Curated'
export const SITE = {
  name: 'Alkemical Development',
  tagline: 'Research Laboratory',
  description:
    'Alkemical Development is a research laboratory exploring the boundaries of computation.',
  url: 'https://alkem.dev',
  socials: {
    github: 'https://github.com/alkemdev',
  },
} as const

export const NAV_LINKS = [
  { label: 'Blog', href: '/blog' },
  { label: 'Info', href: '/info' },
  { label: 'Code', href: '/code' },
] as const

export const COLORS = {
  purple: '#9955BB',
  green: '#60A879',
  bg: '#0a0a0f',
  bgRaised: '#13131a',
  text: '#e8e6e3',
  textDim: '#8a8a9a',
  border: '#2a2a3a',
} as const
