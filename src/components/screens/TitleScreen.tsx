import { useState, useEffect } from 'react'
import { playButtonPress, isMuted, toggleMute } from '../../audio/AudioManager'
import { getHighScores } from '../../data/highscores'
import { TitleBackground } from '../TitleBackground'

interface Props {
  onStart: () => void
  onHighScores: () => void
}

export function TitleScreen({ onStart, onHighScores }: Props) {
  const [mute, setMute] = useState(isMuted)

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        playButtonPress()
        onStart()
      }
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault()
        playButtonPress()
        onHighScores()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onStart, onHighScores])

  const scores = getHighScores()
  const personalBest = scores.length > 0 ? scores[0].score : null

  return (
    <div
      className="relative h-full overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #2D3A8C 0%, #1A1A2E 100%)' }}
    >
      {/* Mute toggle */}
      <button
        onClick={() => setMute(toggleMute())}
        className="absolute z-10 flex items-center justify-center rounded-full active:scale-90 transition-transform"
        style={{
          top: 'max(16px, env(safe-area-inset-top, 0px))',
          right: 'max(24px, env(safe-area-inset-right, 0px))',
          width: 44,
          height: 44,
        }}
        aria-label={mute ? 'Unmute' : 'Mute'}
      >
        {mute ? (
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="rgba(255,255,255,0.35)" stroke="none" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="rgba(255,255,255,0.7)" stroke="none" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>

      {/* Falling kana background */}
      <TitleBackground />

      {/* Content layer */}
      <div
        className="relative flex flex-col items-center justify-center h-full"
        style={{
          zIndex: 1,
          paddingLeft: 'max(24px, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(24px, env(safe-area-inset-right, 0px))',
        }}
      >
        {/* Title */}
        <div className="mb-3 text-center animate-slide-down">
          <h1
            className="text-7xl font-black tracking-tight animate-title-glow"
            style={{
              fontFamily: "'M PLUS Rounded 1c', sans-serif",
              color: '#FFFFFF',
            }}
          >
            五十音
          </h1>
          <h2
            className="text-4xl font-black -mt-1"
            style={{
              fontFamily: "'M PLUS Rounded 1c', sans-serif",
              color: '#F9B233',
            }}
          >
            大師
          </h2>
        </div>

        {/* Spacer */}
        <div className="mb-6" />

        {/* Start button */}
        <button
          onClick={() => { playButtonPress(); onStart() }}
          className="
            w-full max-w-xs py-5 rounded-2xl text-2xl font-bold text-white
            transition-all duration-150
            active:scale-95
            animate-slide-up
          "
          style={{
            background: '#E84855',
            boxShadow: '0 6px 24px rgba(232, 72, 85, 0.5)',
            fontFamily: "'M PLUS Rounded 1c', sans-serif",
            fontWeight: 900,
          }}
        >
          ゲームスタート
        </button>

        {/* Personal best */}
        {personalBest != null && (
          <div
            className="mt-3 text-sm tabular-nums animate-slide-up"
            style={{
              fontFamily: "'M PLUS Rounded 1c', sans-serif",
              color: 'rgba(249,178,51,0.6)',
            }}
          >
            最高スコア: {personalBest.toLocaleString()}
          </div>
        )}

        {/* High Scores button */}
        <button
          onClick={() => { playButtonPress(); onHighScores() }}
          className="mt-4 text-base active:scale-95 transition-all duration-150 animate-slide-up"
          style={{
            fontFamily: "'M PLUS Rounded 1c', sans-serif",
            fontWeight: 700,
            color: 'rgba(249,178,51,0.8)',
          }}
        >
          <span className="mr-1.5" role="img" aria-label="trophy">&#127942;</span>
          ハイスコア
        </button>

        {/* Decorative kana */}
        <div
          className="text-3xl mt-8 flex gap-5 opacity-20 animate-fade-in"
          style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif", color: '#fff' }}
        >
          <span>あ</span>
          <span>い</span>
          <span>う</span>
          <span>え</span>
          <span>お</span>
        </div>
      </div>
    </div>
  )
}
