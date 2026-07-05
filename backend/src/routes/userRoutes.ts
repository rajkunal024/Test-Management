import { IncomingMessage, ServerResponse } from "node:http";
import { getUsers, createUser, bulkCreateUsers, updateUser, deleteUser } from "../controllers/userController.js";
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
  if (path.startsWith("/api/admin/users/") && !path.endsWith("/bulk")) {
    const parts = path.split("/");
    const userId = parts[parts.length - 1];
    if (userId) {
      if (method === "PUT") {
        await updateUser(request, response, userId);
        return;
      }
      if (method === "DELETE") {
        await deleteUser(request, response, userId);
        return;
      }
    }
  }
  json(response, 404, { success: false, message: "Users route not found" });
};
