// Helper: write cadastro.tsx from base64 input. Run: node scripts/write-cadastro.js
const fs = require("fs");
const path = require("path");
const b64 = process.argv[2];
if (!b64) {
  console.error("usage: node scripts/write-cadastro.js <b64>");
  process.exit(1);
}
const content = Buffer.from(b64, "base64").toString("utf-8");
const target = path.join(__dirname, "..", "src", "routes", "cadastro.tsx");
fs.writeFileSync(target, content, "utf-8");
console.log("wrote", target, "len=", content.length);
