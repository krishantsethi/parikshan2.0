"use client";

import { useState, type ReactNode } from "react";
import { Calculator, Flame, HeartPulse, Info, Ruler, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
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
  type ActivityLevel,
  type BmiCategory,
  type MacroGoal,
  type Sex,
} from "@/lib/health/calculators";

type Units = "metric" | "imperial";

function parseNumber(value: string): number | null {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function ResultPanel({
  children,
  formula,
  limitations,
}: {
  children: ReactNode;
  formula: string;
  limitations: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-accent/20 bg-accent-dim/40 p-4">
      <div>{children}</div>
      <p className="mt-3 border-t border-accent/15 pt-2.5 font-mono text-[10px] leading-relaxed text-faint">
        {formula}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{limitations}</p>
    </div>
  );
}

function HeightWeightInputs({
  units,
  heightCm,
  setHeightCm,
  feet,
  setFeet,
  inches,
  setInches,
  weight,
  setWeight,
}: {
  units: Units;
  heightCm: string;
  setHeightCm: (v: string) => void;
  feet: string;
  setFeet: (v: string) => void;
  inches: string;
  setInches: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {units === "metric" ? (
        <Input
          label="Height"
          type="number"
          inputMode="decimal"
          min={50}
          max={260}
          step="0.1"
          value={heightCm}
          onChange={(event) => setHeightCm(event.target.value)}
          placeholder="170"
          hint="centimetres"
        />
      ) : (
        <div>
          <span className="block text-xs font-medium uppercase tracking-wider text-muted">Height</span>
          <div className="mt-1.5 flex gap-2">
            <Input
              type="number"
              min={3}
              max={8}
              value={feet}
              onChange={(event) => setFeet(event.target.value)}
              placeholder="5"
              aria-label="Height feet"
            />
            <Input
              type="number"
              min={0}
              max={11}
              value={inches}
              onChange={(event) => setInches(event.target.value)}
              placeholder="7"
              aria-label="Height inches"
            />
          </div>
        </div>
      )}
      <Input
        label="Weight"
        type="number"
        inputMode="decimal"
        min={units === "metric" ? 20 : 44}
        max={units === "metric" ? 400 : 880}
        step="0.1"
        value={weight}
        onChange={(event) => setWeight(event.target.value)}
        placeholder={units === "metric" ? "70" : "154"}
        hint={units === "metric" ? "kilograms" : "pounds"}
      />
    </div>
  );
}

function resolveMeasurements(args: {
  units: Units;
  heightCm: string;
  feet: string;
  inches: string;
  weight: string;
}): { heightCm: number; weightKg: number } {
  const heightCm =
    args.units === "metric"
      ? (parseNumber(args.heightCm) ?? NaN)
      : feetInchesToCm(parseNumber(args.feet) ?? NaN, parseNumber(args.inches) ?? 0);
  const rawWeight = parseNumber(args.weight) ?? NaN;
  const weightKg = args.units === "metric" ? rawWeight : lbsToKg(rawWeight);
  return { heightCm, weightKg };
}

const BMI_LABEL: Record<BmiCategory, string> = {
  underweight: "Underweight",
  normal: "Within the normal range",
  overweight: "Overweight",
  obese: "Obese",
};

function BmiCalculator() {
  const [units, setUnits] = useState<Units>("metric");
  const [heightCm, setHeightCm] = useState("170");
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("7");
  const [weight, setWeight] = useState("70");
  const [result, setResult] = useState<ReturnType<typeof calcBmi> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function calculate() {
    setError(null);
    try {
      const measurements = resolveMeasurements({ units, heightCm, feet, inches, weight });
      setResult(calcBmi(measurements));
    } catch (calcError) {
      setResult(null);
      setError(calcError instanceof Error ? calcError.message : "Check your inputs.");
    }
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scale className="size-4.5 text-accent" aria-hidden />
          <h3 className="text-sm font-semibold text-ink">Body mass index (BMI)</h3>
        </div>
        <UnitToggle units={units} setUnits={setUnits} />
      </div>
      <div className="mt-4">
        <HeightWeightInputs
          units={units}
          heightCm={heightCm}
          setHeightCm={setHeightCm}
          feet={feet}
          setFeet={setFeet}
          inches={inches}
          setInches={setInches}
          weight={weight}
          setWeight={setWeight}
        />
      </div>
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      <Button size="sm" className="mt-4" onClick={calculate} icon={<Calculator className="size-3.5" />}>
        Calculate BMI
      </Button>
      {result && (
        <ResultPanel formula={result.formula} limitations={result.limitations}>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold text-ink">{result.bmi}</span>
            <Badge tone={result.categoryWho === "normal" ? "success" : "warning"}>
              WHO: {BMI_LABEL[result.categoryWho]}
            </Badge>
            <Badge tone={result.categoryAsianIndian === "normal" ? "success" : "warning"}>
              South Asian: {BMI_LABEL[result.categoryAsianIndian]}
            </Badge>
          </div>
        </ResultPanel>
      )}
    </div>
  );
}

function UnitToggle({ units, setUnits }: { units: Units; setUnits: (units: Units) => void }) {
  return (
    <div className="flex rounded-lg border border-line bg-panel p-0.5" role="group" aria-label="Units">
      {(["metric", "imperial"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setUnits(option)}
          aria-pressed={units === option}
          className={`rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors ${
            units === option ? "bg-panel-raised text-ink" : "text-faint hover:text-muted"
          }`}
        >
          {option === "metric" ? "kg / cm" : "lb / ft"}
        </button>
      ))}
    </div>
  );
}

