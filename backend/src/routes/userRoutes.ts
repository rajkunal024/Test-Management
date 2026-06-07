import { IncomingMessage, ServerResponse } from "node:http";
import { getUsers, createUser, bulkCreateUsers } from "../controllers/userController.js";
import { json } from "../middlewares/utils.js";

export const handleUsersRoutes = async (request: IncomingMessage, response: ServerResponse, path: string, method: string) => {
  if (path === "/api/admin/users" && method === "GET") {
    await getUsers(request, response);
    return;
  }
  if (path === "/api/admin/users" && method === "POST") {
    await createUser(request, response);
    return;
  }
  if (path === "/api/admin/users/bulk" && method === "POST") {
    await bulkCreateUsers(request, response);
    return;
  }
  json(response, 404, { success: false, message: "Users route not found" });
};
