import type { KanaEntry } from '../types/game'
import {
  KANA_A_ROW, KANA_KA_ROW, KANA_SA_ROW, KANA_TA_ROW, KANA_NA_ROW,
  KANA_HA_ROW, KANA_MA_ROW, KANA_YA_ROW, KANA_RA_ROW, KANA_WA_ROW,
} from './kana'

export interface KanaRowDef {
  id: string
  name: string
  kana: KanaEntry[]
  consonants: string[]
}

export const KANA_ROWS: KanaRowDef[] = [
  { id: 'a',  name: 'あ行', kana: KANA_A_ROW,  consonants: [] },
  { id: 'ka', name: 'か行', kana: KANA_KA_ROW, consonants: ['k'] },
  { id: 'sa', name: 'さ行', kana: KANA_SA_ROW, consonants: ['s'] },
  { id: 'ta', name: 'た行', kana: KANA_TA_ROW, consonants: ['t'] },
  { id: 'na', name: 'な行', kana: KANA_NA_ROW, consonants: ['n'] },
  { id: 'ha', name: 'は行', kana: KANA_HA_ROW, consonants: ['h', 'f'] },
  { id: 'ma', name: 'ま行', kana: KANA_MA_ROW, consonants: ['m'] },
  { id: 'ya', name: 'や行', kana: KANA_YA_ROW, consonants: ['y'] },
  { id: 'ra', name: 'ら行', kana: KANA_RA_ROW, consonants: ['r'] },
  { id: 'wa', name: 'わ行', kana: KANA_WA_ROW, consonants: ['w'] },
]

/** Built from user's row selection */
export interface LevelDef {
  name: string
  kana: KanaEntry[]
  consonants: string[]
  rowIds: string[]
}

export function buildLevelFromRows(selectedRowIds: string[]): LevelDef {
  const rows = KANA_ROWS.filter(r => selectedRowIds.includes(r.id))
  return {
    name: rows.map(r => r.name).join(' + '),
    kana: rows.flatMap(r => r.kana),
    consonants: [...new Set(rows.flatMap(r => r.consonants))],
    rowIds: selectedRowIds.slice().sort(),
  }
}
