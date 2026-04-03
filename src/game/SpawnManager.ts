import type { GameState, FallingKana, KanaEntry } from '../types/game'

const BASE_FALL_SPEED = 95 // px/s at start
const BASE_SPAWN_INTERVAL = 1.3 // seconds at start
const BASE_MAX_ACTIVE = 4
const MARGIN = 40

// Difficulty ramps over time
const SPEED_RAMP = 0.65    // +65% speed per minute
const INTERVAL_RAMP = 0.30 // -30% interval per minute
const MAX_SPEED = 260

// Fever mode threshold
const FEVER_COMBO_THRESHOLD = 15

// Combo-driven speed bonus tiers
const COMBO_SPEED_TIERS = [
  { combo: 20, bonus: 0.75 },
  { combo: 10, bonus: 0.50 },
  { combo: 5,  bonus: 0.30 },
  { combo: 3,  bonus: 0.15 },
]

// Per-kana proficiency speed range
const PROF_SPEED_MIN = 0.8  // weak kana: 80% speed (more time to learn)
const PROF_SPEED_MAX = 1.25 // strong kana: 125% speed (more challenge)

export class SpawnManager {
  private timer = 0
  private elapsed = 0
  private kanaPool: KanaEntry[] = []

  /** Total elapsed game time in seconds */
  get elapsedTime(): number {
    return this.elapsed
  }

  setKanaPool(pool: KanaEntry[]) {
    this.kanaPool = pool
  }

  reset() {
    this.timer = 0
    this.elapsed = 0
  }

  /** Base fall speed from time ramp */
  private get timeBaseSpeed(): number {
    return Math.min(MAX_SPEED, BASE_FALL_SPEED * (1 + (this.elapsed / 60) * SPEED_RAMP))
  }

  /** Dynamic minimum interval — decreases over time from 0.45 to 0.25 */
  private get dynamicMinInterval(): number {
    return Math.max(0.25, 0.45 - this.elapsed * 0.0015)
  }

  /** Current spawn interval (decreases over time) */
  private get currentInterval(): number {
    return Math.max(this.dynamicMinInterval, BASE_SPAWN_INTERVAL / (1 + (this.elapsed / 60) * INTERVAL_RAMP))
  }

  /** Current max active kana (increases over time, faster after 60s) */
  private get currentMaxActive(): number {
    if (this.elapsed > 60) {
      return Math.min(12, BASE_MAX_ACTIVE + Math.floor(this.elapsed / 15))
    }
    return Math.min(7, BASE_MAX_ACTIVE + Math.floor(this.elapsed / 25))
  }

  /** Combo-driven speed bonus multiplier */
  getComboSpeedBonus(combo: number): number {
    for (const tier of COMBO_SPEED_TIERS) {
      if (combo >= tier.combo) return tier.bonus
    }
    return 0
  }

  /** Per-kana speed multiplier based on proficiency (accuracy) */
  private getKanaSpeedMultiplier(state: GameState, kana: string): number {
    const prof = state.kanaProficiency.get(kana)
    if (!prof || prof.totalAttempts < 2) return 1.0 // not enough data

    const accuracy = prof.hits / prof.totalAttempts
    return PROF_SPEED_MIN + accuracy * (PROF_SPEED_MAX - PROF_SPEED_MIN)
  }

  /** Weighted random selection — weaker kana appear more often */
  private selectWeighted(available: KanaEntry[], state: GameState): KanaEntry {
    const weights = available.map(entry => {
      const prof = state.kanaProficiency.get(entry.kana)
      if (!prof || prof.totalAttempts < 2) return 1.5
      const accuracy = prof.hits / prof.totalAttempts
      return Math.pow(2 - accuracy, 1.5)
    })

    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let r = Math.random() * totalWeight
    for (let i = 0; i < available.length; i++) {
      r -= weights[i]
      if (r <= 0) return available[i]
    }
    return available[available.length - 1]
  }

  update(dt: number, state: GameState, canvasWidth: number) {
    if (state.isGameOver) return

    this.elapsed += dt
    this.timer += dt

    // Fever mode: combo >= 15
    state.isFever = state.combo >= FEVER_COMBO_THRESHOLD

    const activeCount = state.fallingKana.filter(
      k => k.state === 'falling' || k.state === 'warning'
    ).length

    // Fever: halve interval, +3 maxActive
    const effectiveInterval = state.isFever ? this.currentInterval * 0.5 : this.currentInterval
    const effectiveMaxActive = state.isFever ? this.currentMaxActive + 3 : this.currentMaxActive

    // 90s+ → only check maxActive, skip interval gate
    if (this.elapsed > 90) {
      if (activeCount < effectiveMaxActive) {
        this.timer = 0
        this.spawn(state, canvasWidth)
      }
    } else if (this.timer >= effectiveInterval && activeCount < effectiveMaxActive) {
      this.timer = 0
      this.spawn(state, canvasWidth)
    }
  }

  private spawn(state: GameState, canvasWidth: number) {
    const activeKana = new Set(
      state.fallingKana
        .filter(k => k.state === 'falling' || k.state === 'warning')
        .map(k => k.kana)
    )

    const available = this.kanaPool.filter(k => !activeKana.has(k.kana))
    if (available.length === 0) return

    const entry = this.selectWeighted(available, state)

    // X-distance protection
    const nearTopKana = state.fallingKana.filter(
      k => (k.state === 'falling' || k.state === 'warning') && k.y < 120
    )
    const usableWidth = canvasWidth - MARGIN * 2
    let x = MARGIN + Math.random() * usableWidth
    for (let attempt = 0; attempt < 5; attempt++) {
      const tooClose = nearTopKana.some(k => Math.abs(k.x - x) < 60)
      if (!tooClose) break
      x = MARGIN + Math.random() * usableWidth
    }

    // Romaji hint: only after repeated failures
    const prof = state.kanaProficiency.get(entry.kana)
    let romajiOpacity = 0
    if (prof && prof.consecutiveMisses >= 2) {
      romajiOpacity = 0.6
    }

    // Determine if this is a focus kana (weak, needs practice)
    let isFocusKana = false
    if (prof && prof.totalAttempts >= 3) {
      const accuracy = prof.hits / prof.totalAttempts
      if (accuracy < 0.6) isFocusKana = true
    }

    // Speed: time ramp × per-kana proficiency (combo applied dynamically in engine)
    const kanaMultiplier = this.getKanaSpeedMultiplier(state, entry.kana)
    const baseSpeed = this.timeBaseSpeed * kanaMultiplier
    const comboBonus = this.getComboSpeedBonus(state.combo)
    const speed = baseSpeed * (1 + comboBonus)

    const kana: FallingKana = {
      id: state.nextId++,
      kana: entry.kana,
      romaji: entry.romaji,
      x,
      y: -30,
      speed,
      baseSpeed,
      spawnTime: performance.now(),
      state: 'falling',
      stateTimer: 0,
      romajiOpacity,
      isFocusKana,
    }

    state.fallingKana.push(kana)
  }
}
