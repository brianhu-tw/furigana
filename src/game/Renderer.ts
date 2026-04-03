import type { FallingKana, FloatingText, Particle } from '../types/game'
import { BackgroundSystem } from './BackgroundSystem'

// Background colors now managed by BackgroundSystem
const WARNING_COLOR = '#F39C12'
const KANA_COLOR = '#FFFFFF'
const GROUND_COLOR = 'rgba(232, 72, 85, 0.6)'
const WARNING_LINE_COLOR = 'rgba(249, 178, 51, 0.4)'

// Hit animation timing (seconds)
const HIT_PHASE1 = 0.06  // Scale up
const HIT_PHASE2 = 0.18  // Peak glow
const HIT_PHASE3 = 0.36  // Shrink + scatter
const HIT_TOTAL = 0.45

// Showing answer timing
const ANSWER_FADE_START = 0.9

export class Renderer {
  private canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  private dpr = 1
  private _width = 0
  private _height = 0

  get width() { return this._width }
  get height() { return this._height }
  get groundY() { return this._height * 0.88 }
  get warningY() { return this._height * 0.68 }

  /** Combo break red flash intensity (0-1, decays each frame) */
  comboBreakFlash = 0
  /** Hit golden flash intensity (0-1, decays fast) */
  hitFlash = 0
  /** Gold border pulse on combo milestones 10+ (0-1, decays) */
  milestoneBorderFlash = 0

