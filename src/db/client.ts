import { drizzle } from "drizzle-orm/libsql";

import { getDatabaseEnvironment } from "@/server/env-core";

const databaseEnvironment = getDatabaseEnvironment();

export const db = drizzle({
  connection: {
    url: databaseEnvironment.url,
    authToken: databaseEnvironment.authToken,
  },
});
