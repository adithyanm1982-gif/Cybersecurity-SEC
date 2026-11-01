// =====================================================================
//  Sound engine. Every sound is SYNTHESISED here with the Web Audio API,
//  so there are no audio files to download. Each kind of button has its
//  own sound, and the intro has a cyberpunk sequence.
//
//    sfx.play('click')   sfx.play('success')   sfx.configure({ enabled, volume })
// =====================================================================
let ctx = null
let bus = null // every sound goes in here
let master = null // volume knob (after it comes a limiter, so loud never means distorted)
let noiseBuf = null
const cfg = { enabled: true, volume: 0.9 }

const masterGain = () => 0.2 + cfg.volume * 1.6 // volume 0..1  ->  loud and clear, the limiter catches the peaks

const watchers = new Set()

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    ctx.onstatechange = () => watchers.forEach((fn) => fn())
    bus = ctx.createGain()
    master = ctx.createGain()
    master.gain.value = masterGain()
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -9
    limiter.knee.value = 8
    limiter.ratio.value = 14
    limiter.attack.value = 0.002
    limiter.release.value = 0.18
    bus.connect(master)
    master.connect(limiter)
    limiter.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// one oscillator note with a quick attack and a smooth fade
function tone({ f = 440, f2, dur = 0.1, type = 'sine', vol = 0.4, delay = 0, attack = 0.004, lp }) {
  const t = ctx.currentTime + delay
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vol, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let node = o
  if (lp) {
    const fl = ctx.createBiquadFilter()
    fl.type = 'lowpass'
    fl.frequency.value = lp
    o.connect(fl)
    node = fl
  }
  node.connect(g)
  g.connect(bus)
  o.start(t)
  o.stop(t + dur + 0.03)
}

// filtered noise: swooshes, impacts, static bursts
function noise({ dur = 0.3, vol = 0.3, delay = 0, from = 400, to = 4000, q = 1, type = 'bandpass' }) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t = ctx.currentTime + delay
  const s = ctx.createBufferSource()
  s.buffer = noiseBuf
  const fl = ctx.createBiquadFilter()
  fl.type = type
  fl.Q.value = q
  fl.frequency.setValueAtTime(from, t)
  fl.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur / 3))
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(fl)
  fl.connect(g)
  g.connect(bus)
  s.start(t, Math.random())
  s.stop(t + dur + 0.03)
}

