"use client";

// Structured clinical documentation picker.
// Renders clickable descriptor chips that append standardized, NON-COPYRIGHTED
// clinical phrases into an existing free-text field. This lets the clinician
// document by selecting instead of typing, while the underlying value stays a
// plain string so all existing save logic is unchanged. A chip that is already
// present in the text is highlighted and clicking it removes that phrase.
//
// These descriptors are generic clinical documentation language (standard
// mental-status / biopsychosocial vocabulary). They are NOT reproductions of
// any copyrighted or licensed assessment instrument.

import React from "react";

export type PickerOption = string;
export type PickerGroup = { label?: string; options: PickerOption[] };

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function phrasePresent(value: string, phrase: string): boolean {
  const v = normalize(value);
  const p = normalize(phrase);
  if (!p) return false;
  return v.split(/[;.\n]/).map(normalize).includes(p) || v.includes(p);
}

function appendPhrase(value: string, phrase: string): string {
  const current = (value || "").trim();
  if (!current) return phrase;
  // separate discrete descriptors with "; " for readable documentation
  const endsWithSeparator = /[;.\n]\s*$/.test(current);
  return endsWithSeparator ? `${current} ${phrase}` : `${current}; ${phrase}`;
}

function removePhrase(value: string, phrase: string): string {
  const parts = (value || "")
    .split(/;\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => normalize(part) !== normalize(phrase));
  return parts.join("; ");
}

type StructuredPickerProps = {
  value: string;
  onAppend: (nextValue: string) => void;
  groups: PickerGroup[];
  disabled?: boolean;
  helpText?: string;
};

