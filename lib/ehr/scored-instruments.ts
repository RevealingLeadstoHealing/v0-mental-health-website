// Scored screening instruments with full item text, response options, and
// auto-scoring.
//
// COPYRIGHT / LICENSING NOTE (important for the practice):
// Only PUBLIC-DOMAIN instruments are reproduced here with their item wording.
// PHQ-9 and GAD-7 (Pfizer/Spitzer) were released for free public use and
// reproduction. PC-PTSD-5 was developed by the U.S. National Center for PTSD
// (U.S. Government work, public domain). Instruments that are copyrighted or
// license-restricted (e.g. AUDIT, PCL-5 full items, EDE-Q, MoCA, Conners,
// Vanderbilt, BASC, etc.) are intentionally NOT reproduced here — those
// continue to use results-entry so the practice does not reproduce protected
// material without a license.

export type InstrumentOption = { label: string; value: number };
export type InstrumentItem = { id: string; text: string };

export type ScoredInstrument = {
  key: string;
  title: string;
  publicDomainNote: string;
  instructions: string;
  options: InstrumentOption[]; // shared response scale for all items
  items: InstrumentItem[];
  // Optional named subscales (item ids grouped) — omitted for simple total scales.
  scoring: {
    // severity bands by total-score cutoffs (inclusive lower bound)
    bands: { min: number; max: number; label: string }[];
    maxScore: number;
  };
  // Optional per-item clinical flag (e.g. PHQ-9 item 9 self-harm).
  flagItemId?: string;
  flagNote?: string;
};

const FREQUENCY_0_3: InstrumentOption[] = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];

