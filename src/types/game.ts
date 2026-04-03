export interface KanaEntry {
  kana: string
  romaji: string[]
}

export interface FallingKana {
  id: number
  kana: string
  romaji: string[]
  x: number
  y: number
  speed: number
  /** Speed without combo bonus — used for dynamic speed recalculation */
  baseSpeed: number
  spawnTime: number
  state: 'falling' | 'warning' | 'hit-animating' | 'showing-answer' | 'hit' | 'missed'
  /** Time accumulated in current transitional state (hit-animating / showing-answer) */
  stateTimer: number
  /** Opacity of romaji hint below kana (0 = hidden) */
  romajiOpacity: number
  /** Weak kana targeted by adaptive learning (accuracy < 60%, attempts >= 3) */
  isFocusKana?: boolean
}

export interface FloatingText {
  text: string
  x: number
  y: number
  startTime: number
  duration: number
  color: string
  fontSize: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface KanaProficiency {
  totalAttempts: number
  hits: number
  misses: number
  consecutiveMisses: number
  /** Recent reaction times in ms (last 5) */
  reactionTimes: number[]
}

export interface GameState {
  fallingKana: FallingKana[]
  floatingTexts: FloatingText[]
  score: number
  combo: number
  maxCombo: number
  lives: number
  maxLives: number
  totalHits: number
  totalMisses: number
  isRunning: boolean
  isGameOver: boolean
  nextId: number
  kanaProficiency: Map<string, KanaProficiency>
  /** Fever mode active when combo >= 15 */
  isFever: boolean
}

export interface KanaStats {
  kana: string
  hits: number
  misses: number
  accuracy: number
  avgReactionMs: number
}

export interface GameStateSnapshot {
  score: number
  combo: number
  maxCombo: number
  comboMultiplier: number
  lives: number
  maxLives: number
  totalHits: number
  totalMisses: number
  isGameOver: boolean
  isPaused: boolean
  kanaStats: KanaStats[]
  kanaRows: string[]
  inputBuffer: string
  totalBaseScore: number
  totalTimeBonus: number
  totalThrillBonus: number
  totalComboBonus: number
}

export type GameScreen = 'title' | 'levelSelect' | 'countdown' | 'game' | 'result' | 'highScore'
