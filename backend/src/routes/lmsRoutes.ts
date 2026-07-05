import { IncomingMessage, ServerResponse } from "node:http";
import { getMaterials, createMaterial, deleteMaterial } from "../controllers/lmsController.js";
import { json } from "../middlewares/utils.js";

export const handleLmsRoutes = async (request: IncomingMessage, response: ServerResponse, path: string, method: string) => {
  if (path.startsWith("/api/lms/materials") && method === "GET") {
    await getMaterials(request, response);
    return;
  }
  if (path.startsWith("/api/lms/materials") && method === "POST") {
    await createMaterial(request, response);
    return;
  }
  if (path.startsWith("/api/lms/materials/") && method === "DELETE") {
    const materialId = path.replace("/api/lms/materials/", "");
    await deleteMaterial(request, response, materialId);
    return;
  }
  json(response, 404, { success: false, message: "LMS route not found" });
};
