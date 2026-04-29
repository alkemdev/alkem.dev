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
  { label: 'Code', href: '/code' },
  { label: 'Blog', href: '/blog' },
  { label: 'Team', href: '/info' },
] as const
