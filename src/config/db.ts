import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ✅ Use connection string from Render
  ssl: {
    rejectUnauthorized: false, // ✅ Required for Render PostgreSQL
  },
});

// ✅ Test database connection
export const testDBConnection = async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Database Connected: 🕒", result.rows[0]);
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
};

// ✅ Event listeners for debugging
pool.on("connect", () => console.log("✅ Connected to PostgreSQL database."));
pool.on("error", (err) => console.error("❌ Database connection error:", err));

export default pool;
