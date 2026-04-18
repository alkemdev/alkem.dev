# alkem.dev

Source for [alkem.dev](https://alkem.dev) — the Alkemical Development website.

Built with [Astro](https://astro.build), [Three.js](https://threejs.org),
[Tailwind CSS](https://tailwindcss.com), and deployed to
[Cloudflare Pages](https://pages.cloudflare.com).

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321
```

## Stack

| Layer       | Tool                                 | Notes                                            |
| ----------- | ------------------------------------ | ------------------------------------------------ |
| Runtime     | Node.js 22.12+                       | Required by Astro 6                              |
| Framework   | Astro 6                              | Static output, Vite 7, Content Layer collections |
| Styling     | Tailwind CSS 4                       | CSS-only config via `@theme`                     |
| 3D          | Three.js + GLSL                      | Polyhedral flask hero with bloom post-processing |
| Content     | MDX + Astro Content Collections      | Blog posts, projects, team                       |
| Math        | KaTeX via remark-math / rehype-katex | LaTeX in MDX                                     |
| Code blocks | astro-expressive-code                | github-dark theme                                |
| Infra       | OpenTofu + Cloudflare provider v5    | DNS + custom domain                              |
| Hosting     | Cloudflare Pages                     | Auto-deploy on push to `main`                    |

## Project structure

```
src/
  components/     Astro components (Nav, Hero, Footer, cards)
  data/           Content collections (posts/, projects/, team.json)
  layouts/        Page shells (Root, Page, Post)
  pages/          File-based routing
  site.ts         Site metadata, nav links, brand colors
  styles/         Global CSS + Tailwind theme
  three/          Three.js hero scene
    geometry.ts     Flask mesh built from SVG logo coordinates
    scene.ts        Orthographic camera, bloom, animation loop
    scroll.ts       GSAP ScrollTrigger fade-out
    shaders/        GLSL vertex + fragment shaders
  types.ts        Module declarations (GLSL imports)
public/
  fonts/          Ubuntu font family (woff2)
  images/         Flask logo SVG
  favicon.svg
infra/
  cloudflare/     Terraform for DNS + custom domain binding
```

## Content

Content lives in `src/data/` as Astro Content Collections:

- **Blog posts** — `src/data/posts/*.mdx` (frontmatter: title, blurb, dated, tags)
- **Projects** — `src/data/projects/*.mdx` (frontmatter: title, blurb, status, repo, tags)
- **Team** — `src/data/team.json` (name, role, blurb, socials)

Schemas are defined in `src/content.config.ts`.

## The 3D hero

The landing page features a polyhedral flask modeled after the
[logo SVG](public/images/flask.svg). The flask profile is derived from the
SVG path coordinates and rendered as a `LatheGeometry` with flat-shaded
faces, wireframe edges, vertex dots, orbiting mini polyhedra, and particle
dust. See [`src/three/`](src/three/) for details.

Key design choices:

- **Orthographic camera** for an isometric look (no perspective distortion)
- **Flat shading** so each polygon face is distinct
- **UnrealBloomPass** for subtle glow
- **GSAP ScrollTrigger** fades the scene as the user scrolls past

## Infrastructure

The Cloudflare Pages project is created via the dashboard (required for
GitHub integration / auto-deploy). Terraform manages only:

- DNS CNAME record (`alkem.dev` → `alkem-dev.pages.dev`)
- Custom domain binding on the Pages project

See [`infra/cloudflare/README.md`](infra/cloudflare/README.md) for setup.

**Node version:** Astro 6 requires Node **22.12+**. On Cloudflare Pages, set the environment variable `NODE_VERSION` to `22` (or match `.nvmrc`) so builds use a compatible runtime.

## Branding

Brand colors are defined in two places:

| Token | Hex | Usage |
|-------|-----|-------|
| `purple` | `#9955BB` | Primary accent, links on hover, wireframe |
| `green` | `#60A879` | Secondary accent, active links, liquid fill |
| `bg` | `#0A0A0F` | Page background |
| `bg-raised` | `#13131A` | Card / raised surface background |
| `text` | `#E8E6E3` | Body text |
| `text-dim` | `#8A8A9A` | Muted text |
| `border` | `#2A2A3A` | Borders and dividers |

- CSS: `src/styles/global.css` (Tailwind `@theme` block)
- TypeScript: `src/site.ts` (`COLORS` export)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Run Astro TypeScript diagnostics |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without writing |

## License

Source code is open source. Content (blog posts, project descriptions) is
copyright Alkemical Development.
