#!/usr/bin/env node
/**
 * Crawls the preview server (or any URL) and validates each page's structure.
 *
 * Usage: node scripts/crawl.mjs [base-url]
 *   default base-url: http://localhost:4321
 *
 * Checks: HTTP status, landmark structure, h1 count, skip link target,
 * meta tags, link integrity (internal links resolve within the crawl set).
 */

const base = (process.argv[2] ?? 'http://localhost:4321').replace(/\/$/, '')

const SEED = [
  '/',
  '/blog',
  '/code',
  '/info',
  '/404',
  '/rss.xml',
  '/sitemap-index.xml',
  '/robots.txt',
]

/** @type {Map<string, {status: number, contentType: string, body: string, problems: string[]}>} */
const visited = new Map()
const queue = [...SEED]

function rel(url) {
  if (url.startsWith(base)) return url.slice(base.length) || '/'
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) return null
  if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) return null
  return url.split('#')[0].split('?')[0] || '/'
}

async function fetchOne(path) {
  const url = `${base}${path}`
  const res = await fetch(url, { redirect: 'manual' })
  const contentType = res.headers.get('content-type') ?? ''
  const body = res.status >= 200 && res.status < 300 ? await res.text() : ''
  return { status: res.status, contentType, body }
}

function extractLinks(html) {
  const hrefs = []
  const re = /<a\b[^>]*\bhref\s*=\s*"([^"]+)"/gi
  let m
  while ((m = re.exec(html))) hrefs.push(m[1])
  return hrefs
}

function validateHtml(path, html) {
  const problems = []
  const h1Count = (html.match(/<h1\b[^>]*>/gi) ?? []).length
  if (h1Count !== 1) problems.push(`<h1> count = ${h1Count} (expected 1)`)

  if (!/<main\b/i.test(html)) problems.push('no <main> landmark')
  if (!/<nav\b[^>]*aria-label="Primary"/i.test(html)) problems.push('no primary <nav>')
  if (!/<footer\b/i.test(html)) problems.push('no <footer>')
  if (!/href="#main-content"/i.test(html)) problems.push('no skip-link to #main-content')
  if (!/id="main-content"/i.test(html)) problems.push('no #main-content target')

  if (!/<title>[^<]+<\/title>/i.test(html)) problems.push('no <title>')
  if (!/<meta\s+name="description"/i.test(html)) problems.push('no meta description')
  if (!/<link\s+rel="canonical"/i.test(html)) problems.push('no canonical link')
  if (!/<meta\s+name="theme-color"/i.test(html)) problems.push('no theme-color meta')
  if (!/<link\s+rel="apple-touch-icon"/i.test(html)) problems.push('no apple-touch-icon')

  // Canonical and og:url must be the clean public URL (no `.html`).
  // With `build.format: 'file'`, `Astro.url.pathname` includes the .html
  // suffix during build — anything that uses it raw will leak into
  // the canonical. The `canonicalPath()` helper in src/site.ts strips it.
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]
  if (canonical?.endsWith('.html')) problems.push(`canonical leaks .html: ${canonical}`)
  const ogUrl = html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/i)?.[1]
  if (ogUrl?.endsWith('.html')) problems.push(`og:url leaks .html: ${ogUrl}`)
  if (!/<link\s+rel="preload"[^>]+ubuntu-regular\.woff2/i.test(html))
    problems.push('no Ubuntu regular font preload')
  if (!/<script[^>]+application\/ld\+json[^>]*>/i.test(html))
    problems.push('no JSON-LD structured data')

  // External CDN dependencies should be self-hosted — KaTeX moved off
  // jsdelivr in commit 21db7b2; flag any regression.
  if (/cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com/i.test(html))
    problems.push('uses external CDN (should be self-hosted)')

  // Homepage has hero canvas / fallback
  if (path === '/') {
    if (!/id="hero-canvas"/.test(html)) problems.push('homepage missing hero canvas')
    if (
      !/aria-hidden="true"[^>]*id="hero-canvas"|id="hero-canvas"[^>]*aria-hidden="true"/.test(html)
    )
      problems.push('hero canvas not aria-hidden')
  }

  // Double heading id check
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])
  const dupIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
  if (dupIds.length) problems.push(`duplicate ids: ${dupIds.join(', ')}`)

  // Background-attachment: fixed should be gone
  if (/background-attachment\s*:\s*fixed/i.test(html))
    problems.push('uses background-attachment: fixed (flicker source)')

  // Mixed min-h-screen min-h-[100dvh]
  if (/min-h-screen\s+min-h-\[100dvh\]/.test(html))
    problems.push('still has min-h-screen + min-h-[100dvh] combo')

  return problems
}

function validateXml(body, kind) {
  const problems = []
  if (!body.trim().startsWith('<?xml')) problems.push('not XML')
  if (kind === 'rss' && !/<rss\b/.test(body)) problems.push('no <rss> root')
  if (kind === 'sitemap' && !/<sitemapindex\b|<urlset\b/.test(body))
    problems.push('no sitemap root')
  return problems
}

while (queue.length) {
  const path = queue.shift()
  if (visited.has(path)) continue

  let entry
  try {
    const { status, contentType, body } = await fetchOne(path)
    entry = { status, contentType, body, problems: [] }
  } catch (e) {
    entry = { status: 0, contentType: '', body: '', problems: [`fetch failed: ${e.message}`] }
    visited.set(path, entry)
    continue
  }

  if (entry.status !== 200) entry.problems.push(`HTTP ${entry.status}`)

  if (entry.contentType.includes('text/html')) {
    entry.problems.push(...validateHtml(path, entry.body))
    for (const href of extractLinks(entry.body)) {
      const r = rel(href)
      if (
        r &&
        !visited.has(r) &&
        !queue.includes(r) &&
        !r.startsWith('/fonts/') &&
        !r.endsWith('.pdf')
      ) {
        queue.push(r)
      }
    }
  } else if (entry.contentType.includes('xml') || path.endsWith('.xml')) {
    const kind = path.includes('sitemap') ? 'sitemap' : path.includes('rss') ? 'rss' : 'xml'
    entry.problems.push(...validateXml(entry.body, kind))
  }

  visited.set(path, entry)
}

// Report
let anyProblems = false
const rows = [...visited.entries()].sort(([a], [b]) => a.localeCompare(b))
console.log(`\nCrawled ${rows.length} paths from ${base}\n`)
console.log('status  path'.padEnd(50) + 'issues')
console.log('─'.repeat(80))
for (const [path, entry] of rows) {
  const statusStr = String(entry.status).padStart(3, ' ')
  const issues = entry.problems.length ? entry.problems.join('; ') : 'ok'
  if (entry.problems.length) anyProblems = true
  console.log(`  ${statusStr}   ${path.padEnd(40)}${issues}`)
}

if (anyProblems) {
  console.log('\n✗ issues found')
  process.exit(1)
} else {
  console.log('\n✓ all pages clean')
}
