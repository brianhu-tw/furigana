import type { GameState, GameStateSnapshot } from '../types/game'
import { createInitialState, resetState } from './GameState'
import { Renderer } from './Renderer'
import { SpawnManager } from './SpawnManager'
import { InputManager } from './InputManager'
import { ScoreManager } from './ScoreManager'
import { ParticleSystem } from './ParticleSystem'
import type { KanaEntry } from '../types/game'
import {
  playMissSound, playComboBreakSound,
  playWrongInputSound, startBGM, stopBGM,
  playPauseSound, playResumeSound, playHitSoundWithCombo,
  playWarningBeep, playGameOverJingle, playComboMilestone,
  playClutchSave, updateBGMDynamics, playGoFanfare,
} from '../audio/AudioManager'

const COMBO_MILESTONES = new Map<number, string>([
  [5, 'Nice!'],
  [10, 'Great!'],
  [15, 'Amazing!'],
  [20, 'Incredible!'],
  [30, 'Unstoppable!'],
  [50, 'LEGENDARY!'],
  [75, 'GODLIKE!'],
  [100, 'PERFECT CENTURY!'],
  [150, 'TRANSCENDENT!'],
  [200, 'INHUMAN!'],
])

/** Get milestone text, including dynamic milestones every 100 after 200 */
function getMilestoneText(combo: number): string | undefined {
  const text = COMBO_MILESTONES.get(combo)
  if (text) return text
  if (combo > 200 && combo % 100 === 0) return 'INHUMAN!'
  return undefined
}

/** Get milestone color based on combo level */
function getMilestoneColor(combo: number): string {
  if (combo >= 200) return '#FF0000'   // red
  if (combo >= 150) return '#FF4500'   // orange-red
  if (combo >= 100) return '#FF6600'   // orange
  if (combo >= 75) return '#FFA500'    // gold-orange
  return '#FFD700'                      // gold
}

const HIT_ANIM_DURATION = 0.45
const ANSWER_SHOW_DURATION = 1.2
const GAME_OVER_GRACE = 1.0

export type StateChangeCallback = (snapshot: GameStateSnapshot) => void

export class GameEngine {
  private state: GameState
  private renderer: Renderer
  private spawnManager = new SpawnManager()
  private inputManager = new InputManager()
  private scoreManager = new ScoreManager()
  private particleSystem = new ParticleSystem()

