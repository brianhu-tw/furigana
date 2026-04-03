let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    audioCtx = new AC()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

// ─── Mute State ───

let muted = false
try { muted = localStorage.getItem('gojuon-muted') === 'true' } catch {}

let masterGainNode: GainNode | null = null

function getMasterGain(): GainNode {
  const ctx = getCtx()
  if (!masterGainNode) {
    masterGainNode = ctx.createGain()
    masterGainNode.gain.value = muted ? 0 : 1
    masterGainNode.connect(ctx.destination)
  }
  return masterGainNode
}

export function isMuted(): boolean {
  return muted
}

export function toggleMute(): boolean {
  muted = !muted
  try { localStorage.setItem('gojuon-muted', muted ? 'true' : 'false') } catch {}
  if (masterGainNode) {
    masterGainNode.gain.value = muted ? 0 : 1
  }
  return muted
}

// ─── SFX Master Gain ───

let sfxGainNode: GainNode | null = null

function getSfxGain(): GainNode {
  const ctx = getCtx()
  if (!sfxGainNode) {
    sfxGainNode = ctx.createGain()
    sfxGainNode.gain.value = 0.5
    sfxGainNode.connect(getMasterGain())
  }
  return sfxGainNode
}

export function unlockAudio() {
  getCtx() // getCtx() handles lazy init + resume
}

// ─── Hit Sound (punchy: click transient + tonal sweep + harmonic) ───

export function playHitSound() {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    // Click transient for attack
    const clickLen = Math.round(ctx.sampleRate * 0.008)
    const clickBuf = ctx.createBuffer(1, clickLen, ctx.sampleRate)
    const clickData = clickBuf.getChannelData(0)
    for (let i = 0; i < clickLen; i++) {
      clickData[i] = (Math.random() * 2 - 1) * (1 - i / clickLen)
    }
    const click = ctx.createBufferSource()
    click.buffer = clickBuf
    const clickGain = ctx.createGain()
    clickGain.gain.setValueAtTime(0.15, now)
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008)
    click.connect(clickGain)
    clickGain.connect(sfx)
    click.start(now)
    click.stop(now + 0.01)

    // Primary tone
    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now)
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.04)

    // Harmonic for richness
    const osc2 = ctx.createOscillator()
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(1320, now)
    osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.03)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

    const osc2Gain = ctx.createGain()
    osc2Gain.gain.value = 0.1

    osc1.connect(gain)
    osc2.connect(osc2Gain)
    osc2Gain.connect(gain)
    gain.connect(sfx)

    osc1.start(now)
    osc1.stop(now + 0.1)
    osc2.start(now)
    osc2.stop(now + 0.1)
  } catch {
    // Audio not available
  }
}

// ─── Miss Sound (ground hit) ───

export function playMissSound() {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(220, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)

    osc.connect(gain)
    gain.connect(sfx)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch {
    // Audio not available
  }
}

// ─── Wrong Input Sound (subtle "nope" buzz) ───

export function playWrongInputSound() {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

    osc.connect(gain)
    gain.connect(sfx)
    osc.start(now)
    osc.stop(now + 0.06)
  } catch {
    // Audio not available
  }
}

// ─── Combo Break Sound (glass shatter) ───

export function playComboBreakSound() {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    const duration = 0.2
    const bufferSize = Math.round(ctx.sampleRate * duration)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15))
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const hpFilter = ctx.createBiquadFilter()
    hpFilter.type = 'highpass'
    hpFilter.frequency.setValueAtTime(2000, now)
    hpFilter.frequency.exponentialRampToValueAtTime(800, now + 0.15)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    noise.connect(hpFilter)
    hpFilter.connect(gain)
    gain.connect(sfx)

    noise.start(now)
    noise.stop(now + duration)
  } catch {
    // Audio not available
  }
}

// ─── Countdown Tick (pitched sine: 3=300Hz, 2=400Hz, 1=500Hz) ───

export function playCountdownTick(number: number) {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    const freq = 200 + (4 - number) * 100 // 300, 400, 500

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.15)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

    osc.connect(gain)
    gain.connect(sfx)
    osc.start(now)
    osc.stop(now + 0.2)
  } catch {
    // Audio not available
  }
}

// ─── GO! Fanfare (C5-E5-G5 ascending arpeggio) ───

