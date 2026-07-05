import { IncomingMessage, ServerResponse } from "node:http";
import { json } from "../middlewares/utils.js";
import {
  getClasses,
  createClass,
  getSessions,
  createSession,
  setCurrentSession,
  getPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  createSemester,
  getSemesters,
  updateSemester,
  deleteSemester,
  promoteSchoolStudents,
  promoteCollegeStudents
} from "../controllers/academicController.js";

export const handleAcademicRoutes = async (request: IncomingMessage, response: ServerResponse, path: string, method: string) => {
  console.log(`[handleAcademicRoutes] method=${method} path=${path}`);
  if (path === "/api/classes" && method === "GET") {
    await getClasses(request, response);
    return;
  }
  if (path === "/api/classes" && method === "POST") {
    await createClass(request, response);
    return;
  }
  if (path === "/api/sessions" && method === "GET") {
    await getSessions(request, response);
    return;
  }
  if (path === "/api/sessions" && method === "POST") {
    await createSession(request, response);
    return;
  }
  const sessionMatch = path.match(/^\/api\/sessions\/([^/]+)\/current$/);
  if (sessionMatch && method === "PUT") {
    const sessionId = sessionMatch[1];
    await setCurrentSession(request, response, sessionId);
    return;
  }
  if (path === "/api/programs" && method === "GET") {
    await getPrograms(request, response);
    return;
  }
  if (path === "/api/programs" && method === "POST") {
    await createProgram(request, response);
    return;
  }
  const programMatch = path.match(/^\/api\/programs\/([^/]+)$/);
  if (programMatch) {
    const programId = programMatch[1];
    if (method === "PUT") {
      await updateProgram(request, response, programId);
      return;
    }
    if (method === "DELETE") {
      await deleteProgram(request, response, programId);
      return;
    }
  }
  if (path === "/api/semesters") {
    if (method === "GET") {
      await getSemesters(request, response);
      return;
    }
    if (method === "POST") {
      await createSemester(request, response);
      return;
    }
  }
  const semesterMatch = path.match(/^\/api\/semesters\/([^/]+)$/);
  if (semesterMatch) {
    const semesterId = semesterMatch[1];
    if (method === "PUT") {
      await updateSemester(request, response, semesterId);
      return;
    }
    if (method === "DELETE") {
      await deleteSemester(request, response, semesterId);
      return;
    }
  }
  if (path === "/api/students/promote/school" && method === "POST") {
    await promoteSchoolStudents(request, response);
    return;
  }
  if (path === "/api/students/promote/college" && method === "POST") {
    await promoteCollegeStudents(request, response);
    return;
  }
  json(response, 404, { success: false, message: "Academic route not found" });
};
