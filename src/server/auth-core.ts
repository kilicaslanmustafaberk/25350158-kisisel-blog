import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { getAuthEnvironment } from "@/server/env-core";

const authEnvironment = getAuthEnvironment();

export const auth = betterAuth({
  appName: "Berk Portfolio Admin",
  baseURL: authEnvironment.baseUrl,
  secret: authEnvironment.secret,
  trustedOrigins: [authEnvironment.baseUrl],
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 5,
      },
    },
  },
  plugins: [admin(), nextCookies()],
});
