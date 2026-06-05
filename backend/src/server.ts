import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { connectDB } from "./db/index.js";
import { handleRequest } from "./app.js";
import { startAutoShareJob } from "./services/autoShareService.js";

// Tiny dependency-free .env loader helper
const loadEnv = () => {
  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    try {
      const envContent = readFileSync(envPath, "utf-8");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const index = trimmed.indexOf("=");
          if (index !== -1) {
            const key = trimmed.substring(0, index).trim();
            const val = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, "");
            process.env[key] = val;
          }
        }
      }
    } catch (e) {
      console.warn("Could not read .env file:", e);
    }
  }
};
loadEnv();

const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/preproute";

// Connect to MongoDB
connectDB(mongoUri)
  .then(() => {
    startAutoShareJob();
  })
  .catch(err => {
    console.error("MongoDB Connection Error:", err);
  });

const server = createServer(handleRequest);

server.listen(port, "127.0.0.1", () => {
  console.log(`PrepRoute backend listening at http://127.0.0.1:${port}`);
});
