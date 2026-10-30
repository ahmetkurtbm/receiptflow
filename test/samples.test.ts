import { describe, expect, it } from "vitest";
import { SAMPLE_ANALYSES } from "@/lib/samples";

describe("örnek analizler", () => {
  it("en az bir örnek var ve dosya adları benzersiz", () => {
    const names = SAMPLE_ANALYSES.map((sample) => sample.fileName);
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(SAMPLE_ANALYSES.map((sample) => [sample.fileName, sample.analysis] as const))("%s gerçek AI yanıtıyla aynı biçimde", (_name, analysis) => {
    const ids = analysis.fields.map((field) => field.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(analysis.confidence).toBeGreaterThanOrEqual(0);
    expect(analysis.confidence).toBeLessThanOrEqual(100);
    for (const field of analysis.fields) {
      expect(field.confidence).toBeGreaterThanOrEqual(0);
      expect(field.confidence).toBeLessThanOrEqual(100);
      expect(["receipt", "inferred"]).toContain(field.source);
    }
    // Rota gerçek yanıtta bu iki alanı zorunlu kılar; demo da aynısını göstermeli.
    expect(analysis.fields.map((field) => field.key)).toEqual(expect.arrayContaining(["expenseType", "expenseBranch"]));
  });
});
