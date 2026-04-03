import type { GameState, FallingKana, GameStateSnapshot, KanaStats } from '../types/game'

const BASE_SCORE = 100
const COMBO_MULTIPLIERS = [1, 1, 1.5, 2, 3, 5] // index = combo bracket
const THRILL_THRESHOLD = 0.75 // fraction of groundY where thrill bonus kicks in
const THRILL_MULTIPLIER = 1.5

export interface HitScoreDetail {
  earned: number
  timeBonus: number
  thrillBonus: number
  comboMult: number
}

export class ScoreManager {
  kanaRows: string[] = []

  // Cumulative score breakdown tracking
  totalBaseScore = 0
  totalTimeBonus = 0
  totalThrillBonus = 0
  totalComboBonus = 0

  calculateHitScore(kana: FallingKana, groundY: number): number {
    // Time bonus: earlier hit → higher multiplier (1.0 to 2.0)
    const yFraction = Math.max(0, kana.y) / groundY
    const timeBonus = 1 + (1 - yFraction) // 2.0 at top, 1.0 at ground

    // Thrill bonus: close to ground
    const thrillBonus = yFraction >= THRILL_THRESHOLD ? THRILL_MULTIPLIER : 1

    return Math.round(BASE_SCORE * timeBonus * thrillBonus)
  }

  getComboMultiplier(combo: number): number {
    if (combo < 3) return COMBO_MULTIPLIERS[0]
    if (combo < 5) return COMBO_MULTIPLIERS[2]
    if (combo < 10) return COMBO_MULTIPLIERS[3]
    if (combo < 20) return COMBO_MULTIPLIERS[4]
    return COMBO_MULTIPLIERS[5]
  }

  applyHit(state: GameState, kana: FallingKana, groundY: number): HitScoreDetail {
    state.combo++
    if (state.combo > state.maxCombo) {
      state.maxCombo = state.combo
    }
    state.totalHits++

    const yFraction = Math.max(0, kana.y) / groundY
    const timeBonus = 1 + (1 - yFraction)
    const thrillBonus = yFraction >= THRILL_THRESHOLD ? THRILL_MULTIPLIER : 1
    const comboMult = this.getComboMultiplier(state.combo)

    const baseWithBonuses = Math.round(BASE_SCORE * timeBonus * thrillBonus)
    const earned = Math.round(baseWithBonuses * comboMult)
    state.score += earned

    // Track cumulative breakdown
    const timeBonusPortion = Math.round(BASE_SCORE * (timeBonus - 1))
    const thrillBonusPortion = thrillBonus > 1 ? Math.round(BASE_SCORE * timeBonus * (thrillBonus - 1)) : 0
    const comboBonusPortion = comboMult > 1 ? earned - baseWithBonuses : 0

    this.totalBaseScore += BASE_SCORE
    this.totalTimeBonus += timeBonusPortion
    this.totalThrillBonus += thrillBonusPortion
    this.totalComboBonus += comboBonusPortion

    return { earned, timeBonus, thrillBonus, comboMult }
  }

  applyMiss(state: GameState) {
    // Graduated decay: keep 60% of combo momentum instead of hard reset
    const decayed = Math.floor(state.combo * 0.6)
    state.combo = decayed < 2 ? 0 : decayed
  }

  applyDrop(state: GameState) {
    // Harsher decay for drops: keep only 30% of combo momentum
    const decayed = Math.floor(state.combo * 0.3)
    state.combo = decayed < 2 ? 0 : decayed
    state.totalMisses++
    state.lives--

    if (state.lives <= 0) {
      state.lives = 0
      state.isGameOver = true
      // isRunning stays true — engine runs a grace period for final animations
    }
  }

  getSnapshot(state: GameState, isPaused = false, inputBuffer = ''): GameStateSnapshot {
    const kanaStats: KanaStats[] = []
    for (const [kana, prof] of state.kanaProficiency) {
      const total = prof.hits + prof.misses
      const avgReaction = prof.reactionTimes.length > 0
        ? prof.reactionTimes.reduce((a, b) => a + b, 0) / prof.reactionTimes.length
        : 0
      kanaStats.push({
        kana,
        hits: prof.hits,
        misses: prof.misses,
        accuracy: total > 0 ? Math.round((prof.hits / total) * 100) : 0,
        avgReactionMs: Math.round(avgReaction),
      })
    }

    return {
      score: state.score,
      combo: state.combo,
      maxCombo: state.maxCombo,
      comboMultiplier: this.getComboMultiplier(state.combo),
      lives: state.lives,
      maxLives: state.maxLives,
      totalHits: state.totalHits,
      totalMisses: state.totalMisses,
      isGameOver: state.isGameOver,
      isPaused,
      kanaStats,
      kanaRows: this.kanaRows,
      inputBuffer,
      totalBaseScore: this.totalBaseScore,
      totalTimeBonus: this.totalTimeBonus,
      totalThrillBonus: this.totalThrillBonus,
      totalComboBonus: this.totalComboBonus,
    }
  }
}
