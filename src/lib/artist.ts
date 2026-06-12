const SEP_RE = /\s*[/,&、]\s*/

const FEAT_RE = /\s+(?:feat\.|ft\.|feat|ft|Feat\.|Ft\.|Feat|Ft)\s+/i

const COLLAB_RE = /\s+x\s+/i

export function splitArtists(raw: string | null): string[] {
  if (!raw) return []
  // Remove featuring artists from main list but keep them
  const withoutFeat = raw.replace(FEAT_RE, ' / ').replace(COLLAB_RE, ' / ')
  const parts = withoutFeat.split(SEP_RE).filter(Boolean)
  return [...new Set(parts.map((p) => p.trim()).filter(Boolean))]
}

export function extractFeat(raw: string | null): string | null {
  if (!raw) return null
  const m = raw.match(FEAT_RE)
  if (!m) return null
  // Get everything after the feat marker
  const idx = raw.search(FEAT_RE)
  if (idx < 0) return null
  const featPart = raw.slice(idx + m[0].length).trim()
  // Truncate at next separator
  const cleaned = featPart.split(/[/,&、]/)[0].trim()
  return cleaned || null
}
