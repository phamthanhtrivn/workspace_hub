/** Duration of the PCM16 WAV chunks produced by the shared FFmpeg pipeline. */
export function pcmWaveSeconds(buffer: Buffer): number {
  if (
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  )
    throw new Error("Invalid WAV chunk");
  let byteRate = 0;
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const kind = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (offset + 8 + size > buffer.length)
      throw new Error("Incomplete WAV chunk");
    if (kind === "fmt " && size >= 16)
      byteRate = buffer.readUInt32LE(offset + 16);
    if (kind === "data") {
      if (byteRate !== 32000) throw new Error("Expected mono 16 kHz PCM16 WAV");

      return size / byteRate;
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("WAV audio is missing");
}
