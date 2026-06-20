import { IncomingMessage, ServerResponse } from "node:http";
import { verifyToken } from "../utils/crypto.js";
import { OrganizationModel } from "../models/index.js";
import { json } from "./utils.js";

export interface AuthenticatedRequest extends IncomingMessage {
  user?: {
    id: string;
    userId: string;
    role: string;
    organization_id?: string;
  };
  organization_id?: string;
}

export const resolveTenant = async (
  request: IncomingMessage,
  response: ServerResponse
): Promise<boolean> => {
  const req = request as AuthenticatedRequest;

  let token: string | null = null;
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    const cookieHeader = request.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(";");
      for (const cookie of cookies) {
        const [key, ...valParts] = cookie.trim().split("=");
        if (key === "token") {
          token = valParts.join("=");
          break;
        }
      }
    }
  }

  if (!token) {
    json(response, 401, { success: false, message: "Authentication token is required" });
    return false;
  }

  // Handle mock tokens for backward compatibility
  if (token === "mock-jwt-token-xyz-12345") {
    req.user = { id: "vedant-admin", userId: "vedant-admin", role: "Admin", organization_id: "tester" };
    req.organization_id = "tester";
    return true;
  }
  if (token.startsWith("mock-token-")) {
    const parts = token.substring("mock-token-".length).split("-");
    const role = parts[0];
    const userId = parts.slice(1).join("-");
    req.user = { id: userId, userId, role, organization_id: "tester" };
    req.organization_id = "tester";
    return true;
  }

  const secret = process.env.JWT_SECRET ?? "dev_jwt_secret_key_change_me";
  const decoded = verifyToken(token, secret);
  if (!decoded) {
    json(response, 401, { success: false, message: "Invalid or expired token" });
    return false;
  }

  req.user = decoded;

  if (decoded.role === "PARIKSHYA_ADMIN") {
    // Parikshya Admin has access to all organizations. If they pass an organization filter, resolve it.
    const url = new URL(request.url ?? "", `http://${request.headers.host ?? "127.0.0.1"}`);
    const targetOrgId = url.searchParams.get("organization_id") || request.headers["x-organization-id"];
    if (targetOrgId) {
      req.organization_id = Array.isArray(targetOrgId) ? targetOrgId[0] : targetOrgId;
    }
    return true;
  }

  // For regular users (Admin, Teacher, Student), check organization status
  const orgId = decoded.organization_id;
  if (!orgId) {
    json(response, 403, { success: false, message: "User is not assigned to any organization" });
    return false;
  }

  const organization = await OrganizationModel.findOne({ id: orgId });
  if (!organization) {
    json(response, 403, { success: false, message: "Assigned organization not found" });
    return false;
  }

  if (organization.status !== "Active") {
    json(response, 403, { success: false, message: "Organization account is deactivated. Please contact support." });
    return false;
  }

  req.organization_id = orgId;
  return true;
};

export const ParikshyaAdminGuard = async (
  request: IncomingMessage,
  response: ServerResponse
): Promise<boolean> => {
  const req = request as AuthenticatedRequest;
  if (!req.user || req.user.role !== "PARIKSHYA_ADMIN") {
    json(response, 403, { success: false, message: "Access denied. Parikshya Admin privileges required." });
    return false;
  }
  return true;
};

export const OrganizationGuard = async (
  request: IncomingMessage,
  response: ServerResponse
): Promise<boolean> => {
  const req = request as AuthenticatedRequest;
  if (!req.user) {
    json(response, 401, { success: false, message: "Unauthorized" });
    return false;
  }

  if (req.user.role === "PARIKSHYA_ADMIN") {
    return true;
  }

  const url = new URL(request.url ?? "", `http://${request.headers.host ?? "127.0.0.1"}`);
  const targetOrgId = url.searchParams.get("organization_id") || request.headers["x-organization-id"];

  if (targetOrgId && targetOrgId !== req.organization_id) {
    json(response, 403, { success: false, message: "Access denied. Cross-tenant request is prohibited." });
    return false;
  }

  return true;
};
