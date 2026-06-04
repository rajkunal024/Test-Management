import { ServerResponse, IncomingMessage } from "node:http";

export const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://127.0.0.1:5173";

export const json = (
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  additionalHeaders?: Record<string, string | string[]>
) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": frontendOrigin,
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
