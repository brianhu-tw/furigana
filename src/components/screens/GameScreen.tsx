import { useRef, useCallback, useEffect, useMemo, useState } from 'react'
import { GameCanvas } from '../GameCanvas'
import { HUD } from '../HUD'
import { FlickKeyboard } from '../FlickKeyboard'
import { buildFlickKeys } from '../../data/flickMap'
import { useGameEngine } from '../../hooks/useGameEngine'
import type { GameStateSnapshot } from '../../types/game'
import type { LevelDef } from '../../data/levels'
import { playButtonPress } from '../../audio/AudioManager'

interface Props {
  level: LevelDef
  onGameOver: (snapshot: GameStateSnapshot) => void
  onQuit: () => void
}

export function GameScreen({ level, onGameOver, onQuit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showKeyboard] = useState(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0)
  const { snapshot, start, stop, handleInput, handleDirectInput, resize, getSnapshot, togglePause } = useGameEngine(canvasRef, level.kana, level.rowIds)
  const flickKeys = useMemo(() => buildFlickKeys(level.rowIds), [level.rowIds])
  const startedRef = useRef(false)
  const gameOverFiredRef = useRef(false)

  const handleResize = useCallback(() => {
    resize()
  }, [resize])

  // Start engine once canvas is mounted
  const onCanvasReady = useCallback(() => {
    handleResize()
    if (!startedRef.current) {
      startedRef.current = true
      // Small delay to let canvas settle
      requestAnimationFrame(() => {
        start()
      })
    }
  }, [handleResize, start])

  // Physical keyboard support + ESC to pause
  const validKeys = useMemo(() => {
    const keys = new Set(['a', 'i', 'u', 'e', 'o', ...level.consonants])
    return keys
  }, [level.consonants])
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        togglePause()
        return
      }

      if (snapshot.isGameOver || snapshot.isPaused) return
      const key = e.key.toLowerCase()
      if (validKeys.has(key)) {
        e.preventDefault()
        handleInput(key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleInput, snapshot.isGameOver, snapshot.isPaused, togglePause, validKeys])

  const handleQuit = useCallback(() => {
    stop()
    onQuit()
  }, [stop, onQuit])

  // Watch for game over
  if (snapshot.isGameOver && !gameOverFiredRef.current) {
    gameOverFiredRef.current = true
    const final = getSnapshot() ?? snapshot
    // Delay to show final state briefly
    setTimeout(() => onGameOver(final), 800)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative overflow-hidden">
        <HUD snapshot={snapshot} onPause={togglePause} />
        <GameCanvas
          canvasRef={canvasRef}
          onResize={onCanvasReady}
        />

        {/* Pause overlay — covers entire screen including keyboard */}
        {snapshot.isPaused && (
          <div
            className="fixed inset-0 flex flex-col items-center justify-center z-20"
            style={{ background: 'rgba(0, 0, 0, 0.7)' }}
          >
            <span
              className="text-5xl font-black"
              style={{
                fontFamily: "'M PLUS Rounded 1c', sans-serif",
                color: '#FFFFFF',
                marginBottom: 48,
              }}
            >
              一時停止
            </span>
            <button
              onClick={() => { playButtonPress(); togglePause() }}
              className="rounded-2xl text-white active:scale-95 transition-all"
              style={{
                background: '#F9B233',
                fontFamily: "'M PLUS Rounded 1c', sans-serif",
                fontWeight: 900,
                fontSize: 24,
                paddingLeft: 64,
                paddingRight: 64,
                paddingTop: 20,
                paddingBottom: 20,
              }}
            >
              続ける
            </button>
            <button
              onClick={handleQuit}
              className="text-white/40 text-sm active:text-white/70 transition-colors"
              style={{
                fontFamily: "'M PLUS Rounded 1c', sans-serif",
                marginTop: 32,
              }}
            >
              レベル選択に戻る
            </button>
            <span className="text-white/40 text-sm" style={{ marginTop: 20 }}>ESC で再開</span>
          </div>
        )}
      </div>
      {/* Input buffer indicator — always mounted to prevent layout shift / canvas resize flicker */}
      <div
        className="flex-shrink-0 flex justify-center"
        style={{
          background: snapshot.inputBuffer && !snapshot.isPaused && !snapshot.isGameOver
            ? 'rgba(26, 26, 46, 0.95)'
            : 'transparent',
          paddingTop: 6,
          paddingBottom: 2,
          paddingLeft: 'max(24px, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(24px, env(safe-area-inset-right, 0px))',
          visibility: snapshot.inputBuffer && !snapshot.isPaused && !snapshot.isGameOver
            ? 'visible'
            : 'hidden',
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', monospace",
            fontSize: 16,
            color: '#F9B233',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 8,
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 2,
            paddingBottom: 2,
          }}
        >
          {snapshot.inputBuffer || '\u00A0'}_
        </span>
      </div>
      {showKeyboard && (
        <FlickKeyboard
          keys={flickKeys}
          onFlick={handleDirectInput}
          disabled={snapshot.isGameOver || snapshot.isPaused}
        />
      )}
    </div>
  )
}
