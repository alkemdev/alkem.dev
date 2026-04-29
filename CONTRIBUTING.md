# Contributing

## Development setup

```bash
git clone git@github.com:alkemdev/alkem.dev.git
cd alkem.dev
npm install
npm run dev
```

The dev server starts at `http://localhost:4321` with hot reload.

## Brand colors

Palette lives in `src/brand/tokens.json`. After editing it, run `npm run sync:brand` (or rely on `predev` / `prebuild`, which run it automatically) so `src/styles/brand-theme.css` stays in sync with Tailwind.

## Adding content

### Blog post

Create `src/data/posts/your-post.mdx`:

```mdx
---
title: 'Post Title'
blurb: 'A one-line summary.'
dated: 2026-04-01
tags: ['topic']
---

Post body in MDX. Supports KaTeX math (`$$...$$`) and
expressive-code blocks.
```

### Project

Create `src/data/projects/your-project.mdx`:

```mdx
---
title: 'Project Name'
blurb: 'Short description.'
status: 'active' # active | completed | planned
repo: 'https://github.com/alkemdev/repo'
tags: ['rust', 'wasm']
order: 3 # controls display order (lower = first)
---

Longer description in MDX.
```

### Team member

Add an entry to `src/data/team.json`:

```json
{
  "id": "username",
  "name": "Display Name",
  "role": "Role Title",
  "blurb": "Short bio.",
  "socials": {
    "github": "https://github.com/username",
    "website": "https://example.com"
  },
  "order": 3
}
```

## Building

```bash
npm run build      # Type-check + build to dist/
npm run preview    # Preview the built site locally
```

The build runs `astro check` (TypeScript diagnostics) before
`astro build` (static site generation).

## Deploying

Pushes to `main` auto-deploy via Cloudflare Pages. No manual steps needed.

For infrastructure changes (DNS, custom domain), see
[`infra/cloudflare/README.md`](infra/cloudflare/README.md).

## Code style

- Prettier with the config in `.prettierrc.json` (no semicolons, single quotes)
- TypeScript strict mode with `noUncheckedIndexedAccess`
- Astro components use the `interface Props` pattern
- Path aliases: `@/` = `src/`, `@components/`, `@layouts/`, `@three/`

## Project conventions

- **No unnecessary comments** — code should be self-documenting
- **Brand colors** are defined in `src/brand/tokens.json`. CSS consumers go through the generated `src/styles/brand-theme.css` (Tailwind `@theme`); JS/Three.js consumers import from `src/brand/colors.ts`. `npm run sync:brand` regenerates the CSS from the tokens.
- **Site copy** (name, tagline, page titles) lives in `src/site.ts`
- **Fonts** are self-hosted in `public/fonts/` (Ubuntu family)
- **Images** go in `public/images/`. Generated images (`og.png`, `apple-touch-icon.png`) come from scripts in `scripts/` and refresh on `prebuild`.
