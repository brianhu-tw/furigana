import { useRef, useCallback, useState, useEffect } from 'react'
import { GameEngine } from '../game/GameEngine'
import type { GameStateSnapshot, KanaEntry } from '../types/game'

export function useGameEngine(canvasRef: React.RefObject<HTMLCanvasElement | null>, kanaPool?: KanaEntry[], kanaRows?: string[]) {
  const engineRef = useRef<GameEngine | null>(null)
  const [snapshot, setSnapshot] = useState<GameStateSnapshot>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    comboMultiplier: 1,
    lives: 5,
    maxLives: 5,
    totalHits: 0,
    totalMisses: 0,
    isGameOver: false,
    isPaused: false,
    kanaStats: [],
    kanaRows: [],
    inputBuffer: '',
    totalBaseScore: 0,
    totalTimeBonus: 0,
    totalThrillBonus: 0,
    totalComboBonus: 0,
  })

  const initEngine = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || engineRef.current) return

    const engine = new GameEngine(canvas)
    engine.setOnStateChange((s) => {
      setSnapshot({ ...s })
    })
    engineRef.current = engine
  }, [canvasRef])

  const start = useCallback(() => {
    initEngine()
    if (kanaPool) {
      engineRef.current?.setKanaPool(kanaPool)
    }
    if (kanaRows) {
      engineRef.current?.setKanaRows(kanaRows)
    }
    engineRef.current?.start()
  }, [initEngine, kanaPool, kanaRows])

  const stop = useCallback(() => {
    engineRef.current?.stop()
  }, [])

  const pause = useCallback(() => {
    engineRef.current?.pause()
  }, [])

  const resume = useCallback(() => {
    engineRef.current?.resume()
  }, [])

  const togglePause = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    if (engine.isPaused) {
      engine.resume()
    } else {
      engine.pause()
    }
  }, [])

  const handleInput = useCallback((char: string) => {
    engineRef.current?.handleInput(char)
  }, [])

  const handleDirectInput = useCallback((kana: string) => {
    engineRef.current?.handleDirectInput(kana)
  }, [])

  const resize = useCallback(() => {
    engineRef.current?.resize()
  }, [])

  const getSnapshot = useCallback((): GameStateSnapshot | null => {
    return engineRef.current?.getSnapshot() ?? null
  }, [])

  useEffect(() => {
    return () => {
      engineRef.current?.destroy()
      engineRef.current = null
    }
  }, [])

  return {
    snapshot,
    start,
    stop,
    pause,
    resume,
    togglePause,
    handleInput,
    handleDirectInput,
    resize,
    getSnapshot,
  }
}