export function playGoFanfare() {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    const notes = [523, 659, 784]
    notes.forEach((freq, i) => {
      const t = now + i * 0.06

      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = freq

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.15, t)
      gain.gain.setValueAtTime(0.12, t + 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)

      osc.connect(gain)
      gain.connect(sfx)
      osc.start(t)
      osc.stop(t + 0.4)
    })
  } catch {
    // Audio not available
  }
}

// ─── Pause Sound (descending sweep 800→200Hz) ───

export function playPauseSound() {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.10, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    osc.connect(gain)
    gain.connect(sfx)
    osc.start(now)
    osc.stop(now + 0.15)
  } catch {
    // Audio not available
  }
}

// ─── Resume Sound (ascending sweep 200→800Hz) ───

export function playResumeSound() {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(200, now)
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.10, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    osc.connect(gain)
    gain.connect(sfx)
    osc.start(now)
    osc.stop(now + 0.15)
  } catch {
    // Audio not available
  }
}

// ─── Button Press (soft sine blip 600→900Hz) ───

export function playButtonPress() {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.04)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    osc.connect(gain)
    gain.connect(sfx)
    osc.start(now)
    osc.stop(now + 0.1)
  } catch {
    // Audio not available
  }
}

// ─── Hit Sound with Combo Pitch (semitone per combo, capped at +12) ───

export function playHitSoundWithCombo(combo: number) {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    const semitones = Math.min(combo, 12)
    const pitchMult = Math.pow(2, semitones / 12)
    const baseFreq = 880 * pitchMult

    // Click transient
    const clickLen = Math.round(ctx.sampleRate * 0.008)
    const clickBuf = ctx.createBuffer(1, clickLen, ctx.sampleRate)
    const clickData = clickBuf.getChannelData(0)
    for (let i = 0; i < clickLen; i++) {
      clickData[i] = (Math.random() * 2 - 1) * (1 - i / clickLen)
    }
    const click = ctx.createBufferSource()
    click.buffer = clickBuf
    const clickGain = ctx.createGain()
    clickGain.gain.setValueAtTime(0.15, now)
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008)
    click.connect(clickGain)
    clickGain.connect(sfx)
    click.start(now)
    click.stop(now + 0.01)

    // Tonal sweep with combo-scaled pitch
    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(baseFreq, now)
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + 0.04)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

    osc1.connect(gain)
    gain.connect(sfx)
    osc1.start(now)
    osc1.stop(now + 0.1)
  } catch {
    // Audio not available
  }
}

// ─── Warning Beep (two rapid 1200Hz square beeps, very quiet) ───

export function playWarningBeep() {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.1
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = 1200

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.05, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)

      osc.connect(gain)
      gain.connect(sfx)
      osc.start(t)
      osc.stop(t + 0.05)
    }
  } catch {
    // Audio not available
  }
}

// ─── Game Over Jingle (descending E4-C4-A3-E3 triangle arpeggio) ───

export function playGameOverJingle() {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    const notes = [329, 262, 220, 165]

    notes.forEach((freq, i) => {
      const t = now + i * 0.2
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.15, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)

      osc.connect(gain)
      gain.connect(sfx)
      osc.start(t)
      osc.stop(t + 0.5)
    })
  } catch {
    // Audio not available
  }
}

// ─── Clutch Save Sound (timpani hit + upward sweep) ───

export function playClutchSave() {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    // Timpani-like hit: sine 200→60Hz drop
    const timpani = ctx.createOscillator()
    timpani.type = 'sine'
    timpani.frequency.setValueAtTime(200, now)
    timpani.frequency.exponentialRampToValueAtTime(60, now + 0.15)

    const timpGain = ctx.createGain()
    timpGain.gain.setValueAtTime(0.2, now)
    timpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    timpani.connect(timpGain)
    timpGain.connect(sfx)
    timpani.start(now)
    timpani.stop(now + 0.15)

    // Upward sweep: sine 400→1200Hz
    const sweep = ctx.createOscillator()
    sweep.type = 'sine'
    sweep.frequency.setValueAtTime(400, now)
    sweep.frequency.exponentialRampToValueAtTime(1200, now + 0.1)

    const sweepGain = ctx.createGain()
    sweepGain.gain.setValueAtTime(0.1, now)
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

    sweep.connect(sweepGain)
    sweepGain.connect(sfx)
    sweep.start(now)
    sweep.stop(now + 0.1)
  } catch {
    // Audio not available
  }
}

