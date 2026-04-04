import type { GameState } from '../types/game'

const MAX_LIVES = 5

export function createInitialState(): GameState {
  return {
    fallingKana: [],
    floatingTexts: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    lives: MAX_LIVES,
    maxLives: MAX_LIVES,
    totalHits: 0,
    totalMisses: 0,
    isRunning: false,
    isGameOver: false,
    nextId: 1,
    kanaProficiency: new Map(),
    isFever: false,
  }
}

export function resetState(state: GameState) {
  state.fallingKana = []
  state.floatingTexts = []
  state.score = 0
  state.combo = 0
  state.maxCombo = 0
  state.lives = MAX_LIVES
  state.maxLives = MAX_LIVES
  state.totalHits = 0
  state.totalMisses = 0
  state.isRunning = false
  state.isGameOver = false
  state.nextId = 1
  state.isFever = false
  // kanaProficiency intentionally NOT reset — persists across games within session
}
