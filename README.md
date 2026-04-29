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
  site.ts         Site metadata, nav, copy (see `src/brand/` for palette)
  brand/          tokens.json + colors.ts (Tailwind theme is generated)
  styles/         Global CSS, fonts, generated `brand-theme.css`
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

End-to-end IaC with [OpenTofu](https://opentofu.org) and the Cloudflare
provider v5. The Pages project, custom domain binding, and DNS record
are all defined in [`infra/cloudflare/`](infra/cloudflare/) — no GitHub
Actions, no dashboard clicks (after the one-time GitHub-App OAuth).

`NODE_VERSION=22` is set as a Pages env var via Terraform; the build
runs `npm run build` and ships `dist/`. Cloudflare's built-in runner
deploys on push to `main` via the GitHub webhook configured by the
`cloudflare_pages_project.this` resource.

See [`infra/cloudflare/README.md`](infra/cloudflare/README.md) for the
full IaC layout, prerequisites, and the `tofu import` flow for adopting
an existing project.

## Branding

**Single source:** edit [`src/brand/tokens.json`](src/brand/tokens.json) (palette keys match Tailwind: `purple`, `green`, `bg`, `bg-raised`, `text`, `text-dim`, `border`).

Then run **`npm run sync:brand`** (also runs automatically before `npm run dev` / `npm run build`) to regenerate [`src/styles/brand-theme.css`](src/styles/brand-theme.css) for the Tailwind `@theme` color tokens.

- **Runtime / Three.js:** import from [`src/brand/colors.ts`](src/brand/colors.ts) (`brand`, `hexToThree`, etc.).
- **Voice & page titles:** [`src/site.ts`](src/site.ts) (`SITE.description`, `SITE.tagline`).

## Scripts

| Command                | Description                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| `npm run sync:brand`   | Regenerate `brand-theme.css` from `tokens.json` (also runs before dev/build) |
| `npm run dev`          | Start dev server with HMR                                                    |
| `npm run build`        | Type-check + production build to `dist/`                                     |
| `npm run preview`      | Preview the production build locally                                         |
| `npm run check`        | Run Astro TypeScript diagnostics                                             |
| `npm run format`       | Format all files with Prettier                                               |
| `npm run format:check` | Check formatting without writing                                             |

## License

Source code is open source. Content (blog posts, project descriptions) is
copyright Alkemical Development.
