import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getHandlers() {
  const { auth } = await import("@/server/auth");
  return toNextJsHandler(auth);
}

export async function GET(request: Request) {
  const handlers = await getHandlers();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  const handlers = await getHandlers();
  return handlers.POST(request);
}
