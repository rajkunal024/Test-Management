import { IncomingMessage, ServerResponse } from "node:http";
import { getNotifications, markAllNotificationsRead, clearAllNotifications } from "../controllers/notificationController.js";
import { json } from "../middlewares/utils.js";

export const handleNotificationsRoutes = async (request: IncomingMessage, response: ServerResponse, path: string, method: string) => {
  if (path === "/api/notifications" && method === "GET") {
    await getNotifications(request, response);
    return;
  }
  if (path === "/api/notifications/read-all" && method === "POST") {
    await markAllNotificationsRead(request, response);
    return;
  }
  if (path === "/api/notifications/clear-all" && method === "DELETE") {
    await clearAllNotifications(request, response);
    return;
  }
  json(response, 404, { success: false, message: "Notifications route not found" });
};
