export interface LyricLine {
  time: number
  text: string
}

/**
 * Parse LRC lyrics string into timed lines.
 * Handles [mm:ss.xx], [mm:ss.xxx], [mm:ss], and multi-tag lines.
 */
export function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = []
  if (!lrc) return lines

  // Match time tags: [mm:ss.xx], [mm:ss.xxx], or [mm:ss] (no ms)
  const timeRe = /\[(\d{1,3}):(\d{1,2})(?:\.(\d{2,3}))?\]/g

  for (const raw of lrc.split('\n')) {
    const trimmed = raw.trim()
    if (!trimmed) continue

    // Skip metadata tags: [ti:...], [ar:...], [al:...], [by:...], [offset:...], [length:...]
    if (/^\[\D+:/.test(trimmed)) continue

    // Collect all time stamps on this line
    const times: number[] = []
    let m: RegExpExecArray | null
    timeRe.lastIndex = 0
    while ((m = timeRe.exec(trimmed)) !== null) {
      const min = parseInt(m[1], 10)
      const sec = parseInt(m[2], 10)
      const msStr = m[3]
      const ms = msStr
        ? parseInt(msStr.length === 2 ? msStr + '0' : msStr, 10)
        : 0
      times.push(min * 60 + sec + ms / 1000)
    }

    if (times.length === 0) continue

    // Extract text after the last time tag
    const textStart = trimmed.lastIndexOf(']') + 1
    const text = trimmed.slice(textStart).trim()
    if (!text) continue

    for (const t of times) {
      lines.push({ time: t, text })
    }
  }

  // Sort by time
  lines.sort((a, b) => a.time - b.time)

  return lines
}

/**
 * Find the index of the active lyric line based on current playback time.
 * Returns the last line whose time <= currentTime.
 */
export function getActiveIndex(lines: LyricLine[], currentTime: number): number {
  if (!lines.length) return -1
  let idx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime) {
      idx = i
    } else {
      break
    }
  }
  return idx
}