  /** Current combo value for dynamic background */
  combo = 0
  /** Desaturation flash on combo break (0-1, decays over ~0.5s) */
  comboBreakDesat = 0
  /** Ambient sparkle particles for high combo */
  private ambientParticles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }[] = []
  private ambientSpawnTimer = 0
  /** Shockwave ring effect for milestones 50+ */
  private shockwave: { cx: number; cy: number; radius: number; alpha: number } | null = null

  /** Progressive Japanese background scenery system */
  private bgSystem = new BackgroundSystem()

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.resize()
  }

  /** Update background system state — called from GameEngine each frame */
  updateBackground(dt: number, elapsed: number, combo: number, kanaRows: string[]) {
    this.bgSystem.update(dt, elapsed, combo, kanaRows)
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this._width = rect.width
    this._height = rect.height
    this.canvas.width = rect.width * this.dpr
    this.canvas.height = rect.height * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  clear() {
    const ctx = this.ctx
    const w = this._width
    const h = this._height

    // Interpolate background colors based on combo level
    const combo = this.combo
    let topR = 0x2D, topG = 0x3A, topB = 0x8C
    let midR = 0x7B, midG = 0xA7, midB = 0xCC
    let botR = 0xE8, botG = 0xD5, botB = 0xB5

    if (combo >= 20) {
      // Warm/energetic: deeper purple top, warm orange mid, golden bottom
      topR = 0x5B; topG = 0x21; topB = 0x8C
      midR = 0xCC; midG = 0x7B; midB = 0x5C
      botR = 0xF5; botG = 0xC0; botB = 0x6B
    } else if (combo >= 10) {
      // Warmer: slightly purple top, warm mid
      const t = (combo - 10) / 10
      topR = Math.round(0x2D + (0x5B - 0x2D) * t)
      topG = Math.round(0x3A + (0x21 - 0x3A) * t)
      topB = 0x8C
      midR = Math.round(0x7B + (0xCC - 0x7B) * t)
      midG = Math.round(0xA7 + (0x7B - 0xA7) * t)
      midB = Math.round(0xCC + (0x5C - 0xCC) * t)
      botR = Math.round(0xE8 + (0xF5 - 0xE8) * t)
      botG = Math.round(0xD5 + (0xC0 - 0xD5) * t)
      botB = Math.round(0xB5 + (0x6B - 0xB5) * t)
    } else if (combo >= 5) {
      // Slightly more vibrant
      const t = (combo - 5) / 5
      topR = Math.round(0x2D + (0x35 - 0x2D) * t)
      topG = Math.round(0x3A + (0x30 - 0x3A) * t)
      topB = Math.round(0x8C + (0x9E - 0x8C) * t)
      midR = Math.round(0x7B + (0x85 - 0x7B) * t)
      midG = Math.round(0xA7 + (0xAF - 0xA7) * t)
      midB = Math.round(0xCC + (0xDD - 0xCC) * t)
    }

    // Apply desaturation on combo break
    if (this.comboBreakDesat > 0) {
      const d = this.comboBreakDesat
      const avgTop = (topR + topG + topB) / 3
      const avgMid = (midR + midG + midB) / 3
      const avgBot = (botR + botG + botB) / 3
      topR = Math.round(topR + (avgTop - topR) * d)
      topG = Math.round(topG + (avgTop - topG) * d)
      topB = Math.round(topB + (avgTop - topB) * d)
      midR = Math.round(midR + (avgMid - midR) * d)
      midG = Math.round(midG + (avgMid - midG) * d)
      midB = Math.round(midB + (avgMid - midB) * d)
      botR = Math.round(botR + (avgBot - botR) * d)
      botG = Math.round(botG + (avgBot - botG) * d)
      botB = Math.round(botB + (avgBot - botB) * d)
    }

    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, `rgb(${topR},${topG},${topB})`)
    grad.addColorStop(0.5, `rgb(${midR},${midG},${midB})`)
    grad.addColorStop(1, `rgb(${botR},${botG},${botB})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  drawWarningLine() {
    const ctx = this.ctx
    const y = this.warningY

    ctx.save()
    ctx.strokeStyle = WARNING_LINE_COLOR
    ctx.lineWidth = 2
    ctx.setLineDash([8, 8])
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(this._width, y)
    ctx.stroke()
    ctx.restore()
  }

  drawGroundLine() {
    const ctx = this.ctx
    const y = this.groundY

    ctx.save()
    ctx.strokeStyle = GROUND_COLOR
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(this._width, y)
    ctx.stroke()
    ctx.restore()
  }

  /** Subtle thrill zone overlay between warning line and ground */
  private drawThrillZone() {
    const ctx = this.ctx
    const thrillTop = this.warningY
    const thrillHeight = this.groundY - thrillTop
    ctx.save()
    ctx.fillStyle = 'rgba(251, 146, 60, 0.04)'
    ctx.fillRect(0, thrillTop, this._width, thrillHeight)
    ctx.restore()
  }

  drawKana(kana: FallingKana) {
    if (kana.state === 'hit-animating') {
      this.drawHitAnimation(kana)
      return
    }

    if (kana.state === 'showing-answer') {
      this.drawShowingAnswer(kana)
      return
    }

    const ctx = this.ctx
    const isWarning = kana.y >= this.warningY
    const size = isWarning ? 60 : 52
    const color = isWarning ? WARNING_COLOR : KANA_COLOR

    // Focus kana: purple glow halo behind the character
    if (kana.isFocusKana) {
      ctx.save()
      const gradient = ctx.createRadialGradient(kana.x, kana.y, 0, kana.x, kana.y, 25)
      gradient.addColorStop(0, 'rgba(147, 51, 234, 0.15)')
      gradient.addColorStop(1, 'rgba(147, 51, 234, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(kana.x - 25, kana.y - 25, 50, 50)
      ctx.restore()
    }

    ctx.save()
    ctx.font = `bold ${size}px 'M PLUS Rounded 1c', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Glow for warning state
    if (isWarning) {
      ctx.shadowColor = WARNING_COLOR
      ctx.shadowBlur = 16
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 4
    }

    // Dark stroke for readability
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 3
    ctx.strokeText(kana.kana, kana.x, kana.y)

    ctx.fillStyle = color
    ctx.fillText(kana.kana, kana.x, kana.y)

    // Romaji hint below kana
    if (kana.romajiOpacity > 0) {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      const hintSize = Math.round(size * 0.38)
      ctx.font = `bold ${hintSize}px 'Inter', sans-serif`
      ctx.fillStyle = `rgba(255, 255, 255, ${kana.romajiOpacity})`
      ctx.fillText(kana.romaji[0], kana.x, kana.y + size * 0.55)
    }

    ctx.restore()
  }

  /** 4-phase hit explosion: scale up → glow → burst → fade */
  private drawHitAnimation(kana: FallingKana) {
    const ctx = this.ctx
    const t = kana.stateTimer

    let scale = 1
    let alpha = 1
    let glowIntensity = 0

    if (t < HIT_PHASE1) {
      // Phase 1: scale up
      const p = t / HIT_PHASE1
      scale = 1 + 0.3 * p
      glowIntensity = p * 0.5
    } else if (t < HIT_PHASE2) {
      // Phase 2: peak glow
      const p = (t - HIT_PHASE1) / (HIT_PHASE2 - HIT_PHASE1)
      scale = 1.3
      glowIntensity = 0.5 + p * 0.5
    } else if (t < HIT_PHASE3) {
      // Phase 3: shrink + scatter
      const p = (t - HIT_PHASE2) / (HIT_PHASE3 - HIT_PHASE2)
      scale = 1.3 * (1 - p * 0.8)
      alpha = 1 - p * 0.5
      glowIntensity = 1 - p
    } else {
      // Phase 4: fade out
      const p = (t - HIT_PHASE3) / (HIT_TOTAL - HIT_PHASE3)
      scale = 1.3 * 0.2 * (1 - p)
      alpha = 0.5 * (1 - p)
      glowIntensity = 0
    }

    if (alpha <= 0.01) return

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(kana.x, kana.y)
    ctx.scale(scale, scale)

    const size = 52
    ctx.font = `bold ${size}px 'M PLUS Rounded 1c', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Golden glow
    if (glowIntensity > 0) {
      ctx.shadowColor = '#F9B233'
      ctx.shadowBlur = 20 + glowIntensity * 30
    }

    // White → gold blend based on glow intensity
    const g = Math.round(255 - glowIntensity * 77)  // 255→178
    const b = Math.round(255 - glowIntensity * 204)  // 255→51
    ctx.fillStyle = `rgb(255,${g},${b})`
    ctx.fillText(kana.kana, 0, 0)

    ctx.restore()
  }

  /** Stopped kana showing the correct romaji answer */
  private drawShowingAnswer(kana: FallingKana) {
    const ctx = this.ctx
    const t = kana.stateTimer

    // Fade out in last 300ms
    let alpha = 1
    if (t > ANSWER_FADE_START) {
      alpha = Math.max(0, 1 - (t - ANSWER_FADE_START) / 0.3)
    }
    if (alpha <= 0) return

    const size = 52

    ctx.save()
    ctx.globalAlpha = alpha

    // Semi-transparent background pill
    const pillW = size * 2.2
    const pillH = size * 1.8
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    const rx = kana.x - pillW / 2
    const ry = kana.y - pillH * 0.45
    ctx.beginPath()
    ctx.roundRect(rx, ry, pillW, pillH, 12)
    ctx.fill()

    // Grey kana
    ctx.font = `bold ${size}px 'M PLUS Rounded 1c', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.fillText(kana.kana, kana.x, kana.y)

    // Red romaji answer
    const answerSize = Math.round(size * 0.5)
    ctx.font = `bold ${answerSize}px 'Inter', sans-serif`
    ctx.fillStyle = '#E84855'
    ctx.fillText(kana.romaji[0], kana.x, kana.y + size * 0.55)

    ctx.restore()
  }

  /** Red overlay flash on combo break */
  private drawComboBreakFlash() {
    if (this.comboBreakFlash <= 0) return

    const ctx = this.ctx
    ctx.save()
    ctx.fillStyle = `rgba(232, 72, 85, ${this.comboBreakFlash * 0.3})`
    ctx.fillRect(0, 0, this._width, this._height)
    ctx.restore()
  }

  /** Golden flash on successful hit */
  private drawHitFlash() {
    if (this.hitFlash <= 0) return

    const ctx = this.ctx
    ctx.save()
    ctx.fillStyle = `rgba(249, 178, 51, ${this.hitFlash * 0.12})`
    ctx.fillRect(0, 0, this._width, this._height)
    ctx.restore()
  }

  /** Gold border pulse on combo milestones */
  private drawMilestoneBorder() {
    if (this.milestoneBorderFlash <= 0) return

    const ctx = this.ctx
    const w = this._width
    const h = this._height
    const alpha = this.milestoneBorderFlash * 0.6
    const thickness = 4 + this.milestoneBorderFlash * 8

    ctx.save()
    ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`
    ctx.lineWidth = thickness
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 15 * this.milestoneBorderFlash
    ctx.strokeRect(thickness / 2, thickness / 2, w - thickness, h - thickness)
    ctx.restore()
  }

  drawParticles(particles: Particle[]) {
    const ctx = this.ctx
    for (const p of particles) {
      const alpha = p.life / p.maxLife
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  drawFloatingTexts(texts: FloatingText[], now: number) {
    const ctx = this.ctx

    for (const ft of texts) {
      const elapsed = (now - ft.startTime) / 1000
      const progress = Math.min(1, elapsed / ft.duration)
      if (progress >= 1) continue

      ctx.save()

      // Score texts drift upward; milestone texts scale up then fade
      const isMilestone = ft.fontSize >= 48

      if (isMilestone) {
        // Scale-up + fade-out for milestones
        const scaleIn = Math.min(1, progress * 5) // 0→1 in first 20% of duration
        const scale = 0.5 + scaleIn * 0.5 // 0.5 → 1.0
        const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3

        ctx.globalAlpha = alpha
        ctx.translate(ft.x, ft.y)
        ctx.scale(scale, scale)

        ctx.font = `900 ${ft.fontSize}px 'M PLUS Rounded 1c', sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Outline
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'
        ctx.lineWidth = 4
        ctx.strokeText(ft.text, 0, 0)

        // Glow
        ctx.shadowColor = ft.color
        ctx.shadowBlur = 20
        ctx.fillStyle = ft.color
        ctx.fillText(ft.text, 0, 0)
      } else {
        // Score popup: drift upward + fade
        const driftY = -50 * progress
        const alpha = 1 - progress

        ctx.globalAlpha = alpha
        ctx.font = `bold ${ft.fontSize}px 'Inter', sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        ctx.strokeStyle = 'rgba(0,0,0,0.5)'
        ctx.lineWidth = 2
        ctx.strokeText(ft.text, ft.x, ft.y + driftY)

        ctx.fillStyle = ft.color
        ctx.fillText(ft.text, ft.x, ft.y + driftY)
      }

      ctx.restore()
    }
  }

  /** Update and draw slow-floating ambient sparkle particles */
  private updateAmbientParticles(dt: number) {
    const combo = this.combo
    // Sparkles start at combo 10, increase density at 20+
    const targetDensity = combo >= 20 ? 12 : combo >= 10 ? 5 : 0

    // Spawn new sparkles
    if (targetDensity > 0) {
      this.ambientSpawnTimer += dt
      const spawnInterval = 1 / (targetDensity * 0.5)
      while (this.ambientSpawnTimer >= spawnInterval && this.ambientParticles.length < targetDensity * 3) {
        this.ambientSpawnTimer -= spawnInterval
        this.ambientParticles.push({
          x: Math.random() * this._width,
          y: Math.random() * this._height,
          vx: (Math.random() - 0.5) * 8,
          vy: -5 - Math.random() * 10,
          life: 2 + Math.random() * 3,
          maxLife: 2 + Math.random() * 3,
          size: 1 + Math.random() * 2,
        })
      }
    }

    // Update existing
    const ctx = this.ctx
    for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
      const p = this.ambientParticles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt

      if (p.life <= 0) {
        this.ambientParticles.splice(i, 1)
        continue
      }

      const alpha = Math.min(1, p.life / p.maxLife, (p.maxLife - p.life) / 0.5) * 0.4
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = combo >= 20 ? '#FFE4B5' : '#E0F2FE'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  /** Trigger a shockwave ring expanding from (cx, cy) */
  triggerShockwave(cx: number, cy: number) {
    this.shockwave = { cx, cy, radius: 0, alpha: 0.7 }
  }

  /** Update and draw shockwave ring */
  private updateShockwave(dt: number) {
    if (!this.shockwave) return
    const sw = this.shockwave
    sw.radius += 400 * dt
    sw.alpha -= dt * 0.7

    if (sw.alpha <= 0) {
      this.shockwave = null
      return
    }

    const ctx = this.ctx
    ctx.save()
    ctx.strokeStyle = `rgba(255, 215, 0, ${sw.alpha})`
    ctx.lineWidth = 3 + sw.alpha * 5
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 10 * sw.alpha
    ctx.beginPath()
    ctx.arc(sw.cx, sw.cy, sw.radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  /** Decay time-based visual effects */
  updateEffects(dt: number) {
    if (this.comboBreakDesat > 0) {
      this.comboBreakDesat -= dt * 2 // ~0.5s decay
      if (this.comboBreakDesat < 0) this.comboBreakDesat = 0
    }
    if (this.milestoneBorderFlash > 0) {
      this.milestoneBorderFlash -= dt * 1.5 // ~0.67s decay
      if (this.milestoneBorderFlash < 0) this.milestoneBorderFlash = 0
    }
  }

  render(fallingKana: FallingKana[], particles: Particle[], floatingTexts: FloatingText[] = [], dt = 0) {
    this.updateEffects(dt)
    this.clear()
    this.bgSystem.draw(this.ctx, this._width, this._height)
    this.updateAmbientParticles(dt)
    this.drawThrillZone()
    this.drawWarningLine()
    this.drawGroundLine()

    for (const k of fallingKana) {
      if (k.state === 'falling' || k.state === 'warning' ||
          k.state === 'hit-animating' || k.state === 'showing-answer') {
        this.drawKana(k)
      }
    }

    this.drawParticles(particles)
    this.drawFloatingTexts(floatingTexts, performance.now())
    this.drawHitFlash()
    this.drawMilestoneBorder()
    this.updateShockwave(dt)
    this.drawComboBreakFlash()
  }
}
