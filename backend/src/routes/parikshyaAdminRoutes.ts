import { IncomingMessage, ServerResponse } from "node:http";
import {
  parikshyaAdminLogin,
  getDashboardStats,
  getAnalytics,
  listOrganizations,
  createOrganization,
  getOrganizationDetails,
  updateSecurityFeatures,
  updateOrganizationStatus,
  updateOrganization,
  listUsers,
  getUserDetails,
  changeParikshyaAdminPassword,
  forgotParikshyaAdminPassword,
  verifyParikshyaAdminOtp,
  resetParikshyaAdminPassword,
  listAllQuestions
} from "../controllers/parikshyaAdminController.js";
import { resolveTenant, ParikshyaAdminGuard } from "../middlewares/tenant.js";
import { json } from "../middlewares/utils.js";

export const handleParikshyaAdminRoutes = async (
  request: IncomingMessage,
  response: ServerResponse,
  path: string,
  method: string
) => {
  // Public Login & Auth Endpoints
  if (path === "/api/parikshya-admin/auth/login" && method === "POST") {
    await parikshyaAdminLogin(request, response);
    return;
  }
  if (path === "/api/parikshya-admin/auth/forgot-password" && method === "POST") {
    await forgotParikshyaAdminPassword(request, response);
    return;
  }
  if (path === "/api/parikshya-admin/auth/verify-otp" && method === "POST") {
    await verifyParikshyaAdminOtp(request, response);
    return;
  }
  if (path === "/api/parikshya-admin/auth/reset-password" && method === "POST") {
    await resetParikshyaAdminPassword(request, response);
    return;
  }

  // Resolve tenant details and check parikshya admin permissions for all other endpoints
  const isTenantResolved = await resolveTenant(request, response);
  if (!isTenantResolved) return;

  const isParikshyaAdmin = await ParikshyaAdminGuard(request, response);
  if (!isParikshyaAdmin) return;

  // Change Password
  if (path === "/api/parikshya-admin/change-password" && method === "POST") {
    await changeParikshyaAdminPassword(request, response);
    return;
  }

  // Platform Dashboard & Analytics
  if (path === "/api/parikshya-admin/dashboard/stats" && method === "GET") {
    await getDashboardStats(request, response);
    return;
  }
  if (path === "/api/parikshya-admin/analytics" && method === "GET") {
    await getAnalytics(request, response);
    return;
  }

  // Organizations routes
  if (path === "/api/parikshya-admin/organizations" && method === "GET") {
    await listOrganizations(request, response);
    return;
  }
  if (path === "/api/parikshya-admin/organizations" && method === "POST") {
    await createOrganization(request, response);
    return;
  }
  if (path.startsWith("/api/parikshya-admin/organizations/") && path.endsWith("/security-features") && method === "PUT") {
    await updateSecurityFeatures(request, response);
    return;
  }
  if (path.startsWith("/api/parikshya-admin/organizations/") && path.endsWith("/status") && method === "PUT") {
    await updateOrganizationStatus(request, response);
    return;
  }
  if (path.startsWith("/api/parikshya-admin/organizations/") && method === "PUT") {
    await updateOrganization(request, response);
    return;
  }
  if (path.startsWith("/api/parikshya-admin/organizations/") && method === "GET") {
    await getOrganizationDetails(request, response);
    return;
  }

  // Users Directory routes
  if (path === "/api/parikshya-admin/users" && method === "GET") {
    await listUsers(request, response);
    return;
  }
  if (path.startsWith("/api/parikshya-admin/users/") && method === "GET") {
    await getUserDetails(request, response);
    return;
  }

  // Questions Bank routes
  if (path === "/api/parikshya-admin/questions" && method === "GET") {
    await listAllQuestions(request, response);
    return;
  }

  json(response, 404, { success: false, message: "Parikshya Admin endpoint not found" });
};
