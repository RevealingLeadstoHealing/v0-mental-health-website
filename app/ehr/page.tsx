"use client";
// @ts-nocheck

import React, { useEffect, useState } from "react";
import {
  Shield,
  Users,
  FileText,
  ClipboardList,
  Calendar,
  MessageSquare,
  BookOpen,
  Lock,
  Video,
  LogOut,
  LogIn,
  Sparkles,
  CheckCircle,
} from "lucide-react";

const APP_NAME = "Revealing Leads to Healing Wellness Services LLC";
const PRACTITIONER_NAME = "Kenseener Carpenter";

const demoProvider = {
  email: "provider@rlth.demo",
  password: "demo123",
  name: PRACTITIONER_NAME,
  role: "provider",
};

const demoClient = {
  email: "client@rlth.demo",
  password: "demo123",
  name: "Demo Client",
  role: "client",
};

const modules = [
  { key: "dashboard", label: "Dashboard", icon: Shield },
  { key: "clients", label: "Client Management", icon: Users },
  { key: "chart", label: "Client Chart", icon: FileText },
  { key: "intake", label: "Intake", icon: ClipboardList },
  { key: "notes", label: "Progress Notes", icon: FileText },
  { key: "assessments", label: "Assessments", icon: ClipboardList },
  { key: "documents", label: "Document Library", icon: Lock },
  { key: "homework", label: "Homework", icon: BookOpen },
  { key: "telehealth", label: "Telehealth", icon: Video },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "schedule", label: "Scheduling", icon: Calendar },
];

const STORAGE_KEYS = {
  assessments: "rlth:ehr:savedAssessments",
  notes: "rlth:ehr:savedNotes",
};

const ICD10_LIBRARY = [
  "F41.1 Generalized Anxiety Disorder",
  "F33.1 Major Depressive Disorder, recurrent, moderate",
  "F32.9 Major Depressive Disorder, unspecified",
  "F43.10 Post-Traumatic Stress Disorder",
  "F90.9 Attention-Deficit Hyperactivity Disorder",
  "F31.9 Bipolar Disorder, unspecified",
  "F43.23 Adjustment Disorder with mixed anxiety and depressed mood",
  "F10.20 Alcohol Dependence, uncomplicated",
  "F19.10 Other psychoactive substance abuse, uncomplicated",
  "Z63.0 Relationship distress with spouse or intimate partner",
  "Z59.0 Housing instability",
  "Z60.2 Problems related to living alone",
];

const clientChart = {
  name: "Demo Client",
  dob: "Not entered",
  phone: "Not entered",
  presentingProblem: "Anxiety, overwhelm, and difficulty regulating stress.",
  goals:
    "Improve coping, reduce symptom intensity, increase emotional regulation, and strengthen daily functioning.",
  diagnoses: ["Generalized Anxiety Disorder"],
  primaryDiagnosis: "F41.1 Generalized Anxiety Disorder",
  secondaryDiagnosis: "None entered",
  tertiaryDiagnosis: "None entered",
  homework: ["Grounding Practice"],
  documents: ["Consent for Treatment", "HIPAA Acknowledgement", "Release of Information"],
};

