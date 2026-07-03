// Helper: write login.tsx from base64 string. Re-run if the file is corrupted.
const fs = require("fs");
const path = require("path");

// Base64 of UTF-8 encoded content for src/routes/login.tsx
// Generated externally; do not edit the b64 below.
const b64 = require("fs").readFileSync(path.join(__dirname, "login.b64.txt"), "utf-8").trim();
const content = Buffer.from(b64, "base64").toString("utf-8");
const target = path.join(__dirname, "..", "src", "routes", "login.tsx");
fs.writeFileSync(target, content, "utf-8");
console.log("written", target, content.length, "bytes");