// ─── BGM: Korobeiniki (Tetris Theme A) — 8-bit chiptune ───
// Public domain Russian folk song (19th century)

let bgmSchedulerId = 0
let bgmGainNode: GainNode | null = null
let bgmBeat = 0
let bgmNextTime = 0
let bgmHatBuffer: AudioBuffer | null = null
let bgmLoopCount = 0

// Per-layer GainNodes for independent dynamic control
let bgmMelodyGain: GainNode | null = null
let bgmCounterMelodyGain: GainNode | null = null
let bgmBassGain: GainNode | null = null
let bgmArpeggioGain: GainNode | null = null
let bgmDrumsGain: GainNode | null = null

// Low-pass filter on BGM master bus
let bgmFilter: BiquadFilterNode | null = null

// Danger state tremolo
let bgmTremoloId = 0
let bgmInDanger = false

// Track current combo tier to avoid redundant ramps
let bgmCurrentTier = -1

const BGM_BPM = 140
const BGM_EIGHTH = 60 / BGM_BPM / 2 // duration of an eighth note
const BGM_SIXTEENTH = BGM_EIGHTH / 2 // duration of a sixteenth note

// Korobeiniki melody — each entry is [MIDI note, duration in eighth notes]
// 0 = rest
const MELODY: [number, number][] = [
  // Bar 1-2: E B C D | C B A
  [76, 2], [71, 1], [72, 1], [74, 2], [72, 1], [71, 1],
  // Bar 3-4: A A C E | D C B
  [69, 2], [69, 1], [72, 1], [76, 2], [74, 1], [72, 1],
  // Bar 5-6: B B C D | E
  [71, 2], [71, 1], [72, 1], [74, 2], [76, 2],
  // Bar 7-8: C A A | rest
  [72, 2], [69, 2], [69, 2], [0, 2],
  // Bar 9-10: D D F A | G F E
  [74, 2], [74, 1], [77, 1], [81, 2], [79, 1], [77, 1],
  // Bar 11-12: C C E | D C B
  [72, 2], [72, 1], [76, 1], [76, 2], [74, 1], [72, 1],
  // Bar 13-14: B B C D | E
  [71, 2], [71, 1], [72, 1], [74, 2], [76, 2],
  // Bar 15-16: C A A | rest
  [72, 2], [69, 2], [69, 2], [0, 2],
]

// Counter-melody: harmonized 3rds/6ths below lead melody
// Same rhythm as MELODY — [MIDI note, duration in eighth notes], 0 = rest
const COUNTER_MELODY: [number, number][] = [
  // Bar 1-2: C5 G4 A4 B4 | A4 G4 E4
  [72, 2], [67, 1], [69, 1], [71, 2], [69, 1], [67, 1],
  // Bar 3-4: E4 E4 A4 C5 | B4 A4 G4
  [64, 2], [64, 1], [69, 1], [72, 2], [71, 1], [69, 1],
  // Bar 5-6: G4 G4 A4 B4 | C5
  [67, 2], [67, 1], [69, 1], [71, 2], [72, 2],
  // Bar 7-8: A4 E4 E4 | rest
  [69, 2], [64, 2], [64, 2], [0, 2],
  // Bar 9-10: A4 A4 C5 F5 | E5 C5 C5
  [69, 2], [69, 1], [72, 1], [77, 2], [76, 1], [72, 1],
  // Bar 11-12: A4 A4 C5 | C5 B4 A4
  [69, 2], [69, 1], [72, 1], [72, 2], [71, 1], [69, 1],
  // Bar 13-14: G4 G4 A4 B4 | C5
  [67, 2], [67, 1], [69, 1], [71, 2], [72, 2],
  // Bar 15-16: A4 E4 E4 | rest
  [69, 2], [64, 2], [64, 2], [0, 2],
]

