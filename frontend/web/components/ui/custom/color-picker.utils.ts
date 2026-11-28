export interface HsvColor {
  hue: number;
  saturation: number;
  value: number;
}

export function normalizeHexColor(input: string): string | null {
  const hex = input.trim().replace(/^#/, "");
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) return null;

  return `#${(hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex).toUpperCase()}`;
}

export function hsvToHex({ hue, saturation, value }: HsvColor): string {
  const chroma = ((value / 100) * saturation) / 100;
  const section = (((hue % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  const channels =
    section < 1
      ? [chroma, x, 0]
      : section < 2
        ? [x, chroma, 0]
        : section < 3
          ? [0, chroma, x]
          : section < 4
            ? [0, x, chroma]
            : section < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const offset = value / 100 - chroma;

  return `#${channels
    .map((channel) =>
      Math.round((channel + offset) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
}

export function hexToHsv(input: string): HsvColor {
  const hex = normalizeHexColor(input);
  if (!hex) return { hue: 0, saturation: 0, value: 0 };
  const [red, green, blue] = [1, 3, 5].map(
    (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const max = Math.max(red, green, blue),
    min = Math.min(red, green, blue),
    difference = max - min;
  const hue =
    difference === 0
      ? 0
      : max === red
        ? 60 * (((green - blue) / difference + 6) % 6)
        : max === green
          ? 60 * ((blue - red) / difference + 2)
          : 60 * ((red - green) / difference + 4);

  return {
    hue,
    saturation: max === 0 ? 0 : (difference / max) * 100,
    value: max * 100,
  };
}

export function colorAreaPosition(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return {
    saturation: Math.max(0, Math.min(100, width > 0 ? (x / width) * 100 : 0)),
    value: Math.max(
      0,
      Math.min(100, height > 0 ? 100 - (y / height) * 100 : 0),
    ),
  };
}
