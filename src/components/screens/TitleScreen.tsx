import { useEffect } from 'react'
import { playButtonPress } from '../../audio/AudioManager'
import { getHighScores } from '../../data/highscores'
import { TitleBackground } from '../TitleBackground'

interface Props {
  onStart: () => void
  onHighScores: () => void
}

export function TitleScreen({ onStart, onHighScores }: Props) {
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
      {/* Falling kana background */}
      <TitleBackground />

      {/* Content layer */}
      <div className="relative flex flex-col items-center justify-center h-full px-6" style={{ zIndex: 1 }}>
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
          開始遊戲
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