// Walking bass — [MIDI note, duration in eighth notes]
// root-fifth-octave-fifth pattern per half-bar (4 eighths)
const WALKING_BASS: [number, number][] = [
  // Bars 1-2: Am
  [45, 1], [40, 1], [45, 1], [40, 1],  [45, 1], [48, 1], [45, 1], [40, 1],
  // Bars 3-4: Am
  [45, 1], [40, 1], [45, 1], [40, 1],  [45, 1], [48, 1], [45, 1], [40, 1],
  // Bars 5-6: E
  [40, 1], [47, 1], [40, 1], [44, 1],  [40, 1], [47, 1], [40, 1], [44, 1],
  // Bars 7-8: Am
  [45, 1], [40, 1], [45, 1], [48, 1],  [45, 1], [40, 1], [45, 1], [0, 1],
  // Bars 9-10: Dm
  [38, 1], [45, 1], [38, 1], [42, 1],  [38, 1], [45, 1], [38, 1], [42, 1],
  // Bars 11-12: C
  [48, 1], [43, 1], [48, 1], [43, 1],  [48, 1], [43, 1], [48, 1], [43, 1],
  // Bars 13-14: E
  [40, 1], [47, 1], [40, 1], [44, 1],  [40, 1], [47, 1], [40, 1], [44, 1],
  // Bars 15-16: Am
  [45, 1], [40, 1], [45, 1], [48, 1],  [45, 1], [40, 1], [45, 1], [0, 1],
]

// Arpeggio chord map — maps eighth-beat ranges to MIDI chord tones (4-note cycle)
// Each entry: [startBeat, endBeat, [midi notes cycling on 16ths]]
const ARPEGGIO_MAP: [number, number, number[]][] = [
  [0,  16, [57, 60, 64, 60]],   // Bars 1-4: Am (A3 C4 E4 C4)
  [16, 24, [52, 56, 59, 56]],   // Bars 5-6: E  (E3 G#3 B3 G#3)
  [24, 32, [57, 60, 64, 60]],   // Bars 7-8: Am
  [32, 40, [50, 53, 57, 53]],   // Bars 9-10: Dm (D3 F3 A3 F3)
  [40, 48, [48, 52, 55, 52]],   // Bars 11-12: C (C3 E3 G3 E3)
  [48, 56, [52, 56, 59, 56]],   // Bars 13-14: E
  [56, 64, [57, 60, 64, 60]],   // Bars 15-16: Am
]

/** Convert MIDI note number to frequency */
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function getHatBuffer(): AudioBuffer {
  if (bgmHatBuffer) return bgmHatBuffer
  const ctx = getCtx()
  const len = Math.round(ctx.sampleRate * 0.03)
  bgmHatBuffer = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = bgmHatBuffer.getChannelData(0)
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.04))
  }
  return bgmHatBuffer
}

/** Total duration of melody in eighth notes */
const MELODY_TOTAL = MELODY.reduce((sum, [, dur]) => sum + dur, 0)

function createLayerGain(ctx: AudioContext, value: number, master: GainNode): GainNode {
  const g = ctx.createGain()
  g.gain.value = value
  g.connect(master)
  return g
}

export function startBGM() {
  try {
    const ctx = getCtx()
    ctx.resume() // Re-activate AudioContext after screen lock / background tab
    bgmGainNode = ctx.createGain()
    bgmGainNode.gain.value = 0.15
    bgmGainNode.connect(getMasterGain())

    // Low-pass filter between layers and master gain
    bgmFilter = ctx.createBiquadFilter()
    bgmFilter.type = 'lowpass'
    bgmFilter.frequency.value = 4000
    bgmFilter.Q.value = 1.0
    bgmFilter.connect(bgmGainNode)

    // Create per-layer gain nodes routed through filter
    bgmMelodyGain = createLayerGain(ctx, 1.0, bgmFilter)
    bgmCounterMelodyGain = createLayerGain(ctx, 0.001, bgmFilter) // starts muted
    bgmBassGain = createLayerGain(ctx, 1.0, bgmFilter)
    bgmArpeggioGain = createLayerGain(ctx, 0.001, bgmFilter) // starts muted
    bgmDrumsGain = createLayerGain(ctx, 0.5, bgmFilter) // starts at reduced volume (hat-only feel)

    bgmBeat = 0
    bgmLoopCount = 0
    bgmNextTime = ctx.currentTime + 0.05
    bgmCurrentTier = 0
    bgmInDanger = false
    getHatBuffer()
    bgmSchedulerId = window.setInterval(scheduleBGM, 25)
  } catch {}
}

