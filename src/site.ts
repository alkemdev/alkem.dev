export const SITE = {
  name: 'Alkemical Development',
  tagline: 'Open Source Software Research Lab',
  description:
    'Alkemical Development is an open source software research lab exploring the boundaries of computation.',
  url: 'https://alkem.dev',
  socials: {
    github: 'https://github.com/alkemdev',
  },
} as const

export const NAV_LINKS = [
  { label: 'Projects', href: '/projects' },
  { label: 'Team', href: '/team' },
  { label: 'Blog', href: '/blog' },
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