const SOUNDS = {
  // ---- buttons: each family sounds different ----
  click: () => { // primary buttons: crisp digital tick
    tone({ f: 1250, f2: 780, dur: 0.07, type: 'square', vol: 0.26, lp: 5000 })
    tone({ f: 2500, dur: 0.035, type: 'sine', vol: 0.16 })
  },
  soft: () => { // secondary / small buttons: mellow tap
    tone({ f: 540, f2: 430, dur: 0.1, type: 'triangle', vol: 0.4 })
  },
  nav: () => { // navigation links and next/back: short rising sweep
    noise({ dur: 0.16, vol: 0.2, from: 600, to: 2600, q: 2 })
    tone({ f: 420, f2: 860, dur: 0.13, type: 'triangle', vol: 0.3 })
  },
  toggle: () => { // switches, segmented buttons, swatches: double tick
    tone({ f: 720, dur: 0.045, type: 'square', vol: 0.2, lp: 4000 })
    tone({ f: 1080, dur: 0.05, type: 'square', vol: 0.2, lp: 4000, delay: 0.055 })
  },
  select: () => { // opening an album, photo or card
    tone({ f: 980, dur: 0.06, type: 'sine', vol: 0.32 })
    tone({ f: 1470, dur: 0.08, type: 'sine', vol: 0.26, delay: 0.045 })
  },
  open: () => { // settings, menus, panels: whoosh up
    noise({ dur: 0.26, vol: 0.24, from: 400, to: 3600, q: 1.5 })
    tone({ f: 320, f2: 640, dur: 0.22, type: 'sine', vol: 0.3 })
  },
  close: () => { // closing: whoosh down
    noise({ dur: 0.2, vol: 0.2, from: 3600, to: 400, q: 1.5 })
    tone({ f: 640, f2: 320, dur: 0.18, type: 'sine', vol: 0.26 })
  },
  danger: () => { // delete / log out: short descending digital "denied" zap
    tone({ f: 760, f2: 240, dur: 0.13, type: 'square', vol: 0.2, lp: 2600 })
    noise({ dur: 0.12, vol: 0.14, from: 2600, to: 500, q: 1.5 })
  },
  success: () => { // upload saved, form sent: rising three-note chime
    ;[660, 880, 1320].forEach((f, i) => tone({ f, dur: 0.16, type: 'triangle', vol: 0.34, delay: i * 0.085 }))
    tone({ f: 1760, dur: 0.3, type: 'sine', vol: 0.16, delay: 0.26 })
  },
  error: () => { // something failed: two short falling beeps
    tone({ f: 330, dur: 0.09, type: 'square', vol: 0.2, lp: 2200 })
    tone({ f: 247, dur: 0.14, type: 'square', vol: 0.2, lp: 2200, delay: 0.11 })
  },

  // ---- intro: cyberpunk boot sequence (bright synth + digital glitch, nothing low or rumbling) ----
  introBlip: (i = 0) => { // a boot line appears: three quick rising data chirps
    const base = 1100 + i * 260
    ;[0, 1, 2].forEach((k) => tone({ f: base * (1 + k * 0.25), dur: 0.04, type: 'square', vol: 0.15, delay: k * 0.045, lp: 7000 }))
  },
  introRise: () => { // tension: an accelerating minor arpeggio climbing up, with a rising digital hiss
    const notes = [220, 261.63, 329.63, 392, 440, 523.25, 659.25, 783.99, 880, 1046.5, 1318.5, 1568, 1760, 2093]
    let t = 0
    let step = 0.15
    notes.forEach((f, i) => {
      tone({ f, dur: 0.11, type: 'square', vol: 0.11 + i * 0.01, delay: t, lp: 3400 })
      t += step
      step = Math.max(0.05, step * 0.83)
    })
    noise({ dur: 1.4, vol: 0.14, from: 1500, to: 11000, q: 1.2, type: 'highpass' })
  },
  introHit: () => { // title: bright detuned synth stab (A minor), laser zap and glitch bursts
    ;[440, 523.25, 659.25, 783.99].forEach((f) => {
      tone({ f, dur: 0.95, type: 'sawtooth', vol: 0.13, lp: 2800, attack: 0.008 })
      tone({ f: f * 1.008, dur: 0.95, type: 'sawtooth', vol: 0.1, lp: 2800, attack: 0.008 })
    })
    tone({ f: 3400, f2: 260, dur: 0.26, type: 'square', vol: 0.15, lp: 6500 }) // laser zap
    tone({ f: 2093, dur: 0.7, type: 'sine', vol: 0.16, delay: 0.03 }) // metallic ping
    noise({ dur: 0.35, vol: 0.28, from: 900, to: 9000, q: 1.5 }) // digital whoosh
    for (let i = 0; i < 4; i++) noise({ dur: 0.045, vol: 0.24, from: 3500 + i * 900, to: 8000, type: 'highpass', delay: 0.09 + i * 0.07 }) // glitch
  },
  introAccess: () => { // "access granted": shimmering high arpeggio over a soft pad
    ;[659.25, 783.99, 987.77, 1318.5, 1568, 1975.5].forEach((f, i) => tone({ f, dur: 0.2, type: 'triangle', vol: 0.22, delay: i * 0.07 }))
    ;[440, 523.25, 659.25].forEach((f) => tone({ f, dur: 1.8, type: 'sine', vol: 0.1, attack: 0.2 }))
    tone({ f: 2637, dur: 0.6, type: 'sine', vol: 0.12, delay: 0.45 })
  },
  introOut: () => { // the intro dissolves into the site: quick bright sweep
    noise({ dur: 0.6, vol: 0.2, from: 2000, to: 12000, q: 1, type: 'highpass' })
    tone({ f: 600, f2: 2400, dur: 0.35, type: 'triangle', vol: 0.2 })
  },
}

export const sfx = {
  configure({ enabled, volume }) {
    cfg.enabled = enabled
    cfg.volume = Math.min(1, Math.max(0, volume))
    if (master) master.gain.value = masterGain()
  },
  // browsers only allow audio after a tap / click / key press: this is called on the first one
  unlock() { ensure() },
  // true while sound is switched on but the browser is still blocking it (used for the "tap for sound" hint)
  locked() { return cfg.enabled && Boolean(ctx) && ctx.state !== 'running' },
  watch(fn) { watchers.add(fn); return () => watchers.delete(fn) },
  // fromClick = true when called straight from a tap / click (then it may unlock the audio itself)
  play(name, arg, fromClick = false) {
    if (!cfg.enabled || !SOUNDS[name]) return
    try {
      const c = ensure()
      if (!c) return
      if (c.state === 'running') SOUNDS[name](arg)
      // Never schedule sounds while blocked: they would all burst out together when audio finally unlocks.
      else if (fromClick) c.resume().then(() => SOUNDS[name](arg)).catch(() => {})
    } catch { /* sound is optional: never break the page */ }
  },
}

export const logo = (name) => `${import.meta.env.BASE_URL}logos/${name}`