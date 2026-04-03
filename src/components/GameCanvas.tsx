import { useRef, useEffect } from 'react'

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onResize?: () => void
}

export function GameCanvas({ canvasRef, onResize }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.style.width = container.clientWidth + 'px'
        canvas.style.height = container.clientHeight + 'px'
        onResize?.()
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [canvasRef, onResize])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  )
}
