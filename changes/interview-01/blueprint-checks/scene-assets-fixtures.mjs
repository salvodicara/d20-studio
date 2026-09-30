// B47 — writes the file fixtures of scene-assets-journey.js into the evidence directory
// (never into the checkout): the Universal VTT sample as a .dd2vtt file, a malformed
// .dd2vtt, and a PNG map with a drawn 56 px grid offset by (20, 12) for the alignment.
// Usage: node changes/interview-01/blueprint-checks/scene-assets-fixtures.mjs <dir>
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { uvttSampleText } from "../../../design/blueprint/uvtt-sample.mjs";

const dir =
  process.argv[2] ??
  "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B47/";
mkdirSync(dir, { recursive: true });

writeFileSync(dir + "cripta-sotto-la-torre.dd2vtt", uvttSampleText());
writeFileSync(dir + "rotta.dd2vtt", JSON.stringify({ format: 0.3, line_of_sight: [] }));

// A minimal PNG encoder (RGB, no filter) for the grid map.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const W = 1000,
  H = 650;
const rows = [];
for (let y = 0; y < H; y++) {
  const row = Buffer.alloc(1 + W * 3);
  for (let x = 0; x < W; x++) {
    const line = (x - 20 + 56 * 20) % 56 < 2 || (y - 12 + 56 * 20) % 56 < 2;
    const [r, g, b] = line ? [232, 223, 194] : [61, 74, 68];
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  rows.push(row);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(W, 0);
header.writeUInt32BE(H, 4);
header[8] = 8;
header[9] = 2;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync(dir + "sotterraneo-griglia.png", png);
console.log("Fixtures written to " + dir + " (png " + png.length + " bytes)");
