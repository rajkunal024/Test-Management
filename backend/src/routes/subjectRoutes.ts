import { IncomingMessage, ServerResponse } from "node:http";
import { getSubjects, createSubject, getTopicsBySubject, getSubtopicsByTopics } from "../controllers/subjectController.js";
import { json } from "../middlewares/utils.js";

export const handleSubjectsRoutes = async (request: IncomingMessage, response: ServerResponse, path: string, method: string) => {
  if (path === "/api/subjects" && method === "GET") {
    await getSubjects(request, response);
    return;
  }
  if (path === "/api/subjects" && method === "POST") {
    await createSubject(request, response);
    return;
  }
  if (path.startsWith("/api/topics/subject/") && method === "GET") {
    const subjectId = path.replace("/api/topics/subject/", "");
    await getTopicsBySubject(request, response, subjectId);
    return;
  }
  if (path === "/api/sub-topics/multi-topics" && method === "POST") {
    await getSubtopicsByTopics(request, response);
    return;
  }
  json(response, 404, { success: false, message: "Subjects route not found" });
};
