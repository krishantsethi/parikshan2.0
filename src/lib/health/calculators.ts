/**
 * Educational health calculators — documented formulas, explicit limitations.
 *
 * These are NOT diagnostic tools. Every result includes the formula used and
 * a limitations note so the UI can show them. Inputs are validated with
 * RangeError; API/UI layers translate that into field errors.
 */

/* ----------------------------------------------------------------- helpers */

export function lbsToKg(lb: number): number {
  return lb * 0.45359237;
}
export function kgToLbs(kg: number): number {
  return kg / 0.45359237;
}
export function inchesToCm(inches: number): number {
  return inches * 2.54;
}
export function cmToInches(cm: number): number {
  return cm / 2.54;
}
export function feetInchesToCm(feet: number, inches: number): number {
  return inchesToCm(feet * 12 + inches);
}

function assertRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${label} must be between ${min} and ${max}.`);
  }
}

/* --------------------------------------------------------------------- BMI */

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

export interface BmiResult {
  bmi: number;
  categoryWho: BmiCategory;
  categoryAsianIndian: BmiCategory;
  formula: string;
  limitations: string;
}

export function calcBmi(input: { weightKg: number; heightCm: number }): BmiResult {
  assertRange(input.weightKg, 2, 400, "Weight");
  assertRange(input.heightCm, 50, 260, "Height");
  const heightM = input.heightCm / 100;
  const bmi = input.weightKg / (heightM * heightM);

  const who = (v: number): BmiCategory =>
    v < 18.5 ? "underweight" : v < 25 ? "normal" : v < 30 ? "overweight" : "obese";
  // WHO Asia-Pacific / Indian guidance uses lower thresholds.
  const asian = (v: number): BmiCategory =>
    v < 18.5 ? "underweight" : v < 23 ? "normal" : v < 25 ? "overweight" : "obese";

  return {
    bmi: Number(bmi.toFixed(1)),
    categoryWho: who(bmi),
    categoryAsianIndian: asian(bmi),
    formula: "BMI = weight (kg) ÷ height (m)²",
    limitations:
      "BMI ignores body composition, muscle mass, pregnancy, and age. It is a population screening measure, not a diagnosis. South Asian adults are often assessed with lower cut-offs (23 / 25).",
  };
}

/* --------------------------------------------------------------------- BMR */

export type Sex = "male" | "female";

export interface BmrResult {
  bmrKcal: number;
  formula: string;
  limitations: string;
}

/** Mifflin-St Jeor (1990) — the most widely recommended predictive equation. */
export function calcBmr(input: { weightKg: number; heightCm: number; age: number; sex: Sex }): BmrResult {
  assertRange(input.weightKg, 20, 400, "Weight");
  assertRange(input.heightCm, 120, 260, "Height");
  assertRange(input.age, 18, 120, "Age");
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  const bmr = input.sex === "male" ? base + 5 : base - 161;
  return {
    bmrKcal: Math.round(bmr),
    formula:
      input.sex === "male"
        ? "Mifflin-St Jeor: 10×weight + 6.25×height − 5×age + 5"
        : "Mifflin-St Jeor: 10×weight + 6.25×height − 5×age − 161",
    limitations:
      "Predictive equations are estimates (±10–15%). They assume an adult at rest and are unreliable in pregnancy, very high muscle mass, or acute illness. They are not measured calorimetry.",
  };
}

/* -------------------------------------------------------------------- TDEE */

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface TdeeResult {
  tdeeKcal: number;
  factor: number;
  formula: string;
  limitations: string;
}

export function calcTdee(input: { bmrKcal: number; activity: ActivityLevel }): TdeeResult {
  assertRange(input.bmrKcal, 500, 6000, "BMR");
  const factor = ACTIVITY_FACTORS[input.activity];
  return {
    tdeeKcal: Math.round(input.bmrKcal * factor),
    factor,
    formula: `TDEE = BMR × activity factor (${factor})`,
    limitations:
      "Activity factors are population averages; wearable or logged-activity estimates are usually more accurate for individuals.",
  };
}

/* ------------------------------------------------------------------ macros */

export type MacroGoal = "maintain" | "lose" | "gain";

export interface MacroResult {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  assumptions: string[];
  limitations: string;
}

export function calcMacros(input: {
  tdeeKcal: number;
  weightKg: number;
  goal: MacroGoal;
}): MacroResult {
  assertRange(input.tdeeKcal, 800, 8000, "TDEE");
  assertRange(input.weightKg, 20, 400, "Weight");
  const adjustment = input.goal === "lose" ? -400 : input.goal === "gain" ? 300 : 0;
  const calories = Math.round(input.tdeeKcal + adjustment);
  const proteinPerKg = input.goal === "lose" ? 1.8 : 1.6;
  const proteinG = Math.round(input.weightKg * proteinPerKg);
  const fatG = Math.round((calories * 0.27) / 9);
  const carbKcal = calories - proteinG * 4 - fatG * 9;
  if (carbKcal < 0) {
    throw new RangeError("Protein and fat targets exceed the calorie target; adjust the goal.");
  }
  return {
    calories,
    proteinG,
    fatG,
    carbsG: Math.round(carbKcal / 4),
    assumptions: [
      `${proteinPerKg} g protein per kg body weight`,
      "27% of calories from fat",
      "Remaining calories from carbohydrates",
      input.goal === "lose"
        ? "A ~400 kcal/day deficit is assumed"
        : input.goal === "gain"
          ? "A ~300 kcal/day surplus is assumed"
          : "Maintenance calories are assumed",
    ],
    limitations:
      "Macronutrient targets are practical defaults, not medical prescriptions. Kidney disease, diabetes, and other conditions require individual dietitian guidance.",
  };
}

/* --------------------------------------------------------------------- LBM */

export interface LbmResult {
  lbmKg: number;
  formula: string;
  limitations: string;
}

/** Boer (1999) formula — accurate across a broad BMI range. */
export function calcLbm(input: { weightKg: number; heightCm: number; sex: Sex }): LbmResult {
  assertRange(input.weightKg, 20, 400, "Weight");
  assertRange(input.heightCm, 120, 260, "Height");
  const lbm =
    input.sex === "male"
      ? 0.407 * input.weightKg + 0.267 * input.heightCm - 19.2
      : 0.252 * input.weightKg + 0.473 * input.heightCm - 48.3;
  return {
    lbmKg: Number(Math.max(0, lbm).toFixed(1)),
    formula:
      input.sex === "male"
        ? "Boer: 0.407×weight + 0.267×height − 19.2"
        : "Boer: 0.252×weight + 0.473×height − 48.3",
    limitations:
      "Lean body mass is estimated from height and weight only — it cannot distinguish muscle from other lean tissue. DEXA scanning is the reference method.",
  };
}

/* -------------------------------------------------------------------- eGFR */

export type EgfrStage = "G1" | "G2" | "G3a" | "G3b" | "G4" | "G5";

export interface EgfrResult {
  egfr: number;
  stage: EgfrStage;
  stageLabel: string;
  formula: string;
  interpretation: string;
  limitations: string;
}

const EGFR_STAGE_LABELS: Record<EgfrStage, string> = {
  G1: "G1 — normal or high (≥90)",
  G2: "G2 — mildly decreased (60–89)",
  G3a: "G3a — mildly to moderately decreased (45–59)",
  G3b: "G3b — moderately to severely decreased (30–44)",
  G4: "G4 — severely decreased (15–29)",
  G5: "G5 — kidney failure (<15)",
};

function egfrStage(value: number): EgfrStage {
  if (value >= 90) return "G1";
  if (value >= 60) return "G2";
  if (value >= 45) return "G3a";
  if (value >= 30) return "G3b";
  if (value >= 15) return "G4";
  return "G5";
}

/**
 * CKD-EPI 2021 creatinine equation (race-free), adults only.
 *
 * CLINICAL SECTION: staging requires chronicity (≥3 months) and clinical
 * context. This function intentionally returns interpretation caveats with
 * every result and refuses pediatric inputs.
 */
export function calcEgfr(input: { creatinineMgDl: number; age: number; sex: Sex }): EgfrResult {
  assertRange(input.creatinineMgDl, 0.1, 25, "Creatinine");
  assertRange(input.age, 18, 120, "Age (this equation is for adults)");
  const female = input.sex === "female";
  const kappa = female ? 0.7 : 0.9;
  const alpha = female ? -0.241 : -0.302;
  const ratio = input.creatinineMgDl / kappa;
  const egfr =
    142 *
    Math.pow(Math.min(ratio, 1), alpha) *
    Math.pow(Math.max(ratio, 1), -1.2) *
    Math.pow(0.9938, input.age) *
    (female ? 1.012 : 1);
  const rounded = Math.round(egfr);
  const stage = egfrStage(rounded);
  return {
    egfr: rounded,
    stage,
    stageLabel: EGFR_STAGE_LABELS[stage],
    formula:
      "CKD-EPI 2021 (race-free): 142 × min(Scr/κ,1)^α × max(Scr/κ,1)^−1.200 × 0.9938^age × 1.012 (female)",
    interpretation:
      "eGFR estimates glomerular filtration from serum creatinine. A single value does not diagnose chronic kidney disease — staging requires a persistent reduction for at least 3 months plus clinical assessment.",
    limitations:
      "Estimates are less reliable at extremes of muscle mass, in acute kidney injury, pregnancy, or with certain drugs (e.g. trimethoprim, cimetidine). Creatinine assays vary between laboratories. Interpretation must be made by a qualified clinician.",
  };
}

/** µmol/L → mg/dL conversion used when a lab reports SI units. */
export function creatinineUmolToMgDl(value: number): number {
  return value / 88.4;
}
