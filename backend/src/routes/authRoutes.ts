import { IncomingMessage, ServerResponse } from "node:http";
import { signupAdmin, login, logout, changePassword } from "../controllers/authController.js";
import { json } from "../middlewares/utils.js";

export const handleAuthRoutes = async (request: IncomingMessage, response: ServerResponse, path: string, method: string) => {
  if (path === "/api/auth/signup-admin" && method === "POST") {
    await signupAdmin(request, response);
    return;
  }
  if (path === "/api/auth/login" && method === "POST") {
    await login(request, response);
    return;
  }
  if (path === "/api/auth/logout" && method === "POST") {
    await logout(request, response);
    return;
  }
  if (path === "/api/auth/change-password" && method === "POST") {
    await changePassword(request, response);
    return;
  }
  json(response, 404, { success: false, message: "Auth route not found" });
};
