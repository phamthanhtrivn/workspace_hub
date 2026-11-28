/** Contrast-safe text for user-selected hex fills; never changes the saved color. */
export function readableTextOnColor(background: string): string {
  const hex = background.replace(/^#/, "");
  const expanded = hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex;
  if (!/^[\da-f]{6}$/i.test(expanded)) return "var(--primary-foreground)";

  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(expanded.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const lightContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.05;

  return lightContrast >= darkContrast ? "var(--on-color)" : "var(--on-color-dark)";
}
