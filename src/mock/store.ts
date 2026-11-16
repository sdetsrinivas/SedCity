/** Thin wrapper over Web Storage. All keys are prefixed `amc.`. Safe on the server. */
type Area = "local" | "session";

function area(a: Area): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return a === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export const store = {
  get<T>(key: string, fallback: T, a: Area = "local"): T {
    const raw = area(a)?.getItem(`amc.${key}`);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown, a: Area = "local"): void {
    area(a)?.setItem(`amc.${key}`, JSON.stringify(value));
  },
  remove(key: string, a: Area = "local"): void {
    area(a)?.removeItem(`amc.${key}`);
  },
};
