import { describe, expect, it } from "vitest";
import { convenienceFee, isEmail, payBounds, ratioOf, stepValue, valueAtRatio } from "./payment";

describe("payBounds", () => {
  it("allows part payment from ₹100 or a quarter of the bill, rounded up to ₹10", () => {
    expect(payBounds(332.5)).toEqual({ min: 100, max: 332.5, step: 10 });
    expect(payBounds(959.15)).toEqual({ min: 240, max: 959.15, step: 10 });
  });
  it("requires bills below ₹200 to be paid in full", () => {
    expect(payBounds(150)).toEqual({ min: 150, max: 150, step: 10 });
  });
});

describe("slider values", () => {
  const b = payBounds(332.5);
  it("snaps pointer positions to ₹10 steps and the far end to the exact total", () => {
    expect(valueAtRatio(0, b)).toBe(100);
    expect(valueAtRatio(-1, b)).toBe(100);
    expect(valueAtRatio(0.5, b)).toBe(220);
    expect(valueAtRatio(0.99, b)).toBe(332.5);
    expect(valueAtRatio(1, b)).toBe(332.5);
  });
  it("steps up and down on the grid, landing on the total at the top", () => {
    expect(stepValue(100, 1, b)).toBe(110);
    expect(stepValue(320, 1, b)).toBe(330);
    expect(stepValue(330, 1, b)).toBe(332.5);
    expect(stepValue(332.5, 1, b)).toBe(332.5);
    expect(stepValue(332.5, -1, b)).toBe(330);
    expect(stepValue(110, -1, b)).toBe(100);
    expect(stepValue(100, -1, b)).toBe(100);
    expect(stepValue(332.5, -10, b)).toBe(240);
    expect(stepValue(100, 100, b)).toBe(332.5);
  });
  it("maps values back to a track ratio", () => {
    expect(ratioOf(100, b)).toBe(0);
    expect(ratioOf(332.5, b)).toBe(1);
    expect(ratioOf(150, payBounds(150))).toBe(1);
  });
});

describe("convenienceFee", () => {
  it("charges 1% on cards, nothing on UPI and ₹10 on net banking", () => {
    expect(convenienceFee("card", 332.5)).toBe(3.33);
    expect(convenienceFee("upi", 332.5)).toBe(0);
    expect(convenienceFee("netbanking", 332.5)).toBe(10);
  });
});

it("isEmail", () => {
  expect(isEmail("meena.r@example.in")).toBe(true);
  expect(isEmail("meena@")).toBe(false);
});
