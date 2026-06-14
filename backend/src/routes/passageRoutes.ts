import { IncomingMessage, ServerResponse } from "node:http";
import { getPassages, getPassageById, createPassage, updatePassage, deletePassage, getQuestionsForPassage } from "../controllers/passageController.js";
import { json } from "../middlewares/utils.js";

export const handlePassagesRoutes = async (request: IncomingMessage, response: ServerResponse, path: string, method: string) => {
  if (path === "/api/passages" && method === "GET") {
    await getPassages(request, response);
    return;
  }
  if (path === "/api/passages" && method === "POST") {
    await createPassage(request, response);
    return;
  }
  if (path.startsWith("/api/passages/") && path.endsWith("/questions") && method === "GET") {
    const id = path.slice(14, -10);
    await getQuestionsForPassage(request, response, id);
    return;
  }
  if (path.startsWith("/api/passages/") && method === "GET") {
    const id = path.replace("/api/passages/", "");
    await getPassageById(request, response, id);
    return;
  }
  if (path.startsWith("/api/passages/") && method === "PUT") {
    const id = path.replace("/api/passages/", "");
    await updatePassage(request, response, id);
    return;
  }
  if (path.startsWith("/api/passages/") && method === "DELETE") {
    const id = path.replace("/api/passages/", "");
    await deletePassage(request, response, id);
    return;
  }
  json(response, 404, { success: false, message: "Passages route not found" });
};
