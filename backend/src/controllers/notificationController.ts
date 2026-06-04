import { IncomingMessage, ServerResponse } from "node:http";
import { json } from "../middlewares/utils.js";
import { getUserFromRequest } from "../middlewares/auth.js";
import { NotificationModel } from "../models/index.js";

export const getNotifications = async (request: IncomingMessage, response: ServerResponse) => {
  const user = getUserFromRequest(request);
  if (!user) {
    json(response, 401, { success: false, message: "Unauthorized" });
    return;
  }

  try {
    const notifications = await NotificationModel.find({
      $or: [{ user_id: "all" }, { user_id: user.userId }]
    }).sort({ created_at: -1 });

    const mapped = notifications.map((n: any) => ({
      id: n._id,
      message: n.message,
      type: n.type,
      test_id: n.test_id,
      test_name: n.test_name,
      read: n.read_by.includes(user.userId),
      created_at: n.created_at
    }));

    json(response, 200, { success: true, data: mapped });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error fetching notifications" });
  }
};

export const markAllNotificationsRead = async (request: IncomingMessage, response: ServerResponse) => {
  const user = getUserFromRequest(request);
  if (!user) {
    json(response, 401, { success: false, message: "Unauthorized" });
    return;
  }

  try {
    const notifications = await NotificationModel.find({
      $or: [{ user_id: "all" }, { user_id: user.userId }]
    });

    for (const n of notifications) {
      if (!n.read_by.includes(user.userId)) {
        n.read_by.push(user.userId);
        await n.save();
      }
    }

    json(response, 200, { success: true, message: "All notifications marked read" });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error marking notifications read" });
  }
};
