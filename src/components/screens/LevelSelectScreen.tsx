import { useState, useMemo, useEffect, useCallback } from 'react'
import { KANA_ROWS, buildLevelFromRows } from '../../data/levels'
import type { LevelDef } from '../../data/levels'
import { playButtonPress } from '../../audio/AudioManager'

interface Props {
  onSelect: (level: LevelDef) => void
  onBack: () => void
}

export function LevelSelectScreen({ onSelect, onBack }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(['a']))

  const toggle = (id: string) => {
    playButtonPress()
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        // Must keep at least one selected
        if (next.size > 1) next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelected(new Set(KANA_ROWS.map(r => r.id)))
  }

  const totalKana = useMemo(
    () => KANA_ROWS.filter(r => selected.has(r.id)).reduce((sum, r) => sum + r.kana.length, 0),
    [selected]
  )

  const handleStart = useCallback(() => {
    playButtonPress()
    const level = buildLevelFromRows(Array.from(selected))
    onSelect(level)
  }, [selected, onSelect])

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleStart()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        playButtonPress()
        onBack()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleStart, onBack])

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'linear-gradient(180deg, #2D3A8C 0%, #1A1A2E 100%)' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 pt-[max(16px,var(--safe-top))] px-6 pb-3">
        <button
          onClick={onBack}
          className="text-white/50 text-sm mb-2 active:text-white/80"
          style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
        >
          &larr; 戻る
        </button>
        <h1
          className="text-2xl font-black text-center"
          style={{
            fontFamily: "'M PLUS Rounded 1c', sans-serif",
            color: '#FFFFFF',
          }}
        >
          練習する行を選択
        </h1>
        <p
          className="text-center mt-1"
          style={{
            fontFamily: "'M PLUS Rounded 1c', sans-serif",
            color: 'rgba(255,255,255,0.4)',
            fontSize: 13,
          }}
        >
          タップで選択・解除
        </p>
      </div>

      {/* Row grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 flex flex-col items-center">
        <div className="flex flex-col gap-2.5 w-full max-w-md">
          {KANA_ROWS.map(row => {
            const isSelected = selected.has(row.id)
            return (
              <button
                key={row.id}
                onClick={() => toggle(row.id)}
                className="w-full rounded-xl text-left active:scale-[0.97] transition-all"
                style={{
                  background: isSelected ? 'rgba(249,178,51,0.15)' : 'rgba(255,255,255,0.05)',
                  border: isSelected ? '2px solid rgba(249,178,51,0.6)' : '2px solid rgba(255,255,255,0.08)',
                  padding: '12px 16px',
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-md"
                    style={{
                      width: 28,
                      height: 28,
                      background: isSelected ? '#F9B233' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {isSelected && (
                      <span className="text-sm font-bold" style={{ color: '#1A1A2E' }}>&#10003;</span>
                    )}
                  </div>

                  {/* Row name */}
                  <span
                    className="text-lg font-black flex-shrink-0"
                    style={{
                      fontFamily: "'M PLUS Rounded 1c', sans-serif",
                      color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                      width: 48,
                    }}
                  >
                    {row.name}
                  </span>

                  {/* Kana preview */}
                  <div
                    className="flex-1 text-sm tracking-wider"
                    style={{
                      fontFamily: "'M PLUS Rounded 1c', sans-serif",
                      color: isSelected ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
                    }}
                  >
                    {row.kana.map(k => k.kana).join(' ')}
                  </div>
                </div>
              </button>
            )
          })}

          {/* Select all */}
          <button
            onClick={selectAll}
            className="text-sm mt-1 mb-2 active:opacity-70 self-center"
            style={{
              fontFamily: "'M PLUS Rounded 1c', sans-serif",
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            全部選択
          </button>
        </div>
      </div>

      {/* Start button */}
      <div className="flex-shrink-0 px-6 pb-[max(16px,var(--safe-bottom))] pt-3 flex flex-col items-center">
        <button
          onClick={handleStart}
          className="w-full max-w-md py-4 rounded-2xl text-xl text-white active:scale-95 transition-all"
          style={{
            background: '#E84855',
            boxShadow: '0 6px 24px rgba(232, 72, 85, 0.5)',
            fontFamily: "'M PLUS Rounded 1c', sans-serif",
            fontWeight: 900,
          }}
        >
          スタート ({totalKana}字)
        </button>
      </div>
    </div>
  )
}
