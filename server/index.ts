import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { config } from "./config";
import type { ConfigResponse } from "@shared/types";
import { scriptRouter } from "./routes/script";
import { renderRouter } from "./routes/render";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Report which providers are live (lets the client show a banner).
app.get("/api/config", (_req, res) => {
  const response: ConfigResponse = {
    llmProvider: config.llm.provider,
    imageProvider: config.image.provider,
    live: config.llm.provider !== "mock" && config.image.provider !== "mock",
  };
  res.json(response);
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api", scriptRouter);
app.use("/api", renderRouter);

// In production, serve the built client from dist/.
const distDir = path.resolve(__dirname, "..", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

app.listen(config.port, () => {
  console.log(`\n  Yomu server → http://localhost:${config.port}`);
  console.log(`  LLM provider:   ${config.llm.provider}`);
  console.log(`  Image provider: ${config.image.provider}`);
  console.log(`  Delivery store: ${config.storage.provider}`);
  if (!fs.existsSync(distDir)) {
    console.log(`  (dev) client served by Vite → http://localhost:5173\n`);
  }
});
