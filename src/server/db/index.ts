import { getConfig } from "@/lib/env";
import type { DataStore } from "@/server/db/types";
import { MemoryStore } from "@/server/db/memory-store";
import { PgStore } from "@/server/db/pg-store";

/**
 * Store selection:
 *  - DATABASE_URL set  -> Postgres driver (run `npm run db:migrate` first)
 *  - otherwise         -> in-memory demo driver (volatile, clearly labeled)
 *
 * The singleton lives per server instance. On serverless platforms the demo
 * driver is per-instance memory — this is a documented limitation, not a bug.
 */
let storePromise: Promise<DataStore> | null = null;

function createStore(): DataStore {
  const cfg = getConfig();
  if (cfg.databaseUrl) {
    return new PgStore(cfg.databaseUrl);
  }
  return new MemoryStore();
}

export function getStore(): Promise<DataStore> {
  if (!storePromise) {
    storePromise = (async () => {
      const store = createStore();
      await store.init();
      return store;
    })().catch((error) => {
      // Reset so a transient failure doesn't poison the instance forever.
      storePromise = null;
      throw error;
    });
  }
  return storePromise;
}

/** True when the deployment has no durable database configured. */
export function isDemoStore(): boolean {
  return !getConfig().databaseUrl;
}
