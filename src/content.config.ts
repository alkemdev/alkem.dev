import { defineCollection, z } from 'astro:content'
import { glob, file } from 'astro/loaders'

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.mdx', base: './src/data/posts' }),
  schema: z.object({
    title: z.string(),
    blurb: z.string(),
    dated: z.coerce.date(),
    draft: z.boolean().default(false),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
})

const projects = defineCollection({
  loader: glob({ pattern: '**/[^_]*.mdx', base: './src/data/projects' }),
  schema: z.object({
    title: z.string(),
    blurb: z.string(),
    url: z.string().optional(),
    repo: z.string().optional(),
    status: z.enum(['active', 'completed', 'planned']).default('active'),
    tags: z.array(z.string()).default([]),
    order: z.number().default(0),
  }),
})

const team = defineCollection({
  loader: file('./src/data/team.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    blurb: z.string(),
    image: z.string().optional(),
    socials: z.record(z.string()).default({}),
    order: z.number().default(0),
  }),
})

export const collections = { posts, projects, team }
