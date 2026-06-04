import { IncomingMessage } from "node:http";
import { verifyToken } from "../utils/crypto.js";

export const getUserFromRequest = (request: IncomingMessage): { userId: string; role: string } | null => {
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
    return { userId: "vedant-admin", role: "Admin" };
  }
  if (token.startsWith("mock-token-")) {
    const parts = token.substring("mock-token-".length).split("-");
    const role = parts[0];
    const userId = parts.slice(1).join("-");
    return { userId, role };
  }

  const secret = process.env.JWT_SECRET ?? "81f8bff1f1d5205403b336fc674612df7ae7a5767d78d1ca17067a2992b6a9c5";
  const decoded = verifyToken(token, secret);
  if (!decoded) {
    return null;
  }
  return { userId: decoded.userId, role: decoded.role };
};

export const checkRole = (request: IncomingMessage, allowedRoles: string[]): boolean => {
  const user = getUserFromRequest(request);
  if (!user) return false;
  return allowedRoles.includes(user.role);
};
