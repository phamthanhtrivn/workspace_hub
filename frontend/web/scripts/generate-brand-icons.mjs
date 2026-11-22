import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// All browser/notification variants are derived from the editable SVG mark.
const asset = (path) => new URL(path, import.meta.url);
const mark = await readFile(
  asset("../public/brand/workspacehub-mark.svg"),
  "utf8",
);
const background = '<rect width="128" height="128" rx="28" fill="#0B1020"/>';
if (!mark.includes("<!-- icon-background -->")) {
  throw new Error("The brand SVG is missing its icon background marker.");
}
const icon = mark.replace("<!-- icon-background -->", background);
const badge = mark.replaceAll("url(#mark-gradient)", "#ffffff");
const render = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map((size) => render(icon, size)));
const directory = Buffer.alloc(6 + 16 * frames.length);
directory.writeUInt16LE(1, 2); // ICO image type.
directory.writeUInt16LE(frames.length, 4);
let offset = directory.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  directory.writeUInt8(sizes[index], entry);
  directory.writeUInt8(sizes[index], entry + 1);
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});

await Promise.all([
  writeFile(asset("../app/icon.svg"), icon),
  writeFile(asset("../app/favicon.ico"), Buffer.concat([directory, ...frames])),
  render(icon, 180).then((png) =>
    writeFile(asset("../app/apple-icon.png"), png),
  ),
  render(icon, 192).then((png) =>
    writeFile(asset("../public/brand/workspacehub-icon.png"), png),
  ),
  render(badge, 96).then((png) =>
    writeFile(asset("../public/brand/workspacehub-badge.png"), png),
  ),
]);
console.log(
  "Generated SVG, ICO, Apple touch and notification icons from the brand mark.",
);
