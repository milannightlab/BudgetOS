import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof createDb>;

// Include a bump so HMR picks up relation renames that don't change export keys.
// Bump when table columns change — Object.keys(schema) alone misses that.
const schemaKey = `${Object.keys(schema).sort().join("|")}#overview-sort-v1`;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

const globalForDb = globalThis as unknown as {
  db?: Db;
  dbSchemaKey?: string;
};

function getDb(): Db {
  if (!globalForDb.db || globalForDb.dbSchemaKey !== schemaKey) {
    globalForDb.db = createDb();
    globalForDb.dbSchemaKey = schemaKey;
  }
  return globalForDb.db;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb(), prop, receiver);
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});
