import { useMemo, useState, useEffect, useRef } from 'react'
import type { GameStateSnapshot } from '../../types/game'
import { playButtonPress, playNewHighScoreFanfare } from '../../audio/AudioManager'
import { isHighScore, addHighScore, getBestScore } from '../../data/highscores'

interface Props {
  snapshot: GameStateSnapshot
  onRestart: () => void
  onBackToLevels?: () => void
}

function getPerformanceRank(score: number): { letter: string; color: string; label: string } {
  if (score >= 10000) return { letter: 'S', color: '#F9B233', label: '素晴らしい!' }
  if (score >= 5000) return { letter: 'A', color: '#4ADE80', label: 'よくできた!' }
  if (score >= 2000) return { letter: 'B', color: '#60A5FA', label: 'まあまあ!' }
  if (score >= 1000) return { letter: 'C', color: '#FFFFFF', label: 'もっと頑張ろう!' }
  return { letter: 'D', color: '#9CA3AF', label: 'ドンマイ!' }
}

const COUNT_UP_DURATION = 1200 // ms

// Phase timing (ms from mount)
const PHASE_1_START = 0
const PHASE_2_START = 1500
const PHASE_3_START = 2500
const PHASE_4_START = 4000

export function ResultScreen({ snapshot, onRestart, onBackToLevels }: Props) {
  const total = snapshot.totalHits + snapshot.totalMisses
  const accuracy = total > 0 ? Math.round((snapshot.totalHits / total) * 100) : 0

  // Capture previous best BEFORE adding new score
  const previousBest = useRef(getBestScore())

  // Phase control
  const [phase, setPhase] = useState(1)

  // Score count-up animation
  const [displayScore, setDisplayScore] = useState(0)
  const [countUpDone, setCountUpDone] = useState(false)
  const startTimeRef = useRef(0)
  const rafRef = useRef(0)

  // Mini count-ups for stats in Phase 3
  const [displayCombo, setDisplayCombo] = useState(0)
  const [displayAccuracy, setDisplayAccuracy] = useState(0)
  const [displayHits, setDisplayHits] = useState(0)

  // Phase progression via timeouts
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    timers.push(setTimeout(() => setPhase(2), PHASE_2_START - PHASE_1_START))
    timers.push(setTimeout(() => setPhase(3), PHASE_3_START - PHASE_1_START))
    timers.push(setTimeout(() => setPhase(4), PHASE_4_START - PHASE_1_START))

    return () => timers.forEach(clearTimeout)
  }, [])

  // Phase 1: Score count-up
  useEffect(() => {
    if (snapshot.score === 0) {
      setDisplayScore(0)
      setCountUpDone(true)
      return
    }

    startTimeRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / COUNT_UP_DURATION, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * snapshot.score))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setCountUpDone(true)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [snapshot.score])

  // Phase 3: Mini count-ups for stats
  useEffect(() => {
    if (phase < 3) return

    const duration = 600
    const start = performance.now()
    let raf = 0

    const animate = (now: number) => {
      const elapsed = now - start
      const p = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplayCombo(Math.round(eased * snapshot.maxCombo))
      setDisplayAccuracy(Math.round(eased * accuracy))
      setDisplayHits(Math.round(eased * snapshot.totalHits))
      if (p < 1) raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [phase, snapshot.maxCombo, accuracy, snapshot.totalHits])

  // High score detection + fanfare
  const highScoreRank = useMemo(() => {
    if (!isHighScore(snapshot.score)) return null
    return addHighScore({
      score: snapshot.score,
      maxCombo: snapshot.maxCombo,
      accuracy,
      date: new Date().toISOString().split('T')[0],
      kanaRows: snapshot.kanaRows ?? [],
    })
  }, [snapshot.score, snapshot.maxCombo, accuracy, snapshot.kanaRows])

  const fanfarePlayed = useRef(false)
  useEffect(() => {
    if (phase >= 2 && highScoreRank != null && !fanfarePlayed.current) {
      fanfarePlayed.current = true
      playNewHighScoreFanfare()
    }
  }, [phase, highScoreRank])

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        playButtonPress()
        onRestart()
      }
      if (e.key === 'Escape' && onBackToLevels) {
        e.preventDefault()
        playButtonPress()
        onBackToLevels()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onRestart, onBackToLevels])

  const rank = getPerformanceRank(snapshot.score)

  // History comparison
  const prevBest = previousBest.current
  const scoreDiff = snapshot.score - prevBest
  const isNewPersonalBest = highScoreRank === 1

  return (
    <div
      className="flex flex-col items-center h-full px-6 overflow-y-auto"
      style={{
        background: 'linear-gradient(180deg, #1A1A2E 0%, #2D3A8C 100%)',
        paddingTop: 'max(16px, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex flex-col items-center justify-center min-h-full py-8 w-full">
        {/* ── Phase 1: Game Over + Score Count-Up ── */}
        <h1
          className="text-4xl font-black mb-2"
          style={{
            fontFamily: "'M PLUS Rounded 1c', sans-serif",
            color: '#E84855',
          }}
        >
          ゲームオーバー
        </h1>

        {/* Score with pulse during count-up */}
        <div className="w-full max-w-xs mb-2">
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-sm">スコア</span>
            <span
              className="font-bold tabular-nums"
              style={{
                color: '#F9B233',
                fontFamily: "'M PLUS Rounded 1c', sans-serif",
                fontWeight: 900,
                fontSize: countUpDone ? 32 : 28,
                transition: 'font-size 0.3s ease',
                animation: !countUpDone ? 'score-pulse 0.4s ease-in-out infinite' : 'none',
              }}
            >
              {displayScore.toLocaleString()}
            </span>
          </div>

          {/* History comparison — appears after count-up */}
          {countUpDone && prevBest > 0 && (
            <div
              className="text-right text-xs mt-0.5"
              style={{
                fontFamily: "'M PLUS Rounded 1c', sans-serif",
                opacity: 0,
                animation: 'fade-in 0.3s ease-out 0.2s forwards',
              }}
            >
              {isNewPersonalBest ? (
                <span style={{ color: '#F9B233', fontWeight: 700 }}>
                  個人新高!
                </span>
              ) : scoreDiff > 0 ? (
                <span style={{ color: '#4ADE80' }}>
                  ↑ +{scoreDiff.toLocaleString()}
                </span>
              ) : scoreDiff < 0 ? (
                <span style={{ color: '#9CA3AF' }}>
                  ↓ {scoreDiff.toLocaleString()}
                </span>
              ) : (
                <span style={{ color: '#9CA3AF' }}>
                  ± 0
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Phase 2: Rank Stamp ── */}
        <div
          className="flex flex-col items-center justify-center mb-4"
          style={{ minHeight: 120 }}
        >
          {phase >= 2 && (
            <>
              {/* Rank letter — stamp animation */}
              <div
                className="animate-stamp-in"
                style={{
                  fontFamily: "'M PLUS Rounded 1c', sans-serif",
                  fontSize: 72,
                  fontWeight: 900,
                  color: rank.color,
                  lineHeight: 1,
                  textShadow:
                    rank.letter === 'S'
                      ? '0 0 30px rgba(249,178,51,0.5), 0 0 60px rgba(249,178,51,0.25)'
                      : rank.letter === 'A'
                        ? '0 0 20px rgba(74,222,128,0.4)'
                        : 'none',
                  animation:
                    rank.letter === 'S'
                      ? 'stamp-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, rank-glow 2s ease-in-out 0.5s infinite'
                      : 'stamp-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                }}
              >
                {rank.letter === 'S' && <span style={{ fontSize: 14, position: 'absolute', marginLeft: -14, marginTop: -8 }}>✨</span>}
                {rank.letter}
                {rank.letter === 'S' && <span style={{ fontSize: 14, position: 'relative', top: -24, marginLeft: 2 }}>✨</span>}
              </div>

              {/* Rank label */}
              <div
                style={{
                  fontFamily: "'M PLUS Rounded 1c', sans-serif",
                  color: rank.color,
                  fontSize: 16,
                  fontWeight: 700,
                  opacity: 0,
                  animation: 'fade-in 0.3s ease-out 0.4s forwards',
                }}
              >
                {rank.label}
              </div>

              {/* High score badge */}
              {highScoreRank != null && (
                <div
                  className="mt-1"
                  style={{
                    fontFamily: "'M PLUS Rounded 1c', sans-serif",
                    color: '#F9B233',
                    fontSize: 16,
                    fontWeight: 900,
                    textShadow: '0 0 20px rgba(249,178,51,0.5)',
                    opacity: 0,
                    animation: 'fade-in 0.3s ease-out 0.5s forwards',
                  }}
                >
                  ハイスコア #{highScoreRank}!
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Phase 3: Stats Cascade ── */}
        {phase >= 3 && (
          <div className="w-full max-w-xs space-y-3 mb-6">
            <CascadeStat
              label="最高コンボ"
              value={`${displayCombo}x`}
              delay={0}
              isPersonalBest={snapshot.maxCombo > 0 && highScoreRank === 1}
            />
            <CascadeStat
              label="正確率"
              value={`${displayAccuracy}%`}
              delay={300}
            />
            <CascadeStat
              label="正解 / ミス"
              value={`${displayHits} / ${snapshot.totalMisses}`}
              delay={600}
            />
          </div>
        )}

        {/* ── Phase 4: Full Report Card ── */}
        {phase >= 4 && (
          <>
            {/* Score breakdown (Batch 2 feature) */}
            <div
              className="w-full max-w-xs mb-4"
              style={{ opacity: 0, animation: 'fade-in 0.4s ease-out forwards' }}
            >
              <ScoreBreakdown
                displayScore={snapshot.score}
                totalBaseScore={snapshot.totalBaseScore}
                totalTimeBonus={snapshot.totalTimeBonus}
                totalThrillBonus={snapshot.totalThrillBonus}
                totalComboBonus={snapshot.totalComboBonus}
                totalHits={snapshot.totalHits}
              />
            </div>

            {/* Per-kana Stats */}
            {snapshot.kanaStats.length > 0 && (
              <div
                className="w-full max-w-xs mb-8"
                style={{ opacity: 0, animation: 'fade-in 0.4s ease-out 0.2s forwards' }}
              >
                <div className="text-white/40 text-xs mb-3 text-center tracking-wider">各文字の成績</div>
                <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <table className="w-full text-center">
                    <thead>
                      <tr className="text-[10px] text-white/40">
                        <th className="py-2 font-normal">文字</th>
                        <th className="py-2 font-normal">正解</th>
                        <th className="py-2 font-normal">ミス</th>
                        <th className="py-2 font-normal">正確率</th>
                        <th className="py-2 font-normal">反応</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.kanaStats.map(stat => (
                        <tr
                          key={stat.kana}
                          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <td className="py-2.5">
                            <span
                              className="text-xl font-bold"
                              style={{
                                fontFamily: "'M PLUS Rounded 1c', sans-serif",
                                color: stat.accuracy >= 80 ? '#4ADE80' : stat.accuracy >= 50 ? '#F9B233' : '#E84855',
                              }}
                            >
                              {stat.kana}
                            </span>
                          </td>
                          <td className="text-white/80 text-sm tabular-nums py-2.5">{stat.hits}</td>
                          <td className="text-white/80 text-sm tabular-nums py-2.5">{stat.misses}</td>
                          <td className="py-2.5">
                            <span
                              className="text-sm font-bold tabular-nums"
                              style={{ color: stat.accuracy >= 80 ? '#4ADE80' : stat.accuracy >= 50 ? '#F9B233' : '#E84855' }}
                            >
                              {stat.accuracy}%
                            </span>
                          </td>
                          <td className="text-white/50 text-xs tabular-nums py-2.5">
                            {stat.avgReactionMs > 0 ? `${(stat.avgReactionMs / 1000).toFixed(1)}s` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Restart button — bounce in */}
            <button
              onClick={() => { playButtonPress(); onRestart() }}
              className="
                w-full max-w-xs py-5 rounded-2xl text-2xl text-white
                transition-all duration-150
                active:scale-95
                shrink-0
                animate-result-bounce-in
              "
              style={{
                background: '#E84855',
                boxShadow: '0 6px 24px rgba(232, 72, 85, 0.5)',
                fontFamily: "'M PLUS Rounded 1c', sans-serif",
                fontWeight: 900,
              }}
            >
              もう一回
            </button>

            {/* Back to levels */}
            {onBackToLevels && (
              <button
                onClick={() => { playButtonPress(); onBackToLevels!() }}
                className="mt-4 text-white/40 text-sm active:text-white/70"
                style={{
                  fontFamily: "'M PLUS Rounded 1c', sans-serif",
                  opacity: 0,
                  animation: 'fade-in 0.3s ease-out 0.3s forwards',
                }}
              >
                レベル選択に戻る
              </button>
            )}

            {/* Keyboard hints */}
            <div
              className="mt-6 text-white/20 text-xs text-center space-y-1"
              style={{
                fontFamily: "'M PLUS Rounded 1c', sans-serif",
                opacity: 0,
                animation: 'fade-in 0.3s ease-out 0.5s forwards',
              }}
            >
              <div>[Enter] もう一回</div>
              {onBackToLevels && <div>[Esc] レベル選択に戻る</div>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CascadeStat({
  label,
  value,
  delay,
  isPersonalBest,
}: {
  label: string
  value: string
  delay: number
  isPersonalBest?: boolean
}) {
  return (
    <div
      className="flex justify-between items-center"
      style={{
        opacity: 0,
        animation: `cascade-in 0.4s ease-out ${delay}ms forwards`,
      }}
    >
      <span className="text-white/60 text-sm">{label}</span>
      <span className="flex items-center gap-2">
        <span
          className="font-bold tabular-nums text-lg"
          style={{ color: '#FFFFFF' }}
        >
          {value}
        </span>
        {isPersonalBest && (
          <span
            className="animate-new-badge"
            style={{
              background: '#E84855',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 4,
              lineHeight: '16px',
            }}
          >
            NEW!
          </span>
        )}
      </span>
    </div>
  )
}

function ScoreBreakdown({
  displayScore,
  totalBaseScore,
  totalTimeBonus,
  totalThrillBonus,
  totalComboBonus,
  totalHits,
}: {
  displayScore: number
  totalBaseScore: number
  totalTimeBonus: number
  totalThrillBonus: number
  totalComboBonus: number
  totalHits: number
}) {
  const [expanded, setExpanded] = useState(false)
  const hasBreakdown = totalBaseScore > 0

  return (
    <div>
      <div
        className="flex justify-between items-center"
        onClick={() => hasBreakdown && setExpanded(!expanded)}
        style={{ cursor: hasBreakdown ? 'pointer' : 'default' }}
      >
        <span className="text-white/60 text-sm flex items-center gap-1">
          スコア内訳
          {hasBreakdown && (
            <span className="text-white/30 text-xs">{expanded ? '▲' : '▼'}</span>
          )}
        </span>
        <span
          className="font-bold tabular-nums text-lg"
          style={{ color: '#F9B233' }}
        >
          {displayScore.toLocaleString()}
        </span>
      </div>
      {expanded && hasBreakdown && (
        <div
          className="mt-2 rounded-lg px-3 py-2 space-y-1"
          style={{ background: 'rgba(0,0,0,0.25)' }}
        >
          <BreakdownRow label={`基礎分 (${totalHits} hits x 100)`} value={totalBaseScore} />
          {totalTimeBonus > 0 && <BreakdownRow label="速度ボーナス" value={totalTimeBonus} prefix="+" />}
          {totalThrillBonus > 0 && <BreakdownRow label="スリルボーナス" value={totalThrillBonus} prefix="+" />}
          {totalComboBonus > 0 && <BreakdownRow label="コンボボーナス" value={totalComboBonus} prefix="+" />}
        </div>
      )}
    </div>
  )
}

function BreakdownRow({ label, value, prefix = '' }: { label: string; value: number; prefix?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/40 text-xs">{label}</span>
      <span className="text-white/60 text-xs tabular-nums">{prefix}{value.toLocaleString()}</span>
    </div>
  )
}
