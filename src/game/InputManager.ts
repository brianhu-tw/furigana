import type { GameState, FallingKana } from '../types/game'

export class InputManager {
  private queue: string[] = []
  private buffer = ''

  enqueue(char: string) {
    this.queue.push(char)
  }

  reset() {
    this.queue = []
    this.buffer = ''
  }

  getBuffer() {
    return this.buffer
  }

  update(state: GameState, _groundY: number): { hit: FallingKana | null; miss: boolean } {
    let result: { hit: FallingKana | null; miss: boolean } = { hit: null, miss: false }

    while (this.queue.length > 0) {
      const char = this.queue.shift()!
      this.buffer += char

      const activeKana = state.fallingKana
        .filter(k => k.state === 'falling' || k.state === 'warning')
        .sort((a, b) => b.y - a.y) // closest to ground first

      // Check for exact match
      let matched: FallingKana | null = null
      for (const k of activeKana) {
        if (k.romaji.includes(this.buffer)) {
          matched = k
          break
        }
      }

      if (matched) {
        matched.state = 'hit'
        this.buffer = ''
        result = { hit: matched, miss: false }
        continue
      }

      // Check if buffer is a valid prefix of any active kana's romaji
      let isPrefix = false
      for (const k of activeKana) {
        for (const r of k.romaji) {
          if (r.startsWith(this.buffer)) {
            isPrefix = true
            break
          }
        }
        if (isPrefix) break
      }

      if (!isPrefix) {
        // No match possible — it's a miss
        this.buffer = ''
        result = { hit: null, miss: true }
        break // Stop processing remaining queue chars this frame to prevent leakage
      }
    }

    return result
  }
}
