// A short "ding" when a pomodoro or a break ends, made with the Web Audio API
// (no sound file needed). Browsers only allow sound after the user has
// clicked something, so `unlockSound()` is called from the Start button.
let ctx: AudioContext | null = null

export function unlockSound(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null // no audio available: the timer still works silently
  }
}

/** Three short tones. */
export function ding(): void {
  if (!ctx) return
  const start = ctx.currentTime
  ;[0, 0.25, 0.5].forEach((offset, i) => {
    const osc = ctx!.createOscillator()
    const gain = ctx!.createGain()
    osc.frequency.value = i === 2 ? 1046 : 880
    gain.gain.setValueAtTime(0.0001, start + offset)
    gain.gain.exponentialRampToValueAtTime(0.25, start + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.22)
    osc.connect(gain).connect(ctx!.destination)
    osc.start(start + offset)
    osc.stop(start + offset + 0.25)
  })
}
