import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { readFileSync } from "fs";

// Parse .env.local manually
try {
  const envLines = readFileSync(".env.local", "utf8").split("\n");
  for (const line of envLines) {
    const m = line.match(/^([^#=]+)=(.*)/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch {}

neonConfig.webSocketConstructor = ws;

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set");

const pool = new Pool({ connectionString: url });

const sql = readFileSync("./drizzle/0004_pretty_scarecrow.sql", "utf8");
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

// Clean up orphaned rows that would violate FK constraints
console.log("Cleaning up orphaned user_point rows...");
const cleanup = await pool.query(
  `DELETE FROM user_point WHERE user_id NOT IN (SELECT id FROM app_user) RETURNING id`
);
if (cleanup.rows.length > 0) {
  console.log(`  Deleted ${cleanup.rows.length} orphaned user_point row(s):`, cleanup.rows.map(r => r.id));
}

const cleanup2 = await pool.query(
  `DELETE FROM post WHERE user_id NOT IN (SELECT id FROM app_user) RETURNING id`
);
if (cleanup2.rows.length > 0) {
  console.log(`  Deleted ${cleanup2.rows.length} orphaned post row(s):`, cleanup2.rows.map(r => r.id));
}

console.log(`Applying ${statements.length} statements...`);
for (const stmt of statements) {
  console.log("→", stmt.slice(0, 80));
  try {
    await pool.query(stmt);
    console.log("  ✓");
  } catch (e) {
    // 42710: duplicate_object (constraint/index already exists), 42P07: duplicate_table
    if (e.code === "42710" || e.code === "42P07") {
      console.log("  ⚠ already exists, skipping");
    } else {
      throw e;
    }
  }
}

// Record in drizzle migrations table
await pool.query(`
  INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
  VALUES ('0004_pretty_scarecrow', ${Date.now()})
  ON CONFLICT DO NOTHING
`).catch(() => {});

await pool.end();
console.log("Migration complete.");
