import type { GameEvent } from "../core/mod.ts";

type SoundName = "step" | "bump" | "pluck" | "repair" | "sizzle" | "fanfare";

// Which sound each event plays. A new event fails to type-check until it has an entry.
const SOUND_FOR: Record<GameEvent["type"], SoundName | null> = {
  moved: "step",
  blocked: "bump",
  foraged: "pluck",
  repaired: "repair",
  cooked: "sizzle",
  plated: "fanfare",
};

type Note = {
  frequency: number;
  seconds: number;
  wave: OscillatorType;
  at?: number;
  // Slide to this frequency by the end of the note.
  to?: number;
};

const NOTES: Record<SoundName, Note[]> = {
  step: [{ frequency: 130, seconds: 0.05, wave: "triangle", to: 80 }],
  bump: [{ frequency: 110, seconds: 0.14, wave: "square", to: 60 }],
  pluck: [
    { frequency: 620, seconds: 0.1, wave: "triangle", to: 880 },
    { frequency: 1240, seconds: 0.09, wave: "sine", at: 0.07 },
  ],
  // The three notes of "yes, chef", from nobody.
  repair: [
    { frequency: 392, seconds: 0.16, wave: "sawtooth" },
    { frequency: 392, seconds: 0.14, wave: "sawtooth", at: 0.17 },
    { frequency: 523, seconds: 0.34, wave: "sawtooth", at: 0.32 },
  ],
  sizzle: [{ frequency: 70, seconds: 0.5, wave: "sine", to: 50 }],
  fanfare: [
    { frequency: 523, seconds: 0.18, wave: "triangle" },
    { frequency: 659, seconds: 0.18, wave: "triangle", at: 0.17 },
    { frequency: 784, seconds: 0.2, wave: "triangle", at: 0.34 },
    { frequency: 1047, seconds: 0.6, wave: "triangle", at: 0.52 },
    { frequency: 784, seconds: 0.6, wave: "sine", at: 0.52 },
  ],
};

// These also get a rush of filtered noise, for rustling and frying.
const NOISE: Partial<Record<SoundName, { seconds: number; hertz: number }>> = {
  step: { seconds: 0.05, hertz: 2400 },
  sizzle: { seconds: 1.5, hertz: 5200 },
};

const VOLUME = 0.12;

// Phaser plays loaded audio but has no synthesis, so this is plain Web Audio, with
// no library and no Phaser. Browsers refuse to start audio before a user gesture,
// so the context waits for the first key or click.
export class Sounds {
  context: AudioContext | null = null;
  private muted = false;
  private readonly button: HTMLButtonElement;

  constructor(button: HTMLButtonElement) {
    this.button = button;
    const start = () => this.startContext();
    addEventListener("keydown", start, { once: true });
    addEventListener("pointerdown", start, { once: true });
    button.addEventListener("click", (event) => {
      this.setMuted(!this.muted);
      // After a mouse click, give keys back to the game. Keyboard users keep focus.
      if (event.detail > 0) button.blur();
    });
  }

  show(event: GameEvent) {
    const sound = SOUND_FOR[event.type];
    if (sound) this.play(sound);
  }

  private setMuted(muted: boolean) {
    this.muted = muted;
    this.button.textContent = muted ? "Dale: off" : "Dale: on";
    this.button.setAttribute("aria-pressed", String(muted));
    this.startContext();
    // Unmuting confirms itself.
    this.play("pluck");
  }

  private startContext() {
    try {
      this.context ??= new AudioContext();
      this.context.resume();
    } catch {
      // No audio on this browser or device. The game plays on, silently.
      this.context = null;
    }
  }

  private play(sound: SoundName) {
    const { context } = this;
    if (!context || this.muted) return;
    const noise = NOISE[sound];
    if (noise) this.hiss(context, noise.seconds, noise.hertz);
    for (const { frequency, seconds, wave, at = 0, to } of NOTES[sound]) {
      const begin = context.currentTime + at;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, begin);
      if (to) oscillator.frequency.linearRampToValueAtTime(to, begin + seconds);
      gain.gain.setValueAtTime(VOLUME, begin);
      gain.gain.exponentialRampToValueAtTime(0.001, begin + seconds);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(begin);
      oscillator.stop(begin + seconds);
    }
  }

  private hiss(context: AudioContext, seconds: number, hertz: number) {
    const length = Math.ceil(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    // Presentation only, so Math.random() is fine out here. It would not be in core/.
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = hertz;
    gain.gain.setValueAtTime(VOLUME, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + seconds,
    );
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
  }
}
