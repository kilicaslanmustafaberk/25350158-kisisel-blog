import { createClient } from "@libsql/client";

if (!process.env.TURSO_DATABASE_URL) throw new Error("TURSO_DATABASE_URL is required.");
const client = createClient({ url: process.env.TURSO_DATABASE_URL });
// Phase 4 tests create their own profile/education/skills through the authenticated
// HTTP API, so no fixture rows are required here. Kept for parity with the
// phase2/phase3 seed script naming convention and as a placeholder for future fixtures.
client.close();
