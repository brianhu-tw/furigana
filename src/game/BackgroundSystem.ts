// Background System: Progressive Japanese scenery that rewards longer play
// Stage 0: pure gradient (existing). Stage 1-4: scenery fades in over time.

import { EasterEggManager } from './EasterEggs'

// ── Theme configuration ──

interface ThemeConfig {
  name: string
  landmark: 'fuji' | 'torii' | 'mountains' | 'sakuraTree'
  particle: 'sakura' | 'snow'
  skyTint: string // subtle color overlay that blends with existing gradient
}

const THEME_MAP: Record<string, ThemeConfig> = {
  'あ': { name: 'sakura', landmark: 'sakuraTree', particle: 'sakura', skyTint: 'rgba(255,183,197,0.06)' },
  'か': { name: 'torii', landmark: 'torii', particle: 'sakura', skyTint: 'rgba(192,57,43,0.04)' },
  'さ': { name: 'fuji', landmark: 'fuji', particle: 'snow', skyTint: 'rgba(74,111,165,0.05)' },
  'た': { name: 'bamboo', landmark: 'mountains', particle: 'sakura', skyTint: 'rgba(100,180,100,0.04)' },
  'な': { name: 'matsuri', landmark: 'torii', particle: 'sakura', skyTint: 'rgba(255,165,0,0.04)' },
  'は': { name: 'kouyou', landmark: 'sakuraTree', particle: 'sakura', skyTint: 'rgba(204,51,0,0.04)' },
  'ま': { name: 'yuki', landmark: 'fuji', particle: 'snow', skyTint: 'rgba(200,210,230,0.05)' },
  'や': { name: 'umi', landmark: 'mountains', particle: 'snow', skyTint: 'rgba(44,95,124,0.04)' },
  'ら': { name: 'hoshi', landmark: 'mountains', particle: 'snow', skyTint: 'rgba(60,50,120,0.04)' },
  'わ': { name: 'niwa', landmark: 'sakuraTree', particle: 'sakura', skyTint: 'rgba(100,140,100,0.04)' },
}

const DEFAULT_THEME: ThemeConfig = {
  name: 'default',
  landmark: 'fuji',
  particle: 'sakura',
  skyTint: 'rgba(100,100,180,0.03)',
}

// ── Particle types ──

interface BgParticle {
  x: number
  y: number
  size: number
  rotation: number
  rotSpeed: number
  fallSpeed: number
  swayPhase: number
  swayAmp: number
  swayFreq: number
  color: string
  alpha: number
  type: 'sakura' | 'snow'
  snowStyle: 'dot' | 'star'
}

// ── Stage timing ──

const STAGE_THRESHOLDS = [0, 20, 45, 75, 120] // seconds
const STAGE_ALPHA_RANGES: [number, number][] = [
  [0, 0],         // stage 0: nothing
  [0.05, 0.12],   // stage 1: far silhouettes
  [0.10, 0.20],   // stage 2: mid elements + particles
  [0.20, 0.30],   // stage 3: full scene
  [0.30, 0.40],   // stage 4: golden hour
]

// Particle limits
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
const MAX_PARTICLES = isMobile ? 15 : 25

const SAKURA_COLORS = ['#ffb7c5', '#ff9eb5', '#ffc5d3', '#ffd5df', '#ffffff']
const SNOW_COLORS = ['#ffffff', '#e8eef5', '#d0d8e5', '#f0f5ff']

export class BackgroundSystem {
  private stage = 0
  private stageAlpha = 0 // current interpolated alpha within stage range
  private theme: ThemeConfig = DEFAULT_THEME
  private elapsed = 0
  private particles: BgParticle[] = []
  private themeIndex = 0
  private themeRotateTimer = 0
  easterEggs: EasterEggManager

  // Cached geometry for static landmarks (invalidated on resize)
  private cachedW = 0
  private cachedH = 0

  constructor() {
    this.easterEggs = new EasterEggManager()
  }

