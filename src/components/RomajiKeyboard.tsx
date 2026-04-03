import { useCallback, useMemo } from 'react'

const VOWELS = ['a', 'i', 'u', 'e', 'o'] as const
const CONSONANT_ROW1 = ['k', 's', 't', 'n', 'h'] as const
const CONSONANT_ROW2 = ['m', 'y', 'r', 'w', 'f'] as const

interface Props {
  onInput: (char: string) => void
  disabled?: boolean
  consonants?: string[]
}

export function RomajiKeyboard({ onInput, disabled, consonants = [] }: Props) {
  const handlePointerDown = useCallback(
    (char: string) => (e: React.PointerEvent) => {
      e.preventDefault()
      if (!disabled) {
        navigator.vibrate?.(5)
        onInput(char)
      }
    },
    [onInput, disabled]
  )

  const activeConsonants = useMemo(() => new Set(consonants), [consonants])

  const rows = useMemo(() => {
    const result: string[][] = [Array.from(VOWELS)]

    const row1 = CONSONANT_ROW1.filter(c => activeConsonants.has(c))
    if (row1.length > 0) result.push(row1)

    const row2 = CONSONANT_ROW2.filter(c => activeConsonants.has(c))
    if (row2.length > 0) result.push(row2)

    return result
  }, [activeConsonants])

  return (
    <div
      className="flex-shrink-0 pt-3"
      style={{
        background: 'rgba(26, 26, 46, 0.95)',
        paddingLeft: 'max(24px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(24px, env(safe-area-inset-right, 0px))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-2 justify-center mb-2">
          {row.map(key => (
            <button
              key={key}
              onPointerDown={handlePointerDown(key)}
              className={`
                flex-1 max-w-[64px] rounded-lg
                text-lg font-bold
                flex items-center justify-center
                transition-transform duration-75
                active:scale-90
                ${disabled
                  ? 'bg-gray-700 text-gray-500'
                  : ri === 0
                    ? 'bg-[#2D3A8C] text-white active:bg-[#E84855]'
                    : 'bg-[#3D2A6E] text-white/80 active:bg-[#E84855]'
                }
              `}
              style={{
                touchAction: 'manipulation',
                height: 52,
              }}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
