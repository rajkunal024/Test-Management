import { IncomingMessage, ServerResponse } from "node:http";
import { handleAuthRoutes } from "./authRoutes.js";
import { handleParikshyaAdminRoutes } from "./parikshyaAdminRoutes.js";
import { handleSubjectsRoutes } from "./subjectRoutes.js";
import { handleTestsRoutes } from "./testRoutes.js";
import { handleQuestionsRoutes } from "./questionRoutes.js";
import { handleAttemptsRoutes } from "./attemptRoutes.js";
import { handleUsersRoutes } from "./userRoutes.js";
import { handleNotificationsRoutes } from "./notificationRoutes.js";
import { handlePassagesRoutes } from "./passageRoutes.js";
import { json } from "../middlewares/utils.js";
import { tenantContext } from "../utils/context.js";
import { resolveTenant } from "../middlewares/tenant.js";

const isPublicRoute = (path: string, method: string): boolean => {
  if (path === "/api/health") return true;
  if (path.startsWith("/api/parikshya-admin/auth/")) return true;
  
  const publicAuthPaths = [
    "/api/auth/login",
    "/api/auth/signup-admin",
    "/api/auth/forgot-password",
    "/api/auth/verify-otp",
    "/api/auth/reset-password"
  ];
  return publicAuthPaths.includes(path);
};

export const routeRequest = async (request: IncomingMessage, response: ServerResponse, path: string, method: string) => {
  if (isPublicRoute(path, method)) {
    if (path === "/api/health") {
      json(response, 200, { success: true, service: "parikshya-backend" });
      return;
    }
    if (path.startsWith("/api/parikshya-admin")) {
      await handleParikshyaAdminRoutes(request, response, path, method);
      return;
    }
    if (path.startsWith("/api/auth")) {
      await handleAuthRoutes(request, response, path, method);
      return;
    }
    return;
  }

  // Resolve tenant details and enforce access policies
  const isTenantResolved = await resolveTenant(request, response);
  if (!isTenantResolved) return;

  const req = request as any;
  await tenantContext.run({ organization_id: req.organization_id, user: req.user }, async () => {
    // Parikshya Admin Routes (internally guarded)
    if (path.startsWith("/api/parikshya-admin")) {
      await handleParikshyaAdminRoutes(request, response, path, method);
      return;
    }

    // Auth routes (guarded updates like change-password, profile-picture)
    if (path.startsWith("/api/auth")) {
      await handleAuthRoutes(request, response, path, method);
      return;
    }

    // Subjects / topics / subtopics routes
    if (path.startsWith("/api/subjects") || path.startsWith("/api/topics") || path.startsWith("/api/sub-topics")) {
      await handleSubjectsRoutes(request, response, path, method);
      return;
    }

    // Tests / monitor routes
    if (path.startsWith("/api/tests")) {
      await handleTestsRoutes(request, response, path, method);
      return;
    }

    // Questions / bulk / pool routes
    if (path.startsWith("/api/questions")) {
      await handleQuestionsRoutes(request, response, path, method);
      return;
    }

    // Passages routes
    if (path.startsWith("/api/passages")) {
      await handlePassagesRoutes(request, response, path, method);
      return;
    }

    // Attempts routes
    if (path.startsWith("/api/attempts")) {
      await handleAttemptsRoutes(request, response, path, method);
      return;
    }

    // Admin User Directory routes
    if (path.startsWith("/api/admin")) {
      await handleUsersRoutes(request, response, path, method);
      return;
    }

    // Notifications routes
    if (path.startsWith("/api/notifications")) {
      await handleNotificationsRoutes(request, response, path, method);
      return;
    }

    json(response, 404, { success: false, message: "Route not found" });
  });
};
