import { useRef, useState, useEffect } from 'react'
import type { GameStateSnapshot } from '../types/game'
import { playButtonPress, isMuted, toggleMute } from '../audio/AudioManager'

interface Props {
  snapshot: GameStateSnapshot
  onPause?: () => void
}

export function HUD({ snapshot, onPause }: Props) {
  const [mute, setMute] = useState(isMuted)
  const prevComboRef = useRef(snapshot.combo)
  const prevMultRef = useRef(snapshot.comboMultiplier)
  const [brokenCombo, setBrokenCombo] = useState(0)
  const [multPulse, setMultPulse] = useState(false)

  useEffect(() => {
    const prev = prevComboRef.current
    prevComboRef.current = snapshot.combo

    if (prev >= 3 && snapshot.combo === 0) {
      setBrokenCombo(prev)
      const timer = setTimeout(() => setBrokenCombo(0), 800)
      return () => clearTimeout(timer)
    }
  }, [snapshot.combo])

  useEffect(() => {
    const prevMult = prevMultRef.current
    prevMultRef.current = snapshot.comboMultiplier

    if (snapshot.comboMultiplier > prevMult && snapshot.comboMultiplier > 1) {
      setMultPulse(true)
      const timer = setTimeout(() => setMultPulse(false), 400)
      return () => clearTimeout(timer)
    }
  }, [snapshot.comboMultiplier])

  const hearts = Array.from({ length: snapshot.maxLives }, (_, i) => (
    <span
      key={i}
      className={`text-xl transition-all duration-200 ${
        i < snapshot.lives
          ? 'opacity-100 scale-100'
          : 'opacity-30 scale-75'
      }`}
      style={{ color: i < snapshot.lives ? '#E84855' : '#555' }}
    >
      {i < snapshot.lives ? '\u2764' : '\u2661'}
    </span>
  ))

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-start justify-between z-10 pointer-events-none"
      style={{
        fontFamily: "'Inter', sans-serif",
        paddingTop: 'max(16px, env(safe-area-inset-top, 0px))',
        paddingLeft: 'max(24px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(24px, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Score */}
      <div className="text-white font-bold text-lg tabular-nums">
        {snapshot.score.toLocaleString()}
      </div>

      {/* Combo / Combo Break */}
      <div className="flex flex-col items-center min-w-[60px]">
        {snapshot.combo > 0 && (
          <div className={`flex flex-col items-center animate-bounce-in${snapshot.combo >= 50 ? ' combo-pulse' : ''}`}>
            <div className="flex items-baseline gap-1">
              <div
                className="font-extrabold tabular-nums"
                style={{
                  color: '#F9B233',
                  fontSize: snapshot.combo >= 50 ? 36 : snapshot.combo >= 20 ? 30 : 24,
                  textShadow: snapshot.combo >= 20 ? '0 0 12px rgba(249,178,51,0.6)' : undefined,
                  transition: 'font-size 0.3s ease',
                }}
              >
                {snapshot.combo}
              </div>
              {snapshot.comboMultiplier > 1 && (
                <div
                  className="font-bold text-sm tabular-nums transition-transform duration-200"
                  style={{
                    color: '#67E8F9',
                    transform: multPulse ? 'scale(1.4)' : 'scale(1)',
                  }}
                >
                  x{snapshot.comboMultiplier}
                </div>
              )}
            </div>
            <div className="text-xs text-white/70 -mt-1">COMBO</div>
          </div>
        )}
        {brokenCombo > 0 && snapshot.combo === 0 && (
          <div className="flex flex-col items-center combo-break">
            <div
              className="font-extrabold text-2xl tabular-nums"
              style={{ color: '#E84855' }}
            >
              {brokenCombo}
            </div>
            <div className="text-xs text-white/70 -mt-1">BREAK</div>
          </div>
        )}
      </div>

      {/* Lives + Mute + Pause */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">{hearts}</div>
        <button
          onClick={() => setMute(toggleMute())}
          className="pointer-events-auto flex items-center justify-center rounded-lg active:scale-90 transition-transform duration-75"
          style={{
            width: 32,
            height: 32,
            background: 'rgba(255,255,255,0.15)',
            fontSize: 16,
          }}
          aria-label={mute ? 'Unmute' : 'Mute'}
        >
          {mute ? '\u{1F507}' : '\u{1F50A}'}
        </button>
        {onPause && (
          <button
            onClick={() => { playButtonPress(); onPause() }}
            className="pointer-events-auto flex items-center justify-center rounded-lg active:scale-90 transition-transform duration-75"
            style={{
              width: 32,
              height: 32,
              background: 'rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 14,
              fontWeight: 700,
            }}
            aria-label="Pause"
          >
            II
          </button>
        )}
      </div>
    </div>
  )
}
