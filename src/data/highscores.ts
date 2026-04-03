export interface HighScoreEntry {
  score: number
  maxCombo: number
  accuracy: number
  date: string
  kanaRows: string[]
}

const STORAGE_KEY = 'gojuon-highscores'
const MAX_ENTRIES = 10

export function getHighScores(): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (e: unknown): e is HighScoreEntry =>
          typeof e === 'object' && e !== null && typeof (e as HighScoreEntry).score === 'number',
      )
      .sort((a: HighScoreEntry, b: HighScoreEntry) => b.score - a.score)
      .slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

export function addHighScore(entry: HighScoreEntry): number | null {
  const scores = getHighScores()
  const rank = scores.findIndex(e => entry.score > e.score)
  const insertAt = rank === -1 ? scores.length : rank

  if (insertAt >= MAX_ENTRIES) return null

  scores.splice(insertAt, 0, entry)
  const trimmed = scores.slice(0, MAX_ENTRIES)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Storage full or unavailable
  }

  return insertAt + 1 // 1-based rank
}

export function isHighScore(score: number): boolean {
  if (score <= 0) return false
  const scores = getHighScores()
  if (scores.length < MAX_ENTRIES) return true
  return score > scores[scores.length - 1].score
}

export function getBestScore(): number {
  const scores = getHighScores()
  return scores.length > 0 ? scores[0].score : 0
}
