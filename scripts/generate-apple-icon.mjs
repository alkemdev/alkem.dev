#!/usr/bin/env node
/**
 * Generates `public/apple-touch-icon.png` (180x180) from brand tokens.
 * Re-run via `npm run icons:generate`; runs automatically before `build`.
 *
 * The flask SVG ships with black strokes (great on a white favicon, invisible
 * on dark). For the iOS home-screen icon we recolor strokes to the text color
 * so the silhouette reads clearly on the dark brand background.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const tokensPath = join(root, 'src/brand/tokens.json')
const flaskPath = join(root, 'public/images/flask.svg')
const outPath = join(root, 'public/apple-touch-icon.png')

const { colors } = JSON.parse(readFileSync(tokensPath, 'utf8'))

const flaskRaw = readFileSync(flaskPath, 'utf8')
// Pull the inner content out of the source <svg> (its own viewBox stays usable).
const flaskInner = flaskRaw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
// Recolor strokes for visibility on the dark plate.
const flaskRecolored = flaskInner.replaceAll('stroke="#000000"', `stroke="${colors.text}"`)

const SIZE = 180

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <radialGradient id="bg" cx="30%" cy="20%" r="80%">
      <stop offset="0%" stop-color="${colors.purple}" stop-opacity="0.45"/>
      <stop offset="60%" stop-color="${colors.purple}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${colors.green}" stop-opacity="0.10"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" rx="40" fill="${colors.bg}"/>
  <rect width="${SIZE}" height="${SIZE}" rx="40" fill="url(#bg)"/>
  <g transform="translate(28 28) scale(7.75)">
    <svg viewBox="0 0 16 16" width="16" height="16" overflow="visible">${flaskRecolored}</svg>
  </g>
</svg>`

const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: SIZE } })
writeFileSync(outPath, resvg.render().asPng())
console.log('icons:generate →', outPath)