function scheduleBGM() {
  if (!bgmGainNode) return
  const ctx = getCtx()
  while (bgmNextTime < ctx.currentTime + 0.15) {
    playBGMAt(ctx, bgmNextTime, bgmBeat)
    bgmNextTime += BGM_EIGHTH
    const prevBeat = bgmBeat
    bgmBeat = (bgmBeat + 1) % MELODY_TOTAL
    if (bgmBeat < prevBeat) bgmLoopCount++
  }
}

function playBGMAt(ctx: AudioContext, t: number, eighthBeat: number) {
  if (!bgmGainNode) return

  const melodyDest = bgmMelodyGain || bgmGainNode
  const counterDest = bgmCounterMelodyGain || bgmGainNode
  const bassDest = bgmBassGain || bgmGainNode
  const arpDest = bgmArpeggioGain || bgmGainNode
  const drumsDest = bgmDrumsGain || bgmGainNode

  // ── Melody (square wave) ──
  let pos = 0
  for (const [note, dur] of MELODY) {
    if (eighthBeat >= pos && eighthBeat < pos + dur) {
      if (eighthBeat === pos && note > 0) {
        const osc = ctx.createOscillator()
        osc.type = 'square'
        osc.frequency.value = midiToFreq(note)

        const g = ctx.createGain()
        const noteDuration = dur * BGM_EIGHTH
        g.gain.setValueAtTime(0.18, t)
        g.gain.setValueAtTime(0.18, t + noteDuration * 0.7)
        g.gain.exponentialRampToValueAtTime(0.001, t + noteDuration * 0.95)

        osc.connect(g)
        g.connect(melodyDest)
        osc.start(t)
        osc.stop(t + noteDuration)
      }
      break
    }
    pos += dur
  }

  // ── Counter-Melody (detuned square waves for PWM effect) ──
  pos = 0
  for (const [note, dur] of COUNTER_MELODY) {
    if (eighthBeat >= pos && eighthBeat < pos + dur) {
      if (eighthBeat === pos && note > 0) {
        const freq = midiToFreq(note)
        const noteDuration = dur * BGM_EIGHTH

        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        osc1.type = 'square'
        osc2.type = 'square'
        osc1.frequency.value = freq
        osc2.frequency.value = freq * 1.005 // slight detune for chorus

        const g = ctx.createGain()
        g.gain.setValueAtTime(0.08, t)
        g.gain.setValueAtTime(0.08, t + noteDuration * 0.7)
        g.gain.exponentialRampToValueAtTime(0.001, t + noteDuration * 0.95)

        osc1.connect(g)
        osc2.connect(g)
        g.connect(counterDest)
        osc1.start(t)
        osc1.stop(t + noteDuration)
        osc2.start(t)
        osc2.stop(t + noteDuration)
      }
      break
    }
    pos += dur
  }

  // ── Walking Bass (triangle wave with pluck envelope) ──
  pos = 0
  for (const [note, dur] of WALKING_BASS) {
    if (eighthBeat >= pos && eighthBeat < pos + dur) {
      if (eighthBeat === pos && note > 0) {
        const freq = midiToFreq(note)
        const noteDuration = dur * BGM_EIGHTH

        const osc = ctx.createOscillator()
        osc.type = 'triangle'
        // Slight pitch drop for pluck character
        osc.frequency.setValueAtTime(freq * 1.02, t)
        osc.frequency.exponentialRampToValueAtTime(freq, t + 0.02)

        const g = ctx.createGain()
        g.gain.setValueAtTime(0.25, t)
        g.gain.setValueAtTime(0.20, t + noteDuration * 0.6)
        g.gain.exponentialRampToValueAtTime(0.001, t + noteDuration * 0.9)

        osc.connect(g)
        g.connect(bassDest)
        osc.start(t)
        osc.stop(t + noteDuration)
      }
      break
    }
    pos += dur
  }

  // ── Arpeggio (sine wave 16th notes outlining chord tones) ──
  for (const [startBeat, endBeat, chordTones] of ARPEGGIO_MAP) {
    if (eighthBeat >= startBeat && eighthBeat < endBeat) {
      // Two 16th notes per eighth beat
      for (let sub = 0; sub < 2; sub++) {
        const sixteenthIndex = (eighthBeat - startBeat) * 2 + sub
        const noteIndex = sixteenthIndex % chordTones.length
        const freq = midiToFreq(chordTones[noteIndex])
        const noteT = t + sub * BGM_SIXTEENTH

        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = freq

        const g = ctx.createGain()
        g.gain.setValueAtTime(0.06, noteT)
        g.gain.exponentialRampToValueAtTime(0.001, noteT + 0.08)

        osc.connect(g)
        g.connect(arpDest)
        osc.start(noteT)
        osc.stop(noteT + 0.1)
      }
      break
    }
  }

  // ── Drums ──

  // Check if we're in the last 4 eighth beats of the loop (drum fill zone)
  const fillStart = MELODY_TOTAL - 4
  const inFill = bgmLoopCount > 0 && eighthBeat >= fillStart

  if (inFill) {
    // Drum fill: rapid snare 16ths with crescendo
    const fillBeatIndex = eighthBeat - fillStart // 0..3
    for (let sub = 0; sub < 2; sub++) {
      const hitIndex = fillBeatIndex * 2 + sub
      const hitT = t + sub * BGM_SIXTEENTH
      const hitGain = 0.06 + (hitIndex / 8) * 0.12 // crescendo

      const len = Math.round(ctx.sampleRate * 0.06)
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.1))
      }
      const sn = ctx.createBufferSource()
      sn.buffer = buf
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 4000
      bp.Q.value = 0.6
      const sG = ctx.createGain()
      sG.gain.setValueAtTime(hitGain, hitT)
      sG.gain.exponentialRampToValueAtTime(0.001, hitT + 0.06)
      sn.connect(bp)
      bp.connect(sG)
      sG.connect(drumsDest)
      sn.start(hitT)
      sn.stop(hitT + 0.06)
    }

    // Crash cymbal on the very last eighth beat of the fill
    if (eighthBeat === MELODY_TOTAL - 1) {
      const crashDuration = 0.4
      const crashBufSize = Math.round(ctx.sampleRate * crashDuration)
      const crashBuf = ctx.createBuffer(1, crashBufSize, ctx.sampleRate)
      const crashData = crashBuf.getChannelData(0)
      for (let i = 0; i < crashBufSize; i++) {
        crashData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (crashBufSize * 0.2))
      }
      const crashSrc = ctx.createBufferSource()
      crashSrc.buffer = crashBuf
      const crashBp = ctx.createBiquadFilter()
      crashBp.type = 'bandpass'
      crashBp.frequency.value = 6000
      crashBp.Q.value = 0.3
      const crashG = ctx.createGain()
      crashG.gain.setValueAtTime(0.10, t)
      crashG.gain.exponentialRampToValueAtTime(0.001, t + crashDuration)
      crashSrc.connect(crashBp)
      crashBp.connect(crashG)
      crashG.connect(drumsDest)
      crashSrc.start(t)
      crashSrc.stop(t + crashDuration)
    }
  } else {
    // Normal drums pattern
    // Kick on every 4 eighth notes (beats 0, 4, 8, ...)
    if (eighthBeat % 4 === 0) {
      const kick = ctx.createOscillator()
      const kG = ctx.createGain()
      kick.type = 'sine'
      kick.frequency.setValueAtTime(120, t)
      kick.frequency.exponentialRampToValueAtTime(40, t + 0.06)
      kG.gain.setValueAtTime(0.35, t)
      kG.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      kick.connect(kG)
      kG.connect(drumsDest)
      kick.start(t)
      kick.stop(t + 0.1)
    }

    // Snare on beats 2, 6, 10, ... (every other quarter note)
    if (eighthBeat % 4 === 2) {
      const len = Math.round(ctx.sampleRate * 0.06)
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.1))
      }
      const sn = ctx.createBufferSource()
      sn.buffer = buf
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 4000
      bp.Q.value = 0.6
      const sG = ctx.createGain()
      sG.gain.setValueAtTime(0.12, t)
      sG.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
      sn.connect(bp)
      bp.connect(sG)
      sG.connect(drumsDest)
      sn.start(t)
      sn.stop(t + 0.06)
    }
  }

  // Hi-hat on every eighth note (always plays, even during fill)
  const hatBuf = getHatBuffer()
  const hat = ctx.createBufferSource()
  hat.buffer = hatBuf
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 9000
  const hG = ctx.createGain()
  // Accent on downbeats
  hG.gain.setValueAtTime(eighthBeat % 2 === 0 ? 0.06 : 0.03, t)
  hG.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
  hat.connect(hp)
  hp.connect(hG)
  hG.connect(drumsDest)
  hat.start(t)
  hat.stop(t + 0.03)
}

