/**
 * The single mock service layer. Every "API call" in the portal goes through `call()`,
 * which applies the named simulated delay and (optionally) a simulated failure.
 */
import { resolveDelay, resolveLimit, type DelayName, type MockOverrides } from "./delays";
import { readClientOverrides } from "./overrides";

export class ApiError extends Error {
  constructor(
    public readonly endpoint: DelayName,
    message: string,
    public readonly status = 503,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface CallOptions {
  /** Fail deterministically when this returns true (e.g. specific consumer numbers). */
  failWhen?: () => boolean;
  /** Probability 0..1 of a random failure. */
  failRate?: number;
  failMessage?: string;
  failStatus?: number;
  /** Injected for tests. */
  overrides?: MockOverrides;
  rng?: () => number;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function call<T>(name: DelayName, handler: () => T | Promise<T>, opts: CallOptions = {}): Promise<T> {
  const overrides = opts.overrides ?? readClientOverrides();
  const rng = opts.rng ?? Math.random;
  const ms = resolveDelay(name, overrides, rng);
  if (ms > 0) await sleep(ms);

  const forced = overrides.fail?.includes(name) ?? false;
  const random = typeof opts.failRate === "number" && rng() < opts.failRate;
  if (forced || random || opts.failWhen?.()) {
    throw new ApiError(name, opts.failMessage ?? "Service temporarily unavailable. Please try again.", opts.failStatus);
  }
  const result = await handler();
  return result === undefined ? result : structuredClone(result);
}

/** Wait for a named delay outside of an API call (e.g. UI timers). */
export function delayFor(name: DelayName, overrides: MockOverrides = readClientOverrides()): number {
  return resolveDelay(name, overrides);
}

/** A named time limit (not scaled by the `scale` override; see `resolveLimit`). */
export function limitFor(name: DelayName, overrides: MockOverrides = readClientOverrides()): number {
  return resolveLimit(name, overrides);
}
