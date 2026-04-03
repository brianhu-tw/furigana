import { useEffect } from 'react'
import { getHighScores } from '../../data/highscores'
import { KANA_ROWS } from '../../data/levels'
import { playButtonPress } from '../../audio/AudioManager'

interface Props {
  onBack: () => void
}

const ROW_NAME_MAP = new Map(KANA_ROWS.map(r => [r.id, r.name]))

export function HighScoreScreen({ onBack }: Props) {
  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        playButtonPress()
        onBack()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onBack])

  const scores = getHighScores()

  return (
    <div
      className="flex flex-col items-center h-full px-6 overflow-y-auto"
      style={{
        background: 'linear-gradient(180deg, #1A1A2E 0%, #2D3A8C 100%)',
        paddingTop: 'max(16px, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex flex-col items-center min-h-full py-8 w-full max-w-sm">
        <h1
          className="text-3xl font-black mb-6"
          style={{
            fontFamily: "'M PLUS Rounded 1c', sans-serif",
            color: '#F9B233',
          }}
        >
          ハイスコア
        </h1>

        {scores.length === 0 ? (
          <div
            className="text-white/40 text-center mt-12"
            style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
          >
            まだスコアがありません
          </div>
        ) : (
          <div className="w-full rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <table className="w-full text-center">
              <thead>
                <tr className="text-[10px] text-white/40">
                  <th className="py-2 font-normal">#</th>
                  <th className="py-2 font-normal">スコア</th>
                  <th className="py-2 font-normal">コンボ</th>
                  <th className="py-2 font-normal">正確率</th>
                  <th className="py-2 font-normal">日付</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((entry, i) => {
                  const isGold = i === 0
                  const rowNames = entry.kanaRows
                    ?.map(id => ROW_NAME_MAP.get(id) ?? id)
                    .join(' ')

                  return (
                    <tr
                      key={i}
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <td
                        className="py-2.5 text-sm font-bold tabular-nums"
                        style={{ color: isGold ? '#F9B233' : 'rgba(255,255,255,0.5)' }}
                      >
                        {i + 1}
                      </td>
                      <td
                        className="py-2.5 text-sm font-bold tabular-nums"
                        style={{ color: isGold ? '#F9B233' : '#FFFFFF' }}
                      >
                        {entry.score.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-sm text-white/80 tabular-nums">
                        {entry.maxCombo}x
                      </td>
                      <td className="py-2.5 text-sm tabular-nums" style={{
                        color: entry.accuracy >= 80 ? '#4ADE80' : entry.accuracy >= 50 ? '#F9B233' : '#E84855',
                      }}>
                        {entry.accuracy}%
                      </td>
                      <td className="py-2.5 text-white/50 text-xs tabular-nums" title={rowNames}>
                        {entry.date}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex-1" />

        <button
          onClick={() => { playButtonPress(); onBack() }}
          className="mt-8 text-white/40 text-sm active:text-white/70"
          style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
        >
          戻る
        </button>
      </div>
    </div>
  )
}