function LbmCalculator() {
  const [units, setUnits] = useState<Units>("metric");
  const [heightCm, setHeightCm] = useState("170");
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("7");
  const [weight, setWeight] = useState("70");
  const [sex, setSex] = useState<Sex>("male");
  const [result, setResult] = useState<ReturnType<typeof calcLbm> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function calculate() {
    setError(null);
    try {
      const measurements = resolveMeasurements({ units, heightCm, feet, inches, weight });
      setResult(calcLbm({ ...measurements, sex }));
    } catch (calcError) {
      setResult(null);
      setError(calcError instanceof Error ? calcError.message : "Check your inputs.");
    }
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Ruler className="size-4.5 text-accent" aria-hidden />
          <h3 className="text-sm font-semibold text-ink">Lean body mass (Boer)</h3>
        </div>
        <UnitToggle units={units} setUnits={setUnits} />
      </div>
      <div className="mt-4 space-y-4">
        <HeightWeightInputs
          units={units}
          heightCm={heightCm}
          setHeightCm={setHeightCm}
          feet={feet}
          setFeet={setFeet}
          inches={inches}
          setInches={setInches}
          weight={weight}
          setWeight={setWeight}
        />
        <Select
          label="Sex (required by the equation)"
          value={sex}
          onChange={(event) => setSex(event.target.value as Sex)}
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
        />
      </div>
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      <Button size="sm" className="mt-4" onClick={calculate} icon={<Calculator className="size-3.5" />}>
        Estimate lean mass
      </Button>
      {result && (
        <ResultPanel formula={result.formula} limitations={result.limitations}>
          <span className="text-3xl font-semibold text-ink">{result.lbmKg}</span>
          <span className="ml-2 text-sm text-muted">kg estimated lean body mass</span>
        </ResultPanel>
      )}
    </div>
  );
}

