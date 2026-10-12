import { describe, expect, it } from "vitest";

import { formatCurrency } from "./formatCurrency";

describe("formatCurrency", () => {
  it("formats rupee amounts with exactly two fractional digits", () => {
    expect(formatCurrency(99)).toBe("₹99.00");
    expect(formatCurrency(824.25)).toBe("₹824.25");
  });

  it("uses Indian digit grouping for larger amounts", () => {
    expect(formatCurrency(123456.78)).toBe("₹1,23,456.78");
  });
});
