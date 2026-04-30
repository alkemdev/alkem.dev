/**
 * Estimate reading time in minutes from the raw post body.
 * 200 wpm matches the conventional figure used by Medium, GitHub
 * READMEs, etc. Floor of 1 — a 30-word post still reads as "1 min".
 */
export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}