function EnergyCalculator() {
  const [units, setUnits] = useState<Units>("metric");
  const [heightCm, setHeightCm] = useState("170");
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("7");
  const [weight, setWeight] = useState("70");
  const [age, setAge] = useState("30");
  const [sex, setSex] = useState<Sex>("male");
  const [activity, setActivity] = useState<ActivityLevel>("light");
  const [goal, setGoal] = useState<MacroGoal>("maintain");
  const [result, setResult] = useState<{
    bmr: ReturnType<typeof calcBmr>;
    tdee: ReturnType<typeof calcTdee>;
    macros: ReturnType<typeof calcMacros>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function calculate() {
    setError(null);
    try {
      const measurements = resolveMeasurements({ units, heightCm, feet, inches, weight });
      const ageValue = parseNumber(age);
      if (ageValue === null) throw new Error("Enter a valid age.");
      const bmr = calcBmr({ ...measurements, age: ageValue, sex });
      const tdee = calcTdee({ bmrKcal: bmr.bmrKcal, activity });
      const macros = calcMacros({ tdeeKcal: tdee.tdeeKcal, weightKg: measurements.weightKg, goal });
      setResult({ bmr, tdee, macros });
    } catch (calcError) {
      setResult(null);
      setError(calcError instanceof Error ? calcError.message : "Check your inputs.");
    }
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="size-4.5 text-accent" aria-hidden />
          <h3 className="text-sm font-semibold text-ink">Energy needs & macronutrients</h3>
        </div>
        <UnitToggle units={units} setUnits={setUnits} />
      </div>
      <div className="mt-4 space-y-4">
        <HeightWeightInputs
          units={units}
          heightCm={heightCm}
          setHeightCm={setHeightCm}
          feet={feet}
          setFeet={setFeet}
          inches={inches}
          setInches={setInches}
          weight={weight}
          setWeight={setWeight}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Age"
            type="number"
            min={18}
            max={120}
            value={age}
            onChange={(event) => setAge(event.target.value)}
            hint="years (adults only)"
          />
          <Select
            label="Sex (required by the equation)"
            value={sex}
            onChange={(event) => setSex(event.target.value as Sex)}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Activity level"
            value={activity}
            onChange={(event) => setActivity(event.target.value as ActivityLevel)}
            options={Object.keys(ACTIVITY_FACTORS).map((key) => ({
              value: key,
              label: key.replace("_", " "),
            }))}
          />
          <Select
            label="Goal"
            value={goal}
            onChange={(event) => setGoal(event.target.value as MacroGoal)}
            options={[
              { value: "maintain", label: "Maintain weight" },
              { value: "lose", label: "Lose weight" },
              { value: "gain", label: "Gain weight" },
            ]}
          />
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      <Button size="sm" className="mt-4" onClick={calculate} icon={<Calculator className="size-3.5" />}>
        Calculate
      </Button>
      {result && (
        <ResultPanel formula={result.bmr.formula} limitations={result.bmr.limitations}>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["BMR", `${result.bmr.bmrKcal} kcal`],
              ["TDEE", `${result.tdee.tdeeKcal} kcal`],
              ["Protein", `${result.macros.proteinG} g`],
              ["Fat / carbs", `${result.macros.fatG} g / ${result.macros.carbsG} g`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] uppercase tracking-wider text-faint">{label}</dt>
                <dd className="mt-0.5 font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-faint">
            Target calories for your goal: {result.macros.calories} kcal · {result.macros.assumptions.join(" · ")}
          </p>
        </ResultPanel>
      )}
    </div>
  );
}

function EgfrCalculator() {
  const [creatinine, setCreatinine] = useState("1.0");
  const [unit, setUnit] = useState<"mg/dL" | "µmol/L">("mg/dL");
  const [age, setAge] = useState("40");
  const [sex, setSex] = useState<Sex>("male");
  const [result, setResult] = useState<ReturnType<typeof calcEgfr> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function calculate() {
    setError(null);
    try {
      const raw = parseNumber(creatinine);
      const ageValue = parseNumber(age);
      if (raw === null) throw new Error("Enter a valid creatinine value.");
      if (ageValue === null) throw new Error("Enter a valid age.");
      const mgDl = unit === "mg/dL" ? raw : creatinineUmolToMgDl(raw);
      setResult(calcEgfr({ creatinineMgDl: mgDl, age: ageValue, sex }));
    } catch (calcError) {
      setResult(null);
      setError(calcError instanceof Error ? calcError.message : "Check your inputs.");
    }
  }

  return (
    <div className="panel border-warning/25 p-5">
      <div className="flex items-center gap-2">
        <HeartPulse className="size-4.5 text-warning" aria-hidden />
        <h3 className="text-sm font-semibold text-ink">eGFR — CKD-EPI 2021 (adults)</h3>
        <Badge tone="warning">Clinical section</Badge>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        For interpretation by qualified professionals. This is not a screening tool for self-diagnosis.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Input
            label="Serum creatinine"
            type="number"
            step="0.01"
            min={0.1}
            value={creatinine}
            onChange={(event) => setCreatinine(event.target.value)}
            hint={unit}
          />
          <div className="mt-2 flex gap-2">
            {(["mg/dL", "µmol/L"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setUnit(option)}
                aria-pressed={unit === option}
                className={`rounded-md border px-2 py-1 text-[10px] ${
                  unit === option ? "border-accent/40 bg-accent-dim text-accent" : "border-line text-faint"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Input
            label="Age"
            type="number"
            min={18}
            max={120}
            value={age}
            onChange={(event) => setAge(event.target.value)}
            hint="adults only (18+)"
          />
          <Select
            label="Sex"
            value={sex}
            onChange={(event) => setSex(event.target.value as Sex)}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      <Button size="sm" className="mt-4" variant="secondary" onClick={calculate} icon={<Calculator className="size-3.5" />}>
        Estimate eGFR
      </Button>
      {result && (
        <div className="mt-4 rounded-xl border border-warning/25 bg-warning-dim/50 p-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-semibold text-ink">{result.egfr}</span>
            <span className="text-sm text-muted">mL/min/1.73m²</span>
            <Badge tone="warning">{result.stage}</Badge>
          </div>
          <p className="mt-1.5 text-xs text-muted">{result.stageLabel}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">{result.interpretation}</p>
          <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-faint">{result.formula}</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-faint">{result.limitations}</p>
        </div>
      )}
    </div>
  );
}

export function HealthTools() {
  return (
    <div>
      <Alert tone="warning" title="Estimates, not diagnoses" className="mb-6">
        These calculators implement published formulas and show their assumptions. Individual variation
        is substantial. Nothing here should be used to self-diagnose or to change treatment.
      </Alert>

      <Tabs
        items={[
          {
            id: "body",
            label: "Body composition",
            icon: <Scale className="size-3.5" aria-hidden />,
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <BmiCalculator />
                <LbmCalculator />
              </div>
            ),
          },
          {
            id: "energy",
            label: "Energy & nutrition",
            icon: <Flame className="size-3.5" aria-hidden />,
            content: (
              <div className="grid gap-4">
                <EnergyCalculator />
              </div>
            ),
          },
          {
            id: "clinical",
            label: "Clinical",
            icon: <HeartPulse className="size-3.5" aria-hidden />,
            content: (
              <div className="grid gap-4">
                <EgfrCalculator />
              </div>
            ),
          },
        ]}
      />
      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-faint">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Formulas: WHO BMI categories (plus South Asian cut-offs), Mifflin-St Jeor BMR, standard activity
        factors, Boer lean body mass, and the race-free CKD-EPI 2021 creatinine equation. Kidney-related
        estimates belong in the clinical section and require professional interpretation.
      </p>
    </div>
  );
}
