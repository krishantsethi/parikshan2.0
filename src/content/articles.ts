export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "note"; text: string };

export interface ArticleSource {
  label: string;
  url: string;
}

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: "Lab reports" | "Medications" | "Understanding data" | "Preventive health";
  tags: string[];
  publishedAt: string;
  body: ArticleBlock[];
  sources: ArticleSource[];
  reviewNote: string;
}

/**
 * Original educational content written for PARIKSHAN.
 * It is deliberately conservative: it explains how to read values and what to
 * ask a clinician — it does not tell anyone what their result means medically.
 *
 * REVIEW STATUS: these articles have NOT been reviewed by a licensed
 * clinician. That limitation is displayed on every article page.
 */

export const ARTICLES: Article[] = [
  {
    slug: "how-to-read-a-complete-blood-count",
    title: "How to read a complete blood count without panicking",
    excerpt:
      "A CBC is one of the most common lab tests and one of the most misunderstood. Here is what the three cell families measure, how to read the numbers next to them, and which questions actually help at your appointment.",
    category: "Lab reports",
    tags: ["CBC", "haemoglobin", "platelets", "white blood cells"],
    publishedAt: "2025-08-12",
    body: [
      {
        type: "p",
        text: "A complete blood count (CBC) is a snapshot of the cells circulating in your blood. It is ordered for an enormous range of reasons — a routine check-up, a fever, fatigue, surgery preparation — which is part of why results can look alarming out of context. The test measures many things, but they fall into three families.",
      },
      { type: "h2", text: "1. Red cells: oxygen delivery" },
      {
        type: "p",
        text: "Haemoglobin (often written Hb or Hgb) is the protein that carries oxygen. Red blood cell count, haematocrit (the proportion of blood volume made up of red cells), MCV (average cell size), MCH and MCHC (haemoglobin content per cell) help describe the same system from different angles. The World Health Organization's commonly cited anaemia thresholds are below 13 g/dL for adult men and below 12 g/dL for non-pregnant adult women, but individual laboratories often print their own ranges, and those are the numbers your report is flagging against.",
      },
      {
        type: "p",
        text: "A single low haemoglobin does not by itself diagnose anaemia, and anaemia is a description rather than a cause. Hydration, altitude, pregnancy, recent blood loss, and laboratory variation all shift the number. That is why trends across several reports are usually more informative than a single reading.",
      },
      { type: "h2", text: "2. White cells: immune activity" },
      {
        type: "p",
        text: "The total leukocyte count (WBC) plus the differential — neutrophils, lymphocytes, monocytes, eosinophils, basophils — describe the composition of your immune cells. Counts move with infection, inflammation, stress, medications (steroids are a classic example), and sometimes nothing at all. Mild deviations are common and frequently transient; the differential pattern and your symptoms are what make a number meaningful.",
      },
      { type: "h2", text: "3. Platelets: clotting" },
      {
        type: "p",
        text: "Platelets help blood clot. Reports may print values in /µL, ×10³/µL, lakh/µL, or cells/cumm — the same measurement expressed differently. A count of 2.4 lakh/µL and 240,000/µL are identical. Because unit formats vary so much between Indian labs, it is worth confirming the unit before comparing two reports.",
      },
      { type: "h2", text: "How to read any single row" },
      {
        type: "ul",
        items: [
          "Read the value together with its unit — never the number alone.",
          "Check the reference range printed on that same report; ranges differ by lab and method.",
          "Look at the flag (H/L or an arrow) only as the lab's own interpretation of that range.",
          "Compare with previous results from the same laboratory when possible.",
          "Note anything that changed recently: illness, new medication, travel, pregnancy, intense exercise.",
        ],
      },
      {
        type: "note",
        text: "A value outside the reference range is not automatically a problem, and a value inside it is not automatically fine. Reference ranges are statistical constructs, usually covering about 95% of a healthy reference population.",
      },
      { type: "h2", text: "Questions worth asking your clinician" },
      {
        type: "ul",
        items: [
          "Which of these changes matter given my symptoms and history?",
          "Should any of these be repeated, and when?",
          "Could any medication I take affect these results?",
          "Is this lab's reference range comparable to my previous reports?",
        ],
      },
    ],
    sources: [
      { label: "MedlinePlus — Complete Blood Count (CBC)", url: "https://medlineplus.gov/lab-tests/complete-blood-count-cbc/" },
      { label: "World Health Organization — Anaemia", url: "https://www.who.int/news-room/fact-sheets/detail/anaemia" },
      { label: "NCBI Bookshelf — StatPearls: Complete Blood Count", url: "https://www.ncbi.nlm.nih.gov/books/NBK604207/" },
    ],
    reviewNote: "Written by the PARIKSHAN team. Not reviewed by a licensed clinician.",
  },
  {
    slug: "understanding-your-lipid-profile",
    title: "Your lipid profile, explained without the panic",
    excerpt:
      "Total cholesterol, LDL, HDL, triglycerides — what each number describes, why the “normal” range on your report may not be your personal target, and how to prepare a useful question for your doctor.",
    category: "Lab reports",
    tags: ["cholesterol", "LDL", "HDL", "triglycerides"],
    publishedAt: "2025-08-26",
    body: [
      {
        type: "p",
        text: "A lipid profile typically reports total cholesterol, LDL cholesterol, HDL cholesterol, and triglycerides. Sometimes it adds non-HDL cholesterol (total minus HDL), which many clinicians find more useful than total cholesterol alone. These numbers describe fats carried in your blood — they do not, on their own, tell you whether you will have a heart attack.",
      },
      { type: "h2", text: "What each number is doing" },
      {
        type: "ul",
        items: [
          "LDL cholesterol is the particle type most strongly associated with atherosclerotic risk at a population level — which is why it is often the focus of treatment decisions.",
          "HDL cholesterol participates in moving cholesterol away from tissues; higher is generally favourable, but simply raising HDL has not reliably reduced risk in trials.",
          "Triglycerides reflect energy transport and storage and are sensitive to recent food, alcohol, and fasting status.",
          "Total cholesterol is a sum, so it can look high because of a high HDL fraction.",
        ],
      },
      {
        type: "p",
        text: "A laboratory may print “desirable: < 200 mg/dL” for total cholesterol. That is a general population reference, not a personalised target. For someone with diabetes, established cardiovascular disease, or a strong family history, clinicians often aim for substantially lower LDL than the printed limit.",
      },
      { type: "h2", text: "Why one reading can mislead" },
      {
        type: "p",
        text: "Lipid values shift with recent meals, alcohol, illness, weight change, thyroid function, pregnancy, and many medications. A non-fasting sample can raise triglycerides noticeably. One abnormal result is usually a reason to repeat and contextualise, not a reason to make a decision alone.",
      },
      { type: "h2", text: "Units matter more than people expect" },
      {
        type: "p",
        text: "Cholesterol is reported in mg/dL in India and the United States, and in mmol/L in much of Europe. One mmol/L of cholesterol is about 38.7 mg/dL. If two reports use different units, comparing the raw numbers is meaningless — which is why PARIKSHAN never converts medical values silently and excludes mismatched units from a trend.",
      },
      { type: "h2", text: "What actually helps at an appointment" },
      {
        type: "ul",
        items: [
          "Bring two or three previous reports, ideally from the same laboratory.",
          "Mention changes in weight, activity, alcohol, and medications since the last test.",
          "Ask what your personal target is and why it differs (or not) from the printed range.",
          "Ask whether lifestyle changes alone are appropriate for your situation, or whether medication is being considered — that decision belongs to your clinician.",
        ],
      },
      {
        type: "note",
        text: "PARIKSHAN can show you which values sit outside the range printed on your report and how they have moved over time. It cannot tell you your cardiovascular risk or whether you need treatment.",
      },
    ],
    sources: [
      { label: "MedlinePlus — Cholesterol Levels", url: "https://medlineplus.gov/lab-tests/cholesterol-levels/" },
      { label: "World Health Organization — Cardiovascular diseases", url: "https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)" },
      { label: "NCBI Bookshelf — StatPearls: Cholesterol", url: "https://www.ncbi.nlm.nih.gov/books/NBK513352/" },
    ],
    reviewNote: "Written by the PARIKSHAN team. Not reviewed by a licensed clinician.",
  },
  {
    slug: "why-reference-ranges-differ",
    title: "Why your lab's reference range matters more than the word “normal”",
    excerpt:
      "Two laboratories can measure the same substance and print different limits. Here is where reference ranges come from, why units are not interchangeable, and how to compare results responsibly.",
    category: "Understanding data",
    tags: ["reference range", "units", "laboratory", "trends"],
    publishedAt: "2025-09-09",
    body: [
      {
        type: "p",
        text: "A reference range is usually built by measuring a large group of apparently healthy people and taking the central portion of the distribution — commonly the middle 95%. By construction, about one in twenty healthy people will fall outside a given range on any test. That does not make them unwell.",
      },
      { type: "h2", text: "Why limits differ between labs" },
      {
        type: "ul",
        items: [
          "Different analytical methods and instruments produce slightly different values for the same sample.",
          "Reference populations differ by region, age, sex, and even diet.",
          "Some labs print ranges optimised for clinical decision-making rather than pure population statistics.",
          "Units differ: glucose can be mg/dL or mmol/L, creatinine µmol/L or mg/dL, haemoglobin g/dL or g/L.",
        ],
      },
      {
        type: "p",
        text: "This is why a value of 5.6% on an HbA1c report from one lab and 5.9% from another may partly reflect method differences rather than a real change in your health. It is also why “my report says normal” is less informative than “my value is 4.1 with a range of 3.5–5.0 on this lab's method”.",
      },
      { type: "h2", text: "The unit trap" },
      {
        type: "p",
        text: "Units are not cosmetic. Creatinine of 1.2 mg/dL is about 106 µmol/L; glucose of 100 mg/dL is about 5.6 mmol/L; cholesterol of 200 mg/dL is about 5.2 mmol/L. Comparing 1.2 to 106 without converting is a category error, and silent conversion in a health app can produce a chart that looks reassuring and is wrong. PARIKSHAN stores the printed value and unit, flags only against the range printed on that report, and refuses to plot entries whose units differ.",
      },
      { type: "h2", text: "A practical comparison checklist" },
      {
        type: "ul",
        items: [
          "Compare results from the same laboratory and method when possible.",
          "Keep the unit attached to every number, in every note you take.",
          "Treat a change smaller than the lab's own analytical variation as noise until repeated.",
          "Ask your clinician whether a difference between two labs is clinically meaningful.",
        ],
      },
      {
        type: "note",
        text: "Reference ranges describe populations, not individuals. Your clinician interprets your value alongside symptoms, history, medications, and other results.",
      },
    ],
    sources: [
      { label: "NCBI Bookshelf — StatPearls: Reference Ranges", url: "https://www.ncbi.nlm.nih.gov/books/NBK430685/" },
      { label: "MedlinePlus — How to Understand Your Lab Results", url: "https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/" },
      { label: "World Health Organization — Laboratory quality", url: "https://www.who.int/health-topics/medical-devices" },
    ],
    reviewNote: "Written by the PARIKSHAN team. Not reviewed by a licensed clinician.",
  },
  {
    slug: "a-medication-list-that-actually-works",
    title: "A medication list that is actually useful (and why yours probably isn't)",
    excerpt:
      "“BP tablet, white one” is not a medication list. Six fields turn a vague memory into something a pharmacist can actually check — and catch the interaction risks that matter.",
    category: "Medications",
    tags: ["medications", "interactions", "pharmacist", "safety"],
    publishedAt: "2025-09-23",
    body: [
      {
        type: "p",
        text: "Most people carry a mental list of their medicines that is roughly correct and practically useless in an emergency. “The small white tablet for blood pressure” cannot be checked for interactions. A useful list has enough detail for a pharmacist who has never met you.",
      },
      { type: "h2", text: "The six fields that matter" },
      {
        type: "ul",
        items: [
          "Generic name — paracetamol, not just a brand; many brands contain the same molecule.",
          "Strength and form — 500 mg tablet, 5 mg/5 mL syrup, 75 mg tablet.",
          "How you actually take it — “1-0-1 after food”, not “twice daily” if that is not what you do.",
          "What it is for — blood pressure, diabetes, pain, thyroid, etc.",
          "Who prescribed it and when it started.",
          "Anything you have stopped, and why.",
        ],
      },
      { type: "h2", text: "Brand names hide duplicates" },
      {
        type: "p",
        text: "Combination cold and pain products frequently contain paracetamol. If you also take paracetamol tablets for a fever, it is easy to exceed a safe daily amount without realising. The same duplication happens with some cough syrups and sleep aids. Recording generic names exposes these overlaps; recording only brand names conceals them.",
      },
      { type: "h2", text: "The pharmacy conversation" },
      {
        type: "p",
        text: "A pharmacist can review your full list — including over-the-counter products, supplements, and traditional medicines — for interactions and duplication. That review is more reliable than any automated checker, including PARIKSHAN's. Our curated interaction set is deliberately small and clearly labeled; “no interaction found” is not the same as “safe”.",
      },
      {
        type: "note",
        text: "Never stop, start, or change a prescribed medicine because an app, a search result, or a chatbot suggested it. Bring the question to your prescriber or pharmacist.",
      },
      { type: "h2", text: "After a hospital visit" },
      {
        type: "p",
        text: "Discharge is the moment medication lists go wrong. Ask for the discharge medication list in writing, compare it to what you were taking before, and ask specifically which medicines were stopped and why. Update your list the same day, while the instructions are still in front of you.",
      },
    ],
    sources: [
      { label: "World Health Organization — Medication safety", url: "https://www.who.int/initiatives/medication-without-harm" },
      { label: "MedlinePlus — Drugs, Herbs and Supplements", url: "https://medlineplus.gov/druginformation.html" },
      { label: "U.S. Food & Drug Administration — Drug interactions", url: "https://www.fda.gov/drugs/drug-interactions-labeling" },
    ],
    reviewNote: "Written by the PARIKSHAN team. Not reviewed by a licensed pharmacist or clinician.",
  },
  {
    slug: "hba1c-what-the-number-means",
    title: "HbA1c: what the number means — and what it cannot tell you",
    excerpt:
      "HbA1c is an average, not a reading. It reflects roughly three months of glucose exposure, shifts with several medical conditions, and is interpreted differently depending on your situation.",
    category: "Preventive health",
    tags: ["HbA1c", "diabetes", "glucose", "screening"],
    publishedAt: "2025-10-07",
    body: [
      {
        type: "p",
        text: "HbA1c (glycated haemoglobin) measures the fraction of haemoglobin that has glucose attached to it. Because red blood cells live for roughly three months, the result approximates your average blood glucose over that period — not your glucose on the morning of the test.",
      },
      { type: "h2", text: "Common thresholds, not personal verdicts" },
      {
        type: "p",
        text: "Widely used criteria classify HbA1c below 5.7% as normal, 5.7–6.4% as prediabetes, and 6.5% or above as consistent with diabetes — but diagnostic criteria differ slightly between organisations and countries, and diagnosis generally requires confirmation rather than a single test. A printed reference range on your report is a laboratory reference, not a diagnosis.",
      },
      { type: "h2", text: "When HbA1c can mislead" },
      {
        type: "ul",
        items: [
          "Iron-deficiency anaemia and some other anaemias can raise HbA1c relative to true glucose exposure.",
          "Haemoglobin variants (including some thalassaemias common in South Asia) can make certain methods inaccurate.",
          "Recent blood transfusion, pregnancy, and chronic kidney disease change interpretation.",
          "Rapid changes in glucose control are diluted by the three-month averaging window.",
        ],
      },
      {
        type: "p",
        text: "If your HbA1c does not match your home glucose readings, that discrepancy itself is worth raising with your clinician — it may indicate a measurement issue rather than a real change.",
      },
      { type: "h2", text: "Pairing HbA1c with other data" },
      {
        type: "p",
        text: "Fasting glucose, post-meal readings, and symptoms describe different parts of the picture. HbA1c alone cannot tell you about variability, hypoglycaemia, or how specific meals affect you. Wearable and glucometer data, when available, add detail that a quarterly average cannot.",
      },
      {
        type: "note",
        text: "PARIKSHAN charts confirmed HbA1c values with the reference range printed on each report and never converts units automatically. It does not diagnose diabetes or recommend treatment.",
      },
      { type: "h2", text: "Questions worth asking" },
      {
        type: "ul",
        items: [
          "Does this result need confirmation with a repeat test?",
          "Could anaemia, haemoglobin traits, or my kidney function be affecting this measurement?",
          "How does this compare with my home readings?",
          "What target range is appropriate for me specifically?",
        ],
      },
    ],
    sources: [
      { label: "MedlinePlus — Hemoglobin A1c (HbA1c) Test", url: "https://medlineplus.gov/lab-tests/hemoglobin-a1c-hba1c-test/" },
      { label: "National Institute of Diabetes and Digestive and Kidney Diseases — A1C", url: "https://www.niddk.nih.gov/health-information/diagnostic-tests/a1c-test" },
      { label: "World Health Organization — Diabetes", url: "https://www.who.int/news-room/fact-sheets/detail/diabetes" },
    ],
    reviewNote: "Written by the PARIKSHAN team. Not reviewed by a licensed clinician.",
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}

export function articleWordCount(article: Article): number {
  let words = 0;
  for (const block of article.body) {
    if (block.type === "ul") {
      for (const item of block.items) words += item.split(/\s+/).length;
    } else {
      words += block.text.split(/\s+/).length;
    }
  }
  return words;
}

export const ARTICLE_CATEGORIES = [
  "Lab reports",
  "Medications",
  "Understanding data",
  "Preventive health",
] as const;