export function stopBGM() {
  if (bgmSchedulerId) {
    clearInterval(bgmSchedulerId)
    bgmSchedulerId = 0
  }
  if (bgmTremoloId) {
    clearInterval(bgmTremoloId)
    bgmTremoloId = 0
  }
  bgmInDanger = false
  bgmCurrentTier = -1
  if (bgmGainNode) {
    try {
      const ctx = getCtx()
      bgmGainNode.gain.setValueAtTime(bgmGainNode.gain.value, ctx.currentTime)
      bgmGainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    } catch {}
    const g = bgmGainNode
    const f = bgmFilter
    bgmGainNode = null
    bgmFilter = null
    bgmMelodyGain = null
    bgmCounterMelodyGain = null
    bgmBassGain = null
    bgmArpeggioGain = null
    bgmDrumsGain = null
    setTimeout(() => {
      try { g.disconnect() } catch {}
      try { f?.disconnect() } catch {}
    }, 500)
  }
}

// ─── Dynamic BGM: combo-based layer mixing + danger state ───

function getComboTier(combo: number): number {
  if (combo >= 20) return 4
  if (combo >= 10) return 3
  if (combo >= 5) return 2
  if (combo >= 1) return 1
  return 0
}

const TIER_CONFIG: { counterMelody: number; arpeggio: number; drums: number; cutoff: number }[] = [
  { counterMelody: 0.001, arpeggio: 0.001, drums: 0.5, cutoff: 4000 },  // tier 0: sparse
  { counterMelody: 0.001, arpeggio: 0.001, drums: 1.0, cutoff: 5000 },  // tier 1: full drums
  { counterMelody: 1.0,   arpeggio: 0.001, drums: 1.0, cutoff: 7000 },  // tier 2: + counter-melody
  { counterMelody: 1.0,   arpeggio: 1.0,   drums: 1.0, cutoff: 9000 },  // tier 3: + arpeggio
  { counterMelody: 1.0, arpeggio: 1.0, drums: 1.0, cutoff: 12000 }, // tier 4: maximum hype
]

