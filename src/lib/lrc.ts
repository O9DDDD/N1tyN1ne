export interface LyricLine {
  time: number
  text: string
}

export function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = []
  const re = /^\[(\d{2}):(\d{2})\.(\d{2,3})\]/

  for (const raw of lrc.split('\n')) {
    const m = raw.match(re)
    if (!m) continue
    const min = parseInt(m[1], 10)
    const sec = parseInt(m[2], 10)
    const ms = parseInt(m[3].padEnd(3, '0'), 10)
    const time = min * 60 + sec + ms / 1000
    const text = raw.slice(m[0].length).trim()
    if (text) lines.push({ time, text })
  }

  return lines
}

export function getActiveIndex(lines: LyricLine[], currentTime: number): number {
  let idx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime) idx = i
    else break
  }
  return idx
}
