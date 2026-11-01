import { ServerResponse, IncomingMessage } from "node:http";

export const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://127.0.0.1:5173";

export const getCorsOrigin = (origin?: string): string => {
  if (!origin) return frontendOrigin;

  const allowedOriginsEnv = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
    : [];

  const defaultAllowed = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:4200",
    "http://localhost:4200",
    ...allowedOriginsEnv
  ];

  if (defaultAllowed.includes(origin)) {
    return origin;
  }

  // Allow Vercel deployments (*.vercel.app)
  if (origin.endsWith(".vercel.app") || origin.includes(".vercel.app")) {
    return origin;
  }

  // Allow Render services (*.onrender.com)
  if (origin.endsWith(".onrender.com")) {
    return origin;
  }

  // Allow VS Code Dev Tunnels & GitHub Codespaces
  if (
    origin.endsWith(".devtunnels.ms") ||
    origin.endsWith(".github.dev") ||
    origin.endsWith(".app.github.dev")
  ) {
    return origin;
  }

  // Allow localhost, subdomains (*.localhost, *.local), and local network IP addresses
  if (/^https?:\/\/([a-zA-Z0-9-]+\.)*(localhost|local|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
    return origin;
  }

  return frontendOrigin;
};

export const json = (
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  additionalHeaders?: Record<string, string | string[]>
) => {
  const request = (response as any).req;
  const origin = request?.headers?.origin;
  const corsOrigin = getCorsOrigin(origin);

  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "authorization, content-type, x-tenant-id, cache-control, pragma",
    ...additionalHeaders
  });
  response.end(JSON.stringify(body));
};

export const readBody = async (request: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });

export const readBodyBuffer = async (request: IncomingMessage) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
