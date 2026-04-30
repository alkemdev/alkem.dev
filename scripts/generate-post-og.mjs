#!/usr/bin/env node
/**
 * Generates per-post OG images at `public/og/<slug>.png`.
 *
 * Reads frontmatter from `src/data/posts/*.mdx`, skips drafts, and renders
 * each post's title onto the brand OG template — so every shared blog
 * link has a custom social preview instead of the site-wide default.
 *
 * Run via `npm run og:posts` (also runs before `build`).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const tokensPath = join(root, 'src/brand/tokens.json')
const fontsDir = join(root, 'public/fonts')
const postsDir = join(root, 'src/data/posts')
const outDir = join(root, 'public/og')

const { colors } = JSON.parse(readFileSync(tokensPath, 'utf8'))
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

const W = 1200
const H = 630

/**
 * Minimal frontmatter parser — handles `key: 'quoted'`, `key: "quoted"`,
 * and `key: bareword`. Multi-line YAML values would need a real parser,
 * but our schema is flat scalars only.
 */
function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return null
  const fm = m[1]
  const get = (key) => {
    const r = fm.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'))
    if (!r) return undefined
    return r[1].replace(/^['"]|['"]$/g, '')
  }
  return {
    title: get('title'),
    blurb: get('blurb'),
    dated: get('dated'),
    draft: get('draft') === 'true',
  }
}

/** Greedy word-wrap by character count — fine for headline-length text. */
function wrapTitle(title, maxChars) {
  const words = title.split(/\s+/)
  const lines = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function renderSvg({ title, dated }) {
  const lines = wrapTitle(title, 24)
  const fontSize = lines.length === 1 ? 110 : lines.length === 2 ? 90 : 76
  const lineHeight = 1.05
  // Hardcoded baseline for the first line — keeps the title block
  // visually centered for 1–3 line titles without computing ascent.
  const startY = lines.length === 1 ? 340 : lines.length === 2 ? 290 : 250

  const tspans = lines
    .map((line, i) => {
      const dy = i === 0 ? '0' : `${lineHeight}em`
      return `<tspan x="80" dy="${dy}">${escapeXml(line)}</tspan>`
    })
    .join('')

  // Force UTC so a bare `YYYY-MM-DD` doesn't shift a day in PT.
  const dateStr = dated
    ? new Date(dated).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="g1" cx="22%" cy="30%" r="55%">
      <stop offset="0%" stop-color="${colors.purple}" stop-opacity="0.40"/>
      <stop offset="100%" stop-color="${colors.purple}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="85%" cy="80%" r="60%">
      <stop offset="0%" stop-color="${colors.green}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="${colors.green}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${colors.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
  <rect width="${W}" height="${H}" fill="url(#g2)"/>
  <text x="80" y="100"
        font-family="Ubuntu Mono" font-weight="400" font-size="22"
        fill="${colors['text-dim']}" letter-spacing="6">
    ALKEMICAL DEVELOPMENT
  </text>
  <text font-family="Ubuntu" font-weight="700" font-size="${fontSize}"
        fill="${colors.text}" y="${startY}">
    ${tspans}
  </text>
  <text x="80" y="555"
        font-family="Ubuntu Mono" font-weight="400" font-size="22"
        fill="${colors['text-dim']}" letter-spacing="2">
    ${escapeXml(dateStr)}
  </text>
  <text x="${W - 80}" y="555" text-anchor="end"
        font-family="Ubuntu Mono" font-weight="400" font-size="22"
        fill="${colors.green}" letter-spacing="2">
    alkem.dev
  </text>
</svg>`
}

const files = readdirSync(postsDir).filter((f) => f.endsWith('.mdx') && !f.startsWith('_'))

let rendered = 0
let skipped = 0

for (const file of files) {
  const path = join(postsDir, file)
  const content = readFileSync(path, 'utf8')
  const fm = parseFrontmatter(content)
  if (!fm || !fm.title) {
    console.warn(`og:posts → skipping ${file} (no title in frontmatter)`)
    skipped++
    continue
  }
  if (fm.draft) {
    console.log(`og:posts → skipping ${file} (draft)`)
    skipped++
    continue
  }

  const slug = basename(file, extname(file))
  const svg = renderSvg(fm)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: {
      fontDirs: [fontsDir],
      loadSystemFonts: true,
      defaultFontFamily: 'Ubuntu',
    },
  })
  const out = join(outDir, `${slug}.png`)
  writeFileSync(out, resvg.render().asPng())
  console.log(`og:posts → ${out}`)
  rendered++
}

console.log(`og:posts ✓ rendered ${rendered}, skipped ${skipped}`)