export const scoredInstruments: Record<string, ScoredInstrument> = {
  phq9: {
    key: "phq9",
    title: "PHQ-9 (Patient Health Questionnaire-9)",
    publicDomainNote:
      "PHQ-9 is free to use and reproduce (developed by Drs. Spitzer, Williams, Kroenke and colleagues, with an educational grant from Pfizer). No permission required.",
    instructions:
      "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
    options: FREQUENCY_0_3,
    items: [
      { id: "phq9_1", text: "Little interest or pleasure in doing things" },
      { id: "phq9_2", text: "Feeling down, depressed, or hopeless" },
      { id: "phq9_3", text: "Trouble falling or staying asleep, or sleeping too much" },
      { id: "phq9_4", text: "Feeling tired or having little energy" },
      { id: "phq9_5", text: "Poor appetite or overeating" },
      {
        id: "phq9_6",
        text: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
      },
      {
        id: "phq9_7",
        text: "Trouble concentrating on things, such as reading the newspaper or watching television",
      },
      {
        id: "phq9_8",
        text: "Moving or speaking so slowly that other people could have noticed — or the opposite, being so fidgety or restless that you have been moving around a lot more than usual",
      },
      {
        id: "phq9_9",
        text: "Thoughts that you would be better off dead, or of hurting yourself in some way",
      },
    ],
    scoring: {
      maxScore: 27,
      bands: [
        { min: 0, max: 4, label: "None–minimal (0–4)" },
        { min: 5, max: 9, label: "Mild (5–9)" },
        { min: 10, max: 14, label: "Moderate (10–14)" },
        { min: 15, max: 19, label: "Moderately severe (15–19)" },
        { min: 20, max: 27, label: "Severe (20–27)" },
      ],
    },
    flagItemId: "phq9_9",
    flagNote:
      "Item 9 endorses thoughts of being better off dead or self-harm. Any response above “Not at all” requires immediate safety assessment.",
  },

  gad7: {
    key: "gad7",
    title: "GAD-7 (Generalized Anxiety Disorder-7)",
    publicDomainNote:
      "GAD-7 is free to use and reproduce (developed by Drs. Spitzer, Kroenke, Williams and colleagues, with an educational grant from Pfizer). No permission required.",
    instructions:
      "Over the last 2 weeks, how often have you been bothered by the following problems?",
    options: FREQUENCY_0_3,
    items: [
      { id: "gad7_1", text: "Feeling nervous, anxious, or on edge" },
      { id: "gad7_2", text: "Not being able to stop or control worrying" },
      { id: "gad7_3", text: "Worrying too much about different things" },
      { id: "gad7_4", text: "Trouble relaxing" },
      { id: "gad7_5", text: "Being so restless that it is hard to sit still" },
      { id: "gad7_6", text: "Becoming easily annoyed or irritable" },
      { id: "gad7_7", text: "Feeling afraid, as if something awful might happen" },
    ],
    scoring: {
      maxScore: 21,
      bands: [
        { min: 0, max: 4, label: "None–minimal (0–4)" },
        { min: 5, max: 9, label: "Mild (5–9)" },
        { min: 10, max: 14, label: "Moderate (10–14)" },
        { min: 15, max: 21, label: "Severe (15–21)" },
      ],
    },
  },

  pcptsd5: {
    key: "pcptsd5",
    title: "PC-PTSD-5 (Primary Care PTSD Screen for DSM-5)",
    publicDomainNote:
      "PC-PTSD-5 is a U.S. Government work developed by the National Center for PTSD (U.S. Department of Veterans Affairs) and is in the public domain.",
    instructions:
      "Sometimes things happen to people that are unusually or especially frightening, horrible, or traumatic. In the past month, did you… (answer Yes or No to each). A preliminary item first asks whether the person has ever experienced such an event; the screen below is completed only if that is endorsed.",
    options: [
      { label: "No", value: 0 },
      { label: "Yes", value: 1 },
    ],
    items: [
      {
        id: "pcptsd5_1",
        text: "Had nightmares about the event(s) or thought about the event(s) when you did not want to?",
      },
      {
        id: "pcptsd5_2",
        text: "Tried hard not to think about the event(s) or went out of your way to avoid situations that reminded you of the event(s)?",
      },
      {
        id: "pcptsd5_3",
        text: "Been constantly on guard, watchful, or easily startled?",
      },
      {
        id: "pcptsd5_4",
        text: "Felt numb or detached from people, activities, or your surroundings?",
      },
      {
        id: "pcptsd5_5",
        text: "Felt guilty or unable to stop blaming yourself or others for the event(s) or any problems the event(s) may have caused?",
      },
    ],
    scoring: {
      maxScore: 5,
      bands: [
        { min: 0, max: 2, label: "Below threshold (0–2)" },
        { min: 3, max: 5, label: "Positive screen (3–5) — probable PTSD; further evaluation indicated" },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Additional PUBLIC-DOMAIN instruments (verified free to reproduce).
// ---------------------------------------------------------------------------

// PHQ-2 — same free Pfizer/Spitzer family as PHQ-9 (public domain).
Object.assign(scoredInstruments, {
  phq2: {
    key: "phq2",
    title: "PHQ-2 (Patient Health Questionnaire-2)",
    publicDomainNote:
      "PHQ-2 is free to use and reproduce (Pfizer/Spitzer et al.). No permission required. A positive PHQ-2 (score of 3 or more) warrants a full PHQ-9.",
    instructions:
      "Over the last 2 weeks, how often have you been bothered by the following problems?",
    options: FREQUENCY_0_3,
    items: [
      { id: "phq2_1", text: "Little interest or pleasure in doing things" },
      { id: "phq2_2", text: "Feeling down, depressed, or hopeless" },
    ],
    scoring: {
      maxScore: 6,
      bands: [
        { min: 0, max: 2, label: "Negative screen (0–2)" },
        { min: 3, max: 6, label: "Positive screen (3–6) — administer full PHQ-9" },
      ],
    },
  } as ScoredInstrument,
});

export function scoreInstrument(
  key: string,
  answers: Record<string, number>
): { total: number; band: string; maxScore: number; answeredAll: boolean } | null {
  const instrument = scoredInstruments[key];
  if (!instrument) return null;
  let total = 0;
  let answeredCount = 0;
  for (const item of instrument.items) {
    const val = answers[item.id];
    if (typeof val === "number" && Number.isFinite(val)) {
      total += val;
      answeredCount += 1;
    }
  }
  const answeredAll = answeredCount === instrument.items.length;
  const band =
    instrument.scoring.bands.find((b) => total >= b.min && total <= b.max)?.label ?? "";
  return { total, band, maxScore: instrument.scoring.maxScore, answeredAll };
}

export function isScoredInstrument(key: string): boolean {
  return Boolean(scoredInstruments[key]);
}
