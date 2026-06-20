import { ServerResponse, IncomingMessage } from "node:http";

export const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://127.0.0.1:5173";

export const json = (
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  additionalHeaders?: Record<string, string | string[]>
) => {
  const request = (response as any).req;
  const origin = request?.headers?.origin;
  const allowedOrigins = [
    process.env.FRONTEND_ORIGIN,
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:4200",
    "http://localhost:4200"
  ].filter(Boolean);
  
  const corsOrigin = (origin && allowedOrigins.includes(origin)) ? origin : frontendOrigin;

  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Credentials": "true",
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
