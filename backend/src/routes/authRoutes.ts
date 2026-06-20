import { IncomingMessage, ServerResponse } from "node:http";
import { signupAdmin, login, logout, changePassword, forgotPassword, verifyOtpController, resetPassword, uploadProfilePicture } from "../controllers/authController.js";
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
  if (path === "/api/auth/forgot-password" && method === "POST") {
    await forgotPassword(request, response);
    return;
  }
  if (path === "/api/auth/verify-otp" && method === "POST") {
    await verifyOtpController(request, response);
    return;
  }
  if (path === "/api/auth/reset-password" && method === "POST") {
    await resetPassword(request, response);
    return;
  }
  if (path === "/api/auth/profile-picture" && method === "POST") {
    await uploadProfilePicture(request, response);
    return;
  }
  if (path === "/api/auth/organization" && method === "GET") {
    const req = request as any;
    const { OrganizationModel } = await import("../models/index.js");
    const org = await OrganizationModel.findOne({ id: req.organization_id });
    json(response, 200, {
      success: true,
      data: {
        id: org?.id,
        name: org?.name,
        logo: org?.logo,
        securityFeatures: org?.securityFeatures
      }
    });
    return;
  }
  json(response, 404, { success: false, message: "Auth route not found" });
};