export function updateBGMDynamics(combo: number, lives: number, _maxLives: number) {
  if (!bgmGainNode || !bgmFilter) return
  try {
    const ctx = getCtx()
    const now = ctx.currentTime

    // ── Combo tier layer mixing ──
    const tier = getComboTier(combo)
    if (tier !== bgmCurrentTier) {
      bgmCurrentTier = tier
      const cfg = TIER_CONFIG[tier]

      if (bgmCounterMelodyGain) {
        bgmCounterMelodyGain.gain.cancelScheduledValues(now)
        bgmCounterMelodyGain.gain.setValueAtTime(bgmCounterMelodyGain.gain.value, now)
        bgmCounterMelodyGain.gain.linearRampToValueAtTime(cfg.counterMelody, now + 0.5)
      }
      if (bgmArpeggioGain) {
        bgmArpeggioGain.gain.cancelScheduledValues(now)
        bgmArpeggioGain.gain.setValueAtTime(bgmArpeggioGain.gain.value, now)
        bgmArpeggioGain.gain.linearRampToValueAtTime(cfg.arpeggio, now + 0.5)
      }
      if (bgmDrumsGain) {
        bgmDrumsGain.gain.cancelScheduledValues(now)
        bgmDrumsGain.gain.setValueAtTime(bgmDrumsGain.gain.value, now)
        bgmDrumsGain.gain.linearRampToValueAtTime(cfg.drums, now + 0.5)
      }

      bgmFilter.frequency.cancelScheduledValues(now)
      bgmFilter.frequency.setValueAtTime(bgmFilter.frequency.value, now)
      bgmFilter.frequency.linearRampToValueAtTime(cfg.cutoff, now + 0.3)
    }

    // ── Danger state (lives <= 1) ──
    const shouldDanger = lives <= 1
    if (shouldDanger && !bgmInDanger) {
      bgmInDanger = true
      bgmFilter.Q.cancelScheduledValues(now)
      bgmFilter.Q.setValueAtTime(bgmFilter.Q.value, now)
      bgmFilter.Q.linearRampToValueAtTime(4.0, now + 0.3)

      // Heartbeat tremolo at ~2Hz on bgmGainNode
      let tremoloPhase = 0
      bgmTremoloId = window.setInterval(() => {
        if (!bgmGainNode || !bgmInDanger) return
        const t = getCtx().currentTime
        // Pulse between 0.11 and 0.15
        const val = tremoloPhase % 2 === 0 ? 0.11 : 0.15
        bgmGainNode.gain.cancelScheduledValues(t)
        bgmGainNode.gain.setValueAtTime(bgmGainNode.gain.value, t)
        bgmGainNode.gain.linearRampToValueAtTime(val, t + 0.05)
        tremoloPhase++
      }, 250) // 4 transitions per second = 2Hz cycle
    } else if (!shouldDanger && bgmInDanger) {
      bgmInDanger = false
      if (bgmTremoloId) {
        clearInterval(bgmTremoloId)
        bgmTremoloId = 0
      }
      bgmFilter.Q.cancelScheduledValues(now)
      bgmFilter.Q.setValueAtTime(bgmFilter.Q.value, now)
      bgmFilter.Q.linearRampToValueAtTime(1.0, now + 0.3)

      bgmGainNode.gain.cancelScheduledValues(now)
      bgmGainNode.gain.setValueAtTime(bgmGainNode.gain.value, now)
      bgmGainNode.gain.linearRampToValueAtTime(0.15, now + 0.2)
    }
  } catch {
    // Audio not available
  }
}

