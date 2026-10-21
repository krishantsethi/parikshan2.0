import { describe, expect, it } from "vitest";
import {
  ACTIVITY_FACTORS,
  calcBmi,
  calcBmr,
  calcEgfr,
  calcLbm,
  calcMacros,
  calcTdee,
  creatinineUmolToMgDl,
  feetInchesToCm,
  lbsToKg,
} from "@/lib/health/calculators";

describe("calcBmi", () => {
  it("computes BMI with WHO and South Asian categories", () => {
    const result = calcBmi({ weightKg: 70, heightCm: 175 });
    expect(result.bmi).toBeCloseTo(22.9, 1);
    expect(result.categoryWho).toBe("normal");
    expect(result.categoryAsianIndian).toBe("normal");
  });

  it("applies the lower South Asian thresholds", () => {
    // BMI 23.9 -> normal by WHO, overweight by South Asian guidance
    const result = calcBmi({ weightKg: 73, heightCm: 175 });
    expect(result.bmi).toBeCloseTo(23.8, 1);
    expect(result.categoryWho).toBe("normal");
    expect(result.categoryAsianIndian).toBe("overweight");
  });

  it("rejects impossible inputs", () => {
    expect(() => calcBmi({ weightKg: 0, heightCm: 170 })).toThrow(RangeError);
    expect(() => calcBmi({ weightKg: 70, heightCm: 10 })).toThrow(RangeError);
  });
});

describe("calcBmr (Mifflin-St Jeor)", () => {
  it("matches the published equation for men", () => {
    // 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75
    expect(calcBmr({ weightKg: 70, heightCm: 175, age: 30, sex: "male" }).bmrKcal).toBe(1649);
  });

  it("matches the published equation for women", () => {
    // 10*60 + 6.25*160 - 5*30 - 161 = 600 + 1000 - 150 - 161 = 1289
    expect(calcBmr({ weightKg: 60, heightCm: 160, age: 30, sex: "female" }).bmrKcal).toBe(1289);
  });

  it("rejects paediatric ages", () => {
    expect(() => calcBmr({ weightKg: 30, heightCm: 140, age: 12, sex: "male" })).toThrow(RangeError);
  });
});

describe("calcTdee + calcMacros", () => {
  it("applies activity factors", () => {
    expect(calcTdee({ bmrKcal: 1600, activity: "sedentary" }).tdeeKcal).toBe(Math.round(1600 * ACTIVITY_FACTORS.sedentary));
    expect(calcTdee({ bmrKcal: 1600, activity: "moderate" }).factor).toBe(1.55);
  });

  it("computes macro targets that add back up to the calorie target", () => {
    const macros = calcMacros({ tdeeKcal: 2200, weightKg: 70, goal: "maintain" });
    const total = macros.proteinG * 4 + macros.fatG * 9 + macros.carbsG * 4;
    // Rounding tolerance
    expect(Math.abs(total - macros.calories)).toBeLessThanOrEqual(20);
    expect(macros.calories).toBe(2200);
  });

  it("creates a deficit for weight loss and a surplus for gain", () => {
    expect(calcMacros({ tdeeKcal: 2200, weightKg: 70, goal: "lose" }).calories).toBe(1800);
    expect(calcMacros({ tdeeKcal: 2200, weightKg: 70, goal: "gain" }).calories).toBe(2500);
  });
});

describe("calcLbm (Boer)", () => {
  it("computes lean mass for men and women", () => {
    // male: 0.407*70 + 0.267*175 - 19.2 = 28.49 + 46.725 - 19.2 = 56.0
    expect(calcLbm({ weightKg: 70, heightCm: 175, sex: "male" }).lbmKg).toBeCloseTo(56.0, 1);
    // female: 0.252*60 + 0.473*160 - 48.3 = 15.12 + 75.68 - 48.3 = 42.5
    expect(calcLbm({ weightKg: 60, heightCm: 160, sex: "female" }).lbmKg).toBeCloseTo(42.5, 1);
  });
});

describe("calcEgfr (CKD-EPI 2021)", () => {
  it("matches the reference equation for a healthy adult male", () => {
    // 142 × 0.9938^40 ≈ 111 mL/min/1.73m² for a 40-year-old male at Scr 0.9
    // (κ = 0.9, so both min/max ratios are 1; the female multiplier is skipped).
    const result = calcEgfr({ creatinineMgDl: 0.9, age: 40, sex: "male" });
    expect(result.egfr).toBeGreaterThanOrEqual(108);
    expect(result.egfr).toBeLessThanOrEqual(114);
    expect(result.stage).toBe("G1");
  });

  it("stages reduced function correctly", () => {
    const result = calcEgfr({ creatinineMgDl: 2.0, age: 65, sex: "female" });
    expect(result.egfr).toBeLessThan(35);
    expect(["G3b", "G4"]).toContain(result.stage);
  });

  it("includes interpretation and limitation notes", () => {
    const result = calcEgfr({ creatinineMgDl: 1.0, age: 50, sex: "male" });
    expect(result.interpretation).toMatch(/chronic kidney disease/i);
    expect(result.limitations).toMatch(/muscle mass/i);
  });

  it("refuses pediatric ages and impossible creatinine", () => {
    expect(() => calcEgfr({ creatinineMgDl: 1.0, age: 10, sex: "male" })).toThrow(RangeError);
    expect(() => calcEgfr({ creatinineMgDl: 0, age: 40, sex: "male" })).toThrow(RangeError);
  });

  it("converts SI creatinine units", () => {
    expect(creatinineUmolToMgDl(88.4)).toBeCloseTo(1.0, 5);
  });
});

describe("unit converters", () => {
  it("converts pounds and feet correctly", () => {
    expect(lbsToKg(220.462)).toBeCloseTo(100, 2);
    expect(feetInchesToCm(5, 7)).toBeCloseTo(170.18, 1);
  });
});
