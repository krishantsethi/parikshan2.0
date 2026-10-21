/**
 * Curated medication-interaction starter dataset.
 *
 * HONEST SCOPE: this is a small, hand-curated educational set of well-known
 * clinically significant interactions — NOT a licensed interaction database
 * and NOT exhaustive. Each finding is labeled with its source so the UI can
 * distinguish it from live OpenFDA label lookups. Every review recommends
 * pharmacist confirmation.
 *
 * Severity reflects general drug-information references:
 *   major    — potentially serious; avoid or monitor closely
 *   moderate — clinically relevant; often manageable with monitoring
 *   minor    — limited clinical significance
 */

export interface CuratedInteraction {
  a: string[];
  b: string[];
  severity: "major" | "moderate" | "minor";
  description: string;
  evidence: string;
}

export const CURATED_LAST_REVIEWED = "2025-09";
export const CURATED_SOURCE_LABEL =
  "Curated educational starter dataset (not exhaustive; verify with a pharmacist)";

export const CURATED_INTERACTIONS: CuratedInteraction[] = [
  {
    a: ["warfarin"],
    b: ["aspirin", "ibuprofen", "diclofenac", "naproxen", "aceclofenac", "ketorolac"],
    severity: "major",
    description:
      "Warfarin with antiplatelet agents or NSAIDs substantially increases bleeding risk.",
    evidence:
      "Additive anticoagulant/antiplatelet effect plus NSAID-related gastric mucosal injury.",
  },
  {
    a: ["warfarin"],
    b: ["metronidazole", "fluconazole", "amiodarone", "ciprofloxacin"],
    severity: "major",
    description:
      "These medicines can raise warfarin exposure and INR, increasing bleeding risk.",
    evidence: "CYP2C9/CYP3A4 inhibition reduces warfarin clearance.",
  },
  {
    a: ["aspirin"],
    b: ["ibuprofen", "naproxen"],
    severity: "moderate",
    description:
      "Ibuprofen/naproxen taken around low-dose aspirin can blunt aspirin's antiplatelet effect and increase GI irritation.",
    evidence: "Competitive COX-1 binding and additive gastrointestinal toxicity.",
  },
  {
    a: ["clopidogrel"],
    b: ["omeprazole", "esomeprazole"],
    severity: "moderate",
    description:
      "Proton-pump inhibitors can reduce clopidogrel activation; some clinicians prefer pantoprazole instead.",
    evidence: "CYP2C19 inhibition reduces formation of clopidogrel's active metabolite.",
  },
  {
    a: ["simvastatin"],
    b: ["clarithromycin", "erythromycin", "itraconazole", "ketoconazole"],
    severity: "major",
    description:
      "Strong CYP3A4 inhibitors markedly raise simvastatin levels, with risk of myopathy/rhabdomyolysis.",
    evidence: "CYP3A4 inhibition increases statin exposure several-fold.",
  },
  {
    a: ["atorvastatin"],
    b: ["clarithromycin", "itraconazole"],
    severity: "moderate",
    description: "Macrolides/azoles can increase atorvastatin exposure and muscle-related risk.",
    evidence: "CYP3A4 inhibition; risk is lower than with simvastatin.",
  },
  {
    a: ["sertraline", "fluoxetine", "paroxetine", "citalopram", "escitalopram"],
    b: ["tramadol"],
    severity: "major",
    description:
      "SSRI plus tramadol increases serotonin-syndrome and seizure risk; use with caution and clinician guidance.",
    evidence: "Additive serotonergic activity; tramadol lowers seizure threshold.",
  },
  {
    a: ["sertraline", "fluoxetine", "paroxetine", "citalopram", "escitalopram"],
    b: ["ibuprofen", "diclofenac", "naproxen", "aspirin"],
    severity: "moderate",
    description: "SSRIs with NSAIDs increase the risk of gastrointestinal bleeding.",
    evidence: "Impaired platelet serotonin uptake plus NSAID mucosal injury.",
  },
  {
    a: ["lithium"],
    b: ["ibuprofen", "diclofenac", "naproxen", "ketorolac"],
    severity: "major",
    description:
      "NSAIDs reduce lithium clearance and can cause lithium toxicity; levels need monitoring.",
    evidence: "Reduced renal prostaglandin synthesis decreases lithium excretion.",
  },
  {
    a: ["digoxin"],
    b: ["amiodarone", "verapamil", "diltiazem"],
    severity: "major",
    description: "These medicines can raise digoxin levels and cause bradycardia or toxicity.",
    evidence: "P-glycoprotein inhibition and additive AV-node slowing.",
  },
  {
    a: ["methotrexate"],
    b: ["ibuprofen", "diclofenac", "naproxen", "aspirin"],
    severity: "major",
    description:
      "NSAIDs can reduce methotrexate clearance, increasing marrow and mucosal toxicity.",
    evidence: "Competition for renal tubular secretion.",
  },
  {
    a: ["ramipril", "enalapril", "lisinopril", "perindopril", "telmisartan", "losartan"],
    b: ["spironolactone", "potassium chloride", "potassium"],
    severity: "moderate",
    description: "Combining these raises the risk of hyperkalemia; potassium needs monitoring.",
    evidence: "Additive potassium retention via RAAS blockade.",
  },
  {
    a: ["metoprolol", "atenolol", "bisoprolol"],
    b: ["verapamil", "diltiazem"],
    severity: "moderate",
    description: "Beta-blockers with non-dihydropyridine calcium channel blockers can cause marked bradycardia or heart block.",
    evidence: "Additive negative chronotropic and dromotropic effects.",
  },
  {
    a: ["levothyroxine"],
    b: ["calcium carbonate", "ferrous sulfate", "iron", "omeprazole", "pantoprazole", "aluminium hydroxide"],
    severity: "moderate",
    description:
      "These reduce levothyroxine absorption; doses are usually separated by at least 4 hours.",
    evidence: "Chelation in the gut and reduced gastric acid for tablet dissolution.",
  },
  {
    a: ["ciprofloxacin", "levofloxacin", "moxifloxacin"],
    b: ["calcium carbonate", "ferrous sulfate", "iron", "aluminium hydroxide", "sucralfate", "magnesium hydroxide"],
    severity: "moderate",
    description:
      "Antacids and mineral supplements reduce fluoroquinolone absorption; separate dosing by 2–4 hours.",
    evidence: "Divalent/trivalent cation chelation.",
  },
  {
    a: ["doxycycline", "tetracycline"],
    b: ["calcium carbonate", "ferrous sulfate", "iron", "aluminium hydroxide", "magnesium hydroxide"],
    severity: "moderate",
    description: "Antacids/iron/calcium reduce tetracycline absorption; separate dosing.",
    evidence: "Chelation complex formation.",
  },
  {
    a: ["sildenafil", "tadalafil", "vardenafil"],
    b: ["nitroglycerin", "isosorbide mononitrate", "isosorbide dinitrate", "nitrate"],
    severity: "major",
    description:
      "PDE5 inhibitors with nitrates can cause severe, potentially life-threatening hypotension. This combination is generally contraindicated.",
    evidence: "Additive cGMP-mediated vasodilation.",
  },
  {
    a: ["ethinylestradiol", "oral contraceptive", "combined oral contraceptive"],
    b: ["rifampicin", "rifampin", "carbamazepine", "phenytoin"],
    severity: "major",
    description:
      "Enzyme-inducing medicines can reduce oral contraceptive effectiveness; additional contraception is usually advised.",
    evidence: "Hepatic enzyme induction increases steroid hormone metabolism.",
  },
  {
    a: ["allopurinol"],
    b: ["azathioprine", "mercaptopurine"],
    severity: "major",
    description:
      "Allopurinol can cause dangerous accumulation of azathioprine/mercaptopurine; doses are reduced under specialist supervision.",
    evidence: "Inhibition of xanthine oxidase, the metabolic clearance route.",
  },
  {
    a: ["valproate", "sodium valproate"],
    b: ["lamotrigine"],
    severity: "major",
    description:
      "Valproate roughly doubles lamotrigine levels and increases the risk of serious rash; specialist dose adjustment is required.",
    evidence: "Valproate inhibits lamotrigine glucuronidation.",
  },
  {
    a: ["metformin"],
    b: ["alcohol"],
    severity: "minor",
    description: "Heavy or binge alcohol use with metformin raises the (rare) risk of lactic acidosis.",
    evidence: "Alcohol impairs lactate clearance.",
  },
  {
    a: ["insulin", "insulin glargine", "insulin aspart"],
    b: ["glimepiride", "gliclazide", "glibenclamide", "repaglinide"],
    severity: "moderate",
    description:
      "Insulin with sulfonylureas/glinides increases hypoglycemia risk; this combination is used clinically with monitoring.",
    evidence: "Additive glucose-lowering effect.",
  },
  {
    a: ["paracetamol"],
    b: ["warfarin"],
    severity: "moderate",
    description:
      "Regular high-dose paracetamol can raise INR in people taking warfarin; occasional doses are usually fine.",
    evidence: "Possible interference with vitamin K-dependent clotting factor synthesis.",
  },
];
