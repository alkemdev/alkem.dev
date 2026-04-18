import raw from './tokens.json' with { type: 'json' }

/** Canonical palette — edit `tokens.json`, then run `npm run sync:brand`. */
export const brandColors = raw.colors as Record<string, string>

/** Ergonomic accessors (theme keys use hyphens in JSON). */
export const brand = {
  purple: raw.colors.purple,
  green: raw.colors.green,
  bg: raw.colors.bg,
  bgRaised: raw.colors['bg-raised'],
  text: raw.colors.text,
  textDim: raw.colors['text-dim'],
  border: raw.colors.border,
} as const

/** WebGL / Three.js color integer `0xRRGGBB`. */
export function hexToThree(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16)
}

/** RGB 0–255 for CSS `rgba()`. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = hexToThree(hex)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
