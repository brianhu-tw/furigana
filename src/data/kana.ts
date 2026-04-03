import type { KanaEntry } from '../types/game'

export const KANA_A_ROW: KanaEntry[] = [
  { kana: 'あ', romaji: ['a'] },
  { kana: 'い', romaji: ['i'] },
  { kana: 'う', romaji: ['u'] },
  { kana: 'え', romaji: ['e'] },
  { kana: 'お', romaji: ['o'] },
]

export const KANA_KA_ROW: KanaEntry[] = [
  { kana: 'か', romaji: ['ka'] },
  { kana: 'き', romaji: ['ki'] },
  { kana: 'く', romaji: ['ku'] },
  { kana: 'け', romaji: ['ke'] },
  { kana: 'こ', romaji: ['ko'] },
]

export const KANA_SA_ROW: KanaEntry[] = [
  { kana: 'さ', romaji: ['sa'] },
  { kana: 'し', romaji: ['si', 'shi'] },
  { kana: 'す', romaji: ['su'] },
  { kana: 'せ', romaji: ['se'] },
  { kana: 'そ', romaji: ['so'] },
]

export const KANA_TA_ROW: KanaEntry[] = [
  { kana: 'た', romaji: ['ta'] },
  { kana: 'ち', romaji: ['ti', 'chi'] },
  { kana: 'つ', romaji: ['tu', 'tsu'] },
  { kana: 'て', romaji: ['te'] },
  { kana: 'と', romaji: ['to'] },
]

export const KANA_NA_ROW: KanaEntry[] = [
  { kana: 'な', romaji: ['na'] },
  { kana: 'に', romaji: ['ni'] },
  { kana: 'ぬ', romaji: ['nu'] },
  { kana: 'ね', romaji: ['ne'] },
  { kana: 'の', romaji: ['no'] },
]

export const KANA_HA_ROW: KanaEntry[] = [
  { kana: 'は', romaji: ['ha'] },
  { kana: 'ひ', romaji: ['hi'] },
  { kana: 'ふ', romaji: ['hu', 'fu'] },
  { kana: 'へ', romaji: ['he'] },
  { kana: 'ほ', romaji: ['ho'] },
]

export const KANA_MA_ROW: KanaEntry[] = [
  { kana: 'ま', romaji: ['ma'] },
  { kana: 'み', romaji: ['mi'] },
  { kana: 'む', romaji: ['mu'] },
  { kana: 'め', romaji: ['me'] },
  { kana: 'も', romaji: ['mo'] },
]

export const KANA_YA_ROW: KanaEntry[] = [
  { kana: 'や', romaji: ['ya'] },
  { kana: 'ゆ', romaji: ['yu'] },
  { kana: 'よ', romaji: ['yo'] },
]

export const KANA_RA_ROW: KanaEntry[] = [
  { kana: 'ら', romaji: ['ra'] },
  { kana: 'り', romaji: ['ri'] },
  { kana: 'る', romaji: ['ru'] },
  { kana: 'れ', romaji: ['re'] },
  { kana: 'ろ', romaji: ['ro'] },
]

export const KANA_WA_ROW: KanaEntry[] = [
  { kana: 'わ', romaji: ['wa'] },
  { kana: 'を', romaji: ['wo'] },
  { kana: 'ん', romaji: ['n', 'nn'] },
]

/** All basic hiragana */
export const ALL_KANA: KanaEntry[] = [
  ...KANA_A_ROW,
  ...KANA_KA_ROW,
  ...KANA_SA_ROW,
  ...KANA_TA_ROW,
  ...KANA_NA_ROW,
  ...KANA_HA_ROW,
  ...KANA_MA_ROW,
  ...KANA_YA_ROW,
  ...KANA_RA_ROW,
  ...KANA_WA_ROW,
]
