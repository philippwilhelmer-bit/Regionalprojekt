import { describe, it, expect } from "vitest";
import {
  estimateReadingTime,
  isBlockquote,
  stripBlockquotePrefix,
} from "@/lib/reader/article-utils";

describe("estimateReadingTime()", () => {
  it("returns 1 for an empty string", () => {
    expect(estimateReadingTime("")).toBe(1);
  });

  it("returns 1 for 200 words", () => {
    const content = Array(200).fill("word").join(" ");
    expect(estimateReadingTime(content)).toBe(1);
  });

  it("returns 2 for 400 words", () => {
    const content = Array(400).fill("word").join(" ");
    expect(estimateReadingTime(content)).toBe(2);
  });

  it("returns 1 for 50 words", () => {
    const content = Array(50).fill("word").join(" ");
    expect(estimateReadingTime(content)).toBe(1);
  });
});

describe("isBlockquote()", () => {
  it("returns true for paragraph starting with >", () => {
    expect(isBlockquote("> Some quoted text")).toBe(true);
  });

  it("returns true for paragraph starting with German opening quote \u201E", () => {
    expect(isBlockquote("\u201ESome German quote")).toBe(true);
  });

  it("returns false for a regular paragraph", () => {
    expect(isBlockquote("This is a regular paragraph.")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isBlockquote("")).toBe(false);
  });
});

describe("stripBlockquotePrefix()", () => {
  it('removes leading > and whitespace from "> Some quote"', () => {
    expect(stripBlockquotePrefix("> Some quote")).toBe("Some quote");
  });

  it("removes leading \u201E from German quote", () => {
    expect(stripBlockquotePrefix("\u201ESome quote")).toBe("Some quote");
  });
});