  private rafId = 0
  private lastTime = 0
  private onStateChange: StateChangeCallback | null = null
  private lastSnapshot: string = ''
  private shakeAmount = 0
  private driftOffsets = new Map<number, { dx: number; phase: number }>()
  private gameOverTimer = 0
  private warningBeeped = new Set<number>()
  private gameOverJinglePlayed = false
  private clutchJolt = 0
  private visibilityHandler: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas)
    this.state = createInitialState()
  }

  setOnStateChange(cb: StateChangeCallback) {
    this.onStateChange = cb
  }

  setKanaPool(pool: KanaEntry[]) {
    this.spawnManager.setKanaPool(pool)
  }

  setKanaRows(rowIds: string[]) {
    this.scoreManager.kanaRows = rowIds
  }

  handleInput(char: string) {
    this.inputManager.enqueue(char)
  }

  getInputBuffer(): string {
    return this.inputManager.getBuffer()
  }

  resize() {
    this.renderer.resize()
  }

  start() {
    resetState(this.state)
    this.spawnManager.reset()
    this.inputManager.reset()
    this.particleSystem.reset()
    this.driftOffsets.clear()
    this.renderer.comboBreakFlash = 0
    this.renderer.hitFlash = 0
    this.gameOverTimer = 0
    this.warningBeeped.clear()
    this.gameOverJinglePlayed = false
    this.scoreManager.totalBaseScore = 0
    this.scoreManager.totalTimeBonus = 0
    this.scoreManager.totalThrillBonus = 0
    this.scoreManager.totalComboBonus = 0

    this.state.isRunning = true
    this.lastTime = performance.now()
    this.emitState()
    this.loop(this.lastTime)

    // Play GO fanfare first, delay BGM so they don't overlap
    playGoFanfare()
    setTimeout(() => startBGM(), 600)

    // Auto-pause when screen is locked or tab is hidden
    this.visibilityHandler = () => {
      if (document.hidden && this.state.isRunning && !this._paused && !this.state.isGameOver) {
        this.pause()
      }
    }
    document.addEventListener('visibilitychange', this.visibilityHandler)
  }

  private _paused = false

  get isPaused() { return this._paused }

  pause() {
    if (this._paused || !this.state.isRunning || this.state.isGameOver) return
    this._paused = true
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    playPauseSound()
    stopBGM()
    this.emitState()
  }

  resume() {
    if (!this._paused) return
    this._paused = false
    this.lastTime = performance.now()
    this.loop(this.lastTime)
    playResumeSound()
    startBGM()
    this.emitState()
  }

  stop() {
    this._paused = false
    this.state.isRunning = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    stopBGM()
  }

  destroy() {
    this.stop()
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = null
    }
  }

  getSnapshot(): GameStateSnapshot {
    return this.scoreManager.getSnapshot(this.state, this._paused, this.inputManager.getBuffer())
  }

  private loop = (now: number) => {
    if (!this.state.isRunning) return

    const dt = Math.min((now - this.lastTime) / 1000, 0.1) // cap at 100ms
    this.lastTime = now

    if (this.state.isGameOver) {
      this.updateGameOverGrace(dt, now)
    } else {
      this.update(dt, now)
    }

    this.draw(dt)
    this.rafId = requestAnimationFrame(this.loop)
  }

  /** Normal gameplay update */
  private update(dt: number, now: number) {
    // Update background scenery system
    this.renderer.updateBackground(dt, this.spawnManager.elapsedTime, this.state.combo, this.scoreManager.kanaRows)

    // Spawn
    this.spawnManager.update(dt, this.state, this.renderer.width)

    // Initialize drift offsets for new kana
    for (const k of this.state.fallingKana) {
      if (!this.driftOffsets.has(k.id)) {
        this.driftOffsets.set(k.id, {
          dx: (Math.random() - 0.5) * 0.3,
          phase: Math.random() * Math.PI * 2,
        })
      }
    }

    // Move kana
    const groundY = this.renderer.groundY

    for (const k of this.state.fallingKana) {
      if (k.state === 'falling' || k.state === 'warning') {
        // Dynamic speed: apply current combo bonus to base speed each frame
        const comboBonus = this.spawnManager.getComboSpeedBonus(this.state.combo)
        k.speed = k.baseSpeed * (1 + comboBonus)

        // Non-linear fall: accelerate as kana descends (ease-in quadratic)
        const progress = Math.max(0, k.y / groundY) // 0 at top, 1 at ground
        const accelFactor = 1 + progress * progress * 1.5 // 1x at top → 2.5x near ground
        k.y += k.speed * accelFactor * dt

        // Horizontal drift
        const drift = this.driftOffsets.get(k.id)
        if (drift) {
          k.x += Math.sin(now / 1000 + drift.phase) * drift.dx
        }

        // Warning state
        if (k.y >= this.renderer.warningY && k.state === 'falling') {
          k.state = 'warning'
          if (!this.warningBeeped.has(k.id)) {
            this.warningBeeped.add(k.id)
            playWarningBeep()
          }
        }

        // Ground hit → showing-answer
        if (k.y >= groundY) {
          k.state = 'showing-answer'
          k.stateTimer = 0
          k.y = groundY

          this.particleSystem.spawnMiss(k.x, groundY)
          playMissSound()

          const prevCombo = this.state.combo
          this.scoreManager.applyDrop(this.state)

          // Update proficiency
          const prof = this.state.kanaProficiency.get(k.kana)
          if (prof) {
            prof.totalAttempts++
            prof.misses++
            prof.consecutiveMisses++
          } else {
            this.state.kanaProficiency.set(k.kana, {
              totalAttempts: 1, hits: 0, misses: 1,
              consecutiveMisses: 1, reactionTimes: [],
            })
          }

          // Combo break feedback
          if (prevCombo >= 3) {
            this.triggerComboBreak(prevCombo)
          }

          this.shakeAmount = 4
          this.vibrate([30, 20, 30])

          // Update dynamic BGM after drop (combo reset, lives changed)
          updateBGMDynamics(this.state.combo, this.state.lives, this.state.maxLives)
        }
      }
    }

    // Advance transitional state timers
    this.advanceStateTimers(dt)

    // Process input
    const inputResult = this.inputManager.update(this.state, groundY)
    if (inputResult.hit) {
      const k = inputResult.hit
      const wasWarning = k.state === 'warning'

      const hitDetail = this.scoreManager.applyHit(this.state, k, groundY)

      // Start hit animation
      k.state = 'hit-animating'
      k.stateTimer = 0

      // Clutch save: different particles + SFX + canvas jolt when hit in warning zone
      if (wasWarning) {
        this.particleSystem.spawnClutchSave(k.x, k.y)
        playClutchSave()
        this.clutchJolt = 3 // upward jolt in pixels
        // "+THRILL" floating text
        this.state.floatingTexts.push({
          text: '+THRILL',
          x: k.x + 30,
          y: k.y - 20,
          startTime: now,
          duration: 0.8,
          color: '#E84855',
          fontSize: 22,
        })
      } else {
        this.particleSystem.spawnHit(k.x, k.y, this.state.combo)
      }
      playHitSoundWithCombo(this.state.combo)
      this.vibrate([15])

      // Golden screen flash (accumulate instead of reset to avoid strobe on rapid hits)
      this.renderer.hitFlash = Math.min(1, this.renderer.hitFlash + 0.4)

      // Floating score text at hit position
      this.state.floatingTexts.push({
        text: `+${hitDetail.earned}`,
        x: k.x,
        y: k.y,
        startTime: now,
        duration: 0.8,
        color: wasWarning ? '#67E8F9' : '#F9B233',
        fontSize: 28,
      })

      // Score breakdown sub-text for high-value hits (earned > 200 means bonuses applied)
      if (hitDetail.earned > 200) {
        const parts: string[] = []
        if (hitDetail.timeBonus > 1.3) parts.push(`x${hitDetail.timeBonus.toFixed(1)} 速度`)
        if (hitDetail.thrillBonus > 1) parts.push(`x${hitDetail.thrillBonus.toFixed(1)} 驚險`)
        if (hitDetail.comboMult > 1) parts.push(`x${hitDetail.comboMult} combo`)
        if (parts.length > 0) {
          this.state.floatingTexts.push({
            text: parts.join(' '),
            x: k.x,
            y: k.y + 20,
            startTime: now,
            duration: 0.8,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 14,
          })
        }
      }

      // Update dynamic BGM after hit (combo changed)
      updateBGMDynamics(this.state.combo, this.state.lives, this.state.maxLives)

      // Check combo multiplier milestones (scoring transparency)
      const combo = this.state.combo
      const COMBO_MULT_MILESTONES: Record<number, string> = { 3: 'x1.5', 5: 'x2', 10: 'x3', 20: 'x5' }
      if (COMBO_MULT_MILESTONES[combo]) {
        const label = combo === 20
          ? `${COMBO_MULT_MILESTONES[combo]} MAX COMBO!`
          : `${COMBO_MULT_MILESTONES[combo]} COMBO!`
        this.state.floatingTexts.push({
          text: label,
          x: this.renderer.width / 2,
          y: this.renderer.height * 0.45,
          startTime: now,
          duration: 1.0,
          color: '#FFD700',
          fontSize: 32,
        })
      }

      // Check combo milestones (celebration text)
      const milestoneText = getMilestoneText(combo)
      if (milestoneText) {
        const milestoneColor = getMilestoneColor(combo)
        const duration = combo >= 100 ? 2.0 : combo >= 50 ? 1.6 : 1.2
        this.state.floatingTexts.push({
          text: milestoneText,
          x: this.renderer.width / 2,
          y: this.renderer.height * 0.35,
          startTime: now,
          duration,
          color: milestoneColor,
          fontSize: 56,
        })
        playComboMilestone(combo)

        // Tiered celebration effects
        if (combo >= 10) {
          this.renderer.milestoneBorderFlash = 1
          this.shakeAmount = Math.max(this.shakeAmount, 5)
        }
        if (combo >= 20) {
          this.particleSystem.spawnMilestoneBurst(
            this.renderer.width / 2,
            this.renderer.height * 0.35,
            combo,
          )
        }
        if (combo >= 50) {
          this.renderer.triggerShockwave(this.renderer.width / 2, this.renderer.height * 0.35)
        }
      }

      // Update proficiency with reaction time
      const reactionMs = performance.now() - k.spawnTime
      const prof = this.state.kanaProficiency.get(k.kana)
      if (prof) {
        prof.totalAttempts++
        prof.hits++
        prof.consecutiveMisses = 0
        prof.reactionTimes.push(reactionMs)
        if (prof.reactionTimes.length > 5) prof.reactionTimes.shift()
      } else {
        this.state.kanaProficiency.set(k.kana, {
          totalAttempts: 1, hits: 1, misses: 0,
          consecutiveMisses: 0, reactionTimes: [reactionMs],
        })
      }
    } else if (inputResult.miss) {
      const prevCombo = this.state.combo
      this.scoreManager.applyMiss(this.state)

      // Wrong input feedback
      playWrongInputSound()
      this.shakeAmount = Math.max(this.shakeAmount, 1.5)
      this.vibrate([10])

      if (prevCombo >= 3) {
        this.triggerComboBreak(prevCombo)
      }

      // Update dynamic BGM after wrong input (combo reset)
      updateBGMDynamics(this.state.combo, this.state.lives, this.state.maxLives)
    }

    // Update particles
    this.particleSystem.update(dt)

    // Remove expired floating texts
    this.state.floatingTexts = this.state.floatingTexts.filter(
      ft => (now - ft.startTime) / 1000 < ft.duration
    )

    // Decay effects
    this.decayEffects(dt)

    // Clean up dead kana
    this.cleanupKana()

    // Emit state changes
    this.emitState()
  }

  /** After game over, keep rendering for animations to finish */
  private updateGameOverGrace(dt: number, now: number) {
    this.gameOverTimer += dt

    // Keep background animating during grace period
    this.renderer.updateBackground(dt, this.spawnManager.elapsedTime, this.state.combo, this.scoreManager.kanaRows)

    // Play game over jingle once, after a short delay so it doesn't overlap BGM fadeout
    if (!this.gameOverJinglePlayed && this.gameOverTimer >= 0.2) {
      this.gameOverJinglePlayed = true
      playGameOverJingle()
    }

    this.advanceStateTimers(dt)
    this.particleSystem.update(dt)
    this.state.floatingTexts = this.state.floatingTexts.filter(
      ft => (now - ft.startTime) / 1000 < ft.duration
    )
    this.decayEffects(dt)
    this.cleanupKana()

    if (this.gameOverTimer >= GAME_OVER_GRACE) {
      this.state.isRunning = false
    }

    this.emitState()
  }

  /** Advance hit-animating and showing-answer timers */
  private advanceStateTimers(dt: number) {
    for (const k of this.state.fallingKana) {
      if (k.state === 'hit-animating') {
        k.stateTimer += dt
        if (k.stateTimer >= HIT_ANIM_DURATION) {
          k.state = 'hit'
        }
      }

      if (k.state === 'showing-answer') {
        k.stateTimer += dt
        if (k.stateTimer >= ANSWER_SHOW_DURATION) {
          k.state = 'missed'
        }
      }
    }
  }

  /** Decay visual effects */
  private decayEffects(dt: number) {
    if (this.renderer.comboBreakFlash > 0) {
      this.renderer.comboBreakFlash -= dt * 5
      if (this.renderer.comboBreakFlash < 0) this.renderer.comboBreakFlash = 0
    }

    if (this.renderer.hitFlash > 0) {
      this.renderer.hitFlash -= dt * 10 // ~100ms decay
      if (this.renderer.hitFlash < 0) this.renderer.hitFlash = 0
    }

    if (this.shakeAmount > 0) {
      this.shakeAmount *= 0.85
      if (this.shakeAmount < 0.3) this.shakeAmount = 0
    }

    if (this.clutchJolt > 0) {
      this.clutchJolt *= 0.7 // fast decay ~50ms
      if (this.clutchJolt < 0.2) this.clutchJolt = 0
    }
  }

  /** Remove kana that have finished their lifecycle */
  private cleanupKana() {
    this.state.fallingKana = this.state.fallingKana.filter(
      k => k.state === 'falling' || k.state === 'warning' ||
           k.state === 'hit-animating' || k.state === 'showing-answer'
    )

    const activeIds = new Set(this.state.fallingKana.map(k => k.id))
    for (const id of this.driftOffsets.keys()) {
      if (!activeIds.has(id)) this.driftOffsets.delete(id)
    }
  }

  private triggerComboBreak(prevCombo = 0) {
    this.renderer.comboBreakFlash = 1
    playComboBreakSound()
    this.shakeAmount = Math.max(this.shakeAmount, 3)

    // Desaturate background on high combo break
    if (prevCombo >= 10) {
      this.renderer.comboBreakDesat = 1
    }
  }

  private draw(dt: number) {
    const ctx = this.renderer.ctx
    ctx.save()

    if (this.shakeAmount > 0) {
      const sx = (Math.random() - 0.5) * this.shakeAmount * 2
      const sy = (Math.random() - 0.5) * this.shakeAmount * 2
      ctx.translate(sx, sy)
    }

    // Brief upward jolt on clutch save (relief pulse)
    if (this.clutchJolt > 0) {
      ctx.translate(0, -this.clutchJolt)
    }

    this.renderer.combo = this.state.combo
    this.renderer.render(
      this.state.fallingKana,
      this.particleSystem.active,
      this.state.floatingTexts,
      dt,
    )

    ctx.restore()
  }

  private emitState() {
    if (!this.onStateChange) return

    const snapshot = this.scoreManager.getSnapshot(this.state, this._paused, this.inputManager.getBuffer())
    const key = JSON.stringify(snapshot)
    if (key !== this.lastSnapshot) {
      this.lastSnapshot = key
      this.onStateChange(snapshot)
    }
  }

  private vibrate(pattern: number[]) {
    try {
      navigator.vibrate?.(pattern)
    } catch {
      // Vibration API not available
    }
  }
}