export function StructuredPicker({ value, onAppend, groups, disabled, helpText }: StructuredPickerProps) {
  const toggle = (phrase: string) => {
    if (disabled) return;
    if (phrasePresent(value || "", phrase)) {
      onAppend(removePhrase(value || "", phrase));
    } else {
      onAppend(appendPhrase(value || "", phrase));
    }
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Quick select — click to add to the note, click again to remove
      </p>
      {helpText && <p className="text-xs text-slate-500">{helpText}</p>}
      <div className="space-y-2">
        {groups.map((group, groupIndex) => (
          <div key={group.label || groupIndex} className="space-y-1">
            {group.label && <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{group.label}</p>}
            <div className="flex flex-wrap gap-1.5">
              {group.options.map((option) => {
                const active = phrasePresent(value || "", option);
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(option)}
                    aria-pressed={active}
                    className={
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition " +
                      (active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:bg-slate-100")
                    }
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Descriptor libraries — generic, non-copyrighted clinical documentation terms.
// ---------------------------------------------------------------------------

// Biopsychosocial intake field descriptors, keyed by intake field name.
export const intakePickerGroups: Record<string, PickerGroup[]> = {
  chiefComplaint: [
    {
      label: "Common presenting concerns",
      options: [
        "Depressed mood", "Anxiety / worry", "Panic episodes", "Trauma-related distress",
        "Grief / loss", "Anger / irritability", "Relationship / family conflict",
        "Work or school stress", "Sleep disturbance", "Substance use concern",
        "Mood swings", "Difficulty concentrating", "Low self-esteem", "Life transition / adjustment",
      ],
    },
  ],
  onset: [
    {
      label: "Onset",
      options: ["Recent onset (days to weeks)", "Onset within past few months", "Longstanding (months to years)", "Chronic / lifelong", "Episodic / recurrent", "Acute worsening of chronic condition"],
    },
    {
      label: "Course",
      options: ["Gradual onset", "Sudden onset", "Following identifiable stressor", "No clear precipitant", "Symptoms worsening", "Symptoms stable", "Symptoms improving"],
    },
  ],
  presentingProblem: [
    {
      label: "Symptom domains",
      options: [
        "Depressed / low mood", "Loss of interest or pleasure", "Excessive worry", "Panic / physical anxiety symptoms",
        "Irritability / anger", "Intrusive memories / flashbacks", "Avoidance", "Hypervigilance",
        "Sleep disturbance", "Appetite change", "Low energy / fatigue", "Difficulty concentrating",
        "Hopelessness", "Guilt / worthlessness", "Social withdrawal",
      ],
    },
    {
      label: "Functional impact",
      options: ["Impact on work / school", "Impact on relationships", "Impact on daily functioning", "Impact on self-care", "Impact on parenting", "No significant functional impairment reported"],
    },
    {
      label: "Client goals",
      options: ["Client seeking symptom relief", "Client seeking coping strategies", "Client seeking support during transition", "Client referred by provider", "Client self-referred"],
    },
  ],
  demographicsSummary: [
    {
      label: "Living situation",
      options: ["Lives alone", "Lives with partner / spouse", "Lives with family", "Lives with roommate(s)", "Stable housing", "Housing instability", "Homeless / temporary housing"],
    },
    {
      label: "Work / school",
      options: ["Employed full-time", "Employed part-time", "Unemployed", "Retired", "Student", "On disability / leave"],
    },
    {
      label: "Access / language",
      options: ["English-speaking", "Interpreter services needed", "Requests accessibility accommodations", "No access needs identified"],
    },
  ],
  socialFamilyHistory: [
    {
      label: "Supports",
      options: ["Supportive family relationships", "Strained family relationships", "Supportive friendships", "Limited social support", "Involved in community / faith group", "Socially isolated"],
    },
    {
      label: "Relationship status",
      options: ["Single", "Partnered", "Married", "Separated / divorced", "Widowed"],
    },
    {
      label: "Family history",
      options: ["Family history of mental health condition", "Family history of substance use", "No known family psychiatric history", "History of family conflict / instability"],
    },
  ],
  mentalHealthHistory: [
    {
      label: "Prior treatment",
      options: ["No prior mental health treatment", "Prior outpatient therapy", "Prior psychiatric medication", "Currently taking psychiatric medication", "Prior diagnosis reported", "Good response to prior treatment", "Limited response to prior treatment"],
    },
  ],
  hospitalizationHistory: [
    {
      label: "Higher level of care",
      options: ["No psychiatric hospitalizations", "Prior psychiatric hospitalization", "Prior ER visit for mental health crisis", "Prior partial hospitalization / IOP", "Prior residential treatment", "No crisis service history"],
    },
  ],
  medicalPhysicalHistory: [
    {
      label: "Medical",
      options: ["No significant medical history", "Chronic medical condition present", "Currently taking medications", "Medication allergies noted", "No known allergies", "Has primary care provider", "Coordination with PCP recommended"],
    },
    {
      label: "Physical / somatic",
      options: ["Sleep difficulties", "Appetite changes", "Chronic pain", "Fatigue / low energy", "No somatic concerns reported"],
    },
  ],
  abuseTraumaHistory: [
    {
      label: "Trauma exposure",
      options: ["No trauma history reported", "History of childhood abuse / neglect", "History of physical abuse", "History of emotional abuse", "History of sexual abuse", "History of domestic / intimate partner violence", "History of community violence exposure", "Significant grief / loss", "Declined to discuss at this time"],
    },
    {
      label: "Current safety",
      options: ["No current safety concerns", "Current safety concerns identified", "Triggers identified", "Safety planning indicated"],
    },
  ],
  substanceUseHistory: [
    {
      label: "Use",
      options: ["Denies substance use", "Alcohol use reported", "Cannabis use reported", "Tobacco / nicotine use", "Other substance use reported", "History of substance use, currently in recovery"],
    },
    {
      label: "Impact / stage",
      options: ["No functional consequences reported", "Use affecting functioning", "In active recovery", "Engaged in recovery supports", "Precontemplation", "Contemplation", "Preparation / action stage"],
    },
  ],
  riskSafetySummary: [
    {
      label: "Suicidal ideation",
      options: ["Denies suicidal ideation", "Passive suicidal ideation", "Active suicidal ideation", "Ideation without plan or intent", "Ideation with plan", "Ideation with intent", "Access to means addressed"],
    },
    {
      label: "Other risk",
      options: ["Denies homicidal ideation", "Denies self-harm", "History of self-harm", "No current risk to others"],
    },
    {
      label: "Protective / disposition",
      options: ["Protective factors present", "Future-oriented", "Engaged in treatment", "Safety plan reviewed", "Crisis resources provided", "No safety plan needed at this time", "Higher level of care considered"],
    },
  ],
  strengthsProtectiveFactors: [
    {
      label: "Strengths",
      options: ["Motivated for treatment", "Insightful", "Strong support system", "Employed / financially stable", "Effective coping skills", "Spiritual / faith resources", "Future-oriented", "Resilient", "Help-seeking", "Stable living situation"],
    },
  ],
  clinicalFormulation: [
    {
      label: "Predisposing",
      options: ["Predisposing: family history", "Predisposing: early adversity / trauma", "Predisposing: temperament"],
    },
    {
      label: "Precipitating",
      options: ["Precipitating: recent stressor", "Precipitating: loss / grief", "Precipitating: life transition", "Precipitating: relationship conflict"],
    },
    {
      label: "Perpetuating",
      options: ["Perpetuating: avoidance", "Perpetuating: ongoing stressors", "Perpetuating: limited supports", "Perpetuating: maladaptive coping"],
    },
    {
      label: "Protective",
      options: ["Protective: strong supports", "Protective: motivation for change", "Protective: coping skills", "Protective: treatment engagement"],
    },
  ],
  treatmentGoals: [
    {
      label: "Common goals",
      options: [
        "Reduce depressive symptoms", "Reduce anxiety symptoms", "Improve mood regulation",
        "Develop coping skills", "Improve sleep", "Process trauma safely",
        "Improve relationships / communication", "Increase daily functioning",
        "Build support system", "Reduce substance use", "Improve self-esteem", "Develop safety plan",
      ],
    },
  ],
  followUpFrequency: [
    { options: ["Weekly", "Twice weekly", "Every other week", "Twice monthly", "Monthly", "As needed"] },
  ],
  followUpInterval: [
    { options: ["In 2–3 days", "In one week", "In two weeks", "In one month", "As clinically indicated"] },
  ],
};

// Treatment plan field descriptors.
export const treatmentPlanPickerGroups: Record<string, PickerGroup[]> = {
  problem: [
    {
      label: "Problem statement",
      options: [
        "Depressed mood impacting functioning", "Anxiety impacting daily functioning",
        "Trauma-related symptoms", "Grief / bereavement", "Difficulty regulating emotions",
        "Relationship / interpersonal difficulties", "Substance use", "Low self-esteem",
        "Adjustment to life transition", "Sleep disturbance", "Anger / irritability",
      ],
    },
  ],
  intervention: [
    {
      label: "Modalities",
      options: [
        "Cognitive Behavioral Therapy (CBT)", "Dialectical Behavior Therapy (DBT) skills",
        "Trauma-focused therapy", "Person-centered / supportive therapy",
        "Motivational interviewing", "Mindfulness-based techniques",
        "Solution-focused techniques", "Psychoeducation", "Relapse prevention planning",
      ],
    },
    {
      label: "Session focus",
      options: [
        "Weekly individual psychotherapy", "Coping-skills development", "Emotion-regulation skills",
        "Cognitive restructuring", "Exposure / gradual approach", "Behavioral activation",
        "Safety planning", "Coordination of care", "Referral / collateral contact",
      ],
    },
  ],
};

// MSE domain descriptors, keyed by the exact mseDomains label.
export const msePickerGroups: Record<string, PickerGroup[]> = {
  "Appearance and grooming": [
    { options: ["Well-groomed", "Appropriately dressed", "Casually dressed", "Disheveled", "Poor hygiene", "Appears stated age", "Appears older than stated age", "No acute distress"] },
  ],
  "Behavior and engagement": [
    { options: ["Cooperative", "Engaged", "Guarded", "Withdrawn", "Restless", "Agitated", "Good eye contact", "Poor eye contact", "Calm"] },
  ],
  "Psychomotor activity": [
    { options: ["Within normal limits", "Psychomotor agitation", "Psychomotor retardation", "Fidgety / restless", "No abnormal movements"] },
  ],
  "Speech": [
    { options: ["Normal rate and rhythm", "Soft / low volume", "Loud", "Rapid / pressured", "Slowed", "Fluent", "Sparse / minimal", "Normal prosody"] },
  ],
  "Mood (client report)": [
    { options: ["\"Fine\"", "Depressed", "Anxious", "Irritable", "Sad", "Angry", "Hopeful", "Mixed", "Euthymic"] },
  ],
  "Affect (observed)": [
    { options: ["Euthymic", "Full range", "Congruent with mood", "Constricted", "Blunted", "Flat", "Labile", "Tearful", "Anxious", "Irritable"] },
  ],
  "Thought process": [
    { options: ["Linear and goal-directed", "Logical", "Coherent", "Circumstantial", "Tangential", "Loose associations", "Flight of ideas", "Disorganized"] },
  ],
  "Thought content": [
    { options: ["No delusions", "No paranoia", "No obsessions", "Preoccupied with stressors", "Ruminations present", "Delusional content present", "No abnormal content elicited"] },
  ],
  "Perception": [
    { options: ["No hallucinations", "Denies auditory hallucinations", "Denies visual hallucinations", "Perceptual disturbance reported", "No perceptual abnormalities noted"] },
  ],
  "Orientation": [
    { options: ["Oriented x4 (person, place, time, situation)", "Oriented x3", "Disoriented to time", "Disoriented to place", "Alert"] },
  ],
  "Attention and concentration": [
    { options: ["Attentive", "Able to sustain attention", "Mildly distractible", "Impaired concentration", "Within normal limits"] },
  ],
  "Memory": [
    { options: ["Intact recent and remote memory", "Recent memory intact", "Remote memory intact", "Mild memory impairment", "No gross memory deficits"] },
  ],
  "Insight": [
    { options: ["Good", "Fair", "Limited", "Poor", "Aware of condition and need for treatment"] },
  ],
  "Judgment": [
    { options: ["Good", "Fair", "Limited", "Poor", "Intact for daily decisions", "Impaired"] },
  ],
  "Safety: suicidal and homicidal thoughts": [
    { label: "Suicidal", options: ["Denies suicidal ideation", "Passive ideation", "Active ideation", "No plan", "No intent", "Plan present", "Intent present"] },
    { label: "Homicidal / other", options: ["Denies homicidal ideation", "Denies self-harm", "No risk to others"] },
    { label: "Disposition", options: ["Protective factors present", "Safety plan reviewed", "Crisis resources provided", "No acute safety concerns"] },
  ],
};
