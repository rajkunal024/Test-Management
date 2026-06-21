import { IncomingMessage, ServerResponse } from "node:http";
import { getQuestions, createQuestion, updateQuestion, deleteQuestion, bulkQuestions, fetchBulkQuestions, uploadQuestionImage, generateAIQuestions } from "../controllers/questionController.js";
import { json } from "../middlewares/utils.js";

export const handleQuestionsRoutes = async (request: IncomingMessage, response: ServerResponse, path: string, method: string) => {
  if (path === "/api/questions" && method === "GET") {
    await getQuestions(request, response);
    return;
  }
  if (path === "/api/questions/upload-image" && method === "POST") {
    await uploadQuestionImage(request, response);
    return;
  }
  if (path === "/api/questions/generate-ai" && method === "POST") {
    await generateAIQuestions(request, response);
    return;
  }
  if (path === "/api/questions" && method === "POST") {
    await createQuestion(request, response);
    return;
  }
  if (path === "/api/questions/bulk" && method === "POST") {
    await bulkQuestions(request, response);
    return;
  }
  if (path === "/api/questions/fetchBulk" && method === "POST") {
    await fetchBulkQuestions(request, response);
    return;
  }
  if (path.startsWith("/api/questions/") && method === "PUT") {
    const id = path.replace("/api/questions/", "");
    await updateQuestion(request, response, id);
    return;
  }
  if (path.startsWith("/api/questions/") && method === "DELETE") {
    const id = path.replace("/api/questions/", "");
    await deleteQuestion(request, response, id);
    return;
  }
  json(response, 404, { success: false, message: "Questions route not found" });
};
