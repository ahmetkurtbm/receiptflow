import { Pool, QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { receiptFlowPool?: Pool };

export const databaseConfigured = Boolean(process.env.DATABASE_URL);

export const pool = databaseConfigured
  ? globalForDb.receiptFlowPool ?? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      max: 10,
    })
  : null;

if (process.env.NODE_ENV !== "production" && pool) globalForDb.receiptFlowPool = pool;

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  if (!pool) throw new Error("DATABASE_NOT_CONFIGURED");
  return pool.query<T>(text, values);
}

export async function ensureUser(externalUserId: string, displayName?: string, email?: string | null) {
  const result = await query<{ id: string; external_user_id: string; display_name: string }>(
    `INSERT INTO users(external_user_id, display_name, email)
     VALUES($1, $2, $3)
     ON CONFLICT(external_user_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       email = EXCLUDED.email,
       updated_at = NOW()
     RETURNING id, external_user_id, display_name`,
    [externalUserId, displayName || externalUserId, email || null],
  );
  return result.rows[0];
}
