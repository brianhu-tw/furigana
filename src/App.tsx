import { useState, useCallback, useEffect } from 'react'
import { TitleScreen } from './components/screens/TitleScreen'
import { LevelSelectScreen } from './components/screens/LevelSelectScreen'
import { GameScreen } from './components/screens/GameScreen'
import { ResultScreen } from './components/screens/ResultScreen'
import { HighScoreScreen } from './components/screens/HighScoreScreen'
import { unlockAudio, playCountdownTick } from './audio/AudioManager'
import type { GameScreen as GameScreenType, GameStateSnapshot } from './types/game'
import type { LevelDef } from './data/levels'

export default function App() {
  const [screen, setScreen] = useState<GameScreenType>('title')
  const [countdown, setCountdown] = useState(3)
  const [resultSnapshot, setResultSnapshot] = useState<GameStateSnapshot | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<LevelDef | null>(null)

  const handleStart = useCallback(() => {
    unlockAudio()
    setScreen('levelSelect')
  }, [])

  const handleLevelSelect = useCallback((level: LevelDef) => {
    setSelectedLevel(level)
    setScreen('countdown')
    setCountdown(3)
  }, [])

  const handleBackToTitle = useCallback(() => {
    setScreen('title')
  }, [])

  useEffect(() => {
    if (screen !== 'countdown') return

    if (countdown <= 0) {
      setScreen('game')
      return
    }

    playCountdownTick(countdown)

    const timer = setTimeout(() => {
      setCountdown(c => c - 1)
    }, 800)

    return () => clearTimeout(timer)
  }, [screen, countdown])

  const handleGameOver = useCallback((snapshot: GameStateSnapshot) => {
    setResultSnapshot(snapshot)
    setScreen('result')
  }, [])

  const handleRestart = useCallback(() => {
    setResultSnapshot(null)
    if (selectedLevel) {
      setScreen('countdown')
      setCountdown(3)
    } else {
      setScreen('levelSelect')
    }
  }, [selectedLevel])

  const handleBackToLevels = useCallback(() => {
    setResultSnapshot(null)
    setSelectedLevel(null)
    setScreen('levelSelect')
  }, [])

  const handleQuitGame = useCallback(() => {
    setSelectedLevel(null)
    setScreen('levelSelect')
  }, [])

  const handleHighScores = useCallback(() => {
    setScreen('highScore')
  }, [])

  if (screen === 'title') {
    return <TitleScreen onStart={handleStart} onHighScores={handleHighScores} />
  }

  if (screen === 'highScore') {
    return <HighScoreScreen onBack={handleBackToTitle} />
  }

  if (screen === 'levelSelect') {
    return <LevelSelectScreen onSelect={handleLevelSelect} onBack={handleBackToTitle} />
  }

  if (screen === 'countdown') {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ background: 'linear-gradient(180deg, #2D3A8C 0%, #1A1A2E 100%)' }}
      >
        <span
          className="text-8xl font-black animate-countdown"
          style={{
            fontFamily: "'M PLUS Rounded 1c', sans-serif",
            color: countdown > 0 ? '#FFFFFF' : '#F9B233',
            textShadow: '0 0 30px rgba(255,255,255,0.3)',
          }}
          key={countdown}
        >
          {countdown > 0 ? countdown : 'GO!'}
        </span>
      </div>
    )
  }

  if (screen === 'game' && selectedLevel) {
    return <GameScreen level={selectedLevel} onGameOver={handleGameOver} onQuit={handleQuitGame} />
  }

  if (screen === 'result' && resultSnapshot) {
    return (
      <ResultScreen
        snapshot={resultSnapshot}
        onRestart={handleRestart}
        onBackToLevels={handleBackToLevels}
      />
    )
  }

  return null
}
