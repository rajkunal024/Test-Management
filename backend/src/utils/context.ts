import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContext {
  organization_id?: string;
  user?: {
    id: string;
    userId: string;
    role: string;
    organization_id?: string;
  };
}

export const tenantContext = new AsyncLocalStorage<TenantContext>();
