import pg from "pg";

const { Pool } = pg;

let pool = null;

function getPool() {
  const url = (process.env.DATABASE_URL || "").trim();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: url.includes("localhost") || url.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

const adminCache = new Map();
const CACHE_TTL_MS = 15_000;

/**
 * Fetches a user directly from Neon Auth's PostgreSQL table (neon_auth."user").
 * Returns null if not found or DATABASE_URL is not configured.
 */
export async function getNeonUserByEmail(email) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) return null;

  const p = getPool();
  if (!p) {
    throw new Error("DATABASE_URL is not configured on the server.");
  }

  const { rows } = await p.query(
    `SELECT id, name, email, role, "emailVerified"
     FROM neon_auth."user"
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [cleanEmail]
  );

  const row = rows[0] || null;
  if (row) {
    adminCache.set(cleanEmail, {
      isAdmin: row.role === "admin",
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  } else {
    adminCache.set(cleanEmail, {
      isAdmin: false,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }
  return row;
}

/**
 * Checks whether an email has role === 'admin' in Neon Auth (with short cache for middleware).
 */
export async function isNeonAdmin(email, { bypassCache = false } = {}) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) return false;

  if (!bypassCache) {
    const cached = adminCache.get(cleanEmail);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.isAdmin;
    }
  }

  const row = await getNeonUserByEmail(cleanEmail);
  return Boolean(row && row.role === "admin");
}
