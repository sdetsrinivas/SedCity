import "server-only";
import { cookies } from "next/headers";
import { MOCK_COOKIE, parseOverrides, resolveDelay, type DelayName } from "./delays";

/** Server-side wait used by streamed (Suspense) server components. */
export async function serverWait(name: DelayName): Promise<void> {
  const jar = await cookies();
  const ms = resolveDelay(name, parseOverrides(jar.get(MOCK_COOKIE)?.value));
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
}
