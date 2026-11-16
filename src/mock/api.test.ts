import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, call } from "./api";

describe("mock api call()", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("waits for the named delay before resolving", async () => {
    const handler = vi.fn(() => ({ ok: true }));
    let done = false;
    const p = call("SEARCH_SUGGEST", handler, { overrides: {} }).then((r) => { done = true; return r; });
    await vi.advanceTimersByTimeAsync(599);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(p).resolves.toEqual({ ok: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("returns a deep copy so callers cannot mutate mock data", async () => {
    const data = { list: [1, 2] };
    const p = call("SEARCH_SUGGEST", () => data, { overrides: { scale: 0 } });
    await vi.runAllTimersAsync();
    const res = await p;
    res.list.push(3);
    expect(data.list).toEqual([1, 2]);
  });

  it("fails when forced through overrides", async () => {
    const p = call("LOGIN_CHECK", () => 1, { overrides: { scale: 0, fail: ["LOGIN_CHECK"] } });
    const assertion = expect(p).rejects.toBeInstanceOf(ApiError);
    await vi.runAllTimersAsync();
    await assertion;
  });

  it("fails deterministically with failWhen and random with failRate", async () => {
    const a = call("LOGIN_CHECK", () => 1, { overrides: { scale: 0 }, failWhen: () => true, failMessage: "Down", failStatus: 500 });
    const b = call("LOGIN_CHECK", () => 1, { overrides: { scale: 0 }, failRate: 0.5, rng: () => 0.1 });
    const c = call("LOGIN_CHECK", () => 1, { overrides: { scale: 0 }, failRate: 0.5, rng: () => 0.9 });
    const checks = [
      expect(a).rejects.toMatchObject({ message: "Down", status: 500, endpoint: "LOGIN_CHECK" }),
      expect(b).rejects.toBeInstanceOf(ApiError),
      expect(c).resolves.toBe(1),
    ];
    await vi.runAllTimersAsync();
    await Promise.all(checks);
  });
});
