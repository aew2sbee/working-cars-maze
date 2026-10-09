// Tiny synthesized sounds, so no audio files have to be loaded.

let context: AudioContext | undefined;

/** iOS only plays Web Audio after it is started inside a touch handler. */
export function unlockAudio(): void {
  if (!context) {
    if (typeof AudioContext === 'undefined') return;
    context = new AudioContext();
  }
  if (context.state === 'suspended') void context.resume();
}

/**
 * An oscillator wired through its own gain to the speakers. The caller sets pitch and volume
 * before starting it, so it never sounds for an instant at the default settings.
 */
function voice(audio: AudioContext, type: OscillatorType): { oscillator: OscillatorNode; gain: GainNode } {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.connect(gain).connect(audio.destination);
  return { oscillator, gain };
}

function tone(frequency: number, delay: number, duration: number, type: OscillatorType, volume: number): void {
  if (!context) return;
  const start = context.currentTime + delay;
  const { oscillator, gain } = voice(context, type);
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

/**
 * A comic "ぽこっ、びよよ〜ん" for bumping into a wall: a quick knock, then a wobbly spring.
 * Silly rather than scolding, and nothing like the low thud of a step.
 */
export function playBump(): void {
  if (!context) return;
  const now = context.currentTime;

  // ぽこっ: a short, hollow knock.
  const knock = voice(context, 'sine');
  knock.oscillator.frequency.setValueAtTime(820, now);
  knock.oscillator.frequency.exponentialRampToValueAtTime(380, now + 0.05);
  knock.gain.gain.setValueAtTime(0.3, now);
  knock.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  knock.oscillator.start(now);
  knock.oscillator.stop(now + 0.07);

  // びよよ〜ん: a spring that leaps up and wobbles as it settles.
  const start = now + 0.045;
  const end = start + 0.55;
  const spring = voice(context, 'triangle');
  spring.oscillator.frequency.setValueAtTime(260, start);
  spring.oscillator.frequency.exponentialRampToValueAtTime(560, start + 0.12);
  spring.oscillator.frequency.exponentialRampToValueAtTime(470, end);
  spring.gain.gain.setValueAtTime(0.0001, start);
  spring.gain.gain.exponentialRampToValueAtTime(0.2, start + 0.015);
  spring.gain.gain.exponentialRampToValueAtTime(0.035, end - 0.03);
  spring.gain.gain.linearRampToValueAtTime(0, end);

  const wobble = context.createOscillator();
  const depth = context.createGain();
  wobble.type = 'sine';
  wobble.frequency.setValueAtTime(14, start);
  depth.gain.setValueAtTime(320, start);
  depth.gain.exponentialRampToValueAtTime(220, start + 0.25);
  depth.gain.exponentialRampToValueAtTime(40, end);
  wobble.connect(depth).connect(spring.oscillator.detune);

  spring.oscillator.start(start);
  wobble.start(start);
  spring.oscillator.stop(end);
  wobble.stop(end);
}

export function playStep(): void {
  tone(180 + Math.random() * 60, 0, 0.09, 'triangle', 0.12);
}

export function playFanfare(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((frequency, i) => {
    tone(frequency, i * 0.13, i === notes.length - 1 ? 0.6 : 0.16, 'square', 0.05);
  });
}
