const { Pool } = require("pg");
const logger = require("../utils/logger");

let pool = null;

async function connectPostgres() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Test connection
  const client = await pool.connect();
  const { rows } = await client.query("SELECT NOW() as now");
  client.release();

  logger.info(`✅ PostgreSQL connected — server time: ${rows[0].now}`);
}

function getPool() {
  if (!pool) throw new Error("PostgreSQL pool not initialised");
  return pool;
}

async function query(sql, params) {
  return getPool().query(sql, params);
}

module.exports = { connectPostgres, getPool, query };
