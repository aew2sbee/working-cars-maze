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

function tone(frequency: number, delay: number, duration: number, type: OscillatorType, volume: number): void {
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

/** A soft, falling "boing" for bumping into a wall: playful, never a scolding buzzer. */
export function playBump(): void {
  if (!context) return;
  const start = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(330, start);
  oscillator.frequency.exponentialRampToValueAtTime(140, start + 0.18);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.25, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.22);
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
