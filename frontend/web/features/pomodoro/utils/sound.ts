/**
 * Web Audio API Sound Synthesizer for Pomodoro alerts.
 * Generates clear, pleasant auditory signals without requiring external sound asset files.
 */

export function playPomodoroSound(
  type: "chime" | "bell" | "digital" = "chime",
  volume: number = 0.7,
) {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const clampedVol = Math.max(0, Math.min(1, volume));

    if (type === "bell") {
      playTibetanBell(ctx, clampedVol);
    } else if (type === "digital") {
      playDigitalBeep(ctx, clampedVol);
    } else {
      playZenChime(ctx, clampedVol);
    }
  } catch (err) {
    console.warn("Could not play Pomodoro alert sound:", err);
  }
}

function playZenChime(ctx: AudioContext, masterVolume: number) {
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + idx * 0.12);

    gain.gain.setValueAtTime(0.001, now + idx * 0.12);
    gain.gain.exponentialRampToValueAtTime(masterVolume * 0.3, now + idx * 0.12 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.12);
    osc.stop(now + idx * 0.12 + 1.25);
  });
}

function playTibetanBell(ctx: AudioContext, masterVolume: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(440, now); // A4
  osc.frequency.exponentialRampToValueAtTime(436, now + 2.5);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(masterVolume * 0.6, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 2.5);
}

function playDigitalBeep(ctx: AudioContext, masterVolume: number) {
  const now = ctx.currentTime;
  const beeps = [0, 0.18, 0.36];

  beeps.forEach((startOffset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, now + startOffset); // A5

    gain.gain.setValueAtTime(masterVolume * 0.4, now + startOffset);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + startOffset);
    osc.stop(now + startOffset + 0.12);
  });
}
