// Easter Egg system: surprise background animations triggered by time/combo

interface EasterEggInstance {
  type: 'walkingCat' | 'manekiNeko'
  x: number
  y: number
  lifetime: number
  maxLifetime: number
  active: boolean
  // Cat-specific
  direction?: 1 | -1
  speed?: number
  // Maneki-specific
  peekAmount?: number
  triggered?: boolean
}

export class EasterEggManager {
  private instances: EasterEggInstance[] = []
  private lastRandomCheck = 0
  private manekiTriggeredForCombo = false
  private lastCombo = 0

  update(dt: number, elapsed: number, combo: number, stage: number) {
    // Reset maneki trigger tracking when combo drops below threshold
    if (combo < 30 && this.lastCombo >= 30) {
      this.manekiTriggeredForCombo = false
    }
    this.lastCombo = combo

    // Random easter egg check every 30s
    if (elapsed - this.lastRandomCheck >= 30) {
      this.lastRandomCheck = elapsed
      this.trySpawnRandom(stage)
    }

    // Deterministic triggers
    if (combo >= 30 && !this.manekiTriggeredForCombo && !this.hasActiveType('manekiNeko')) {
      this.spawnManekiNeko()
      this.manekiTriggeredForCombo = true
    }

    // Update active instances
    for (let i = this.instances.length - 1; i >= 0; i--) {
      const egg = this.instances[i]
      egg.lifetime += dt

      if (egg.type === 'walkingCat') {
        this.updateWalkingCat(egg, dt)
      } else if (egg.type === 'manekiNeko') {
        this.updateManekiNeko(egg, dt)
      }

      if (!egg.active || egg.lifetime >= egg.maxLifetime) {
        this.instances.splice(i, 1)
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    for (const egg of this.instances) {
      if (!egg.active) continue
      if (egg.type === 'walkingCat') {
        this.drawWalkingCat(ctx, w, h, egg, time)
      } else if (egg.type === 'manekiNeko') {
        this.drawManekiNeko(ctx, w, h, egg, time)
      }
    }
  }

  private hasActiveType(type: string): boolean {
    return this.instances.some(e => e.type === type && e.active)
  }

  private trySpawnRandom(stage: number) {
    // Max 1 easter egg at a time
    if (this.instances.length > 0) return

    // Walking cat: 3% chance, any stage (but more visible at stage 1+)
    if (stage >= 1 && Math.random() < 0.03) {
      this.spawnWalkingCat()
    }
  }

  // ── Walking Cat ──

  private spawnWalkingCat() {
    const dir = Math.random() < 0.5 ? 1 : -1 as 1 | -1
    this.instances.push({
      type: 'walkingCat',
      x: dir === 1 ? -0.1 : 1.1, // normalized x (fraction of w)
      y: 0,
      lifetime: 0,
      maxLifetime: 30, // generous timeout
      active: true,
      direction: dir,
      speed: 0.04, // fraction of w per second
    })
  }

  private updateWalkingCat(egg: EasterEggInstance, dt: number) {
    egg.x += (egg.direction ?? 1) * (egg.speed ?? 0.04) * dt

    // Deactivate when fully off-screen on the other side
    if ((egg.direction === 1 && egg.x > 1.1) ||
        (egg.direction === -1 && egg.x < -0.1)) {
      egg.active = false
    }
  }

  private drawWalkingCat(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
    egg: EasterEggInstance,
    time: number
  ) {
    ctx.save()

    const catX = egg.x * w
    const catY = h * 0.84
    ctx.translate(catX, catY)
    if (egg.direction === -1) ctx.scale(-1, 1)

    const s = w * 0.055
    ctx.fillStyle = '#2a2a2a'

    // Body (horizontal ellipse)
    ctx.beginPath()
    ctx.ellipse(0, -s * 0.35, s * 0.45, s * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()

    // Head (circle, slightly forward)
    ctx.beginPath()
    ctx.arc(s * 0.38, -s * 0.55, s * 0.2, 0, Math.PI * 2)
    ctx.fill()

    // Ears (two triangles)
    ctx.beginPath()
    ctx.moveTo(s * 0.28, -s * 0.70)
    ctx.lineTo(s * 0.22, -s * 0.90)
    ctx.lineTo(s * 0.38, -s * 0.75)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(s * 0.42, -s * 0.70)
    ctx.lineTo(s * 0.48, -s * 0.90)
    ctx.lineTo(s * 0.55, -s * 0.72)
    ctx.closePath()
    ctx.fill()

    // Legs with walk cycle
    const legW = s * 0.06
    const legH = s * 0.25
    const legPositions = [
      { x: -s * 0.25, phase: 0 },
      { x: -s * 0.10, phase: Math.PI },
      { x: s * 0.15, phase: Math.PI * 0.5 },
      { x: s * 0.30, phase: Math.PI * 1.5 },
    ]

    for (const leg of legPositions) {
      const legAngle = Math.sin(time * 8 + leg.phase) * 0.35
      ctx.save()
      ctx.translate(leg.x, -s * 0.15)
      ctx.rotate(legAngle)
      ctx.fillRect(-legW / 2, 0, legW, legH)
      ctx.restore()
    }

    // Tail (curved line)
    const tailWag = Math.sin(time * 3) * 0.3
    ctx.beginPath()
    ctx.moveTo(-s * 0.40, -s * 0.35)
    ctx.quadraticCurveTo(
      -s * 0.60, -s * 0.70 + Math.sin(time * 3) * s * 0.15,
      -s * 0.50, -s * 0.85 + tailWag * s * 0.2
    )
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = s * 0.06
    ctx.lineCap = 'round'
    ctx.stroke()

    ctx.restore()
  }

  // ── Maneki Neko (Beckoning Cat) ──

  private spawnManekiNeko() {
    this.instances.push({
      type: 'manekiNeko',
      x: 0,
      y: 0,
      lifetime: 0,
      maxLifetime: 3.0, // peek in + wave + peek out
      active: true,
      peekAmount: 0,
    })
  }

  private updateManekiNeko(egg: EasterEggInstance, _dt: number) {
    const t = egg.lifetime
    const total = egg.maxLifetime

    // Peek animation: 0-0.5s slide in, 0.5-2.5s wave, 2.5-3.0s slide out
    if (t < 0.5) {
      egg.peekAmount = t / 0.5
    } else if (t < total - 0.5) {
      egg.peekAmount = 1
    } else {
      egg.peekAmount = Math.max(0, (total - t) / 0.5)
    }

    if (t >= total) {
      egg.active = false
    }
  }

  private drawManekiNeko(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
    egg: EasterEggInstance,
    time: number
  ) {
    const peekAmount = egg.peekAmount ?? 0
    if (peekAmount <= 0) return

    ctx.save()

    const baseX = w + w * 0.05 * (1 - peekAmount) // slides in from right
    const baseY = h * 0.65
    const s = Math.min(w, h) * 0.08

    ctx.translate(baseX, baseY)

    // Body (large ellipse)
    ctx.fillStyle = '#f5f0e0'
    ctx.beginPath()
    ctx.ellipse(-s * 0.5, 0, s * 0.45, s * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()

    // Head (big circle — Q-version cute)
    ctx.beginPath()
    ctx.arc(-s * 0.5, -s * 0.65, s * 0.42, 0, Math.PI * 2)
    ctx.fill()

    // Left ear
    ctx.beginPath()
    ctx.moveTo(-s * 0.85, -s * 0.85)
    ctx.lineTo(-s * 0.75, -s * 1.15)
    ctx.lineTo(-s * 0.55, -s * 0.90)
    ctx.closePath()
    ctx.fill()
    // Inner ear
    ctx.fillStyle = '#ffaaaa'
    ctx.beginPath()
    ctx.moveTo(-s * 0.80, -s * 0.88)
    ctx.lineTo(-s * 0.75, -s * 1.05)
    ctx.lineTo(-s * 0.60, -s * 0.92)
    ctx.closePath()
    ctx.fill()

    // Right ear
    ctx.fillStyle = '#f5f0e0'
    ctx.beginPath()
    ctx.moveTo(-s * 0.15, -s * 0.85)
    ctx.lineTo(-s * 0.25, -s * 1.15)
    ctx.lineTo(-s * 0.45, -s * 0.90)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffaaaa'
    ctx.beginPath()
    ctx.moveTo(-s * 0.20, -s * 0.88)
    ctx.lineTo(-s * 0.25, -s * 1.05)
    ctx.lineTo(-s * 0.40, -s * 0.92)
    ctx.closePath()
    ctx.fill()

    // Eyes
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.ellipse(-s * 0.65, -s * 0.65, s * 0.07, s * 0.09, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(-s * 0.35, -s * 0.65, s * 0.07, s * 0.09, 0, 0, Math.PI * 2)
    ctx.fill()
    // Eye highlights
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(-s * 0.67, -s * 0.68, s * 0.025, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(-s * 0.37, -s * 0.68, s * 0.025, 0, Math.PI * 2)
    ctx.fill()

    // Nose
    ctx.fillStyle = '#ff8888'
    ctx.beginPath()
    ctx.moveTo(-s * 0.50, -s * 0.55)
    ctx.lineTo(-s * 0.53, -s * 0.50)
    ctx.lineTo(-s * 0.47, -s * 0.50)
    ctx.closePath()
    ctx.fill()

    // Mouth (W shape)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-s * 0.60, -s * 0.47)
    ctx.quadraticCurveTo(-s * 0.55, -s * 0.42, -s * 0.50, -s * 0.47)
    ctx.quadraticCurveTo(-s * 0.45, -s * 0.42, -s * 0.40, -s * 0.47)
    ctx.stroke()

    // Red collar
    ctx.fillStyle = '#cc3333'
    ctx.beginPath()
    ctx.ellipse(-s * 0.5, -s * 0.35, s * 0.30, s * 0.06, 0, 0, Math.PI)
    ctx.fill()

    // Gold bell
    ctx.fillStyle = '#d4a843'
    ctx.beginPath()
    ctx.arc(-s * 0.5, -s * 0.28, s * 0.05, 0, Math.PI * 2)
    ctx.fill()

    // Waving right paw
    const waveAngle = Math.sin(time * 4) * 0.4
    ctx.save()
    ctx.translate(-s * 0.15, -s * 0.35)
    ctx.rotate(-0.8 + waveAngle)
    ctx.fillStyle = '#f5f0e0'
    ctx.fillRect(-s * 0.06, 0, s * 0.12, s * 0.35)
    ctx.beginPath()
    ctx.arc(0, s * 0.38, s * 0.08, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Orange calico patch
    ctx.fillStyle = '#e8a040'
    ctx.beginPath()
    ctx.ellipse(-s * 0.70, -s * 0.55, s * 0.12, s * 0.10, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(-s * 0.30, -s * 0.10, s * 0.10, s * 0.15, 0.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}