  update(dt: number, elapsed: number, combo: number, kanaRows: string[]) {
    this.elapsed = elapsed
    this.updateStage(elapsed)
    this.updateTheme(kanaRows, dt)
    if (this.stage >= 2) {
      this.updateParticles(dt, elapsed)
    }
    this.easterEggs.update(dt, elapsed, combo, this.stage)
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.stage < 1) return // stage 0: nothing to draw

    // Check if canvas size changed
    if (w !== this.cachedW || h !== this.cachedH) {
      this.cachedW = w
      this.cachedH = h
    }

    const time = this.elapsed

    // Layer 1: Far silhouettes (stage 1+)
    if (this.stage >= 1) {
      this.drawFarMountains(ctx, w, h, time)
    }

    // Layer 2: Mid landmark (stage 2+)
    if (this.stage >= 2) {
      this.drawLandmark(ctx, w, h, time)
    }

    // Layer 3: Particles (stage 2+)
    if (this.stage >= 2) {
      this.drawParticles(ctx)
    }

    // Layer 4: Easter eggs (any stage, managed separately)
    this.easterEggs.draw(ctx, w, h, time)

    // Layer 5: Sky tint overlay
    if (this.stage >= 2) {
      ctx.save()
      ctx.globalAlpha = this.stageAlpha * 0.5
      ctx.fillStyle = this.theme.skyTint
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }

