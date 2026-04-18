/**
 * Database test setup — loads environment variables before tests run.
 *
 * jest.database.config.js runs this file via setupFiles so that
 * SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DATABASE_URL are
 * available to every database test.
 */

const { config } = require("dotenv");
const path = require("path");

// Load .env.local (developer machine) or .env.test (CI)
config({ path: path.resolve(__dirname, ".env.local") });
config({ path: path.resolve(__dirname, ".env.test") });

// Guard: fail fast if required DB credentials are absent
const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    throw new Error(
      `[jest.database.setup] Missing required env var: ${key}\n` +
        "Copy .env.local.example → .env.local and fill in your Supabase credentials.",
    );
  }
}
