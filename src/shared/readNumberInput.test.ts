import type { ChangeEvent } from "react";
import { describe, expect, it } from "vitest";
import { readNumberInput } from "./readNumberInput";

function changeEvent(value: string): ChangeEvent<HTMLInputElement> {
  const target = { value } as HTMLInputElement;
  return { target } as ChangeEvent<HTMLInputElement>;
}

describe("readNumberInput", () => {
  it("strips a leading zero (068 -> 68), the bug this guards against", () => {
    const e = changeEvent("068");
    expect(readNumberInput(e)).toBe(68);
    expect(e.target.value).toBe("68"); // DOM value is corrected too, not just the return value
  });

  it("strips multiple leading zeros (007 -> 7)", () => {
    expect(readNumberInput(changeEvent("007"))).toBe(7);
  });

  it("keeps a single zero as 0", () => {
    const e = changeEvent("0");
    expect(readNumberInput(e)).toBe(0);
    expect(e.target.value).toBe("0");
  });

  it("collapses repeated zeros to a single 0 (00 -> 0)", () => {
    expect(readNumberInput(changeEvent("00"))).toBe(0);
  });

  it("treats an emptied field as 0", () => {
    const e = changeEvent("");
    expect(readNumberInput(e)).toBe(0);
    expect(e.target.value).toBe("0");
  });

  it("leaves a number with no leading zero untouched", () => {
    expect(readNumberInput(changeEvent("68"))).toBe(68);
  });
});