// ─── Combo Milestone SFX with BGM Ducking ───

// Pentatonic scale: C5, D5, E5, G5, A5
const MILESTONE_NOTES = [523, 587, 659, 784, 880]

function getMilestoneNoteCount(combo: number): number {
  if (combo >= 50) return 5
  if (combo >= 20) return 4
  if (combo >= 10) return 3
  if (combo >= 5) return 2
  return 0
}

export function playComboMilestone(combo: number) {
  const noteCount = getMilestoneNoteCount(combo)
  if (noteCount === 0) return

  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    // Play ascending pentatonic chime
    for (let i = 0; i < noteCount; i++) {
      const t = now + i * 0.08
      const freq = MILESTONE_NOTES[i]

      // Main sine tone
      const osc1 = ctx.createOscillator()
      osc1.type = 'sine'
      osc1.frequency.value = freq
      const g1 = ctx.createGain()
      g1.gain.setValueAtTime(0.12, t)
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
      osc1.connect(g1)
      g1.connect(sfx)
      osc1.start(t)
      osc1.stop(t + 0.3)

      // Detuned octave shimmer
      const osc2 = ctx.createOscillator()
      osc2.type = 'sine'
      osc2.frequency.value = freq * 2.01
      const g2 = ctx.createGain()
      g2.gain.setValueAtTime(0.04, t)
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
      osc2.connect(g2)
      g2.connect(sfx)
      osc2.start(t)
      osc2.stop(t + 0.3)
    }

    // Duck BGM during milestone
    if (bgmGainNode) {
      bgmGainNode.gain.cancelScheduledValues(now)
      bgmGainNode.gain.setValueAtTime(bgmGainNode.gain.value, now)
      bgmGainNode.gain.linearRampToValueAtTime(0.10, now + 0.05)
      bgmGainNode.gain.linearRampToValueAtTime(0.15, now + 0.45)
    }
  } catch {
    // Audio not available
  }
}

// ─── New High Score Fanfare (C5-E5-G5-C6 then E6-G6-C7) ───

export function playNewHighScoreFanfare() {
  try {
    const ctx = getCtx()
    const sfx = getSfxGain()
    const now = ctx.currentTime

    // Two-phrase celebration arpeggio
    const phrase1 = [523, 659, 784, 1047] // C5 E5 G5 C6
    const phrase2 = [1319, 1568, 2093]     // E6 G6 C7

    const allNotes = [...phrase1, ...phrase2]
    allNotes.forEach((freq, i) => {
      const t = now + i * 0.09

      const osc = ctx.createOscillator()
      osc.type = i < phrase1.length ? 'square' : 'sine'
      osc.frequency.value = freq

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.14, t)
      gain.gain.setValueAtTime(0.12, t + 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)

      osc.connect(gain)
      gain.connect(sfx)
      osc.start(t)
      osc.stop(t + 0.5)
    })
  } catch {
    // Audio not available
  }
}
