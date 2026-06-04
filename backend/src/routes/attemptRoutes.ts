import { IncomingMessage, ServerResponse } from "node:http";
import { getAttempts, createAttempt } from "../controllers/attemptController.js";
import { json } from "../middlewares/utils.js";

export const handleAttemptsRoutes = async (request: IncomingMessage, response: ServerResponse, path: string, method: string) => {
  if (path === "/api/attempts" && method === "GET") {
    await getAttempts(request, response);
    return;
  }
  if (path === "/api/attempts" && method === "POST") {
    await createAttempt(request, response);
    return;
  }
  json(response, 404, { success: false, message: "Attempts route not found" });
};
