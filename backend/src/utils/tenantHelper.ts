import { IncomingMessage } from "node:http";
import { OrganizationModel } from "../models/index.js";

/**
 * Resolves the target organization for an incoming request based on:
 * 1. Explicit `x-tenant-id` / `x-tenant-code` / `x-organization-id` headers
 * 2. Domain / Subdomain from x-forwarded-host, Origin, Referer, or Host (e.g. bu.localhost, tester.localhost, bu.local)
 */
export const getTenantFromRequest = async (request: IncomingMessage): Promise<any | null> => {
  // 1. Explicit header (e.g. sent by client interceptor)
  const tenantHeader = (request.headers["x-tenant-id"] || request.headers["x-tenant-code"] || request.headers["x-organization-id"]) as string | undefined;
  if (tenantHeader && tenantHeader !== "null" && tenantHeader !== "undefined" && tenantHeader.trim() !== "") {
    const cleanHeader = tenantHeader.trim();
    const org = await OrganizationModel.findOne({
      $or: [
        { id: cleanHeader },
        { code: cleanHeader.toUpperCase() },
        { name: new RegExp(`^${cleanHeader}$`, "i") }
      ]
    });
    if (org) return org;
  }

  // 2. Extract from x-forwarded-host, Origin, Referer, or Host header
  const rawSources = [
    request.headers["x-forwarded-host"],
    request.headers.origin,
    request.headers.referer,
    request.headers.host
  ];

  for (const raw of rawSources) {
    if (!raw || typeof raw !== "string") continue;
    try {
      let hostname = raw;
      if (hostname.includes("://")) {
        hostname = new URL(hostname).hostname;
      } else {
        hostname = hostname.split(":")[0];
      }

      // Check subdomains (e.g. "bu.localhost" -> "bu", "tester.local" -> "tester")
      const parts = hostname.split(".");
      if (parts.length > 1) {
        const sub = parts[0].toLowerCase().trim();
        // Skip generic non-tenant prefixes
        if (sub !== "www" && sub !== "localhost" && sub !== "127" && sub !== "app" && sub !== "api") {
          const org = await OrganizationModel.findOne({
            $or: [
              { code: sub.toUpperCase() },
              { id: sub },
              { id: `org_${sub}` },
              { id: new RegExp(`^${sub}`, "i") },
              { name: new RegExp(`^${sub}`, "i") },
              { domain: sub }
            ]
          });
          if (org) return org;
        }
      }
    } catch (e) {
      console.warn("Could not parse host for tenant extraction:", e);
    }
  }

  return null;
};
