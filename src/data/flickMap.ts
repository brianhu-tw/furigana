import { KANA_ROWS } from './levels'

export type FlickDirection = 'center' | 'left' | 'up' | 'right' | 'down'

export interface FlickKeyDef {
  rowId: string
  label: string
  directions: Partial<Record<FlickDirection, string>>
}

/** Derive flick direction from romaji ending vowel */
function getDirection(romaji: string): FlickDirection {
  // Special case: ん has romaji 'n' or 'nn'
  if (romaji === 'n' || romaji === 'nn') return 'up'

  const last = romaji[romaji.length - 1]
  switch (last) {
    case 'a': return 'center'
    case 'i': return 'left'
    case 'u': return 'up'
    case 'e': return 'right'
    case 'o': return 'down'
    default: return 'center'
  }
}

export function buildFlickKeys(rowIds: string[]): FlickKeyDef[] {
  return KANA_ROWS
    .filter(row => rowIds.includes(row.id))
    .map(row => {
      const directions: Partial<Record<FlickDirection, string>> = {}
      for (const entry of row.kana) {
        const dir = getDirection(entry.romaji[0])
        directions[dir] = entry.kana
      }
      return {
        rowId: row.id,
        label: row.kana[0].kana,
        directions,
      }
    })
}