function Card({ children, className = "" }) {
  return <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("provider@rlth.demo");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const account = [demoProvider, demoClient].find((u) => u.email === email && u.password === password);
    if (!account) {
      setError("Use provider@rlth.demo / demo123 or client@rlth.demo / demo123 for this preview.");
      return;
    }
    setError("");
    onLogin(account);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="grid max-w-6xl w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-8 lg:p-10">
          <div className="flex gap-4 items-start">
            <div className="rounded-2xl bg-slate-900 p-4 text-white">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Proprietary EHR Preview</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{APP_NAME}</h1>
              <p className="mt-4 max-w-2xl text-slate-600">
                A stable mock preview of the practice EHR workspace: login, provider dashboard, client chart,
                intake, assessments, homework, document library, telehealth, messaging, scheduling, and
                audit-oriented workflow.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "Provider-only clinical notes",
              "Client homework and portal tools",
              "HIPAA-oriented document tracking",
              "Telehealth documentation assist",
              "Assessments: PHQ-9, GAD-7, SBIRT, DAST, ACES, WECARE",
              "Record request and audit-log workflow",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
                <CheckCircle className="mr-2 inline h-4 w-4 text-slate-700" />
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Preview credentials are already filled in.</p>

          <div className="mt-6 space-y-4">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
            />
            <button onClick={handleLogin} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-black">
              <LogIn className="mr-2 inline h-4 w-4" /> Sign in
            </button>
            {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Demo credentials</p>
              <p>Provider: provider@rlth.demo / demo123</p>
              <p>Client: client@rlth.demo / demo123</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Dashboard({ page, setPage, savedAssessments, setSavedAssessments, savedNotes, setSavedNotes }) {
  const statCards = [
    { Icon: Users, title: "Clients", value: "1", helper: "Private professional client list" },
    { Icon: FileText, title: "Notes", value: String(savedNotes.length), helper: "Saved provider notes" },
    { Icon: ClipboardList, title: "Assessments", value: String(savedAssessments.length), helper: "Saved screening results" },
    { Icon: BookOpen, title: "Homework", value: "1", helper: "Assigned client activity" },
  ];
  if (page === "dashboard") {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Provider Dashboard</h1>
        <p className="mt-2 text-slate-600">Professional EHR workspace for Revealing Leads to Healing Wellness Services LLC.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ Icon, title, value, helper }) => (
            <Card key={title} className="p-5">              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{title}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{helper}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3"><Icon className="h-5 w-5" /></div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-xl font-bold">Development Roadmap Alignment</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This prototype includes the major required modules: authentication, dashboard, client chart,
              intake, progress notes, assessments, homework, documents, telehealth, messaging, scheduling,
              and infrastructure planning.
            </p>
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-bold">HIPAA-Oriented Boundaries</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Client-facing items include homework, messages, shared journal options, and record requests.
              Provider-only areas include notes, treatment plans, assessments, and clinical charting unless released through a formal records process.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (page === "chart") return <ClientChart savedAssessments={savedAssessments} savedNotes={savedNotes} />;
  if (page === "intake") return <Intake />;
  if (page === "assessments") return <Assessments savedAssessments={savedAssessments} setSavedAssessments={setSavedAssessments} />;
  if (page === "notes") return <ProgressNotes savedAssessments={savedAssessments} savedNotes={savedNotes} setSavedNotes={setSavedNotes} />;
  if (page === "documents") return <Documents />;
  if (page === "telehealth") return <Telehealth setSavedNotes={setSavedNotes} />;

  return <PlaceholderPage page={page} />;
}

function ClientChart({ savedAssessments = [], savedNotes = [] }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Client Chart</h1>
      <p className="mt-2 text-slate-600">Centralized provider-only chart view for {clientChart.name}.</p>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{clientChart.name}</h2>
            <p className="text-sm text-slate-500">DOB: {clientChart.dob} • Phone: {clientChart.phone}</p>
          </div>
          <div className="rounded-2xl border p-4">
            <p className="font-semibold">Presenting Problem</p>
            <p className="mt-2 text-sm text-slate-600">{clientChart.presentingProblem}</p>
          </div>
          <div className="rounded-2xl border p-4">
            <p className="font-semibold">Clinical Objectives & Treatment Goals</p>
            <p className="mt-2 text-sm text-slate-600">{clientChart.goals}</p>
          </div>
          <div className="rounded-2xl border p-4">
            <p className="font-semibold">Diagnostic Formulation</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Primary Diagnosis</p><p className="font-semibold">{clientChart.primaryDiagnosis}</p></div>
              <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Secondary Diagnosis</p><p className="font-semibold">{clientChart.secondaryDiagnosis}</p></div>
              <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Tertiary Diagnosis</p><p className="font-semibold">{clientChart.tertiaryDiagnosis}</p></div>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">{clientChart.diagnoses.map((dx) => <Badge key={dx}>{dx}</Badge>)}</div>
          </div>
        </Card>
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Chart Snapshot</h2>
          <div className="space-y-3 text-sm">
            <p className="flex justify-between"><span>Homework</span><Badge>1</Badge></p>
            <p className="flex justify-between"><span>Documents</span><Badge>3</Badge></p>
            <p className="flex justify-between"><span>Saved Assessments</span><Badge>{savedAssessments.length}</Badge></p>
            <p className="flex justify-between"><span>Saved Notes</span><Badge>{savedNotes.length}</Badge></p>
            <p className="flex justify-between"><span>Telehealth Entries</span><Badge>0</Badge></p>
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-xl font-bold">Assessment History</h2>
        <p className="mt-1 text-sm text-slate-500">Screenings saved from the Assessments Engine appear here.</p>
        <div className="mt-4 space-y-3">
          {savedAssessments.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No assessments saved to chart yet.
            </div>
          )}
          {savedAssessments.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">Saved {item.savedAt}</p>
                </div>
                <Badge>{item.severity}</Badge>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Score</p>
                  <p className="font-bold text-slate-900">{item.score}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Risk Flag</p>
                  <p className="font-bold text-slate-900">{item.riskFlag || "None"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="font-bold text-slate-900">Saved to chart</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-xl font-bold">Progress Note History</h2>
        <p className="mt-1 text-sm text-slate-500">Saved SOAP/DAP notes, initial assessment notes, MSE, and clinical formulation appear here.</p>
        <div className="mt-4 space-y-3">
          {savedNotes.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No progress notes saved to chart yet.
            </div>
          )}
          {savedNotes.map((note) => (
            <div key={note.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{note.noteType}</p>
                  <p className="text-xs text-slate-500">Saved {note.savedAt}</p>
                </div>
                <Badge>{note.modality}</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{note.summary}</p>
              <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                MSE: {note.mseSummary || "Not entered"}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Intake() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Client Intake</h1>
      <p className="mt-2 text-slate-600">Revealing Leads to Healing Wellness Services LLC • EHR Proprietary System</p>
      {submitted && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Intake saved to secure chart.</div>}
      <Card className="mt-6 p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <input className="rounded-2xl border p-3" placeholder="First Name" />
          <input className="rounded-2xl border p-3" placeholder="Last Name" />
          <input className="rounded-2xl border p-3" type="date" />
          <input className="rounded-2xl border p-3" placeholder="Contact Phone" />
        </div>
        <textarea className="min-h-32 w-full rounded-2xl border p-3" placeholder="Presenting Problem / Reason for Therapy" />
        <textarea className="min-h-32 w-full rounded-2xl border p-3" placeholder="Clinical Objectives & Treatment Goals" />
        <input className="w-full rounded-2xl border p-3" placeholder="Diagnostic formulation / ICD-10 code" />
        <button onClick={() => setSubmitted(true)} className="w-full rounded-2xl bg-slate-900 px-4 py-4 font-semibold text-white">Submit Intake to Secure Chart</button>
      </Card>
    </div>
  );
}

function Assessments({ savedAssessments = [], setSavedAssessments = (_updater: unknown) => {} }) {
  const phqQuestions = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself",
    "Trouble concentrating",
    "Moving or speaking slowly or being fidgety/restless",
    "Thoughts that you would be better off dead or hurting yourself",
  ];

  const gadQuestions = [
    "Feeling nervous, anxious, or on edge",
    "Not being able to stop or control worrying",
    "Worrying too much about different things",
    "Trouble relaxing",
    "Being so restless that it is hard to sit still",
    "Becoming easily annoyed or irritable",
    "Feeling afraid as if something awful might happen",
  ];

  const [selectedAssessment, setSelectedAssessment] = useState("PHQ-9");
  const [phqAnswers, setPhqAnswers] = useState(Array(9).fill(0));
  const [gadAnswers, setGadAnswers] = useState(Array(7).fill(0));
  const [assessmentSaved, setAssessmentSaved] = useState(false);
  const [genericResponses, setGenericResponses] = useState({});

  const scoringLabels = ["Not at all", "Several days", "More than half the days", "Nearly every day"];

  const updatePhq = (index, value) => {
    const updated = [...phqAnswers];
    updated[index] = Number(value);
    setPhqAnswers(updated);
  };

  const updateGad = (index, value) => {
    const updated = [...gadAnswers];
    updated[index] = Number(value);
    setGadAnswers(updated);
  };

  const phqScore = phqAnswers.reduce((a, b) => a + b, 0);
  const gadScore = gadAnswers.reduce((a, b) => a + b, 0);

  const getPhqSeverity = () => {
    if (phqScore >= 20) return "Severe Depression";
    if (phqScore >= 15) return "Moderately Severe Depression";
    if (phqScore >= 10) return "Moderate Depression";
    if (phqScore >= 5) return "Mild Depression";
    return "Minimal Depression";
  };

  const getGadSeverity = () => {
    if (gadScore >= 15) return "Severe Anxiety";
    if (gadScore >= 10) return "Moderate Anxiety";
    if (gadScore >= 5) return "Mild Anxiety";
    return "Minimal Anxiety";
  };

  const riskFlag = phqAnswers[8] >= 2;

  const screeningModules = {
    PTSD: {
      title: "PTSD Screening",
      description: "Trauma symptom screening for intrusion symptoms, avoidance, negative mood/cognition changes, hyperarousal, and functional impact.",
      questions: [
        "Has the client experienced or witnessed a traumatic event that continues to affect functioning?",
        "Does the client report unwanted memories, nightmares, flashbacks, or trauma reminders?",
        "Does the client avoid thoughts, feelings, people, places, or situations connected to the trauma?",
        "Does the client report hypervigilance, exaggerated startle response, irritability, or sleep disturbance?",
        "Do symptoms interfere with work, relationships, self-care, or daily functioning?",
      ],
    },
    CRAFFT: {
      title: "CRAFFT-Style Substance Use Screening",
      description: "Brief substance-use risk screen for alcohol/drug-related safety, role impairment, and risk behavior.",
      questions: [
        "Has the client used alcohol, cannabis, or other substances to relax, fit in, or feel better?",
        "Has the client used substances while alone?",
        "Has the client forgotten things done while using substances?",
        "Have family, friends, or others expressed concern about substance use?",
        "Has substance use led to trouble, unsafe situations, missed obligations, or conflict?",
      ],
    },
    Alcohol: {
      title: "Alcohol Use Screening",
      description: "Alcohol frequency, quantity, binge pattern, impairment, readiness for change, and referral need.",
      questions: [
        "How often does the client drink alcohol?",
        "How often does the client drink more than intended?",
        "Has alcohol use affected mood, sleep, health, relationships, work, or safety?",
        "Has anyone expressed concern about the client's alcohol use?",
        "Is the client open to reducing use, monitoring use, or referral support?",
      ],
    },
    ADHD: {
      title: "ADHD Screening",
      description: "Attention, organization, impulsivity, restlessness, task completion, and functional impairment screen.",
      questions: [
        "Does the client report difficulty sustaining attention or completing tasks?",
        "Does the client report disorganization, forgetfulness, or frequent losing/misplacing items?",
        "Does the client report restlessness, impulsivity, interrupting, or difficulty waiting?",
        "Were attention or hyperactivity symptoms present earlier in life?",
        "Do symptoms impair school, work, home, relationships, or daily responsibilities?",
      ],
    },
    Bipolar: {
      title: "Bipolar/Mood Disorder Screening",
      description: "Mood elevation, decreased sleep need, impulsivity, racing thoughts, irritability, and impairment screen.",
      questions: [
        "Has the client had periods of unusually elevated, expansive, or irritable mood?",
        "During those periods, did the client need less sleep but still feel energized?",
        "Were there racing thoughts, increased talking, impulsive spending, risk-taking, or increased activity?",
        "Did mood changes cause impairment, conflict, hospitalization, or safety concerns?",
        "Is there a history of depression alternating with high-energy or irritable episodes?",
      ],
    },
    Pain: {
      title: "Pain Screening",
      description: "Pain severity, interference, duration, sleep impact, emotional impact, and care coordination needs.",
      questions: [
        "What is the client's current pain level or pain burden?",
        "Does pain interfere with sleep, mobility, work, relationships, or daily functioning?",
        "Does pain worsen mood, anxiety, irritability, or stress tolerance?",
        "Is the client connected with medical care for pain evaluation or management?",
        "Are there safety concerns related to pain medication use or coping behaviors?",
      ],
    },
    "Sleep/Insomnia": {
      title: "Sleep and Insomnia Screening",
      description: "Difficulty falling asleep, staying asleep, early waking, sleep quality, fatigue, and functional impact.",
      questions: [
        "Does the client have difficulty falling asleep?",
        "Does the client wake frequently or wake earlier than intended?",
        "Does the client feel unrested, fatigued, or impaired during the day?",
        "Do anxiety, trauma symptoms, pain, substance use, or environment affect sleep?",
        "How significantly does sleep disturbance affect daily functioning?",
      ],
    },
    Stress: {
      title: "Stress Screening",
      description: "Perceived stress, overwhelm, coping capacity, role strain, physical stress symptoms, and support needs.",
      questions: [
        "Does the client feel overwhelmed by current responsibilities or stressors?",
        "Does stress affect sleep, appetite, concentration, mood, or physical symptoms?",
        "Does the client feel able to cope with current demands?",
        "Are there major stressors involving work, housing, finances, family, health, or safety?",
        "Does the client need care coordination, advocacy, resources, or additional support?",
      ],
    },
  };

  const updateGenericResponse = (moduleName, questionIndex, value) => {
    setGenericResponses((prev) => ({
      ...prev,
      [moduleName]: {
        ...(prev[moduleName] || {}),
        [questionIndex]: Number(value),
      },
    }));
  };

  const getGenericScore = (moduleName) => {
    const values = Object.values(genericResponses[moduleName] || {});
    return values.reduce<number>((total, value) => total + Number(value || 0), 0);
  };

  const getGenericRiskLevel = (score) => {
    if (score >= 12) return "High Clinical Concern";
    if (score >= 7) return "Moderate Clinical Concern";
    if (score >= 3) return "Mild Clinical Concern";
    return "Low / No Current Concern";
  };

  const saveAssessment = () => {
    let item;

    if (selectedAssessment === "PHQ-9") {
      item = {
        id: `assessment-${Date.now()}`,
        name: "PHQ-9 Depression Assessment",
        score: phqScore,
        severity: getPhqSeverity(),
        riskFlag: riskFlag ? "Suicide/self-harm review recommended" : "None",
        savedAt: new Date().toLocaleString(),
      };
    } else if (selectedAssessment === "GAD-7") {
      item = {
        id: `assessment-${Date.now()}`,
        name: "GAD-7 Anxiety Assessment",
        score: gadScore,
        severity: getGadSeverity(),
        riskFlag: "None",
        savedAt: new Date().toLocaleString(),
      };
    } else {
      const score = getGenericScore(selectedAssessment);
      item = {
        id: `assessment-${Date.now()}`,
        name: selectedAssessment,
        score,
        severity: getGenericRiskLevel(score),
        riskFlag: score >= 12 ? "Provider review priority" : "None",
        savedAt: new Date().toLocaleString(),
      };
    }

    setSavedAssessments((prev) => [item, ...prev]);
    setAssessmentSaved(true);
    setTimeout(() => setAssessmentSaved(false), 4000);
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assessments Engine</h1>
          <p className="mt-2 text-slate-600">Interactive screening tools with scoring, severity interpretation, provider review workflow, and chart integration preview.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["PHQ-9", "GAD-7", "PTSD", "CRAFFT", "Alcohol", "ADHD", "Bipolar", "Pain", "Sleep/Insomnia", "Stress", "SBIRT", "DAST", "ACES", "WECARE", "Suicide Risk", "Violence Risk", "Safety Plan"].map((tool) => (
            <button
              key={tool}
              onClick={() => setSelectedAssessment(tool)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${selectedAssessment === tool ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {tool}
            </button>
          ))}
        </div>
      </div>

      {assessmentSaved && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Assessment saved to secure chart history.
        </div>
      )}

      {selectedAssessment === "PHQ-9" && (
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">PHQ-9 Depression Assessment</h2>
                <p className="mt-1 text-sm text-slate-500">Rate each symptom over the last two weeks.</p>
              </div>
              <Badge>Auto Scoring Enabled</Badge>
            </div>

            <div className="mt-6 space-y-5">
              {phqQuestions.map((question, index) => (
                <div key={question} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-800">{index + 1}. {question}</p>
                  <div className="mt-4 grid gap-2 md:grid-cols-4">
                    {scoringLabels.map((label, score) => (
                      <button
                        key={label}
                        onClick={() => updatePhq(index, score)}
                        className={`rounded-2xl border px-3 py-3 text-sm transition ${phqAnswers[index] === score ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-bold">PHQ-9 Results</h2>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Total Score</p>
                  <p className="mt-1 text-5xl font-bold text-slate-900">{phqScore}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-sm text-slate-500">Severity Interpretation</p>
                  <p className="mt-1 font-bold text-slate-900">{getPhqSeverity()}</p>
                </div>
                <div className={`rounded-2xl border p-4 ${riskFlag ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                  <p className="font-semibold">Risk Flag Detection</p>
                  <p className="mt-2 text-sm">
                    {riskFlag
                      ? "Suicide/self-harm review recommended based on item 9 response."
                      : "No automatic suicide/self-harm escalation triggered."}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Clinical Actions</h2>
              <button onClick={saveAssessment} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">Save Assessment to Chart</button>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Use the dark Save Assessment button above to send this screening into Client Chart → Assessment History.
              </div>
              <button className="w-full rounded-2xl border px-4 py-3 font-semibold text-slate-500">Copy to Progress Note — coming next</button>
              <button className="w-full rounded-2xl border px-4 py-3 font-semibold text-slate-500">Copy to Intake — coming next</button>
              <button className="w-full rounded-2xl border px-4 py-3 font-semibold text-slate-500">Generate Clinical Summary — coming next</button>
            </Card>
          </div>
        </div>
      )}

      {selectedAssessment === "GAD-7" && (
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">GAD-7 Anxiety Assessment</h2>
                <p className="mt-1 text-sm text-slate-500">Generalized anxiety symptom review.</p>
              </div>
              <Badge>Auto Scoring Enabled</Badge>
            </div>

            <div className="mt-6 space-y-5">
              {gadQuestions.map((question, index) => (
                <div key={question} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-800">{index + 1}. {question}</p>
                  <div className="mt-4 grid gap-2 md:grid-cols-4">
                    {scoringLabels.map((label, score) => (
                      <button
                        key={label}
                        onClick={() => updateGad(index, score)}
                        className={`rounded-2xl border px-3 py-3 text-sm transition ${gadAnswers[index] === score ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-bold">GAD-7 Results</h2>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Total Score</p>
                  <p className="mt-1 text-5xl font-bold text-slate-900">{gadScore}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-sm text-slate-500">Severity Interpretation</p>
                  <p className="mt-1 font-bold text-slate-900">{getGadSeverity()}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Clinical Actions</h2>
              <button className="w-full rounded-2xl border px-4 py-3 font-semibold hover:bg-slate-50">Copy to Progress Note</button>
              <button className="w-full rounded-2xl border px-4 py-3 font-semibold hover:bg-slate-50">Generate Anxiety Summary</button>
              <button onClick={saveAssessment} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">Save Assessment to Chart</button>
            </Card>
          </div>
        </div>
      )}

      {!['PHQ-9', 'GAD-7'].includes(selectedAssessment) && screeningModules[selectedAssessment] && (
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">{screeningModules[selectedAssessment].title}</h2>
                <p className="mt-1 text-sm text-slate-500">{screeningModules[selectedAssessment].description}</p>
              </div>
              <Badge>Structured Screening</Badge>
            </div>
            <div className="mt-6 space-y-5">
              {screeningModules[selectedAssessment].questions.map((question, index) => (
                <div key={question} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-800">{index + 1}. {question}</p>
                  <div className="mt-4 grid gap-2 md:grid-cols-4">
                    {["None / No", "Mild", "Moderate", "Severe / Yes"].map((label, score) => (
                      <button
                        key={label}
                        onClick={() => updateGenericResponse(selectedAssessment, index, score)}
                        className={`rounded-2xl border px-3 py-3 text-sm transition ${(genericResponses[selectedAssessment] || {})[index] === score ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-bold">{selectedAssessment} Results</h2>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Screening Score</p>
                  <p className="mt-1 text-5xl font-bold text-slate-900">{getGenericScore(selectedAssessment)}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-sm text-slate-500">Clinical Concern Level</p>
                  <p className="mt-1 font-bold text-slate-900">{getGenericRiskLevel(getGenericScore(selectedAssessment))}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Provider review required before diagnostic conclusions or clinical decisions are finalized.
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Clinical Actions</h2>
              <button onClick={saveAssessment} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">Save Assessment to Chart</button>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Use the dark Save Assessment button above to send this screening into Client Chart → Assessment History.
              </div>
              <button className="w-full rounded-2xl border px-4 py-3 font-semibold text-slate-500">Copy to Progress Note — coming next</button>
              <button className="w-full rounded-2xl border px-4 py-3 font-semibold text-slate-500">Copy to Intake — coming next</button>
              <button className="w-full rounded-2xl border px-4 py-3 font-semibold text-slate-500">Generate Clinical Summary — coming next</button>
            </Card>
          </div>
        </div>
      )}

      {!['PHQ-9', 'GAD-7'].includes(selectedAssessment) && !screeningModules[selectedAssessment] && (
        <Card className="mt-6 p-8">
          <h2 className="text-2xl font-bold">{selectedAssessment}</h2>
          <p className="mt-4 text-slate-600 leading-7">
            This assessment module placeholder is prepared for expansion with structured questions,
            scoring logic, provider review workflow, chart integration, audit logging, and AI-assisted
            clinical documentation support.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border p-4">
              <p className="font-semibold">Structured Questions</p>
              <p className="mt-2 text-sm text-slate-500">Clinical prompts and scoring workflow.</p>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="font-semibold">Risk Detection</p>
              <p className="mt-2 text-sm text-slate-500">Escalation flags and provider review alerts.</p>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="font-semibold">Chart Integration</p>
              <p className="mt-2 text-sm text-slate-500">Copy to intake, SOAP notes, and treatment planning.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ProgressNotes({ savedAssessments = [], savedNotes = [], setSavedNotes = () => {} }) {
  const [noteType, setNoteType] = useState("SOAP Progress Note");
  const [modality, setModality] = useState("Individual Therapy");
  const modalityCptMap = {
    "Individual Therapy": [
      "90832 Psychotherapy, 30 minutes",
      "90834 Psychotherapy, 45 minutes",
      "90837 Psychotherapy, 60 minutes",
    ],
    "Telehealth Therapy": [
      "90832-95 Telehealth Psychotherapy, 30 minutes",
      "90834-95 Telehealth Psychotherapy, 45 minutes",
      "90837-95 Telehealth Psychotherapy, 60 minutes",
    ],
    "Family Therapy": [
      "90846 Family psychotherapy without patient",
      "90847 Family psychotherapy with patient",
    ],
    "Intake / Initial Assessment": [
      "90791 Psychiatric Diagnostic Evaluation",
      "90792 Psychiatric Diagnostic Evaluation with medical services",
    ],
    "Crisis / Risk Assessment": [
      "90839 Psychotherapy for crisis, first 60 minutes",
      "90840 Psychotherapy for crisis, each additional 30 minutes",
    ],
  };
  const [savedNotice, setSavedNotice] = useState(false);
  const [diagnosisSearch, setDiagnosisSearch] = useState({ primary: "", secondary: "", tertiary: "" });
  const latestAssessment = savedAssessments[0];
  const [note, setNote] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    data: "",
    intervention: "",
    response: "",
    biopsychosocial: "",
    clinicalFormulation: "",
    medicalNecessity: "",
    sessionDate: "",
    startTime: "",
    endTime: "",
    durationMinutes: "",
    cptCode: "90834 Psychotherapy, 45 minutes",
    interpreterRequired: "No",
    interpreterLanguage: "",
    interpreterModifier: "HM",
    telehealthModifier: "95",
    interpreterCpt: "T1013 Sign language/oral interpretive services",
    placeOfService: "11 Office",
    billingModifier: "",
    diagnosisJustification: "",
    primaryDiagnosis: "F41.1 Generalized Anxiety Disorder",
    secondaryDiagnosis: "",
    tertiaryDiagnosis: "",
    demographics: "",
    familyHistory: "",
    socialHistory: "",
    medicalHistory: "",
    traumaHistory: "",
    substanceUseHistory: "",
    educationEmployment: "",
    housingFinancial: "",
    strengthsSupports: "",
    culturalFactors: "",
    assessmentIntegration: "",
    appearance: "",
    behavior: "",
    speech: "",
    mood: "",
    affect: "",
    thoughtProcess: "",
    thoughtContent: "",
    orientation: "",
    memory: "",
    insight: "",
    judgment: "",
    risk: "",
  });

  const update = (field, value) => setNote((prev) => ({ ...prev, [field]: value }));

  const filteredDiagnosisOptions = (searchTerm) => {
    if (!searchTerm) return ICD10_LIBRARY;
    return ICD10_LIBRARY.filter((dx) => dx.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  const selectDiagnosis = (field, value) => {
    update(field, value);
    if (field === "primaryDiagnosis") setDiagnosisSearch((prev) => ({ ...prev, primary: value }));
    if (field === "secondaryDiagnosis") setDiagnosisSearch((prev) => ({ ...prev, secondary: value }));
    if (field === "tertiaryDiagnosis") setDiagnosisSearch((prev) => ({ ...prev, tertiary: value }));
  };

  const importLatestAssessment = () => {
    if (!latestAssessment) return;
    const assessmentText = `${latestAssessment.name}: score ${latestAssessment.score}, severity/concern level ${latestAssessment.severity}, risk flag ${latestAssessment.riskFlag || "None"}.`;
    setNote((prev) => ({
      ...prev,
      assessment: prev.assessment ? `${prev.assessment}\n\nImported assessment: ${assessmentText}` : `Imported assessment: ${assessmentText}`,
      data: prev.data ? `${prev.data}\n\nAssessment reviewed: ${assessmentText}` : `Assessment reviewed: ${assessmentText}`,
      risk: latestAssessment.riskFlag && latestAssessment.riskFlag !== "None" ? latestAssessment.riskFlag : prev.risk,
    }));
  };

  const generateClinicalFormulation = () => {
    setNote((prev) => ({
      ...prev,
      clinicalFormulation:
        "Client presents with symptoms and psychosocial stressors that appear to affect emotional regulation, daily functioning, coping capacity, and treatment engagement. Clinical formulation should integrate presenting concerns, relevant history, diagnostic impressions, risk/protective factors, cultural/contextual factors, and response to intervention. Provider will continue assessment, monitor symptoms, and refine treatment recommendations based on clinical presentation and ongoing progress.",
      medicalNecessity:
        "Services remain medically necessary to assess, treat, and monitor behavioral health symptoms causing functional impairment and requiring structured clinical intervention, risk review, treatment planning, and continuity of care.",
    }));
  };

  const saveNote = () => {
    const mseSummary = [
      note.appearance && `Appearance: ${note.appearance}`,
      note.behavior && `Behavior: ${note.behavior}`,
      note.speech && `Speech: ${note.speech}`,
      note.mood && `Mood: ${note.mood}`,
      note.affect && `Affect: ${note.affect}`,
      note.thoughtProcess && `Thought Process: ${note.thoughtProcess}`,
      note.thoughtContent && `Thought Content: ${note.thoughtContent}`,
      note.orientation && `Orientation: ${note.orientation}`,
      note.memory && `Memory: ${note.memory}`,
      note.insight && `Insight: ${note.insight}`,
      note.judgment && `Judgment: ${note.judgment}`,
      note.risk && `Risk: ${note.risk}`,
    ].filter(Boolean).join("; ");

    const summary = noteType === "DAP Progress Note"
      ? `D: ${note.data || "Not entered"}\n\nA: ${note.assessment || "Not entered"}\n\nP: ${note.plan || "Not entered"}`
      : `S: ${note.subjective || "Not entered"}\n\nO: ${note.objective || "Not entered"}\n\nA: ${note.assessment || "Not entered"}\n\nP: ${note.plan || "Not entered"}`;

    setSavedNotes((prev) => [{
      id: `note-${Date.now()}`,
      noteType,
      modality,
      sessionDate: note.sessionDate,
      durationMinutes: note.durationMinutes,
      cptCode: note.cptCode,
      primaryDiagnosis: note.primaryDiagnosis,
      secondaryDiagnosis: note.secondaryDiagnosis,
      tertiaryDiagnosis: note.tertiaryDiagnosis,
      placeOfService: note.placeOfService,
      billingModifier: note.billingModifier,
      interpreterRequired: note.interpreterRequired,
      interpreterLanguage: note.interpreterLanguage,
      savedAt: new Date().toLocaleString(),
      summary,
      mseSummary,
      clinicalFormulation: note.clinicalFormulation,
      medicalNecessity: note.medicalNecessity,
    }, ...prev]);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 4000);
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Progress Notes Engine</h1>
          <p className="mt-2 text-slate-600">SOAP/DAP notes with MSE, medical necessity, clinical formulation, biopsychosocial initial-session content, and assessment import.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["SOAP Progress Note", "DAP Progress Note", "Initial Assessment / Biopsychosocial"].map((type) => (
            <button key={type} onClick={() => setNoteType(type)} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${noteType === type ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{type}</button>
          ))}
        </div>
      </div>

      {savedNotice && <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Progress note saved to Client Chart.</div>}

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <select className="rounded-2xl border p-3" value={modality} onChange={(e) => setModality(e.target.value)}>
              <option>Individual Therapy</option>
              <option>Family Therapy</option>
              <option>Telehealth Therapy</option>
              <option>Intake / Initial Assessment</option>
              <option>Crisis / Risk Assessment</option>
            </select>
            <select className="rounded-2xl border p-3" value={note.cptCode} onChange={(e) => update("cptCode", e.target.value)}>
              {(modalityCptMap[modality] || []).map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
            <input className="rounded-2xl border p-3" type="date" value={note.sessionDate} onChange={(e) => update("sessionDate", e.target.value)} />
            <input className="rounded-2xl border p-3" value={note.durationMinutes} onChange={(e) => update("durationMinutes", e.target.value)} placeholder="Duration minutes" />
            <input className="rounded-2xl border p-3" type="time" value={note.startTime} onChange={(e) => update("startTime", e.target.value)} />
            <input className="rounded-2xl border p-3" type="time" value={note.endTime} onChange={(e) => update("endTime", e.target.value)} />
            <button onClick={importLatestAssessment} className="rounded-2xl border px-4 py-3 font-semibold hover:bg-slate-50">Import Latest Assessment</button>
          </div>

          <div className="grid gap-4 md:grid-cols-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <select className="rounded-2xl border p-3" value={note.placeOfService} onChange={(e) => update("placeOfService", e.target.value)}>
              <option>11 Office</option>
              <option>02 Telehealth Provided Other Than Home</option>
              <option>10 Telehealth Provided In Patient Home</option>
            </select>
            <select className="rounded-2xl border p-3" value={note.interpreterRequired} onChange={(e) => update("interpreterRequired", e.target.value)}>
              <option>No</option>
              <option>Yes</option>
            </select>
            <input className="rounded-2xl border p-3" value={note.billingModifier} onChange={(e) => update("billingModifier", e.target.value)} placeholder="Billing Modifier (95, GT, HO, etc.)" />
            <input className="rounded-2xl border p-3" value={note.interpreterLanguage} onChange={(e) => update("interpreterLanguage", e.target.value)} placeholder="Interpreter Language" />
            <input className="rounded-2xl border p-3" value={note.interpreterModifier} onChange={(e) => update("interpreterModifier", e.target.value)} placeholder="Interpreter Billing/Service Modifier" />
            <input className="rounded-2xl border p-3" value={note.interpreterCpt} onChange={(e) => update("interpreterCpt", e.target.value)} placeholder="Interpreter CPT/HCPCS Code" />
            <input className="rounded-2xl border p-3" value={note.telehealthModifier} onChange={(e) => update("telehealthModifier", e.target.value)} placeholder="Telehealth Modifier (95/GT)" />
            <div className="space-y-2">
              <input className="rounded-2xl border p-3 w-full" value={diagnosisSearch.primary} onChange={(e) => setDiagnosisSearch((prev) => ({ ...prev, primary: e.target.value }))} placeholder="Search Primary ICD-10 Diagnosis" />
              <select className="rounded-2xl border p-3 w-full" value={note.primaryDiagnosis} onChange={(e) => selectDiagnosis("primaryDiagnosis", e.target.value)}>
                {filteredDiagnosisOptions(diagnosisSearch.primary).map((dx) => (
                  <option key={dx}>{dx}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <input className="rounded-2xl border p-3 w-full" value={diagnosisSearch.secondary} onChange={(e) => setDiagnosisSearch((prev) => ({ ...prev, secondary: e.target.value }))} placeholder="Search Secondary ICD-10 Diagnosis" />
              <select className="rounded-2xl border p-3 w-full" value={note.secondaryDiagnosis} onChange={(e) => selectDiagnosis("secondaryDiagnosis", e.target.value)}>
                <option value="">Select secondary diagnosis</option>
                {filteredDiagnosisOptions(diagnosisSearch.secondary).map((dx) => (
                  <option key={dx}>{dx}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <input className="rounded-2xl border p-3 w-full" value={diagnosisSearch.tertiary} onChange={(e) => setDiagnosisSearch((prev) => ({ ...prev, tertiary: e.target.value }))} placeholder="Search Tertiary ICD-10 Diagnosis" />
              <select className="rounded-2xl border p-3 w-full" value={note.tertiaryDiagnosis} onChange={(e) => selectDiagnosis("tertiaryDiagnosis", e.target.value)}>
                <option value="">Select tertiary diagnosis</option>
                {filteredDiagnosisOptions(diagnosisSearch.tertiary).map((dx) => (
                  <option key={dx}>{dx}</option>
                ))}
              </select>
            </div>
          </div>

          {noteType === "Initial Assessment / Biopsychosocial" && (
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-lg font-bold">Initial Assessment / Biopsychosocial</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.demographics} onChange={(e) => update("demographics", e.target.value)} placeholder="Demographics: age, gender identity, pronouns, race/ethnicity, language, relationship status, household, referral source" />
                <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.familyHistory} onChange={(e) => update("familyHistory", e.target.value)} placeholder="Family history: family composition, relationships, mental health/substance history, supports/conflict" />
                <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.socialHistory} onChange={(e) => update("socialHistory", e.target.value)} placeholder="Social history: relationships, community, legal history, social supports, activities, isolation" />
                <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.medicalHistory} onChange={(e) => update("medicalHistory", e.target.value)} placeholder="Medical history: health conditions, medications, pain, sleep, providers, relevant medical concerns" />
                <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.traumaHistory} onChange={(e) => update("traumaHistory", e.target.value)} placeholder="Trauma history: trauma exposure, PTSD symptoms, safety concerns, triggers, protective factors" />
                <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.substanceUseHistory} onChange={(e) => update("substanceUseHistory", e.target.value)} placeholder="Substance use history: alcohol/drug use, frequency, impact, SBIRT/DAST findings, treatment/referral needs" />
                <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.educationEmployment} onChange={(e) => update("educationEmployment", e.target.value)} placeholder="Education/employment: school/work history, current role, functioning, accommodations, HR/leave needs" />
                <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.housingFinancial} onChange={(e) => update("housingFinancial", e.target.value)} placeholder="Housing/financial/social needs: housing, food, utilities, transportation, WECARE needs" />
                <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.strengthsSupports} onChange={(e) => update("strengthsSupports", e.target.value)} placeholder="Strengths/supports: coping skills, protective factors, values, motivation, natural supports" />
                <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.culturalFactors} onChange={(e) => update("culturalFactors", e.target.value)} placeholder="Cultural/contextual factors: identity, spirituality, language access, immigration/contextual stressors if relevant" />
              </div>
              <textarea className="min-h-28 w-full rounded-2xl border p-3" value={note.assessmentIntegration} onChange={(e) => update("assessmentIntegration", e.target.value)} placeholder="Assessment integration: PHQ-9, GAD-7, suicide risk, PTSD, SBIRT/DAST, ACES, WECARE, violence risk, safety plan findings" />
              <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.diagnosisJustification} onChange={(e) => update("diagnosisJustification", e.target.value)} placeholder="Diagnostic justification / medical necessity support for ICD-10 diagnoses and CPT billing" />
              <textarea className="min-h-32 w-full rounded-2xl border p-3" value={note.biopsychosocial} onChange={(e) => update("biopsychosocial", e.target.value)} placeholder="Overall biopsychosocial summary and presenting problem synthesis" />
              <textarea className="min-h-32 w-full rounded-2xl border p-3" value={note.clinicalFormulation} onChange={(e) => update("clinicalFormulation", e.target.value)} placeholder="Clinical formulation: diagnostic impression, symptom patterns, contributing factors, risk/protective factors, level of care rationale..." />
            </div>
          )}

          {noteType === "DAP Progress Note" ? (
            <div className="space-y-3">
              <textarea className="min-h-28 w-full rounded-2xl border p-3" value={note.data} onChange={(e) => update("data", e.target.value)} placeholder="D - Data: client report, presentation, session content, assessment data reviewed" />
              <textarea className="min-h-28 w-full rounded-2xl border p-3" value={note.assessment} onChange={(e) => update("assessment", e.target.value)} placeholder="A - Assessment: clinical interpretation, response to intervention, progress, risk" />
              <textarea className="min-h-28 w-full rounded-2xl border p-3" value={note.plan} onChange={(e) => update("plan", e.target.value)} placeholder="P - Plan: next steps, homework, referrals, follow-up, safety plan" />
            </div>
          ) : (
            <div className="space-y-3">
              <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.subjective} onChange={(e) => update("subjective", e.target.value)} placeholder="S - Subjective: client report, symptoms, concerns, stressors, progress" />
              <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.objective} onChange={(e) => update("objective", e.target.value)} placeholder="O - Objective: observable presentation, participation, interventions used" />
              <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.assessment} onChange={(e) => update("assessment", e.target.value)} placeholder="A - Assessment: clinical impression, progress, assessment results, risk/protective factors" />
              <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.plan} onChange={(e) => update("plan", e.target.value)} placeholder="P - Plan: treatment plan, homework, referrals, next session focus, safety steps" />
            </div>
          )}

          <div className="space-y-3 rounded-3xl border border-slate-200 p-4">
            <h2 className="text-lg font-bold">Medical Necessity / MSC</h2>
            <textarea className="min-h-24 w-full rounded-2xl border p-3" value={note.medicalNecessity} onChange={(e) => update("medicalNecessity", e.target.value)} placeholder="Medical necessity / MSC: symptoms, impairment, need for skilled intervention, risk monitoring, treatment rationale" />
            <button onClick={generateClinicalFormulation} className="rounded-2xl border px-4 py-3 font-semibold hover:bg-slate-50">Generate clinical formulation + MSC starter</button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-bold">Mental Status Exam</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["appearance", "Appearance / hygiene"],
                ["behavior", "Behavior / psychomotor"],
                ["speech", "Speech"],
                ["mood", "Mood"],
                ["affect", "Affect"],
                ["thoughtProcess", "Thought process"],
                ["thoughtContent", "Thought content"],
                ["orientation", "Orientation"],
                ["memory", "Memory / concentration"],
                ["insight", "Insight"],
                ["judgment", "Judgment"],
                ["risk", "Risk / safety"],
              ].map(([field, label]) => (
                <input key={field} className="rounded-2xl border p-3" value={note[field]} onChange={(e) => update(field, e.target.value)} placeholder={label} />
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-bold">Saved Assessments Available</h2>
            {latestAssessment ? (
              <div className="rounded-2xl border p-4 text-sm">
                <p className="font-semibold">{latestAssessment.name}</p>
                <p className="mt-1 text-slate-600">Score: {latestAssessment.score} • {latestAssessment.severity}</p>
                <p className="mt-1 text-slate-600">Risk: {latestAssessment.riskFlag || "None"}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No saved assessment yet. Save one from the Assessments page first.</p>
            )}
            <button onClick={saveNote} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">Save Note to Chart</button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Documents() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Document Library</h1>
      <p className="mt-2 text-slate-600">Templates, signatures, uploads, advocacy letters, access logging, and view tracking.</p>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6 space-y-3">
          <h2 className="text-xl font-bold">Chart Documents</h2>
          {clientChart.documents.map((doc) => (
            <div key={doc} className="rounded-2xl border p-4 flex items-center justify-between">
              <span className="font-medium">{doc}</span><Badge>Pending signature</Badge>
            </div>
          ))}
        </Card>
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Document Actions</h2>
          <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">Apply Electronic Signature</button>
          <button className="w-full rounded-2xl border px-4 py-3 font-semibold">Upload Document</button>
          <button className="w-full rounded-2xl border px-4 py-3 font-semibold">Create Advocacy Letter</button>
        </Card>
      </div>
    </div>
  );
}

function Telehealth({ setSavedNotes = () => {} }) {
  const [session, setSession] = useState({
    clientName: "Demo Client",
    sessionDate: "",
    sessionType: "Telehealth Video",
    callerId: "RLTH Wellness Services",
    callbackNumber: "",
    videoRoom: "Secure Telehealth Room",
    interpreterService: "Not needed",
    interpreterLanguage: "",
    interpreterVendor: "LanguageLine / Approved Interpreter Service",
    recordingConsent: "No",
    telehealthConsent: "Client provided consent for telehealth services, privacy limitations were reviewed, and client agreed to proceed.",
    bookingSource: "Website booking button",
    bookingStatus: "Pending EMR connection",
    spruceEnabled: "Yes",
    spruceChannel: "Spruce Secure Messaging",
    spruceConversationId: "",
  });
  const [transcript, setTranscript] = useState("");
  const [generatedNote, setGeneratedNote] = useState("");
  const [savedTelehealthNotice, setSavedTelehealthNotice] = useState(false);

  const updateSession = (field, value) => setSession((prev) => ({ ...prev, [field]: value }));

  const generateNoteFromTranscript = () => {
    const cleanTranscript = transcript.trim() || "No transcript entered.";
    const riskText = /suicide|kill myself|want to die|hurt myself|hurt someone|violence|weapon|relapse|substance|alcohol|drug/i.test(cleanTranscript)
      ? "Risk-relevant language was detected in the transcript and requires provider review before finalizing the note."
      : "No automatic high-risk language was detected in the transcript preview.";

    const noteText = `SOAP Telehealth Progress Note\n\nClient: ${session.clientName}\nSession Type: ${session.sessionType}\nDate: ${session.sessionDate || "Not entered"}\nInterpreter: ${session.interpreterService}${session.interpreterLanguage ? ` — ${session.interpreterLanguage}` : ""}\nCaller ID / Dialer Display: ${session.callerId || "Not entered"}\nSpruce Connected: ${session.spruceEnabled}\nSpruce Channel: ${session.spruceChannel}\nSpruce Conversation ID: ${session.spruceConversationId || "Not entered"}\n\nS: Client participated in a telehealth session and discussed symptoms, stressors, treatment needs, and functional impact. Transcript-derived content included: ${cleanTranscript}\n\nO: Client was present through ${session.sessionType}. Provider documented telehealth consent, privacy considerations, interpreter/language needs if applicable, and technical/session access details.\n\nA: Clinical material reviewed during the session suggests ongoing behavioral health symptoms requiring continued therapeutic support, monitoring, and treatment planning. ${riskText}\n\nP: Continue treatment as clinically indicated. Provider to review transcript-derived draft for accuracy, update risk assessment as needed, document interventions used, assign homework if appropriate, and follow up during the next scheduled session.`;

    setGeneratedNote(noteText);
  };

  const saveGeneratedNoteToChart = () => {
    if (!generatedNote.trim()) return;
    setSavedNotes((prev) => [{
      id: `telehealth-note-${Date.now()}`,
      noteType: "AI Telehealth SOAP Draft",
      modality: session.sessionType,
      sessionDate: session.sessionDate,
      durationMinutes: "",
      cptCode: session.sessionType.includes("Video") ? "90834-95 Telehealth Psychotherapy, 45 minutes" : "90834 Psychotherapy, 45 minutes",
      primaryDiagnosis: clientChart.primaryDiagnosis,
      secondaryDiagnosis: clientChart.secondaryDiagnosis,
      tertiaryDiagnosis: clientChart.tertiaryDiagnosis,
      savedAt: new Date().toLocaleString(),
      summary: generatedNote,
      mseSummary: "Generated from telehealth transcript; provider review required.",
    }, ...prev]);
    setSavedTelehealthNotice(true);
    setTimeout(() => setSavedTelehealthNotice(false), 4000);
  };

  const saveTelehealthEntry = () => {
    setSavedTelehealthNotice(true);
    setTimeout(() => setSavedTelehealthNotice(false), 4000);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Telehealth</h1>
      <p className="mt-2 text-slate-600">Audio/video session workflow with interpreter service, dialer display, website booking handoff, recording consent, transcript capture, and AI clinical note conversion.</p>

      {savedTelehealthNotice && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Telehealth entry saved / copied to chart.
        </div>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Telehealth Session Setup</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="rounded-2xl border p-3" value={session.clientName} onChange={(e) => updateSession("clientName", e.target.value)} placeholder="Client name" />
            <input className="rounded-2xl border p-3" type="date" value={session.sessionDate} onChange={(e) => updateSession("sessionDate", e.target.value)} />
            <select className="rounded-2xl border p-3" value={session.sessionType} onChange={(e) => updateSession("sessionType", e.target.value)}>
              <option>Telehealth Video</option>
              <option>Telehealth Audio Only</option>
              <option>Phone Check-In</option>
              <option>Interpreter-Assisted Telehealth</option>
            </select>
            <input className="rounded-2xl border p-3" value={session.videoRoom} onChange={(e) => updateSession("videoRoom", e.target.value)} placeholder="Video platform / secure room" />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h3 className="font-bold">Calling / Dialer Display</h3>
            <p className="text-xs text-slate-500">Prototype field for future phone vendor integration. Production calling usually requires Twilio, Dialpad, RingCentral, Zoom Phone, or another HIPAA-capable vendor with BAA support.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-2xl border p-3" value={session.callerId} onChange={(e) => updateSession("callerId", e.target.value)} placeholder="Generic caller ID display" />
              <input className="rounded-2xl border p-3" value={session.callbackNumber} onChange={(e) => updateSession("callbackNumber", e.target.value)} placeholder="Callback / dialer number" />
            </div>
            <button className="rounded-2xl border px-4 py-3 font-semibold hover:bg-white">Place Call — vendor connection required</button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h3 className="font-bold">Interpreter Service</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <select className="rounded-2xl border p-3" value={session.interpreterService} onChange={(e) => updateSession("interpreterService", e.target.value)}>
                <option>Not needed</option>
                <option>Professional interpreter used</option>
                <option>ASL interpreter used</option>
                <option>Bilingual provider</option>
                <option>Family/support person interpreted</option>
              </select>
              <select className="rounded-2xl border p-3" value={session.interpreterLanguage} onChange={(e) => updateSession("interpreterLanguage", e.target.value)}>
                <option value="">Select language</option>
                <option>Spanish</option>
                <option>Haitian Creole</option>
                <option>French</option>
                <option>Arabic</option>
                <option>Mandarin</option>
                <option>Cantonese</option>
                <option>Russian</option>
                <option>ASL</option>
                <option>Other</option>
              </select>
              <input className="rounded-2xl border p-3 md:col-span-2" value={session.interpreterVendor} onChange={(e) => updateSession("interpreterVendor", e.target.value)} placeholder="Interpreter vendor/service" />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h3 className="font-bold">Consent / Recording / Booking Handoff</h3>
            <select className="rounded-2xl border p-3 w-full" value={session.recordingConsent} onChange={(e) => updateSession("recordingConsent", e.target.value)}>
              <option>No</option>
              <option>Yes — explicit consent documented</option>
            </select>
            <textarea className="min-h-24 w-full rounded-2xl border p-3" value={session.telehealthConsent} onChange={(e) => updateSession("telehealthConsent", e.target.value)} placeholder="Telehealth consent verbiage" />
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-2xl border p-3" value={session.bookingSource} onChange={(e) => updateSession("bookingSource", e.target.value)} placeholder="Booking source" />
              <select className="rounded-2xl border p-3" value={session.bookingStatus} onChange={(e) => updateSession("bookingStatus", e.target.value)}>
                <option>Pending EMR connection</option>
                <option>Website booking received</option>
                <option>Appointment created in EMR</option>
                <option>Client portal invite sent</option>
              </select>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h3 className="font-bold">Spruce Integration</h3>
            <p className="text-xs text-slate-500">Track the Spruce thread used for this telehealth encounter and tie it to documentation.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <select className="rounded-2xl border p-3" value={session.spruceEnabled} onChange={(e) => updateSession("spruceEnabled", e.target.value)}>
                <option>Yes</option>
                <option>No</option>
              </select>
              <input className="rounded-2xl border p-3" value={session.spruceChannel} onChange={(e) => updateSession("spruceChannel", e.target.value)} placeholder="Spruce channel" />
              <input className="rounded-2xl border p-3 md:col-span-2" value={session.spruceConversationId} onChange={(e) => updateSession("spruceConversationId", e.target.value)} placeholder="Spruce conversation/thread ID" />
            </div>
          </div>

          <button onClick={saveTelehealthEntry} className="rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">Save Telehealth Entry</button>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Audio Transcript → Clinical Documentation</h2>
          <p className="text-sm text-slate-500">Production audio recording/transcription requires a HIPAA-capable transcription vendor and explicit consent. This preview uses pasted transcript text.</p>
          <textarea className="min-h-44 w-full rounded-2xl border p-3" value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Paste audio transcription or session summary here after the session..." />
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={generateNoteFromTranscript} className="rounded-2xl border px-4 py-3 font-semibold"><Sparkles className="mr-2 inline h-4 w-4" />Generate SOAP Draft</button>
            <button onClick={saveGeneratedNoteToChart} className="rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">Copy Draft to Chart</button>
            <button className="rounded-2xl border px-4 py-3 font-semibold">Generate Intake Summary</button>
            <button className="rounded-2xl border px-4 py-3 font-semibold">Generate Insurance Summary</button>
          </div>

          {generatedNote && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-bold">Generated Clinical Note Draft</h3>
              <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{generatedNote}</pre>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function PlaceholderPage({ page }) {
  const label = modules.find((m) => m.key === page)?.label || "Module";
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">{label}</h1>
      <p className="mt-2 text-slate-600">Stable preview placeholder. This module is part of the full EHR build and can be expanded after preview is working.</p>
      <Card className="mt-6 p-6">
        <p className="text-sm leading-6 text-slate-600">
          This page is intentionally simplified so the preview can load reliably. The full code backup still contains the larger module logic.
        </p>
      </Card>
    </div>
  );
}

function AppMain({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [savedAssessments, setSavedAssessments] = useState([]);
  const [savedNotes, setSavedNotes] = useState([]);

  useEffect(() => {
    try {
      const storedAssessments = localStorage.getItem(STORAGE_KEYS.assessments);
      const storedNotes = localStorage.getItem(STORAGE_KEYS.notes);
      if (storedAssessments) {
        const parsed = JSON.parse(storedAssessments);
        if (Array.isArray(parsed)) setSavedAssessments(parsed);
      }
      if (storedNotes) {
        const parsed = JSON.parse(storedNotes);
        if (Array.isArray(parsed)) setSavedNotes(parsed);
      }
    } catch {
      // Ignore corrupted local data and keep app usable.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.assessments, JSON.stringify(savedAssessments));
    } catch {
      // Ignore storage write failures (private mode/quota).
    }
  }, [savedAssessments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(savedNotes));
    } catch {
      // Ignore storage write failures (private mode/quota).
    }
  }, [savedNotes]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-white p-5">
          <div className="flex gap-3 items-start">
            <div className="rounded-2xl bg-slate-900 p-3 text-white"><Shield className="h-5 w-5" /></div>
            <div>
              <h2 className="font-bold leading-tight">Revealing Leads to Healing</h2>
              <p className="text-xs text-slate-500">EHR Proprietary System</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="mt-1 font-semibold">{user.name}</p>
            <div className="mt-2"><Badge>{user.role}</Badge></div>
          </div>
          <nav className="mt-6 space-y-1">
            {modules.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPage(key)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition ${page === key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
          <button onClick={onLogout} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold hover:bg-slate-50">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </aside>
        <main className="p-5 lg:p-8">
          <Dashboard page={page} setPage={setPage} savedAssessments={savedAssessments} setSavedAssessments={setSavedAssessments} savedNotes={savedNotes} setSavedNotes={setSavedNotes} />
        </main>
      </div>
    </div>
  );
}

export default function RevealingLeadsToHealingEHRMVP() {
  const [user, setUser] = useState(null);
  return user ? <AppMain user={user} onLogout={() => setUser(null)} /> : <LoginPage onLogin={setUser} />;
}

