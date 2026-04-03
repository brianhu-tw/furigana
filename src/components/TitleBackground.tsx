import { useRef, useEffect } from 'react'

const KANA_CHARS = [
  'あ', 'い', 'う', 'え', 'お',
  'か', 'き', 'く', 'け', 'こ',
  'さ', 'し', 'す', 'せ', 'そ',
  'た', 'ち', 'つ', 'て', 'と',
  'な', 'に', 'ぬ', 'ね', 'の',
  'は', 'ひ', 'ふ', 'へ', 'ほ',
  'ま', 'み', 'む', 'め', 'も',
  'や', 'ゆ', 'よ',
  'ら', 'り', 'る', 'れ', 'ろ',
  'わ', 'を', 'ん',
]

const KANA_COUNT = 18

interface FallingKanaObj {
  kana: string
  x: number
  y: number
  speed: number
  opacity: number
  fontSize: number
}

function randomKana(width: number, height: number, startAbove = true): FallingKanaObj {
  return {
    kana: KANA_CHARS[Math.floor(Math.random() * KANA_CHARS.length)],
    x: Math.random() * width,
    y: startAbove ? -50 - Math.random() * height : Math.random() * height,
    speed: 20 + Math.random() * 20,
    opacity: 0.06 + Math.random() * 0.06,
    fontSize: 24 + Math.random() * 24,
  }
}

export function TitleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const kanaRef = useRef<FallingKanaObj[]>([])
  const rafRef = useRef(0)
  const lastTimeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Re-init kana on resize
      const w = rect.width
      const h = rect.height
      kanaRef.current = []
      for (let i = 0; i < KANA_COUNT; i++) {
        kanaRef.current.push(randomKana(w, h, false))
      }
    }

    resize()
    window.addEventListener('resize', resize)

    const loop = (now: number) => {
      const dt = lastTimeRef.current ? Math.min((now - lastTimeRef.current) / 1000, 0.1) : 0.016
      lastTimeRef.current = now

      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      ctx.clearRect(0, 0, w, h)

      for (const k of kanaRef.current) {
        k.y += k.speed * dt

        if (k.y > h + 50) {
          Object.assign(k, randomKana(w, h, true))
        }

        ctx.save()
        ctx.globalAlpha = k.opacity
        ctx.font = `bold ${k.fontSize}px 'M PLUS Rounded 1c', sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(k.kana, k.x, k.y)
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  )
}
