import { MOCK_COOKIE, parseOverrides, type MockOverrides } from "./delays";

/** Client-side read of the test override cookie. Returns {} on the server. */
export function readClientOverrides(): MockOverrides {
  if (typeof document === "undefined") return {};
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${MOCK_COOKIE}=`));
  return parseOverrides(match?.slice(MOCK_COOKIE.length + 1));
}
