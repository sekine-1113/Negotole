import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set");

const pool = new pg.Pool({ connectionString: url });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: resolve(__dirname, "../drizzle") });
await pool.end();
console.log("✅ Migration complete");
