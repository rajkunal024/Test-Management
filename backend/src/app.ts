import { IncomingMessage, ServerResponse } from "node:http";
import { routeRequest } from "./routes/index.js";
import { json, getCorsOrigin } from "./middlewares/utils.js";

export const handleRequest = async (request: IncomingMessage, response: ServerResponse) => {
  (response as any).req = request;
  const method = request.method ?? "GET";

  if (method === "OPTIONS") {
    const origin = request.headers.origin;
    const corsOrigin = getCorsOrigin(origin);

    response.writeHead(204, {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "authorization, content-type, x-tenant-id, cache-control, pragma",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Max-Age": "86400",
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
