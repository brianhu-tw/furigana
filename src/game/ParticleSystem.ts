import type { Particle } from '../types/game'

const GRAVITY = 200
const HIT_PARTICLE_COUNT = 18
const MISS_PARTICLE_COUNT = 8

const HIT_COLORS = ['#F9B233', '#FFD700', '#FFA500', '#FFEC8B', '#FFFFFF']
const CLUTCH_COLORS = ['#67E8F9', '#A5F3FC', '#FFFFFF', '#E0F2FE', '#22D3EE']
const MISS_COLORS = ['#8B1A1A', '#A52A2A', '#CD5C5C', '#800000']
const RAINBOW_COLORS = ['#FF0000', '#FF7700', '#FFDD00', '#00FF00', '#0088FF', '#8800FF', '#FF00FF', '#FFFFFF']

export class ParticleSystem {
  private particles: Particle[] = []

  get active() {
    return this.particles
  }

  reset() {
    this.particles = []
  }

  spawnHit(x: number, y: number, combo = 0) {
    const count = Math.min(30, HIT_PARTICLE_COUNT + Math.floor(combo / 10))
    const sizeBoost = combo >= 20 ? 1.3 : 1
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
      const speed = 140 + Math.random() * 200
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.5 + Math.random() * 0.4,
        color: HIT_COLORS[Math.floor(Math.random() * HIT_COLORS.length)],
        size: (3 + Math.random() * 5) * sizeBoost,
      })
    }
  }

  spawnClutchSave(x: number, y: number) {
    for (let i = 0; i < HIT_PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / HIT_PARTICLE_COUNT + (Math.random() - 0.5) * 0.5
      const speed = 140 + Math.random() * 200
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.5 + Math.random() * 0.4,
        color: CLUTCH_COLORS[Math.floor(Math.random() * CLUTCH_COLORS.length)],
        size: 3 + Math.random() * 5,
      })
    }
  }

  spawnMiss(x: number, y: number) {
    for (let i = 0; i < MISS_PARTICLE_COUNT; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8
      const speed = 60 + Math.random() * 80
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.4 + Math.random() * 0.2,
        color: MISS_COLORS[Math.floor(Math.random() * MISS_COLORS.length)],
        size: 2 + Math.random() * 3,
      })
    }
  }

  /** Large radial burst for combo milestones */
  spawnMilestoneBurst(x: number, y: number, combo: number) {
    const count = combo >= 100 ? 50 : combo >= 50 ? 40 : 30
    const colors = combo >= 100 ? RAINBOW_COLORS : HIT_COLORS
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3
      const speed = 200 + Math.random() * 300
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.8 + Math.random() * 0.6,
        maxLife: 0.8 + Math.random() * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
      })
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += GRAVITY * dt
      p.life -= dt

      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }
}
