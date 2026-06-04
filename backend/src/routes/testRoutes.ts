import { IncomingMessage, ServerResponse } from "node:http";
import { getTests, createTest, getTestById, updateTest, deleteTest, shareResults } from "../controllers/testController.js";
import { json } from "../middlewares/utils.js";

export const handleTestsRoutes = async (request: IncomingMessage, response: ServerResponse, path: string, method: string) => {
  if (path === "/api/tests" && method === "GET") {
    await getTests(request, response);
    return;
  }
  if (path === "/api/tests" && method === "POST") {
    await createTest(request, response);
    return;
  }
  if (path.startsWith("/api/tests/") && path.endsWith("/share-results") && method === "POST") {
    const id = path.replace("/api/tests/", "").replace("/share-results", "");
    await shareResults(request, response, id);
    return;
  }
  if (path.startsWith("/api/tests/") && !path.endsWith("/edit") && !path.endsWith("/questions") && !path.endsWith("/preview") && !path.endsWith("/share-results") && method === "GET") {
    const id = path.replace("/api/tests/", "");
    await getTestById(request, response, id);
    return;
  }
  if (path.startsWith("/api/tests/") && method === "PUT") {
    const id = path.replace("/api/tests/", "");
    await updateTest(request, response, id);
    return;
  }
  if (path.startsWith("/api/tests/") && method === "DELETE") {
    const id = path.replace("/api/tests/", "");
    await deleteTest(request, response, id);
    return;
  }
  json(response, 404, { success: false, message: "Test route not found" });
};
