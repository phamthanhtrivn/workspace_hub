"""Generate the original, loopable Pomodoro audio in public/assets/sounds."""

from pathlib import Path
import wave

import numpy as np


RATE = 16_000
DURATION = 12
COUNT = RATE * DURATION
TIME = np.arange(COUNT) / RATE
OUT = Path(__file__).resolve().parents[3] / "public" / "assets" / "sounds"
RNG = np.random.default_rng(432)


def noise(low: float, high: float) -> np.ndarray:
    spectrum = np.fft.rfft(RNG.standard_normal(COUNT))
    frequencies = np.fft.rfftfreq(COUNT, 1 / RATE)
    spectrum[(frequencies < low) | (frequencies > high)] = 0
    result = np.fft.irfft(spectrum, n=COUNT)
    return result / max(np.std(result), 1e-8)


def tone(frequency: float, overtones=(1.0, 0.3, 0.12)) -> np.ndarray:
    return sum(
        amplitude * np.sin(2 * np.pi * frequency * (index + 1) * TIME)
        for index, amplitude in enumerate(overtones)
    )


def pulse(start: float, duration: float, decay: float) -> np.ndarray:
    age = (TIME - start) % DURATION
    return np.where(age < duration, np.exp(-age / decay), 0)


def save(name: str, signal: np.ndarray) -> None:
    signal = np.tanh(signal)
    signal -= np.mean(signal)
    fade = np.minimum(1, np.minimum(TIME, DURATION - TIME) / 0.12)
    pcm = np.int16(np.clip(signal * fade * 22_000, -32_768, 32_767))
    with wave.open(str(OUT / f"{name}.wav"), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(pcm.tobytes())


lofi = np.zeros(COUNT)
for start, chord in [(0, (174.61, 207.65, 261.63)), (3, (146.83, 174.61, 220)),
                     (6, (130.81, 164.81, 196)), (9, (146.83, 196, 246.94))]:
    envelope = pulse(start, 2.85, 1.8)
    lofi += 0.08 * envelope * sum(tone(note, (1, 0.18)) for note in chord)
    lofi += 0.13 * envelope * tone(chord[0] / 2, (1, 0.16))
for start in np.arange(0, DURATION, 0.75):
    lofi += 0.09 * pulse(start, 0.18, 0.07) * tone(60, (1, 0.1))
    lofi += 0.015 * pulse(start + 0.375, 0.1, 0.025) * noise(3_000, 7_000)
save("lofi_relax", lofi)

piano = np.zeros(COUNT)
notes = [261.63, 329.63, 392, 523.25, 392, 329.63,
         220, 261.63, 329.63, 440, 329.63, 261.63]
for index, note in enumerate(notes):
    piano += 0.16 * pulse(index, 0.9, 0.36) * tone(note, (1, 0.38, 0.16, 0.07))
save("gentle_piano", piano)

rain = 0.12 * noise(500, 7_000) + 0.09 * noise(70, 1_200)
rain *= 0.85 + 0.15 * np.sin(2 * np.pi * TIME / 3)
save("rain_heavy", rain)

surf = 0.12 * noise(80, 2_800) + 0.055 * noise(2_800, 7_000)
surf *= 0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * TIME / 4)) ** 2
save("ocean_waves", surf)

cafe = 0.055 * noise(150, 1_500) + 0.025 * noise(1_500, 4_500)
cafe *= 0.75 + 0.25 * np.sin(2 * np.pi * TIME / 2.4)
for start in (2, 5.3, 8.2, 10.6):
    cafe += 0.045 * pulse(start, 0.35, 0.09) * tone(900, (1, 0.6))
save("coffee_shop", cafe)

wind = 0.13 * noise(40, 700) + 0.03 * noise(700, 2_200)
wind *= 0.45 + 0.55 * (0.5 + 0.5 * np.sin(2 * np.pi * TIME / 6))
save("forest_wind", wind)
