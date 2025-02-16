import pkg from "pg";
const { Pool } = pkg; // ✅ Correct way to import in ESM

import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export const testDBConnection = async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("🕒 Database Time:", result.rows[0]);
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
};

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database.");
});

pool.on("error", (err) => {
  console.error("❌ Database connection error:", err);
});

export default pool;
