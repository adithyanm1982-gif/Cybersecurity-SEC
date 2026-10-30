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

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
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
    noise({ dur: 0.28, vol: 0.26, from: 300, to: 3200, q: 1.5 })
    tone({ f: 220, f2: 470, dur: 0.26, type: 'sine', vol: 0.32 })
  },
  close: () => { // closing: whoosh down
    noise({ dur: 0.22, vol: 0.22, from: 3200, to: 300, q: 1.5 })
    tone({ f: 470, f2: 220, dur: 0.2, type: 'sine', vol: 0.28 })
  },
  danger: () => { // delete / log out: low falling thud
    tone({ f: 330, f2: 70, dur: 0.34, type: 'sawtooth', vol: 0.3, lp: 1400 })
    noise({ dur: 0.24, vol: 0.2, from: 1300, to: 180, type: 'lowpass' })
  },
  success: () => { // upload saved, form sent: rising three-note chime
    ;[660, 880, 1320].forEach((f, i) => tone({ f, dur: 0.16, type: 'triangle', vol: 0.34, delay: i * 0.085 }))
    tone({ f: 1760, dur: 0.3, type: 'sine', vol: 0.16, delay: 0.26 })
  },
  error: () => { // something failed: two low buzzes
    tone({ f: 190, dur: 0.18, type: 'sawtooth', vol: 0.34, lp: 900 })
    tone({ f: 145, dur: 0.24, type: 'sawtooth', vol: 0.34, lp: 900, delay: 0.17 })
  },

  // ---- intro: cyberpunk boot sequence ----
  introBlip: (i = 0) => { // a boot line appears
    tone({ f: 900 + i * 220, dur: 0.055, type: 'square', vol: 0.22, lp: 6000 })
    tone({ f: 1800 + i * 330, dur: 0.04, type: 'square', vol: 0.12, delay: 0.05, lp: 6000 })
  },
  introRise: () => { // tension riser before the title
    noise({ dur: 1.5, vol: 0.34, from: 200, to: 9000, q: 3 })
    tone({ f: 70, f2: 520, dur: 1.5, type: 'sawtooth', vol: 0.22, lp: 1800 })
  },
  introHit: () => { // title impact: sub drop + glitch zaps
    tone({ f: 150, f2: 36, dur: 1.2, type: 'sine', vol: 0.95 })
    tone({ f: 58, dur: 0.8, type: 'sawtooth', vol: 0.26, lp: 380 })
    noise({ dur: 0.6, vol: 0.4, from: 4500, to: 200, type: 'lowpass' })
    for (let i = 0; i < 4; i++) noise({ dur: 0.05, vol: 0.28, from: 3000 + i * 900, to: 6000, type: 'highpass', delay: 0.07 + i * 0.075 })
  },
  introAccess: () => { // "access granted": dark synth chord with a high ping
    ;[220, 277.18, 329.63, 440].forEach((f) => tone({ f, dur: 1.9, type: 'sawtooth', vol: 0.13, lp: 1500, attack: 0.05 }))
    tone({ f: 1760, dur: 0.6, type: 'sine', vol: 0.22, delay: 0.1 })
    tone({ f: 2637, dur: 0.5, type: 'sine', vol: 0.12, delay: 0.22 })
  },
  introOut: () => { // the intro dissolves into the site
    noise({ dur: 0.8, vol: 0.3, from: 400, to: 7000, q: 1 })
    tone({ f: 330, f2: 990, dur: 0.6, type: 'triangle', vol: 0.26 })
  },
}

export const sfx = {
  configure({ enabled, volume }) {
    cfg.enabled = enabled
    cfg.volume = Math.min(1, Math.max(0, volume))
    if (master) master.gain.value = masterGain()
  },
  // browsers only allow audio after a click: call this from a click handler
  unlock() { ensure() },
  play(name, arg) {
    if (!cfg.enabled || !SOUNDS[name]) return
    try { if (ensure()) SOUNDS[name](arg) } catch { /* sound is optional: never break the page */ }
  },
}

export const logo = (name) => `${import.meta.env.BASE_URL}logos/${name}`