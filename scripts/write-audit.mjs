// Helper: concatena chunks base64 UTF-8 em um arquivo final.
// Uso: node scripts/write-audit.mjs <out> <b64-chunk>
import fs from "node:fs";

const [, , out, ...rest] = process.argv;
const b64 = rest.join("");
const buf = Buffer.from(b64, "base64");
fs.appendFileSync(out, buf);
console.log(`appended ${buf.length} bytes -> ${out}`);