import { IncomingMessage, ServerResponse } from "node:http";
import { routeRequest } from "./routes/index.js";
import { json, frontendOrigin } from "./middlewares/utils.js";

export const handleRequest = async (request: IncomingMessage, response: ServerResponse) => {
  const method = request.method ?? "GET";

  if (method === "OPTIONS") {
    const origin = request.headers.origin;
    const allowedOrigins = [
      process.env.FRONTEND_ORIGIN,
      "http://127.0.0.1:5173",
      "http://localhost:5173"
    ].filter(Boolean);
    const corsOrigin = (origin && allowedOrigins.includes(origin)) ? origin : frontendOrigin;

    response.writeHead(204, {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    });
    response.end();
    return;
  }

  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const path = requestUrl.pathname;
  console.log(`[HTTP] ${method} ${path}`);

  try {
    await routeRequest(request, response, path, method);
  } catch (error) {
    console.error(`Route error on ${method} ${path}:`, error);
    json(response, 500, { success: false, message: "Internal server error" });
  }
};