    // Layer 6: Golden hour (stage 4)
    if (this.stage >= 4) {
      this.drawGoldenHour(ctx, w, h, time)
    }
  }

  // ── Stage management ──

  private updateStage(elapsed: number) {
    let newStage = 0
    for (let i = STAGE_THRESHOLDS.length - 1; i >= 0; i--) {
      if (elapsed >= STAGE_THRESHOLDS[i]) {
        newStage = i
        break
      }
    }
    this.stage = newStage

    if (newStage === 0) {
      this.stageAlpha = 0
      return
    }

    // Interpolate alpha within current stage
    const stageStart = STAGE_THRESHOLDS[newStage]
    const stageEnd = newStage < STAGE_THRESHOLDS.length - 1
      ? STAGE_THRESHOLDS[newStage + 1]
      : stageStart + 60 // stage 4 ramps over 60s
    const progress = Math.min(1, (elapsed - stageStart) / (stageEnd - stageStart))
    const [minA, maxA] = STAGE_ALPHA_RANGES[newStage]
    this.stageAlpha = minA + (maxA - minA) * progress
  }

  // ── Theme management ──

  private updateTheme(kanaRows: string[], dt: number) {
    // Build theme list from selected rows
    const themes: ThemeConfig[] = []
    for (const row of kanaRows) {
      const t = THEME_MAP[row]
      if (t) themes.push(t)
    }

    if (themes.length === 0) {
      this.theme = DEFAULT_THEME
      return
    }

    if (themes.length === 1) {
      this.theme = themes[0]
      return
    }

    // Multi-row: rotate theme every 30s
    this.themeRotateTimer += dt
    if (this.themeRotateTimer >= 30) {
      this.themeRotateTimer = 0
      this.themeIndex = (this.themeIndex + 1) % themes.length
    }
    this.theme = themes[this.themeIndex % themes.length]
  }

  // ── Far mountains (stage 1+) ──

  private drawFarMountains(ctx: CanvasRenderingContext2D, w: number, h: number, _time: number) {
    ctx.save()
    ctx.globalAlpha = this.stageAlpha * 0.7

    const baseY = h * 0.82
    ctx.fillStyle = '#1a1a3e'

    // Back mountain range — gentle bezier curves
    ctx.beginPath()
    ctx.moveTo(0, baseY)
    ctx.quadraticCurveTo(w * 0.15, baseY - h * 0.10, w * 0.25, baseY - h * 0.06)
    ctx.quadraticCurveTo(w * 0.35, baseY - h * 0.15, w * 0.45, baseY - h * 0.08)
    ctx.quadraticCurveTo(w * 0.55, baseY - h * 0.20, w * 0.65, baseY - h * 0.12)
    ctx.quadraticCurveTo(w * 0.75, baseY - h * 0.07, w * 0.85, baseY - h * 0.14)
    ctx.quadraticCurveTo(w * 0.95, baseY - h * 0.05, w, baseY)
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fill()

    // Front smaller hills — slightly lighter
    ctx.globalAlpha = this.stageAlpha * 0.4
    ctx.fillStyle = '#252550'
    const hillY = h * 0.86
    ctx.beginPath()
    ctx.moveTo(0, hillY)
    ctx.quadraticCurveTo(w * 0.2, hillY - h * 0.04, w * 0.35, hillY - h * 0.02)
    ctx.quadraticCurveTo(w * 0.5, hillY - h * 0.06, w * 0.7, hillY - h * 0.03)
    ctx.quadraticCurveTo(w * 0.85, hillY - h * 0.05, w, hillY)
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }

  // ── Landmark drawing (stage 2+) ──

  private drawLandmark(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    switch (this.theme.landmark) {
      case 'fuji':
        this.drawMtFuji(ctx, w, h, time)
        break
      case 'torii':
        this.drawTorii(ctx, w, h, time)
        break
      case 'sakuraTree':
        this.drawSakuraTree(ctx, w, h, time)
        break
      case 'mountains':
        // Already drawn in far mountains, add extra detail
        this.drawDetailedMountain(ctx, w, h, time)
        break
    }
  }

  // ── Mt. Fuji ──

  private drawMtFuji(ctx: CanvasRenderingContext2D, w: number, h: number, _time: number) {
    ctx.save()
    ctx.globalAlpha = this.stageAlpha

    const cx = w * 0.5
    const baseY = h * 0.78
    const peakY = h * 0.30
    const baseHalfW = w * 0.38

    // Main body
    ctx.beginPath()
    ctx.moveTo(cx - baseHalfW, baseY)
    ctx.quadraticCurveTo(cx - baseHalfW * 0.45, baseY - (baseY - peakY) * 0.55, cx, peakY)
    ctx.quadraticCurveTo(cx + baseHalfW * 0.45, baseY - (baseY - peakY) * 0.55, cx + baseHalfW, baseY)
    ctx.closePath()
    ctx.fillStyle = '#4a6fa5'
    ctx.fill()

    // Snow cap
    const snowY = peakY + (baseY - peakY) * 0.25
    const snowHalfW = baseHalfW * 0.32

    ctx.beginPath()
    ctx.moveTo(cx, peakY)
    ctx.lineTo(cx - snowHalfW * 0.3, peakY + (snowY - peakY) * 0.4)
    ctx.lineTo(cx - snowHalfW * 0.55, peakY + (snowY - peakY) * 0.55)
    ctx.lineTo(cx - snowHalfW * 0.7, peakY + (snowY - peakY) * 0.7)
    ctx.lineTo(cx - snowHalfW, snowY)
    ctx.quadraticCurveTo(cx - snowHalfW * 0.5, snowY + (baseY - peakY) * 0.04,
      cx, snowY - (baseY - peakY) * 0.02)
    ctx.quadraticCurveTo(cx + snowHalfW * 0.5, snowY + (baseY - peakY) * 0.04,
      cx + snowHalfW, snowY)
    ctx.lineTo(cx + snowHalfW * 0.7, peakY + (snowY - peakY) * 0.7)
    ctx.lineTo(cx + snowHalfW * 0.55, peakY + (snowY - peakY) * 0.55)
    ctx.lineTo(cx + snowHalfW * 0.3, peakY + (snowY - peakY) * 0.4)
    ctx.closePath()
    ctx.fillStyle = '#e8eef5'
    ctx.fill()

    // Lake reflection
    const lakeY = baseY + h * 0.02
    const lakeH = h * 0.06
    ctx.globalAlpha = this.stageAlpha * 0.3
    ctx.beginPath()
    ctx.moveTo(cx - baseHalfW * 0.6, lakeY)
    ctx.quadraticCurveTo(cx, lakeY + lakeH, cx + baseHalfW * 0.6, lakeY)
    ctx.closePath()
    ctx.fillStyle = '#4a6fa5'
    ctx.fill()

    ctx.restore()
  }

  // ── Torii gate ──

  private drawTorii(ctx: CanvasRenderingContext2D, w: number, h: number, _time: number) {
    ctx.save()
    ctx.globalAlpha = this.stageAlpha

    const cx = w * 0.5
    const waterY = h * 0.75
    const toriiH = h * 0.25
    const topY = waterY - toriiH
    const pillarSpan = w * 0.15
    const pillarW = w * 0.016
    const color = '#c0392b'

    // Left pillar
    ctx.beginPath()
    ctx.moveTo(cx - pillarSpan - pillarW * 0.6, waterY)
    ctx.lineTo(cx - pillarSpan - pillarW * 0.4, topY + toriiH * 0.12)
    ctx.lineTo(cx - pillarSpan + pillarW * 0.4, topY + toriiH * 0.12)
    ctx.lineTo(cx - pillarSpan + pillarW * 0.6, waterY)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()

    // Right pillar
    ctx.beginPath()
    ctx.moveTo(cx + pillarSpan - pillarW * 0.6, waterY)
    ctx.lineTo(cx + pillarSpan - pillarW * 0.4, topY + toriiH * 0.12)
    ctx.lineTo(cx + pillarSpan + pillarW * 0.4, topY + toriiH * 0.12)
    ctx.lineTo(cx + pillarSpan + pillarW * 0.6, waterY)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()

    // Upper crossbeam (kasagi) with upturned ends
    const kasagiExtend = pillarSpan * 1.4
    const kasagiH = toriiH * 0.045

    ctx.beginPath()
    ctx.moveTo(cx - kasagiExtend, topY + kasagiH)
    ctx.quadraticCurveTo(cx - kasagiExtend * 0.95, topY - kasagiH * 1.5,
      cx - kasagiExtend * 0.85, topY - kasagiH * 2)
    ctx.lineTo(cx + kasagiExtend * 0.85, topY - kasagiH * 2)
    ctx.quadraticCurveTo(cx + kasagiExtend * 0.95, topY - kasagiH * 1.5,
      cx + kasagiExtend, topY + kasagiH)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()

    // Lower crossbeam (nuki)
    const nukiY = topY + toriiH * 0.14
    const nukiH = toriiH * 0.025
    const nukiExtend = pillarSpan * 1.1
    ctx.fillRect(cx - nukiExtend, nukiY, nukiExtend * 2, nukiH)

    // Water surface
    ctx.globalAlpha = this.stageAlpha * 0.2
    ctx.fillStyle = '#2c5f7c'
    ctx.fillRect(0, waterY, w, h * 0.02)

    ctx.restore()
  }

  // ── Sakura tree ──

  private drawSakuraTree(ctx: CanvasRenderingContext2D, w: number, h: number, _time: number) {
    ctx.save()
    ctx.globalAlpha = this.stageAlpha

    const treeX = w * 0.2
    const baseY = h * 0.82
    const trunkW = w * 0.02
    const trunkH = h * 0.18

    // Trunk
    ctx.fillStyle = '#4a3728'
    ctx.beginPath()
    ctx.moveTo(treeX - trunkW, baseY)
    ctx.lineTo(treeX - trunkW * 0.5, baseY - trunkH)
    ctx.lineTo(treeX + trunkW * 0.5, baseY - trunkH)
    ctx.lineTo(treeX + trunkW, baseY)
    ctx.closePath()
    ctx.fill()

    // Branches (simple lines)
    ctx.strokeStyle = '#4a3728'
    ctx.lineWidth = trunkW * 0.4
    ctx.lineCap = 'round'

    ctx.beginPath()
    ctx.moveTo(treeX, baseY - trunkH * 0.7)
    ctx.quadraticCurveTo(treeX - w * 0.06, baseY - trunkH * 0.9, treeX - w * 0.08, baseY - trunkH * 0.85)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(treeX, baseY - trunkH * 0.8)
    ctx.quadraticCurveTo(treeX + w * 0.05, baseY - trunkH * 1.0, treeX + w * 0.07, baseY - trunkH * 0.95)
    ctx.stroke()

    // Canopy — overlapping circles with pink tones
    const canopyColors = ['#ffb7c5', '#ffc5d3', '#ff9eb5']
    const canopyCenters = [
      { x: treeX - w * 0.04, y: baseY - trunkH * 0.9, r: w * 0.05 },
      { x: treeX + w * 0.02, y: baseY - trunkH * 1.0, r: w * 0.06 },
      { x: treeX - w * 0.06, y: baseY - trunkH * 0.8, r: w * 0.04 },
      { x: treeX + w * 0.06, y: baseY - trunkH * 0.85, r: w * 0.045 },
      { x: treeX, y: baseY - trunkH * 1.05, r: w * 0.04 },
    ]

    for (let i = 0; i < canopyCenters.length; i++) {
      const c = canopyCenters[i]
      ctx.fillStyle = canopyColors[i % canopyColors.length]
      ctx.beginPath()
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  // ── Detailed mountain (extra for mountains theme) ──

  private drawDetailedMountain(ctx: CanvasRenderingContext2D, w: number, h: number, _time: number) {
    ctx.save()
    ctx.globalAlpha = this.stageAlpha * 0.6

    // A prominent central peak
    const cx = w * 0.55
    const baseY = h * 0.80
    const peakY = h * 0.35

    ctx.beginPath()
    ctx.moveTo(cx - w * 0.25, baseY)
    ctx.quadraticCurveTo(cx - w * 0.12, baseY - (baseY - peakY) * 0.4, cx, peakY)
    ctx.quadraticCurveTo(cx + w * 0.12, baseY - (baseY - peakY) * 0.4, cx + w * 0.25, baseY)
    ctx.closePath()
    ctx.fillStyle = '#2a2a50'
    ctx.fill()

    // Snow highlight on peak
    ctx.globalAlpha = this.stageAlpha * 0.4
    ctx.beginPath()
    ctx.moveTo(cx, peakY)
    ctx.lineTo(cx - w * 0.04, peakY + h * 0.05)
    ctx.quadraticCurveTo(cx, peakY + h * 0.04, cx + w * 0.04, peakY + h * 0.05)
    ctx.closePath()
    ctx.fillStyle = '#d0d8e8'
    ctx.fill()

    ctx.restore()
  }

  // ── Particle system ──

  private updateParticles(dt: number, time: number) {
    const w = this.cachedW || 400
    const h = this.cachedH || 700

    // Target particle count based on stage
    const target = this.stage >= 4 ? MAX_PARTICLES
      : this.stage >= 3 ? Math.floor(MAX_PARTICLES * 0.7)
      : Math.floor(MAX_PARTICLES * 0.5)

    // Spawn to reach target
    while (this.particles.length < target) {
      this.particles.push(this.spawnParticle(w, h, true))
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.y += p.fallSpeed * dt
      p.x += Math.sin(time * p.swayFreq + p.swayPhase) * p.swayAmp * dt
      p.rotation += p.rotSpeed * dt

      // Respawn if below canvas
      if (p.y > h * 1.05) {
        p.y = -p.size * 2
        p.x = Math.random() * w
      }
    }

    // Trim excess
    while (this.particles.length > target) {
      this.particles.pop()
    }
  }

  private spawnParticle(w: number, h: number, randomY: boolean): BgParticle {
    const type = this.theme.particle
    if (type === 'snow') {
      return this.spawnSnowflake(w, h, randomY)
    }
    return this.spawnSakura(w, h, randomY)
  }

  private spawnSakura(w: number, h: number, randomY: boolean): BgParticle {
    return {
      x: Math.random() * w,
      y: randomY ? Math.random() * h : -10,
      size: w * (0.005 + Math.random() * 0.007),
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 3,
      fallSpeed: h * (0.02 + Math.random() * 0.03),
      swayPhase: Math.random() * Math.PI * 2,
      swayAmp: w * (0.02 + Math.random() * 0.03),
      swayFreq: 0.5 + Math.random() * 1.0,
      color: SAKURA_COLORS[Math.floor(Math.random() * SAKURA_COLORS.length)],
      alpha: 0.3 + Math.random() * 0.35,
      type: 'sakura',
      snowStyle: 'dot',
    }
  }

  private spawnSnowflake(w: number, h: number, randomY: boolean): BgParticle {
    const size = w * (0.002 + Math.random() * 0.006)
    return {
      x: Math.random() * w,
      y: randomY ? Math.random() * h : -5,
      size,
      rotation: 0,
      rotSpeed: 0,
      fallSpeed: h * (0.01 + Math.random() * 0.03),
      swayPhase: Math.random() * Math.PI * 2,
      swayAmp: w * (0.01 + Math.random() * 0.02),
      swayFreq: 0.3 + Math.random() * 0.5,
      color: SNOW_COLORS[Math.floor(Math.random() * SNOW_COLORS.length)],
      alpha: 0.25 + Math.random() * 0.4,
      type: 'snow',
      snowStyle: size > w * 0.005 ? 'star' : 'dot',
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (p.type === 'sakura') {
        this.drawSakuraPetal(ctx, p)
      } else {
        this.drawSnowflake(ctx, p)
      }
    }
  }

  private drawSakuraPetal(ctx: CanvasRenderingContext2D, p: BgParticle) {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)
    ctx.globalAlpha = p.alpha * this.stageAlpha * 3 // boost so particles are visible at low stage alpha
    ctx.fillStyle = p.color

    const s = p.size
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.3)
    ctx.quadraticCurveTo(s * 0.6, -s * 0.5, s * 0.4, 0)
    ctx.quadraticCurveTo(s * 0.2, s * 0.3, 0, s * 0.5)
    ctx.quadraticCurveTo(-s * 0.2, s * 0.3, -s * 0.4, 0)
    ctx.quadraticCurveTo(-s * 0.6, -s * 0.5, 0, -s * 0.3)
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }

  private drawSnowflake(ctx: CanvasRenderingContext2D, p: BgParticle) {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.globalAlpha = p.alpha * this.stageAlpha * 3
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#ffffff'

    if (p.snowStyle === 'dot' || p.size < 3) {
      ctx.beginPath()
      ctx.arc(0, 0, p.size, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // 6-pointed star
      ctx.rotate(this.elapsed * 0.3)
      ctx.lineWidth = p.size * 0.15
      ctx.lineCap = 'round'
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(angle) * p.size, Math.sin(angle) * p.size)
        ctx.stroke()
        // Small branch at 60%
        const bx = Math.cos(angle) * p.size * 0.6
        const by = Math.sin(angle) * p.size * 0.6
        const branchAngle = angle + Math.PI / 6
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + Math.cos(branchAngle) * p.size * 0.3,
          by + Math.sin(branchAngle) * p.size * 0.3)
        ctx.stroke()
      }
    }

    ctx.restore()
  }

  // ── Golden hour overlay (stage 4) ──

  private drawGoldenHour(ctx: CanvasRenderingContext2D, w: number, h: number, _time: number) {
    // Warm golden tint across the whole canvas
    const goldenProgress = Math.min(1, (this.elapsed - 120) / 60) // ramps over 60s
    ctx.save()
    ctx.globalAlpha = goldenProgress * 0.12
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#FFD700')
    grad.addColorStop(0.4, '#FFA500')
    grad.addColorStop(1, '#FF8C00')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }
}
