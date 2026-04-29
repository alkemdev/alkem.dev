import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import expressiveCode from 'astro-expressive-code'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { SITE } from './src/site'

export default defineConfig({
  // Single source of truth for the canonical URL — `SITE.url` flows
  // through here, into `<link rel="canonical">`, RSS, and the sitemap.
  site: SITE.url,
  trailingSlash: 'never',
  // `build.format: 'file'` emits `/blog.html` (not `/blog/index.html`),
  // so `/blog` resolves directly with no 308 redirect to `/blog/`.
  // This makes Cloudflare's response match Astro's `trailingSlash: 'never'`
  // canonical, instead of the previous /blog → /blog/ chain.
  build: { format: 'file' },
  integrations: [expressiveCode({ themes: ['github-dark'] }), mdx(), sitemap()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    plugins: [tailwindcss()],
    assetsInclude: ['**/*.glsl'],
  },
})
