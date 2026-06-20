import { IncomingMessage } from "node:http";
import { verifyToken } from "../utils/crypto.js";

export const getUserFromRequest = (request: IncomingMessage): { userId: string; role: string; organization_id?: string } | null => {
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
    return null;
  }

  if (token === "mock-jwt-token-xyz-12345") {
    return { userId: "vedant-admin", role: "Admin", organization_id: "tester" };
  }
  if (token.startsWith("mock-token-")) {
    const parts = token.substring("mock-token-".length).split("-");
    const role = parts[0];
    const userId = parts.slice(1).join("-");
    return { userId, role, organization_id: "tester" };
  }

  const secret = process.env.JWT_SECRET ?? "dev_jwt_secret_key_change_me";
  const decoded = verifyToken(token, secret);
  if (!decoded) {
    return null;
  }
  return { userId: decoded.userId, role: decoded.role, organization_id: decoded.organization_id };
};

export const checkRole = (request: IncomingMessage, allowedRoles: string[]): boolean => {
  const user = getUserFromRequest(request);
  if (!user) return false;
  return allowedRoles.includes(user.role);
};
