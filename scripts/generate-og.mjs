#!/usr/bin/env node
/**
 * Generates `public/og.png` (1200x630) from brand tokens.
 * Stays in sync with the palette — re-run via `npm run og:generate`,
 * also runs before `build` so deploys ship a current image.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const tokensPath = join(root, 'src/brand/tokens.json')
const fontsDir = join(root, 'public/fonts')
const outPath = join(root, 'public/og.png')

const { colors } = JSON.parse(readFileSync(tokensPath, 'utf8'))

const W = 1200
const H = 630

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
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
  <text x="${W / 2}" y="265" text-anchor="middle"
        font-family="Ubuntu" font-weight="700" font-size="132"
        fill="${colors.green}">Alkemical</text>
  <text x="${W / 2}" y="395" text-anchor="middle"
        font-family="Ubuntu" font-weight="700" font-size="132"
        fill="${colors.purple}">Development</text>
  <text x="${W / 2}" y="465" text-anchor="middle"
        font-family="Ubuntu" font-weight="400" font-size="34"
        fill="${colors.green}" opacity="0.9" letter-spacing="3">
    RESEARCH LABORATORY
  </text>
  <text x="${W / 2}" y="565" text-anchor="middle"
        font-family="Ubuntu Mono" font-weight="400" font-size="26"
        fill="${colors['text-dim']}">
    alkem.dev
  </text>
</svg>`

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: {
    fontDirs: [fontsDir],
    loadSystemFonts: true,
    defaultFontFamily: 'Ubuntu',
  },
})

writeFileSync(outPath, resvg.render().asPng())
console.log('og:generate →', outPath)
