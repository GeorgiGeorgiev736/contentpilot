const { Pool } = require("pg");
const { logger } = require("../utils/logger");

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 10, idleTimeoutMillis: 30000 }
    : { host: process.env.DB_HOST || "localhost", port: parseInt(process.env.DB_PORT) || 5432, database: process.env.DB_NAME || "autopilot", user: process.env.DB_USER || "autopilot", password: process.env.DB_PASSWORD || "autopilot123", max: 10, idleTimeoutMillis: 30000 }
);

pool.on("error", (err) => logger.error("PostgreSQL pool error:", err));

async function testDbConnection() {
  const client = await pool.connect();
  await client.query("SELECT 1");
  client.release();
  logger.info("✅ PostgreSQL connected");
}

// Helper: run a query and return rows
async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

// Helper: get first row or null
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

module.exports = { pool, query, queryOne, testDbConnection };
