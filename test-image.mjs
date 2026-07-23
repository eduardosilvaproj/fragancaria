import OpenAI from "openai";
import { readFileSync, writeFileSync } from "fs";

const envContent = readFileSync(".env", "utf-8");
const envVars = Object.fromEntries(
  envContent.split("\n").filter(l => l && !l.startsWith("#")).map(l => {
    const idx = l.indexOf("=");
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
  })
);
const apiKey = envVars.OPENAI_API_KEY;
if (!apiKey) { console.error("OPENAI_API_KEY nao encontrada"); process.exit(1); }

const client = new OpenAI({ apiKey, timeout: 600000, maxRetries: 0 });

console.log("Chamando gpt-5.6 + image_generation tool...");
const start = Date.now();

const response = await client.responses.create({
  model: "gpt-5.6",
  input: [
    {
      role: "user",
      content: [
        { type: "input_text", text: "Uma foto profissional de um frasco de perfume elegante sobre uma superfície de mármore, com iluminação natural suave, tons dourados e sofisticados, estilo fotografia de produto de luxo." },
      ],
    },
  ],
  tools: [
    {
      type: "image_generation",
      output_format: "webp",
      quality: "high",
    },
  ],
  tool_choice: { type: "image_generation" },
});

const elapsed = Date.now() - start;
console.log("Tempo total:", elapsed, "ms");
console.log("Status:", response.status);
console.log("Output types:", response.output?.map(o => o.type));

const genCall = response.output?.find(
  (item) => item.type === "image_generation_call" && typeof item.result === "string"
);
if (!genCall?.result) {
  console.error("NENHUM image_generation_call com result no output");
  console.log(JSON.stringify(response.output, null, 2));
  process.exit(1);
}

const result = genCall.result;
console.log("Result length:", result?.length);
console.log("Result prefix:", result?.substring(0, 80));

const base64Data = result.replace(/^data:[^;]+;base64,/, "");
const buffer = Buffer.from(base64Data, "base64");
writeFileSync("test-image-output.webp", buffer);
console.log("Salvo em test-image-output.webp");
console.log("Tamanho do arquivo:", buffer.length, "bytes");
