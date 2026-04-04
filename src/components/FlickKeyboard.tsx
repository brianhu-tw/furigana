import { useRef, useCallback } from 'react'
import type { FlickKeyDef, FlickDirection } from '../data/flickMap'

interface Props {
  keys: FlickKeyDef[]
  onFlick: (kana: string) => void
  disabled?: boolean
}

const FLICK_THRESHOLD = 20

function angleToDirection(dx: number, dy: number): FlickDirection {
  const angle = Math.atan2(dy, dx) * (180 / Math.PI) // -180 to 180
  if (angle > -45 && angle <= 45) return 'right'
  if (angle > 45 && angle <= 135) return 'down'
  if (angle > -135 && angle <= -45) return 'up'
  return 'left'
}

interface PointerState {
  startX: number
  startY: number
  currentDir: FlickDirection
  active: boolean
}

const DIR_POSITIONS: Record<FlickDirection, { row: number; col: number }> = {
  up:     { row: 0, col: 1 },
  left:   { row: 1, col: 0 },
  center: { row: 1, col: 1 },
  right:  { row: 1, col: 2 },
  down:   { row: 2, col: 1 },
}

function FlickKey({ keyDef, onFlick, disabled }: {
  keyDef: FlickKeyDef
  onFlick: (kana: string) => void
  disabled?: boolean
}) {
  const pointerRef = useRef<PointerState | null>(null)
  const elRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const updatePreview = useCallback((dir: FlickDirection) => {
    const preview = previewRef.current
    if (!preview) return
    preview.style.display = 'grid'
    const cells = preview.children
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i] as HTMLDivElement
      const cellDir = cell.dataset.dir as FlickDirection
      const kana = keyDef.directions[cellDir]
      if (!kana) {
        cell.style.display = 'none'
        continue
      }
      cell.style.display = 'flex'
      if (cellDir === dir) {
        cell.style.background = '#F9B233'
        cell.style.color = '#1A1A2E'
      } else {
        cell.style.background = 'rgba(255,255,255,0.1)'
        cell.style.color = '#FFFFFF'
      }
    }
  }, [keyDef.directions])

  const hidePreview = useCallback(() => {
    const preview = previewRef.current
    if (preview) preview.style.display = 'none'
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    const el = elRef.current
    if (el) el.setPointerCapture(e.pointerId)

    pointerRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      currentDir: 'center',
      active: true,
    }
    updatePreview('center')
    try { navigator.vibrate?.(5) } catch {}
  }, [disabled, updatePreview])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const state = pointerRef.current
    if (!state?.active) return

    const dx = e.clientX - state.startX
    const dy = e.clientY - state.startY
    const dist = Math.sqrt(dx * dx + dy * dy)

    let newDir: FlickDirection
    if (dist < FLICK_THRESHOLD) {
      newDir = 'center'
    } else {
      newDir = angleToDirection(dx, dy)
      // If target direction is empty, keep previous valid direction
      if (!keyDef.directions[newDir]) {
        return
      }
    }

    if (newDir !== state.currentDir) {
      state.currentDir = newDir
      updatePreview(newDir)
      try { navigator.vibrate?.(3) } catch {}
    }
  }, [keyDef.directions, updatePreview])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const state = pointerRef.current
    if (!state?.active) return
    state.active = false

    const el = elRef.current
    if (el) el.releasePointerCapture(e.pointerId)

    hidePreview()

    const kana = keyDef.directions[state.currentDir]
    if (kana) {
      onFlick(kana)
    }
    pointerRef.current = null
  }, [keyDef.directions, onFlick, hidePreview])

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    const state = pointerRef.current
    if (!state) return
    state.active = false
    const el = elRef.current
    if (el) el.releasePointerCapture(e.pointerId)
    hidePreview()
    pointerRef.current = null
  }, [hidePreview])

  // Build 3x3 grid cells
  const allDirs: FlickDirection[] = ['up', 'left', 'center', 'right', 'down']

  return (
    <div
      ref={elRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        width: 72,
        height: 72,
        borderRadius: 12,
        background: disabled ? '#374151' : '#2D3A8C',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <span
        style={{
          fontFamily: "'M PLUS Rounded 1c', sans-serif",
          fontWeight: 900,
          fontSize: 22,
          color: disabled ? '#6B7280' : '#FFFFFF',
          pointerEvents: 'none',
          textTransform: 'lowercase',
        }}
      >
        {keyDef.label}
      </span>

      {/* Direction preview popup */}
      <div
        ref={previewRef}
        style={{
          display: 'none',
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 8,
          gridTemplateColumns: '48px 48px 48px',
          gridTemplateRows: '48px 48px 48px',
          gap: 3,
          zIndex: 50,
          pointerEvents: 'none',
        }}
      >
        {/* 3x3 grid: only place cells at positions that have directions */}
        {(() => {
          const cells: React.ReactNode[] = []
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              const dir = allDirs.find(d => DIR_POSITIONS[d].row === row && DIR_POSITIONS[d].col === col)
              if (!dir) {
                // Empty corner cell
                cells.push(<div key={`${row}-${col}`} style={{ display: 'none' }} />)
                continue
              }
              const kana = keyDef.directions[dir]
              const romajiLabel = keyDef.dirLabels[dir]
              cells.push(
                <div
                  key={dir}
                  data-dir={dir}
                  style={{
                    display: kana ? 'flex' : 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    fontFamily: "'M PLUS Rounded 1c', sans-serif",
                    fontWeight: 900,
                    fontSize: 18,
                    background: 'rgba(255,255,255,0.1)',
                    color: '#FFFFFF',
                  }}
                >
                  {romajiLabel || ''}
                </div>
              )
            }
          }
          return cells
        })()}
      </div>
    </div>
  )
}

export function FlickKeyboard({ keys, onFlick, disabled }: Props) {
  return (
    <div
      className="flex-shrink-0 pt-3.5"
      style={{
        background: 'rgba(26, 26, 46, 0.95)',
        paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
        }}
      >
        {keys.map(keyDef => (
          <FlickKey
            key={keyDef.rowId}
            keyDef={keyDef}
            onFlick={onFlick}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}
