// @ts-nocheck
"use client";

import React, { Component, createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Shield,
  User,
  Users,
  BookOpen,
  PenSquare,
  MessageSquare,
  Calendar,
  FileText,
  ClipboardList,
  Sparkles,
  Brain,
  LogOut,
  LogIn,
  UserPlus,
  Search,
  Save,
  Plus,
  Trash2,
  Edit3,
  HeartHandshake,
  Lock,
  Stethoscope,
  Phone,
  Video,
  Mic,
  Copy,
  Download,
  Languages,
  GraduationCap,
} from "lucide-react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const motion = {
  div: ({ initial, animate, transition, children, ...props }) => <div {...props}>{children}</div>,
};

const EHR_DEMO_ENABLED = process.env.NEXT_PUBLIC_RLTH_EHR_DEMO_ENABLED === "true";
const EHR_PRODUCTION_LOCK_REASON =
  "Live clinical EHR use is locked until secure authentication, BAA-supported backend storage, database access rules, immutable audit logging, backups, and operational HIPAA controls are configured.";

function Card({ children, className = "", ...props }) {
  return <div className={cn("rounded-2xl border border-stone-200 bg-white shadow-sm", className)} {...props}>{children}</div>;
}

function CardHeader({ children, className = "", ...props }) {
  return <div className={cn("space-y-1.5 p-5", className)} {...props}>{children}</div>;
}

function CardContent({ children, className = "", ...props }) {
  return <div className={cn("p-5 pt-0", className)} {...props}>{children}</div>;
}

function CardTitle({ children, className = "", ...props }) {
  return <h3 className={cn("text-lg font-semibold tracking-normal text-stone-950", className)} {...props}>{children}</h3>;
}

function CardDescription({ children, className = "", ...props }) {
  return <p className={cn("text-sm text-stone-600", className)} {...props}>{children}</p>;
}

function Button({ children, className = "", variant = "default", size = "default", type = "button", ...props }) {
  const variantClass = variant === "outline"
    ? "border border-stone-300 bg-white text-stone-800 hover:bg-stone-100"
    : variant === "secondary"
      ? "bg-stone-100 text-stone-900 hover:bg-stone-200"
      : "bg-stone-900 text-white hover:bg-black";
  const sizeClass = size === "sm" ? "min-h-8 px-3 py-1.5 text-sm" : "min-h-10 px-4 py-2 text-sm";
  return <button type={type} className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50", variantClass, sizeClass, className)} {...props}>{children}</button>;
}

function Input({ className = "", label, ...props }) {
  const field = <input className={cn("w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-700 focus:ring-2 focus:ring-stone-200", className)} {...props} />;
  if (!label) return field;
  return <label className="block w-full space-y-1"><span className="block text-xs font-bold uppercase tracking-wider text-slate-600">{label}</span>{field}</label>;
}

function Textarea({ className = "", label, ...props }) {
  const field = <textarea className={cn("w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-700 focus:ring-2 focus:ring-stone-200", className)} {...props} />;
  if (!label) return field;
  return <label className="block w-full space-y-1"><span className="block text-xs font-bold uppercase tracking-wider text-slate-600">{label}</span>{field}</label>;
}

function Badge({ children, className = "", variant = "default", ...props }) {
  const variantClass = variant === "secondary" ? "bg-stone-100 text-stone-700" : "bg-yellow-100 text-stone-900";
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", variantClass, className)} {...props}>{children}</span>;
}

const TabsContext = createContext(null);
function Tabs({ value, defaultValue, onValueChange, children }) {
  const [internalValue, setInternalValue] = useState(defaultValue || value || "");
  const activeValue = value ?? internalValue;
  const setActiveValue = (nextValue) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };
  return <TabsContext.Provider value={{ value: activeValue, setValue: setActiveValue }}>{children}</TabsContext.Provider>;
}
function TabsList({ children, className = "", ...props }) {
  return <div className={cn("inline-grid gap-1 rounded-xl bg-stone-100 p-1", className)} {...props}>{children}</div>;
}
function TabsTrigger({ value, children, className = "", ...props }) {
  const ctx = useContext(TabsContext);
  const active = ctx?.value === value;
  return <button type="button" className={cn("rounded-lg px-3 py-2 text-sm font-semibold transition", active ? "bg-white text-stone-950 shadow-sm" : "text-stone-600 hover:text-stone-950", className)} onClick={() => ctx?.setValue(value)} {...props}>{children}</button>;
}
function TabsContent({ value, children, className = "", ...props }) {
  const ctx = useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return <div className={className} {...props}>{children}</div>;
}

function collectSelectData(children, data = { items: [], placeholder: "Select", triggerClass: "" }) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === SelectItem) data.items.push({ value: child.props.value, label: child.props.children });
    if (child.type === SelectValue && child.props.placeholder) data.placeholder = child.props.placeholder;
    if (child.type === SelectTrigger && child.props.className) data.triggerClass = child.props.className;
    if (child.props?.children) collectSelectData(child.props.children, data);
  });
  return data;
}
function Select({ value, onValueChange, children, className = "", ...props }) {
  const data = collectSelectData(children);
  return (
    <select value={value ?? ""} onChange={(event) => onValueChange?.(event.target.value)} className={cn("w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-700 focus:ring-2 focus:ring-stone-200", data.triggerClass, className)} {...props}>
      {!value && <option value="">{data.placeholder}</option>}
      {data.items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  );
}
function SelectTrigger({ children }) { return <>{children}</>; }
function SelectContent({ children }) { return <>{children}</>; }
function SelectValue() { return null; }
function SelectItem({ children }) { return <>{children}</>; }
function Separator({ className = "", ...props }) { return <div className={cn("h-px w-full bg-stone-200", className)} {...props} />; }

function EhrScopedStyles() {
  return <style jsx global>{`
    .ehr-ui, .ehr-ui * { box-sizing: border-box; }
    .ehr-ui { min-height: 100vh; background: #f7f3ea; color: #2b2926; font-family: Montserrat, Arial, sans-serif; font-size: 14px; line-height: 1.45; }
    .ehr-ui h1, .ehr-ui h2, .ehr-ui h3 { color: #2b2926 !important; font-family: Montserrat, Arial, sans-serif !important; letter-spacing: 0 !important; line-height: 1.2 !important; text-transform: none !important; }
    .ehr-ui h1 { font-size: 1.35rem !important; margin: 0; }
    .ehr-ui h2 { font-size: 1.2rem !important; margin: 0; }
    .ehr-ui h3 { font-size: 1rem !important; margin: 0; }
    .ehr-ui p { margin: 0; }
    .ehr-ui a { color: inherit; }
    .ehr-ui nav { display: block; margin: 0; }
    .ehr-ui nav button { width: 100%; }
    .ehr-ui .min-h-screen { min-height: 100vh; }
    .ehr-ui .w-full { width: 100%; }
    .ehr-ui .max-w-2xl { max-width: 42rem; }
    .ehr-ui .max-w-3xl { max-width: 48rem; }
    .ehr-ui .max-w-5xl { max-width: 64rem; }
    .ehr-ui .flex { display: flex; }
    .ehr-ui .inline-flex { display: inline-flex; }
    .ehr-ui .grid { display: grid; }
    .ehr-ui .grid-cols-1 { grid-template-columns: minmax(0, 1fr); }
    .ehr-ui .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .ehr-ui .grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .ehr-ui .items-start { align-items: flex-start; }
    .ehr-ui .items-center { align-items: center; }
    .ehr-ui .items-end { align-items: flex-end; }
    .ehr-ui .justify-center { justify-content: center; }
    .ehr-ui .justify-between { justify-content: space-between; }
    .ehr-ui .flex-col { flex-direction: column; }
    .ehr-ui .gap-2 { gap: .5rem; }
    .ehr-ui .gap-3 { gap: .75rem; }
    .ehr-ui .gap-4 { gap: 1rem; }
    .ehr-ui .gap-6 { gap: 1.25rem; }
    .ehr-ui .space-y-1 > * + * { margin-top: .25rem; }
    .ehr-ui .space-y-3 > * + * { margin-top: .75rem; }
    .ehr-ui .space-y-4 > * + * { margin-top: 1rem; }
    .ehr-ui .p-2 { padding: .5rem; }
    .ehr-ui .p-3 { padding: .75rem; }
    .ehr-ui .p-4 { padding: 1rem; }
    .ehr-ui .p-5 { padding: 1rem; }
    .ehr-ui .p-6 { padding: 1.25rem; }
    .ehr-ui .p-8 { padding: 1.25rem; }
    .ehr-ui .px-3 { padding-left: .75rem; padding-right: .75rem; }
    .ehr-ui .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .ehr-ui .py-2 { padding-top: .5rem; padding-bottom: .5rem; }
    .ehr-ui .pt-0 { padding-top: 0; }
    .ehr-ui .mt-1 { margin-top: .25rem; }
    .ehr-ui .mt-2 { margin-top: .5rem; }
    .ehr-ui .mt-3 { margin-top: .75rem; }
    .ehr-ui .mt-4 { margin-top: 1rem; }
    .ehr-ui .mt-5 { margin-top: 1.25rem; }
    .ehr-ui .mt-6 { margin-top: 1.5rem; }
    .ehr-ui .mt-8 { margin-top: 1.5rem; }
    .ehr-ui .mb-1 { margin-bottom: .25rem; }
    .ehr-ui .mb-6 { margin-bottom: 1.5rem; }
    .ehr-ui .mr-2 { margin-right: .5rem; }
    .ehr-ui .h-px { height: 1px; }
    .ehr-ui .h-4 { height: 1rem; }
    .ehr-ui .h-5 { height: 1.1rem; }
    .ehr-ui .h-6 { height: 1.2rem; }
    .ehr-ui .w-4 { width: 1rem; }
    .ehr-ui .w-5 { width: 1.1rem; }
    .ehr-ui .w-6 { width: 1.2rem; }
    .ehr-ui .rounded-xl, .ehr-ui .rounded-2xl, .ehr-ui .rounded-3xl { border-radius: 8px; }
    .ehr-ui .border { border: 1px solid #ddd3c1; }
    .ehr-ui .border-r { border-right: 1px solid #ddd3c1; }
    .ehr-ui .bg-white { background-color: #fff; }
    .ehr-ui .bg-slate-50 { background-color: #f8f7f4; }
    .ehr-ui .bg-slate-100 { background-color: #eee7d9; }
    .ehr-ui .bg-slate-900 { background-color: #2b2926; }
    .ehr-ui .text-white { color: #fff; }
    .ehr-ui .text-slate-950, .ehr-ui .text-slate-900 { color: #2b2926; }
    .ehr-ui .text-slate-800 { color: #3a352f; }
    .ehr-ui .text-slate-700 { color: #514a41; }
    .ehr-ui .text-slate-600 { color: #675f54; }
    .ehr-ui .text-slate-500 { color: #796f63; }
    .ehr-ui .text-red-600 { color: #b91c1c; }
    .ehr-ui .text-red-800 { color: #7f1d1d; }
    .ehr-ui .bg-red-50 { background-color: #fef2f2; }
    .ehr-ui .border-red-200 { border-color: #fecaca; }
    .ehr-ui .text-xs { font-size: .75rem; line-height: 1.35; }
    .ehr-ui .text-sm { font-size: .875rem; line-height: 1.45; }
    .ehr-ui .text-lg { font-size: 1rem; line-height: 1.35; }
    .ehr-ui .text-2xl { font-size: 1.25rem; line-height: 1.2; }
    .ehr-ui .text-3xl { font-size: 1.35rem; line-height: 1.2; }
    .ehr-ui .font-medium { font-weight: 600; }
    .ehr-ui .font-semibold { font-weight: 700; }
    .ehr-ui .uppercase { text-transform: uppercase; }
    .ehr-ui .tracking-widest { letter-spacing: .08em; }
    .ehr-ui .whitespace-pre-wrap { white-space: pre-wrap; }
    .ehr-ui .border-slate-100, .ehr-ui .border-slate-200 { border-color: #ddd3c1; }
    .ehr-ui .bg-stone-200 { background-color: #ddd3c1; }
    .ehr-ui .shadow-sm { box-shadow: 0 1px 2px rgba(43, 41, 38, 0.08); }
    @media (min-width: 768px) {
      .ehr-ui .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .ehr-ui .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .ehr-ui .md\\:grid-cols-\\[1fr_180px\\] { grid-template-columns: minmax(0, 1fr) 180px; }
    }
    @media (min-width: 1024px) {
      .ehr-ui .lg\\:grid-cols-\\[1\\.1fr_0\\.9fr\\] { grid-template-columns: 1.1fr .9fr; }
      .ehr-ui .lg\\:grid-cols-\\[260px_1fr\\] { grid-template-columns: 260px minmax(0, 1fr); }
      .ehr-ui .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .ehr-ui .lg\\:grid-cols-9 { grid-template-columns: repeat(9, minmax(0, 1fr)); }
      .ehr-ui .lg\\:p-6 { padding: 1.25rem; }
      .ehr-ui .lg\\:p-8 { padding: 1.5rem; }
      .ehr-ui .lg\\:p-10 { padding: 1.5rem; }
      .ehr-ui .lg\\:flex-row { flex-direction: row; }
      .ehr-ui .lg\\:items-end { align-items: flex-end; }
      .ehr-ui .lg\\:justify-between { justify-content: space-between; }
    }
    @media (min-width: 1280px) {
      .ehr-ui .xl\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .ehr-ui .xl\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .ehr-ui .xl\\:grid-cols-\\[1\\.05fr_0\\.95fr\\] { grid-template-columns: 1.05fr .95fr; }
      .ehr-ui .xl\\:grid-cols-\\[0\\.95fr_1\\.05fr\\] { grid-template-columns: .95fr 1.05fr; }
      .ehr-ui .xl\\:grid-cols-\\[0\\.9fr_1\\.1fr\\] { grid-template-columns: .9fr 1.1fr; }
      .ehr-ui .xl\\:grid-cols-\\[1\\.1fr_0\\.9fr\\] { grid-template-columns: 1.1fr .9fr; }
      .ehr-ui .xl\\:grid-cols-\\[1\\.15fr_0\\.85fr\\] { grid-template-columns: 1.15fr .85fr; }
      .ehr-ui .xl\\:grid-cols-\\[1fr_1fr\\] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .ehr-ui { font-size: 13px; }
      .ehr-ui h1 { font-size: 1.2rem !important; }
      .ehr-ui .p-8, .ehr-ui .p-6, .ehr-ui .p-5 { padding: 1rem; }
      .ehr-ui .gap-6 { gap: 1rem; }
    }
  `}</style>;
}

const APP_NAME = "Revealing Leads to Healing Wellness Services LLC";
const VERSION = "EHR Proprietary System v2.0.25";
const START_DATE = "2025-06-02";
const ROADMAP_DATE = "2026-01-02";
const PRACTITIONER_NAME = "Kenseener Carpenter";
const STORAGE_KEY = "rlth-ehr-demo-v3-stable";
const affirmations = [
  "I can move through this moment with steadiness and care.",
  "Healing is not linear, and my effort still counts.",
  "I am allowed to slow down and reconnect to myself.",
  "My emotions carry information, not failure.",
  "I can practice one helpful step at a time.",
  "Safety, structure, and compassion can exist together.",
];
const diagnosisCodeOptions = [
  { code: "F41.1", label: "Generalized Anxiety Disorder", keywords: "anxiety worry gad generalized anxious" },
  { code: "F41.0", label: "Panic Disorder", keywords: "panic attacks anxiety fear" },
  { code: "F40.10", label: "Social Anxiety Disorder, unspecified", keywords: "social anxiety social phobia performance" },
  { code: "F42.2", label: "Mixed obsessional thoughts and acts", keywords: "ocd obsessive compulsive intrusive thoughts rituals" },
  { code: "F43.10", label: "Post-Traumatic Stress Disorder, unspecified", keywords: "ptsd trauma post traumatic stress abuse flashbacks" },
  { code: "F43.12", label: "Post-Traumatic Stress Disorder, chronic", keywords: "ptsd chronic trauma long term" },
  { code: "F43.20", label: "Adjustment Disorder, unspecified", keywords: "adjustment stress transition life change" },
  { code: "F43.21", label: "Adjustment Disorder with depressed mood", keywords: "adjustment depression grief sadness" },
  { code: "F43.22", label: "Adjustment Disorder with anxiety", keywords: "adjustment anxiety worry stress" },
  { code: "F43.23", label: "Adjustment Disorder with mixed anxiety and depressed mood", keywords: "adjustment anxiety depression mixed" },
  { code: "F32.A", label: "Depression, unspecified", keywords: "depression depressed mood mdd sadness" },
  { code: "F32.1", label: "Major Depressive Disorder, single episode, moderate", keywords: "major depression single episode moderate" },
  { code: "F33.0", label: "Major Depressive Disorder, recurrent, mild", keywords: "major depression recurrent mild" },
  { code: "F33.1", label: "Major Depressive Disorder, recurrent, moderate", keywords: "major depression recurrent moderate" },
  { code: "F33.2", label: "Major Depressive Disorder, recurrent severe without psychotic features", keywords: "major depression recurrent severe" },
  { code: "F34.1", label: "Persistent Depressive Disorder", keywords: "dysthymia persistent depression chronic" },
  { code: "F31.9", label: "Bipolar Disorder, unspecified", keywords: "bipolar mood cycling mania depression" },
  { code: "F90.9", label: "Attention-Deficit Hyperactivity Disorder, unspecified", keywords: "adhd attention concentration focus hyperactivity" },
  { code: "F10.20", label: "Alcohol Use Disorder, unspecified, uncomplicated", keywords: "alcohol use substance drinking" },
  { code: "F12.20", label: "Cannabis Use Disorder, unspecified, uncomplicated", keywords: "cannabis marijuana substance weed" },
  { code: "F11.20", label: "Opioid Use Disorder, unspecified, uncomplicated", keywords: "opioid opiate substance use" },
  { code: "Z63.0", label: "Problems in relationship with spouse or partner", keywords: "relationship partner marital couples" },
  { code: "Z63.8", label: "Other specified problems related to primary support group", keywords: "family support social conflict" },
  { code: "Z60.0", label: "Problems of adjustment to life-cycle transitions", keywords: "life transition adjustment social" },
  { code: "Z62.810", label: "Personal history of physical and sexual abuse in childhood", keywords: "childhood abuse physical sexual trauma history" },
  { code: "Z91.410", label: "Personal history of adult physical and sexual abuse", keywords: "adult abuse physical sexual trauma history" },
  { code: "Z91.411", label: "Personal history of adult psychological abuse", keywords: "psychological emotional abuse adult trauma" },
];
const billingCodeOptions = [
  { code: "90791", type: "CPT", label: "Psychiatric diagnostic evaluation / intake / biopsychosocial assessment", keywords: "intake diagnostic evaluation assessment initial biopsychosocial bio psycho social 90" },
  { code: "90792", type: "CPT", label: "Psychiatric diagnostic evaluation with medical services", keywords: "psychiatric diagnostic medical services medication evaluation" },
  { code: "90832", type: "CPT", label: "Psychotherapy, 30 minutes", keywords: "therapy psychotherapy 30" },
  { code: "90834", type: "CPT", label: "Psychotherapy, 45 minutes", keywords: "therapy psychotherapy 45" },
  { code: "90837", type: "CPT", label: "Psychotherapy, 60 minutes", keywords: "therapy psychotherapy 60 individual" },
  { code: "90846", type: "CPT", label: "Family psychotherapy without patient present", keywords: "family without patient collateral" },
  { code: "90847", type: "CPT", label: "Family psychotherapy with patient present", keywords: "family with patient couples" },
  { code: "90853", type: "CPT", label: "Group psychotherapy", keywords: "group therapy" },
  { code: "90839", type: "CPT", label: "Psychotherapy for crisis, first 60 minutes", keywords: "crisis first 60 emergency" },
  { code: "90840", type: "CPT", label: "Psychotherapy for crisis, each additional 30 minutes", keywords: "crisis additional 30" },
  { code: "96127", type: "CPT", label: "Brief emotional/behavioral assessment scoring", keywords: "screening phq gad outcome measure assessment" },
  { code: "H0031", type: "HCPCS", label: "Mental health assessment by non-physician", keywords: "assessment behavioral health biopsychosocial payer medicaid" },
  { code: "H2011", type: "HCPCS", label: "Crisis intervention service", keywords: "crisis intervention behavioral health" },
  { code: "T1013", type: "HCPCS", label: "Sign language or oral interpretive services, per 15 minutes", keywords: "interpreter language translation asl" },
];
const consentTemplateDefinitions = [
  { title: "Consent for Psychotherapy / Treatment", status: "Pending signature", category: "Consent", body: "Client consents to behavioral health assessment, psychotherapy, treatment planning, coordination of care when authorized, and provider documentation in the EHR. Provider must review limits of confidentiality, risks/benefits, alternatives, attendance, emergencies, and client rights." },
  { title: "Telehealth Consent", status: "Pending signature", category: "Telehealth Consent", body: "Client consents to secure telehealth services, understands technology/privacy limitations, emergency planning requirements, location verification, backup contact procedures, and right to request in-person care when clinically appropriate." },
  { title: "Recording and AI Scribe Consent", status: "Pending signature", category: "AI Scribe Consent", body: "Client consents to temporary audio recording/transcription for clinical documentation support. Audio is temporary only and is deleted overnight or no later than the next business day unless a documented legal/clinical exception applies. Provider reviews and signs final notes." },
  { title: "HIPAA Notice of Privacy Practices Acknowledgement", status: "Pending signature", category: "HIPAA", body: "Client acknowledges receipt/review opportunity for privacy practices, permitted uses/disclosures, rights to access/amend records, complaint process, and confidentiality limitations." },
  { title: "Release of Information", status: "Pending signature", category: "ROI", body: "Client authorizes limited release/exchange of information with named parties. Scope, purpose, expiration, revocation rules, and redisclosure limits must be completed before use." },
  { title: "Communication Consent - Phone/Text/Email/Spruce", status: "Pending signature", category: "Communication", body: "Client authorizes selected communication channels and understands privacy risks, response-time limits, crisis limitations, and that emergency needs require 911/local emergency services." },
  { title: "Financial Responsibility / Billing Consent", status: "Pending signature", category: "Billing", body: "Client acknowledges fees, billing practices, insurance/payer limits, copays/deductibles, cancellation policy, balance responsibility, and authorization to submit claims when applicable." },
  { title: "Emergency and Crisis Policy Acknowledgement", status: "Pending signature", category: "Safety", body: "Client understands this practice is not an emergency service. Crisis instructions, local emergency resources, 988, 911, nearest ER, and provider response limitations are reviewed." },
];
const psychoeducationLibrary = [
  {
    id: "psy-1",
    title: "Understanding the Stress Response",
    topic: "Trauma",
    summary: "A brief overview of fight, flight, freeze, and fawn responses and how they affect the body.",
  },
  {
    id: "psy-2",
    title: "Behavioral Activation Basics",
    topic: "Depression",
    summary: "How action can support mood improvement even before motivation fully returns.",
  },
  {
    id: "psy-3",
    title: "Grounding Skills for Anxiety",
    topic: "Anxiety",
    summary: "Practical grounding tools for acute anxiety and emotional overwhelm.",
  },
  {
    id: "psy-4",
    title: "What Journaling Can Do in Therapy",
    topic: "General",
    summary: "How journaling supports reflection, pattern recognition, and emotional processing.",
  },
];
const mockUsers = [
  {
    id: "provider-1",
    email: "provider@rlth.demo",
    password: "demo123",
    fullName: "Kenseener Carpenter",
    role: "provider",
  },
  {
    id: "client-1",
    email: "client@rlth.demo",
    password: "demo123",
    fullName: "Demo Client",
    role: "client",
  },
];
const mockSeed = {
  currentUserId: null,
  auditLog: [],
  recordRequests: [],
  users: {
    "provider-1": {
      profile: {
        fullName: "Kenseener Carpenter",
        email: "provider@rlth.demo",
        role: "provider",
      },
      journalEntries: [],
      homework: [],
      notes: [],
      treatmentPlans: [],
      assessments: {},
      documents: [],
      intake: null,
      messages: [],
      appointments: [],
    },
    "client-1": {
      profile: {
        fullName: "Demo Client",
        email: "client@rlth.demo",
        role: "client",
      },
      journalEntries: [
        {
          id: "j1",
          title: "First Reflection",
          content: "I noticed today that my body becomes tense before I recognize that I am anxious.",
          visibility: "private",
          createdAt: new Date().toLocaleString(),
        },
      ],
      homework: [
        {
          id: "h1",
          title: "Grounding Practice",
          content: "Practice 5-4-3-2-1 grounding once in the morning and once in the evening.",
          dueDate: "",
          status: "Assigned",
          assignedAt: new Date().toLocaleString(),
          completedAt: "",
        },
      ],
      notes: [],
      treatmentPlans: [],
      assessments: {
        phq9: null,
        gad7: null,
        suicideRisk: null,
        substanceUse: null,
        dast: null,
        aces: null,
        wecare: null,
        violenceRisk: null,
        safetyPlan: null,
      },
      documents: [
        {
          id: "doc-consent-1",
          title: "Consent for Treatment",
          type: "Consent",
          status: "Pending signature",
          viewedAt: "",
          signature: null,
          uploadedFileName: "",
          createdAt: new Date().toLocaleString(),
        },
        {
          id: "doc-hipaa-1",
          title: "HIPAA Acknowledgement",
          type: "Acknowledgement",
          status: "Pending signature",
          viewedAt: "",
          signature: null,
          uploadedFileName: "",
          createdAt: new Date().toLocaleString(),
        },
      ],
      intake: {
        fullName: "Demo Client",
        presentingProblem: "Anxiety, overwhelm, and difficulty regulating stress.",
        diagnoses: ["Generalized Anxiety Disorder"],
      },
      messages: [
        {
          id: "m1",
          from: "provider",
          text: "Welcome to your client portal. Please complete your journal reflection this week.",
          timestamp: new Date().toLocaleString(),
        },
      ],
      appointments: [
        {
          id: "a1",
          date: "2026-03-12",
          time: "10:00",
          format: "Telehealth",
          purpose: "Follow-up psychotherapy",
        },
      ],
    },
  },
};
function normalizeUserBucket(bucket = {}, fallback = {}) {
  const profile = bucket.profile || fallback.profile || {};
  const isClient = profile.role === "client";
  return {
    profile,
    journalEntries: Array.isArray(bucket.journalEntries) ? bucket.journalEntries : [],
    homework: Array.isArray(bucket.homework) ? bucket.homework : [],
    notes: Array.isArray(bucket.notes) ? bucket.notes : [],
    treatmentPlans: Array.isArray(bucket.treatmentPlans) ? bucket.treatmentPlans : [],
    assessments: bucket.assessments || (isClient ? {
      phq9: null,
      gad7: null,
      suicideRisk: null,
      substanceUse: null,
      dast: null,
      aces: null,
      wecare: null,
      violenceRisk: null,
      safetyPlan: null,
    } : {}),
    documents: Array.isArray(bucket.documents) ? bucket.documents : [],
    intake: typeof bucket.intake !== "undefined" ? bucket.intake : (isClient ? { fullName: profile.fullName || "", presentingProblem: "", diagnoses: [] } : null),
    messages: Array.isArray(bucket.messages) ? bucket.messages : [],
    appointments: Array.isArray(bucket.appointments) ? bucket.appointments : [],
    telehealth: Array.isArray(bucket.telehealth) ? bucket.telehealth : [],
  };
}
function normalizeStore(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  const mergedUsers = { ...(mockSeed.users || {}), ...(base.users || {}) };
  const users = Object.fromEntries(
    Object.entries(mergedUsers).map(([id, bucket]) => [id, normalizeUserBucket(bucket, mockSeed.users[id])])
  );
  return {
    currentUserId: base.currentUserId && users[base.currentUserId] ? base.currentUserId : null,
    auditLog: Array.isArray(base.auditLog) ? base.auditLog : [],
    recordRequests: Array.isArray(base.recordRequests) ? base.recordRequests : [],
    users,
  };
}
function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeStore(JSON.parse(raw)) : normalizeStore(mockSeed);
  } catch {
    return normalizeStore(mockSeed);
  }
}
function writeStore(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
const AuthContext = createContext(null);
const PageContext = createContext(null);
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || "Unknown preview error" };
  }
  componentDidCatch(error, info) {
    console.error("RLTH preview component error:", error, info);
  }
  resetPreview = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <Card className="max-w-2xl w-full rounded-3xl shadow-sm border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700">Preview safety boundary caught an error</CardTitle>
              <CardDescription>
                One section of the app crashed, but the safety layer kept the whole preview from going blank.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 whitespace-pre-wrap">
                {this.state.errorMessage}
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
                Try resetting the preview first. If it returns to this screen, the broken page/component needs a code cleanup pass.
              </div>
              <Button className="rounded-2xl" onClick={this.resetPreview}>Reset preview view</Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
function useAuth() {
  return useContext(AuthContext);
}
function usePage() {
  return useContext(PageContext);
}
function AuthProvider({ children }) {
  const [hydrated, setHydrated] = useState(false);
  const [store, setStore] = useState(() => normalizeStore(mockSeed));
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    if (!EHR_DEMO_ENABLED) {
      setHydrated(true);
      return;
    }
    const initialStore = readStore();
    const id = initialStore.currentUserId;
    setStore(initialStore);
    setCurrentUser(id ? { id, ...initialStore.users[id].profile } : null);
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated && EHR_DEMO_ENABLED) writeStore(store);
  }, [store, hydrated]);
  const login = (email, password) => {
    if (!EHR_DEMO_ENABLED) {
      throw new Error("Clinical EHR access is locked until production auth and BAA-backed storage are configured.");
    }
    const found = mockUsers.find((u) => u.email === email && u.password === password);
    if (!found) {
      throw new Error("Invalid email or password.");
    }
    const next = { ...store, currentUserId: found.id };
    setStore(next);
    setCurrentUser({ id: found.id, ...next.users[found.id].profile });
  };
  const signup = ({ fullName, email, password, role }) => {
    if (!EHR_DEMO_ENABLED) {
      throw new Error("Self-registration is disabled until production auth and identity verification are configured.");
    }
    if (!fullName || !email || !password || !role) {
      throw new Error("All registration fields are required.");
    }
    const duplicate = Object.values(store.users).find((u) => u.profile.email === email);
    if (duplicate) {
      throw new Error("An account with that email already exists.");
    }
    const id = `user-${Date.now()}`;
    const nextStore = {
      ...store,
      currentUserId: id,
      users: {
        ...store.users,
        [id]: {
          profile: { fullName, email, role },
          journalEntries: [],
          homework: [],
          notes: [],
          treatmentPlans: [],
          intake: role === "client" ? { fullName, presentingProblem: "", diagnoses: [] } : null,
          assessments: role === "client" ? {
            phq9: null,
            gad7: null,
            suicideRisk: null,
            substanceUse: null,
            dast: null,
            aces: null,
            wecare: null,
            violenceRisk: null,
            safetyPlan: null,
          } : {},
          documents: role === "client" ? [] : [],
          messages: [],
          appointments: [],
        },
      },
    };
    setStore(nextStore);
    setCurrentUser({ id, fullName, email, role });
  };
  const logout = () => {
    const next = { ...store, currentUserId: null };
    setStore(next);
    setCurrentUser(null);
  };
  const appendAuditLog = ({ action, details = "", clientId = "", clientName = "", category = "General" }) => {
    const actorName = currentUser?.fullName || "System";
    const actorRole = currentUser?.role || "system";
    setStore((prev) => ({
      ...prev,
      auditLog: [
        {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toLocaleString(),
          actorId: currentUser?.id || "system",
          actorName,
          actorRole,
          category,
          action,
          details,
          clientId,
          clientName,
        },
        ...(prev.auditLog || []),
      ],
    }));
  };
  const submitRecordRequest = ({ requestType, reason }) => {
    if (!currentUser) return;
    setStore((prev) => ({
      ...prev,
      recordRequests: [
        {
          id: `request-${Date.now()}`,
          clientId: currentUser.id,
          clientName: currentUser.fullName,
          requestType,
          reason,
          status: "Pending Review",
          submittedAt: new Date().toLocaleString(),
          resolvedAt: "",
        },
        ...(prev.recordRequests || []),
      ],
    }));
  };
  const updateRecordRequestStatus = (requestId, status) => {
    setStore((prev) => ({
      ...prev,
      recordRequests: (prev.recordRequests || []).map((item) =>
        item.id === requestId
          ? {
              ...item,
              status,
              resolvedAt: status === "Pending Review" ? "" : new Date().toLocaleString(),
            }
          : item
      ),
    }));
  };
  const updateCurrentUserData = (key, updater) => {
    if (!currentUser) return;
    setStore((prev) => {
      const userBucket = prev.users[currentUser.id];
      const updatedValue = typeof updater === "function" ? updater(userBucket[key]) : updater;
      return {
        ...prev,
        users: {
          ...prev.users,
          [currentUser.id]: {
            ...userBucket,
            [key]: updatedValue,
          },
        },
      };
    });
  };
  const updateSpecificUserData = (userId, key, updater) => {
    setStore((prev) => {
      const userBucket = prev.users[userId];
      if (!userBucket) return prev;
      const updatedValue = typeof updater === "function" ? updater(userBucket[key]) : updater;
      return {
        ...prev,
        users: {
          ...prev.users,
          [userId]: {
            ...userBucket,
            [key]: updatedValue,
          },
        },
      };
    });
  };
  const value = useMemo(
    () => ({
      currentUser,
      store,
      login,
      signup,
      logout,
      updateCurrentUserData,
      updateSpecificUserData,
      appendAuditLog,
      submitRecordRequest,
      updateRecordRequestStatus,
      isMockMode: true,
    }),
    [currentUser, store]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
function PageProvider({ children }) {
  const [page, setPage] = useState("dashboard");
  const [selectedChartClientId, setSelectedChartClientId] = useState("client-1");
  return (
    <PageContext.Provider value={{ page, setPage, selectedChartClientId, setSelectedChartClientId }}>
      {children}
    </PageContext.Provider>
  );
}
function ProductionReadinessLock() {
  const checklist = [
    "BAA-supported hosting/backend selected and signed",
    "Real auth with MFA, role claims, password reset, and session timeout",
    "Database rules that isolate each client chart and provider assignment",
    "Append-only audit logs for logins, chart access, edits, signatures, exports, and record requests",
    "Encrypted storage, backup/retention policy, incident response, and legal/compliance review",
  ];
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl rounded-3xl shadow-sm border-slate-200">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-slate-900 text-white"><Lock className="h-6 w-6" /></div>
            <div>
              <CardTitle>Production EHR access locked</CardTitle>
              <CardDescription>{EHR_PRODUCTION_LOCK_REASON}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Do not enter real client names, clinical notes, recordings, diagnoses, billing details, signatures, or PHI into this EHR until the production controls below are completed.
          </div>
          <div className="grid gap-3">
            {checklist.map((item) => (
              <div key={item} className="rounded-2xl border bg-white p-3 text-sm text-slate-700 flex gap-2">
                <Shield className="h-4 w-4 text-slate-700 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
            Temporary demo mode can be enabled only for non-PHI testing with <code>NEXT_PUBLIC_RLTH_EHR_DEMO_ENABLED=true</code>. It must stay disabled for clinical use.
          </div>
          <a className="inline-flex min-h-10 items-center justify-center rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white" href="/">
            Return to Website
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
function AppShell() {
  const { currentUser } = useAuth();
  if (!EHR_DEMO_ENABLED) return <ProductionReadinessLock />;
  return currentUser ? <MainApp /> : <AuthPage />;
}
function AuthPage() {
  const { login, signup, isMockMode } = useAuth();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ fullName: "", email: "", password: "", role: "client" });
  const handleLogin = () => {
    try {
      setError("");
      login(loginForm.email, loginForm.password);
    } catch (e) {
      setError(e.message);
    }
  };
  const handleSignup = () => {
    try {
      setError("");
      signup(signupForm);
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <Card className="rounded-3xl shadow-sm border-slate-200">
          <CardContent className="p-8 lg:p-10">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-slate-900 text-white">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Started {START_DATE}</p>
                <h1 className="text-3xl font-semibold mt-1">{APP_NAME}</h1>
                <p className="text-slate-600 mt-3 max-w-2xl">
                  Standalone RLTH EHR preview with role-based client and provider workflow,
                  journaling, affirmations, psychoeducation, scheduling, communication, and future-ready EHR modules.
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mt-8">
              {[
                [BookOpen, "Private and shared journaling"],
                [Sparkles, "Daily affirmations"],
                [Users, "Provider/client role routing"],
                [MessageSquare, "Portal communication"],
                [Calendar, "Scheduling module scaffold"],
                [FileText, "HIPAA-aligned record workflow"],
              ].map(([Icon, label]) => (
                <div key={label} className="rounded-2xl border p-4 bg-white flex items-center gap-3">
                  <div className="p-2 rounded-2xl bg-slate-100">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <p className="text-sm font-medium">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>{mode === "login" ? "Sign in" : "Create account"}</CardTitle>
            <CardDescription>
              {isMockMode
                ? "Preview is running in non-PHI demo mode with production backend disabled."
                : "Connected to production backend."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="grid grid-cols-2 rounded-2xl">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="space-y-3 mt-4">
                <Input
                  placeholder="Email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
                <Button className="w-full rounded-2xl" onClick={handleLogin}>
                  <LogIn className="mr-2 h-4 w-4" />Sign in
                </Button>
                <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600 space-y-1">
                  <p className="font-medium text-slate-800">Demo credentials</p>
                  <p>Provider: provider@rlth.demo / demo123</p>
                  <p>Client: client@rlth.demo / demo123</p>
                </div>
              </TabsContent>
              <TabsContent value="signup" className="space-y-3 mt-4">
                <Input
                  placeholder="Full name"
                  value={signupForm.fullName}
                  onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                />
                <Input
                  placeholder="Email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                />
                <Select value={signupForm.role} onValueChange={(value) => setSignupForm({ ...signupForm, role: value })}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="provider">Provider</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full rounded-2xl" onClick={handleSignup}>
                  <UserPlus className="mr-2 h-4 w-4" />Create account
                </Button>
              </TabsContent>
            </Tabs>
            {error && <div className="text-sm text-red-600 rounded-2xl border border-red-200 bg-red-50 p-3">{error}</div>}
            <div className="rounded-2xl border p-4 text-xs text-slate-500">
              Demo mode uses browser-local storage and is not approved for PHI. Production clinical use requires secure auth, BAA-supported backend storage, database rules, immutable audit logs, operational HIPAA controls, and legal review.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function MainApp() {
  const { currentUser, logout, isMockMode } = useAuth();
  const { page, setPage } = usePage();
  const clientItems = [
    ["dashboard", "Dashboard", HeartHandshake],
    ["journal", "Journal", PenSquare],
    ["affirmations", "Affirmations", Sparkles],
    ["psychoeducation", "Psychoeducation", BookOpen],
    ["homework-client", "Homework", BookOpen],
    ["messages", "Messages", MessageSquare],
    ["records-request", "Record Request", FileText],
    ["telehealth", "Telehealth", Video],
    ["schedule", "Scheduling", Calendar],
  ];
  const providerItems = [
    ["dashboard", "Dashboard", HeartHandshake],
    ["affirmations", "Affirmations", Sparkles],
    ["clients", "Client Management", Users],
    ["chart", "Client Chart", FileText],
    ["intake", "Intake", ClipboardList],
    ["notes", "Progress Notes", FileText],
    ["billing", "Billing", ClipboardList],
    ["plans", "Treatment Plans", Stethoscope],
    ["homework", "Homework", BookOpen],
    ["assessments", "Assessments", ClipboardList],
    ["documents", "Document Library", Lock],
    ["infrastructure", "Infrastructure", Shield],
    ["trainings", "Provider Trainings", GraduationCap],
    ["record-requests", "Record Requests", FileText],
    ["audit-log", "Audit Log", Lock],
    ["telehealth", "Telehealth", Video],
    ["messages", "Messages", MessageSquare],
    ["schedule", "Scheduling", Calendar],
    ["psychoeducation", "Psychoeducation", Brain],
  ];
  const navItems = currentUser.role === "provider" ? providerItems : clientItems;
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid lg:grid-cols-[260px_1fr] min-h-screen">
        <aside className="border-r bg-white p-4 lg:p-6">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-slate-900 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">Revealing Leads to Healing</h2>
              <p className="text-sm text-slate-500">{VERSION}</p>
            </div>
          </div>
          <div className="rounded-2xl border p-4 mt-5 bg-slate-50">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="font-medium mt-1">{currentUser.fullName}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="rounded-xl">{currentUser.role}</Badge>
              {isMockMode && <Badge variant="secondary" className="rounded-xl">mock mode</Badge>}
            </div>
          </div>
          <nav className="space-y-1 mt-6">
            {navItems.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition ${
                  page === id ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </nav>
          <Button variant="outline" className="w-full mt-6 rounded-2xl" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />Logout
          </Button>
        </aside>
        <main className="p-4 lg:p-8">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <PageRouter />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
function PageRouter() {
  const { page } = usePage();
  const { currentUser } = useAuth();
  if (page === "dashboard") return <DashboardPage />;
  if (page === "journal") return <JournalPage />;
  if (page === "affirmations") return <AffirmationsPage />;
  if (page === "psychoeducation") return <PsychoeducationPage />;
  if (page === "homework-client" && currentUser.role === "client") return <ClientHomeworkPage />;
  if (page === "messages") return <MessagingPage />;
  if (page === "records-request" && currentUser.role === "client") return <ClientRecordRequestPage />;
  if (page === "record-requests" && currentUser.role === "provider") return <ProviderRecordRequestsPage />;
  if (page === "audit-log" && currentUser.role === "provider") return <AuditLogPage />;
  if (page === "telehealth") return <TelehealthPage />;
  if (page === "schedule") return <SchedulingPage />;
  if (page === "clients" && currentUser.role === "provider") return <ClientManagementPage />;
  if (page === "chart" && currentUser.role === "provider") return <ClientChartPage />;
  if (page === "intake" && currentUser.role === "provider") return <IntakePage />;
  if (page === "notes" && currentUser.role === "provider") return <ProgressNotesPage />;
  if (page === "billing" && currentUser.role === "provider") return <BillingPage />;
  if (page === "plans" && currentUser.role === "provider") return <TreatmentPlansPage />;
  if (page === "homework" && currentUser.role === "provider") return <HomeworkPage />;
  if (page === "assessments" && currentUser.role === "provider") return <AssessmentsPage />;
  if (page === "documents" && currentUser.role === "provider") return <DocumentLibraryPage />;
  if (page === "infrastructure" && currentUser.role === "provider") return <InfrastructurePage />;
  if (page === "trainings" && currentUser.role === "provider") return <ProviderTrainingsPage />;
  return <DashboardPage />;
}
function SectionHeader({ title, description, right }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold">{title}</h1>
        <p className="text-slate-600 mt-2 max-w-3xl">{description}</p>
      </div>
      {right}
    </div>
  );
}
function DashboardPage() {
  const { currentUser, store } = useAuth();
  const bucket = store.users[currentUser.id];
  const stats = currentUser.role === "provider"
    ? [
        [Users, "Clients", Object.values(store.users).filter((u) => u.profile.role === "client").length, "Private professional client list"],
        [FileText, "Notes", bucket.notes.length, "Provider workspace notes"],
        [ClipboardList, "Intake / Plans", bucket.treatmentPlans.length, "Provider workspace templates"],
        [BookOpen, "Homework", Object.values(store.users).reduce((acc, u) => acc + (u.homework?.length || 0), 0), "Client engagement assignments"],
      ]
    : [
        [PenSquare, "Journal Entries", bucket.journalEntries.length, "Private reflections stored to your record"],
        [BookOpen, "Homework", bucket.homework.length, "Assigned activities"],
        [MessageSquare, "Messages", bucket.messages.length, "Communication items"],
        [Calendar, "Appointments", bucket.appointments.length, "Upcoming session items"],
      ];
  return (
    <div>
      <SectionHeader
        title={currentUser.role === "provider" ? "Provider dashboard" : "Client dashboard"}
        description={
          currentUser.role === "provider"
            ? "Professional-grade proprietary EHR workspace for secure charting, intake, messaging, scheduling, and clinical operations under Revealing Leads to Healing Wellness Services LLC."
            : "Client-facing space for journaling, affirmations, psychoeducation, communication, homework, and appointment visibility."
        }
        right={null}
      />
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(([Icon, label, value, helper]) => (
          <Card key={label} className="rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="text-2xl font-semibold mt-1">{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{helper}</p>
                </div>
                <div className="p-2 rounded-2xl bg-slate-100">
                  <Icon className="h-5 w-5 text-slate-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-4 mt-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Development roadmap alignment</CardTitle>
            <CardDescription>January 2, 2026 practitioner roadmap incorporated into the build</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="rounded-2xl border p-4 bg-slate-50">
              <p className="font-medium">Project vision</p>
              <p className="mt-2">
                Fully independent, professional-grade Electronic Health Record platform owned and operated by
                Revealing Leads to Healing Wellness Services LLC for private client management, session documentation,
                and clinical operations.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-2xl border p-4">
                <p className="font-medium">Completed / in progress</p>
                <p className="mt-2">Secure authentication and role management</p>
                <p>Advanced messaging hub</p>
                <p>Proprietary scheduling module</p>
                <p>Clinical intake system</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="font-medium">Future phases</p>
                <p className="mt-2">Client charting dashboard</p>
                <p>Billing and claims</p>
                <p>Document library for signed consents and assessments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Documentation standards</CardTitle>
            <CardDescription>Professional telehealth and ownership rules</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-3">
            <div className="rounded-2xl border p-4 bg-slate-50">
              <p><span className="font-medium text-slate-800">Ownership:</span> All data is the property of Revealing Leads to Healing Wellness Services LLC.</p>
              <p className="mt-2"><span className="font-medium text-slate-800">Naming convention:</span> The word Therapy is written plainly and never styled with special characters or dashes.</p>
              <p className="mt-2"><span className="font-medium text-slate-800">Categorization:</span> Follow-up notes and professional documentation follow the internal clinical documentation standard.</p>
            </div>
            <div className="rounded-2xl border p-4 bg-amber-50 border-amber-200">
              Production HIPAA readiness still requires AWS-backed auth, API authorization, encrypted storage,
              access controls, encrypted workflows, audit logs, incident procedures, backups, and policy documentation.
            </div>
            <p className="text-xs text-slate-400">Roadmap date: {ROADMAP_DATE} | Practitioner: {PRACTITIONER_NAME}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function JournalPage() {
  const { currentUser, store, updateCurrentUserData, appendAuditLog } = useAuth();
  const entries = store.users[currentUser.id].journalEntries || [];
  const [draft, setDraft] = useState({ title: "", content: "", visibility: "private" });
  const [editingId, setEditingId] = useState(null);
  const saveEntry = () => {
    if (!draft.title.trim() || !draft.content.trim()) return;
    if (editingId) {
      updateCurrentUserData("journalEntries", (prev) =>
        prev.map((entry) => (entry.id === editingId ? { ...entry, ...draft } : entry))
      );
      appendAuditLog({
        action: "Updated journal entry",
        details: `${draft.visibility === "shared" ? "Shared" : "Private"} journal entry updated.`,
        clientId: currentUser.id,
        clientName: currentUser.fullName,
        category: "Journal",
      });
      setEditingId(null);
    } else {
      updateCurrentUserData("journalEntries", (prev) => [
        {
          id: `journal-${Date.now()}`,
          title: draft.title,
          content: draft.content,
          visibility: draft.visibility,
          createdAt: new Date().toLocaleString(),
        },
        ...prev,
      ]);
      appendAuditLog({
        action: "Created journal entry",
        details: `${draft.visibility === "shared" ? "Shared" : "Private"} journal entry created.`,
        clientId: currentUser.id,
        clientName: currentUser.fullName,
        category: "Journal",
      });
    }
    setDraft({ title: "", content: "", visibility: "private" });
  };
  const editEntry = (entry) => {
    setDraft({ title: entry.title, content: entry.content, visibility: entry.visibility || "private" });
    setEditingId(entry.id);
  };
  const deleteEntry = (id) => {
    updateCurrentUserData("journalEntries", (prev) => prev.filter((entry) => entry.id !== id));
    appendAuditLog({
      action: "Deleted journal entry",
      details: "Client removed a journal entry.",
      clientId: currentUser.id,
      clientName: currentUser.fullName,
      category: "Journal",
    });
    if (editingId === id) {
      setEditingId(null);
      setDraft({ title: "", content: "", visibility: "private" });
    }
  };
  return (
    <div>
      <SectionHeader
        title="Journal"
        description="Client journaling space. Entries can be marked Private (visible only to the client) or Shared (visible to the provider as part of the clinical record if the client chooses)."
      />
      <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{editingId ? "Edit entry" : "New entry"}</CardTitle>
            <CardDescription>Reflective writing, symptom tracking, or homework reflections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Entry title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <Textarea
              placeholder="Write your reflection here..."
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              className="min-h-[260px] rounded-2xl"
            />
            <Select value={draft.visibility} onValueChange={(value) => setDraft({ ...draft, visibility: value })}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private (only visible to you)</SelectItem>
                <SelectItem value="shared">Shared with provider</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button className="rounded-2xl" onClick={saveEntry}><Save className="mr-2 h-4 w-4" />{editingId ? "Update entry" : "Save entry"}</Button>
              {editingId && (
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => {
                    setEditingId(null);
                    setDraft({ title: "", content: "", visibility: "private" });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
            <div className="text-xs text-slate-500 border rounded-xl p-3 bg-slate-50">
              Private entries remain visible only to the client. Shared entries may be reviewed by the provider as part of therapeutic collaboration but are not automatically incorporated into psychotherapy notes.
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Your entries</CardTitle>
            <CardDescription>Newest first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[650px] overflow-auto">
            {entries.length === 0 && <p className="text-sm text-slate-500">No entries saved yet.</p>}
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{entry.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{entry.createdAt}</p>
                    <Badge className="rounded-xl mt-2" variant="secondary">
                      {entry.visibility === "shared" ? "Shared with provider" : "Private"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => editEntry(entry)}><Edit3 className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => deleteEntry(entry.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{entry.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function AffirmationsPage() {
  const [current, setCurrent] = useState(affirmations[0]);
  const refresh = () => setCurrent(affirmations[Math.floor(Math.random() * affirmations.length)]);
  return (
    <div>
      <SectionHeader
        title="Affirmations"
        description="Client-facing emotional support tool. This can later be personalized by diagnosis, treatment goals, or provider-created libraries."
      />
      <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-8 flex flex-col items-start justify-center min-h-[280px]">
            <Badge className="rounded-xl mb-4">Daily affirmation</Badge>
            <p className="text-2xl font-medium leading-relaxed">{current}</p>
            <Button className="rounded-2xl mt-6" onClick={refresh}><Sparkles className="mr-2 h-4 w-4" />Show another</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>How this expands later</CardTitle>
            <CardDescription>Future client engagement options</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-3">
            <p>Providers can assign affirmation themes by diagnosis, mood pattern, treatment phase, or session focus.</p>
            <p>Clients can bookmark meaningful affirmations and add reflections on what resonates or feels challenging.</p>
            <p>Affirmations can be delivered through scheduled prompts, check-ins, or journaling integrations.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function PsychoeducationPage() {
  const [query, setQuery] = useState("");
  const filtered = psychoeducationLibrary.filter((item) => `${item.title} ${item.topic} ${item.summary}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <SectionHeader
        title="Psychoeducation"
        description="Foundational education library for clients and providers. This can later pull from the production content store."
        right={
          <div className="relative w-full lg:w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 rounded-2xl" placeholder="Search articles" />
          </div>
        }
      />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <Card key={item.id} className="rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <Badge variant="secondary" className="rounded-xl mb-3">{item.topic}</Badge>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-slate-600 mt-2">{item.summary}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
function MessagingPage() {
  const { currentUser, store, updateCurrentUserData, appendAuditLog } = useAuth();
  const bucket = store.users[currentUser.id];
  const [draft, setDraft] = useState("");
  const send = () => {
    if (!draft.trim()) return;
    updateCurrentUserData("messages", (prev) => [
      {
        id: `message-${Date.now()}`,
        from: currentUser.role,
        text: draft,
        timestamp: new Date().toLocaleString(),
      },
      ...prev,
    ]);
    appendAuditLog({
      action: "Sent secure portal message",
      details: `Message sent from ${currentUser.role} portal.`,
      clientId: currentUser.role === "client" ? currentUser.id : "",
      clientName: currentUser.role === "client" ? currentUser.fullName : "",
      category: "Messaging",
    });
    setDraft("");
  };
  return (
    <div>
      <SectionHeader
        title="Messaging"
        description="This is a placeholder communication workflow. In production this should move to secure real-time messaging with strict access rules, logging, and HIPAA-focused controls."
      />
      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Conversation stream</CardTitle>
            <CardDescription>Prototype only</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[560px] overflow-auto">
            {bucket.messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
            {bucket.messages.map((m) => (
              <div key={m.id} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium capitalize">{m.from}</p>
                  <p className="text-xs text-slate-400">{m.timestamp}</p>
                </div>
                <p className="text-sm mt-2 whitespace-pre-wrap">{m.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Send message</CardTitle>
            <CardDescription>Prototype composer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[260px] rounded-2xl" placeholder="Type message..." />
            <Button className="rounded-2xl" onClick={send}><MessageSquare className="mr-2 h-4 w-4" />Send</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function extractRiskFlags(transcript = "") {
  const text = transcript.toLowerCase();
  const suicide = ["suicide", "kill myself", "end my life", "don't want to live", "want to die", "self-harm"].some((term) => text.includes(term));
  const violence = ["hurt someone", "violence", "fight", "assault", "weapon", "kill him", "kill her"].some((term) => text.includes(term));
  const substance = ["alcohol", "drinking", "drug", "weed", "cocaine", "opioid", "pills", "using again", "relapse"].some((term) => text.includes(term));
  return {
    suicide,
    violence,
    substance,
    summary: [
      suicide ? "Possible suicide/self-harm content detected" : null,
      violence ? "Possible violence/aggression content detected" : null,
      substance ? "Possible substance use content detected" : null,
    ].filter(Boolean),
  };
}
function buildSoapNote({ transcript = "", clientName = "Client", modality = "Supportive / Telehealth" }) {
  const clean = transcript.trim() || "No transcript provided.";
  return `S: ${clientName} participated in a telehealth session and described current symptoms, stressors, and functional concerns as reflected in the session transcript. Key client-reported content included: ${clean}
O: Client was present for the scheduled telehealth session. Engagement, responsiveness, and verbal participation were sufficient for clinical discussion. Telehealth modality and session logistics were documented separately in the telehealth record.
A: Clinical themes were reviewed with attention to symptom burden, psychosocial stressors, functional impact, coping capacity, and treatment engagement. This session was conducted within a ${modality} framework. Provider should further refine diagnostic formulation, risk assessment, and response to intervention as clinically indicated.
P: Continue ongoing treatment, reinforce coping strategies reviewed in session, monitor symptom progression and functional impairment, and follow up on identified risk factors, homework, referrals, and care coordination needs.`;
}
function buildIntakeFromTranscript({ transcript = "", clientName = "Client" }) {
  const clean = transcript.trim() || "No transcript provided.";
  return {
    presentingProblem: `${clientName} described current concerns, symptoms, and life impact during telehealth intake discussion. Transcript-derived summary: ${clean}`,
    treatmentGoals: "Initial treatment goals may include symptom reduction, improved coping, improved daily functioning, emotional regulation, and stabilization of identified psychosocial stressors. Provider should individualize and refine goals based on clinical judgment.",
    biopsychosocialSummary: `Biopsychosocial intake summary generated from telehealth transcript: ${clean}`,
  };
}
function buildSessionSummary({ transcript = "", clientName = "Client" }) {
  const clean = transcript.trim() || "No transcript provided.";
  return `${clientName} attended a telehealth session and discussed current stressors, symptoms, and treatment-related concerns. Main themes included: ${clean} Provider and client reviewed coping strategies, current functioning, and next steps.`;
}
function buildInsuranceReadyDocumentation({ transcript = "", modality = "Telehealth" }) {
  const clean = transcript.trim() || "No transcript provided.";
  return `Service Type: Psychotherapy
Delivery Mode: ${modality}
Medical Necessity Summary: Client presented with clinically relevant symptoms and psychosocial stressors requiring ongoing behavioral health intervention.
Interventions: Supportive clinical assessment, symptom review, coping strategy reinforcement, treatment planning, and risk screening as indicated.
Functional Impact: Session content indicated ongoing emotional and/or functional impairment requiring continued treatment.
Progress / Response: Provider should individualize response-to-treatment summary based on clinical review of the transcript.
Transcript-derived clinical content: ${clean}`;
}
function buildDetailedBiopsychosocial({ transcript = "", clientName = "Client", modality = "Telehealth" }) {
  const clean = transcript.trim() || "No transcript or Spruce summary provided.";
  return `Comprehensive Biopsychosocial Assessment Draft

Client / Identifying Information:
Client Name: ${clientName}
Source / Modality: ${modality}
Date: ${new Date().toLocaleDateString()}
Referral / Presenting Context: Provider to complete referral source, reason for service, and client-stated goals.

Demographics and Living Situation:
Provider to document age, pronouns, language, culture, race/ethnicity as clinically relevant, household composition, housing stability, transportation, employment/school status, and current support needs.

Presenting Problem and Current Symptoms:
Transcript-derived content: ${clean}
Provider to refine onset, duration, frequency, intensity, triggers, functional impairment, and client's own description of the problem.

Mental Health History:
Provider to document prior therapy, psychiatric hospitalizations, crisis episodes, prior diagnoses, medication history, previous treatment response, and current behavioral health providers.

Medical / Biological History:
Provider to document medical conditions, current medications, allergies, sleep, appetite, pain, pregnancy/postpartum considerations when applicable, disability status, and relevant primary-care coordination.

Substance Use History:
Provider to document alcohol, cannabis, nicotine, prescribed medication misuse, illicit substance use, frequency, quantity, consequences, withdrawal/tolerance, treatment history, and stage of change.

Family and Social History:
Provider to document family composition, attachment/support patterns, relationship concerns, parenting/caregiver role, social supports, isolation, community connection, cultural/spiritual factors, and family mental-health/substance-use history.

Developmental / Educational / Occupational History:
Provider to document developmental concerns, learning needs, school history, work history, job stressors, military history if applicable, and functional impact.

Trauma / Grief / Safety History:
Provider to document trauma exposure, loss history, domestic/interpersonal violence concerns, protective factors, coping, triggers, and client preference for trauma-sensitive pacing.

Risk Assessment:
Provider must complete current suicidal ideation, homicidal ideation, self-harm, violence risk, abuse/neglect concerns, access to means, protective factors, crisis plan, and level of care decision.

Mental Status / Clinical Presentation:
Provider to document appearance, behavior, speech, mood, affect, thought process/content, perception, cognition, insight, judgment, orientation, and engagement.

Strengths and Protective Factors:
Provider to document resilience, values, coping skills, family/community supports, faith/spirituality if relevant, motivation, insight, treatment engagement, and practical resources.

Diagnostic Impression / ICD-10-CM:
Primary Diagnosis: Provider to select.
Secondary Diagnosis: Provider to select if clinically indicated.
Tertiary Diagnosis: Provider to select if clinically indicated.
Rule-outs / Differential: Provider to complete.

Clinical Formulation:
Client presents with symptoms and psychosocial stressors requiring clinical intervention. Based on available transcript content, current concerns appear connected to symptom burden, environmental stressors, coping capacity, functional impairment, and treatment needs. Provider must refine predisposing, precipitating, perpetuating, and protective factors; diagnostic rationale; medical necessity; risk formulation; and culturally responsive treatment considerations.

Initial Treatment Recommendations:
Provider to define treatment frequency, modality, measurable goals, interventions, referrals, care coordination, safety planning, and next appointment plan.

Provider Review Required:
This draft is not final clinical documentation until reviewed, edited, and signed by the provider.`;
}
function buildInitialProgressNote({ transcript = "", clientName = "Client", modality = "Telehealth" }) {
  const clean = transcript.trim() || "No transcript or Spruce summary provided.";
  return `Initial Progress Note Draft

Client: ${clientName}
Service Modality: ${modality}
Session Type: Initial psychotherapy / clinical engagement session

Presenting Concerns:
${clean}

Clinical Focus:
Provider reviewed presenting concerns, current symptoms, psychosocial stressors, functional impact, treatment expectations, confidentiality/consent topics as appropriate, and initial goals for care.

Interventions Provided:
Clinical interviewing, rapport building, supportive reflection, symptom assessment, preliminary risk screening, psychoeducation as indicated, and treatment planning.

Client Response / Engagement:
Provider to document participation, affect, insight, motivation, barriers, strengths, and response to interventions.

Risk / Safety:
Provider to document suicide/self-harm, homicide/violence, abuse/neglect, substance-related concerns, protective factors, and safety plan/level-of-care decision.

Assessment / Clinical Impression:
Provider to refine diagnostic impression, medical necessity, functional impairment, and formulation after clinical review.

Plan:
Continue assessment/treatment planning, schedule follow-up, assign clinically appropriate homework if indicated, coordinate care with authorization, and update treatment plan once goals are finalized.

Provider Review Required:
This AI-assisted draft must be reviewed, edited, and signed before final chart use.`;
}
function buildFollowUpProgressNote({ transcript = "", clientName = "Client", modality = "Telehealth" }) {
  const clean = transcript.trim() || "No transcript or Spruce summary provided.";
  return `Follow-up Progress Note Draft

Client: ${clientName}
Service Modality: ${modality}
Session Type: Follow-up psychotherapy / continuing care session

Chief Complaint / Session Focus:
Provider to document current chief complaint, interval changes, symptom status, functional impact, and client-stated concerns.

Subjective / Client Report:
${clean}

Objective / Clinical Presentation:
Provider to document appearance, engagement, speech, mood/affect, thought process/content, orientation, insight, judgment, and relevant behavioral observations.

Interventions Provided:
Provider to document modality-specific interventions, skills practiced, psychoeducation, processing, problem-solving, safety planning, care coordination, and homework review.

Client Response / Progress:
Provider to document response to intervention, progress toward treatment goals, barriers, strengths, and readiness for next steps.

Risk / Safety:
Provider to document suicide/self-harm, homicide/violence, abuse/neglect, substance-related concerns, protective factors, and safety plan/level-of-care decision.

Assessment / Medical Necessity:
Provider to document diagnosis, clinical formulation update, impairment/need for continued care, and treatment rationale.

Plan:
Continue treatment, update homework/care coordination, review billing/session time, and schedule next appointment.

Provider Review Required:
This AI-assisted draft must be reviewed, edited, and signed before final chart use.`;
}function buildStructuredClinicalNote({ transcript = "", clientName = "Client", modality = "Telehealth", templateType = "Progress Note - SOAP" }) {
  const clean = transcript.trim() || "No transcript or Spruce summary provided.";
  const intakeDraft = buildIntakeFromTranscript({ transcript, clientName });
  const templateMap = {
    "Progress Note - SOAP": {
      title: "AI Scribe Progress Note - SOAP",
      noteType: "Medical Record Note",
      content: buildSoapNote({ transcript, clientName, modality }),
    },
    "Initial Progress Note": {
      title: "AI Scribe Initial Progress Note",
      noteType: "Initial Progress Note",
      content: buildInitialProgressNote({ transcript, clientName, modality }),
    },
    "Follow-up Progress Note": {
      title: "AI Scribe Follow-up Progress Note",
      noteType: "Follow-up Progress Note",
      content: buildFollowUpProgressNote({ transcript, clientName, modality }),
    },    "Biopsychosocial": {
      title: "AI Scribe Comprehensive Biopsychosocial Draft",
      noteType: "Biopsychosocial",
      intakeFields: intakeDraft,
      content: buildDetailedBiopsychosocial({ transcript, clientName, modality }),
    },
    "Psychosocial": {
      title: "AI Scribe Psychosocial Draft",
      noteType: "Psychosocial",
      content: `Psychosocial Draft

Client / Session:
${clientName} participated through ${modality}.

Current Stressors and Functional Impact:
${clean}

Social / Family / Environmental Factors:
Provider to document family supports, relationship patterns, household composition, housing, school/work, financial stressors, cultural/community supports, and barriers to care.

Strengths and Barriers:
Provider to identify protective factors, client strengths, treatment barriers, and coordination needs.

Clinical Impression:
Provider to complete final formulation and medical necessity language after review.`,
    },
    "Intake Session": {
      title: "AI Scribe Intake Session Draft",
      noteType: "Intake",
      intakeFields: intakeDraft,
      content: `Intake Session Draft

Presenting Problem:
${intakeDraft.presentingProblem}

Treatment Goals:
${intakeDraft.treatmentGoals}

Biopsychosocial Summary:
${intakeDraft.biopsychosocialSummary}

Provider Review Required:
Provider must verify demographics, history, diagnosis, risk, medical necessity, consent status, clinical formulation, and plan before signing.`,
    },
    "Treatment Plan Update": {
      title: "AI Scribe Treatment Plan Update",
      noteType: "Treatment Plan Update",
      content: `Treatment Plan Update Draft

Client:
${clientName}

Session / Source:
${modality}

Progress and Barriers:
${clean}

Updated Goals:
Provider to refine measurable goals based on session content and current functioning.

Interventions:
Provider to document interventions used and planned.

Next Steps:
Continue treatment planning, monitor risk and functioning, assign homework or care coordination tasks as clinically indicated.`,
    },
  };
  return templateMap[templateType] || templateMap["Progress Note - SOAP"];
}function SchedulingPage() {
  const { currentUser, store, updateCurrentUserData, appendAuditLog } = useAuth();
  const appointments = store.users[currentUser.id].appointments || [];
  const [draft, setDraft] = useState({ date: "", time: "", format: "Telehealth", purpose: "Follow-up psychotherapy" });
  const add = () => {
    if (!draft.date || !draft.time) return;
    updateCurrentUserData("appointments", (prev) => [{ id: `appt-${Date.now()}`, ...draft }, ...prev]);
    appendAuditLog({
      action: "Added appointment item",
      details: `${draft.purpose} scheduled for ${draft.date} at ${draft.time}.`,
      clientId: currentUser.role === "client" ? currentUser.id : "",
      clientName: currentUser.role === "client" ? currentUser.fullName : "",
      category: "Scheduling",
    });
    setDraft({ date: "", time: "", format: "Telehealth", purpose: "Follow-up psychotherapy" });
  };
  return (
    <div>
      <SectionHeader
        title="Scheduling"
        description="Scheduling scaffold for future calendar integration, provider availability management, and client booking."
      />
      <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Add appointment item</CardTitle>
            <CardDescription>Prototype scheduler</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            <Input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
            <Select value={draft.format} onValueChange={(value) => setDraft({ ...draft, format: value })}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Telehealth">Telehealth</SelectItem>
                <SelectItem value="In Person">In Person</SelectItem>
                <SelectItem value="Phone">Phone</SelectItem>
              </SelectContent>
            </Select>
            <Input value={draft.purpose} onChange={(e) => setDraft({ ...draft, purpose: e.target.value })} placeholder="Purpose" />
            <Button className="rounded-2xl" onClick={add}><Plus className="mr-2 h-4 w-4" />Add appointment</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Appointment list</CardTitle>
            <CardDescription>Prototype display</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[560px] overflow-auto">
            {appointments.length === 0 && <p className="text-sm text-slate-500">No appointments yet.</p>}
            {appointments.map((appt) => (
              <div key={appt.id} className="rounded-2xl border p-4">
                <p className="font-medium">{appt.purpose}</p>
                <p className="text-sm text-slate-600 mt-1">{appt.date} at {appt.time}</p>
                <p className="text-xs text-slate-400 mt-1">{appt.format}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function TelehealthPage() {
  const { currentUser, store, updateCurrentUserData, updateSpecificUserData, appendAuditLog } = useAuth();
  const isProvider = currentUser.role === "provider";
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.[0] || currentUser.id);
  const activeClientId = isProvider ? selectedClientId : currentUser.id;
  const activeClient = store.users[activeClientId];
  const telehealthLog = activeClient?.telehealth || [];
  const [sessionForm, setSessionForm] = useState({
    sessionType: "Video",
    dialNumber: "",
    platform: "Secure video room",
    consentObtained: false,
    consentVerbiage: "Client provided verbal consent for telehealth services. Audio and visual connection were reviewed, privacy limitations were discussed, and the client agreed to proceed.",
    recordingConsent: false,
    recordingVerbiage: "Client gave explicit consent for temporary recording/transcription to support clinical documentation. Audio is temporary only and will be deleted overnight or no later than the next business day unless a documented legal or clinical exception requires retention.",
    languageUsed: "English",
    interpreterNeeded: false,
    interpreterType: "Professional Interpreter",
    interpreterName: "",
    translationNotes: "",
    technicalNotes: "",
  });
  const [copyNotice, setCopyNotice] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [generatedDocs, setGeneratedDocs] = useState(null);
  const [scribeTemplate, setScribeTemplate] = useState("Progress Note - SOAP");
  const audioRetentionPolicy = "Temporary audio only. Delete overnight or no later than the next business day after documentation review. Final signed note, consent record, and audit log remain in the EHR.";
  const [scribeSeconds, setScribeSeconds] = useState(0);
  const [isScribeTimerRunning, setIsScribeTimerRunning] = useState(false);
  const [scribeDiagnosisSearch, setScribeDiagnosisSearch] = useState("");
  const [scribeDiagnosisTarget, setScribeDiagnosisTarget] = useState("primaryDiagnosis");
  const [scribeBillingSearch, setScribeBillingSearch] = useState("");
  const [scribeMeta, setScribeMeta] = useState({
    chiefComplaint: "",
    onset: "",
    primaryDiagnosis: "",
    secondaryDiagnosis: "",
    tertiaryDiagnosis: "",
    serviceCode: "90837 | CPT | Psychotherapy, 60 minutes",
    interpreterCode: "",
    manualMinutes: "",
    providerSignature: PRACTITIONER_NAME,
    clientSignature: "",
  });
  const scribeDiagnosisMatches = diagnosisCodeOptions.filter((item) => {
    const query = scribeDiagnosisSearch.trim().toLowerCase();
    return query && `${item.code} ${item.label} ${item.keywords}`.toLowerCase().includes(query);
  }).slice(0, 6);
  const scribeBillingMatches = billingCodeOptions.filter((item) => {
    const query = scribeBillingSearch.trim().toLowerCase();
    return query && `${item.code} ${item.type} ${item.label} ${item.keywords}`.toLowerCase().includes(query);
  }).slice(0, 6);
  useEffect(() => {
    if (!isScribeTimerRunning) return;
    const id = window.setInterval(() => setScribeSeconds((prev) => prev + 1), 1000);
    return () => window.clearInterval(id);
  }, [isScribeTimerRunning]);
  const formattedScribeTimer = `${String(Math.floor(scribeSeconds / 3600)).padStart(2, "0")}:${String(Math.floor((scribeSeconds % 3600) / 60)).padStart(2, "0")}:${String(scribeSeconds % 60).padStart(2, "0")}`;
  const scribeSessionMinutes = scribeMeta.manualMinutes || (scribeSeconds ? String(Math.ceil(scribeSeconds / 60)) : "");
  const scribeMetadataBlock = () => [
    `Chief complaint / reason for visit: ${scribeMeta.chiefComplaint || "Not entered"}`,
    `Onset / duration: ${scribeMeta.onset || "Not entered"}`,
    `Session minutes: ${scribeSessionMinutes || "Not entered"}`,
    `Primary ICD-10-CM: ${scribeMeta.primaryDiagnosis || "Not selected"}`,
    `Secondary ICD-10-CM: ${scribeMeta.secondaryDiagnosis || "Not selected"}`,
    `Tertiary ICD-10-CM: ${scribeMeta.tertiaryDiagnosis || "Not selected"}`,
    `Service / CPT-HCPCS: ${scribeMeta.serviceCode || "Not selected"}`,
    `Interpreter service code: ${scribeMeta.interpreterCode || "Not used"}`,
    `Provider e-signature: ${scribeMeta.providerSignature || "Not signed"}`,
    `Client e-signature: ${scribeMeta.clientSignature || "Not signed / not required"}`,
  ].join("\n");
  const applyScribeDiagnosisCode = (item) => {
    setScribeMeta((prev) => ({ ...prev, [scribeDiagnosisTarget]: `${item.code} | ${item.label}` }));
  };
  const handleScribeTemplateChange = (value) => {
    setScribeTemplate(value);
    setScribeMeta((prev) => {
      if (value === "Biopsychosocial" || value === "Intake Session") {
        return { ...prev, manualMinutes: prev.manualMinutes || "90", serviceCode: "90791 | CPT | Psychiatric diagnostic evaluation / intake / biopsychosocial assessment" };
      }
      if (value === "Initial Progress Note") {
        return { ...prev, manualMinutes: prev.manualMinutes || "60", serviceCode: "90791 | CPT | Psychiatric diagnostic evaluation / intake / biopsychosocial assessment" };
      }
      return { ...prev, serviceCode: prev.serviceCode || "90837 | CPT | Psychotherapy, 60 minutes" };
    });
  };
  const buildGeneratedClinicalDocumentation = () => {
    const clientName = activeClient?.profile?.fullName || "Client";
    const modality = `${sessionForm.sessionType} Telehealth`;
    const riskFlags = extractRiskFlags(transcriptText);
    const baseIntakeDraft = buildIntakeFromTranscript({ transcript: transcriptText, clientName });
    const metadata = scribeMetadataBlock();
    const intakeDraft = {
      ...baseIntakeDraft,
      presentingProblem: `Chief Complaint / Reason for Visit: ${scribeMeta.chiefComplaint || "Not entered"}\nOnset / Duration: ${scribeMeta.onset || "Not entered"}\n\n${baseIntakeDraft.presentingProblem}`,
      biopsychosocialSummary: `${baseIntakeDraft.biopsychosocialSummary}\n\nClinical metadata:\n${metadata}`,
    };
    const structuredBase = buildStructuredClinicalNote({ transcript: transcriptText, clientName, modality, templateType: scribeTemplate });
    const structuredNote = {
      ...structuredBase,
      intakeFields: structuredBase.intakeFields ? intakeDraft : structuredBase.intakeFields,
      content: `${metadata}\n\n${structuredBase.content}`,
      scribeMeta: { ...scribeMeta, sessionMinutes: scribeSessionMinutes },
    };
    return {
      soapNote: `${metadata}\n\n${buildSoapNote({ transcript: transcriptText, clientName, modality })}`,
      structuredNote,
      intakeDraft,
      riskFlags,
      sessionSummary: buildSessionSummary({ transcript: transcriptText, clientName }),
      insuranceReady: `${metadata}\n\n${buildInsuranceReadyDocumentation({ transcript: transcriptText, modality })}`,
      scribeMeta: { ...scribeMeta, sessionMinutes: scribeSessionMinutes },
    };
  };
  const saveTelehealthEntry = () => {
    if (!activeClientId) return;
    const entry = {
      id: `telehealth-${Date.now()}`,
      createdAt: new Date().toLocaleString(),
      sessionType: sessionForm.sessionType,
      dialNumber: sessionForm.dialNumber,
      platform: sessionForm.platform,
      consentObtained: sessionForm.consentObtained,
      consentVerbiage: sessionForm.consentVerbiage,
      recordingConsent: sessionForm.recordingConsent,
      recordingVerbiage: sessionForm.recordingVerbiage,
      languageUsed: sessionForm.languageUsed,
      interpreterNeeded: sessionForm.interpreterNeeded,
      interpreterType: sessionForm.interpreterType,
      interpreterName: sessionForm.interpreterName,
      translationNotes: sessionForm.translationNotes,
      technicalNotes: sessionForm.technicalNotes,
      audioRetentionPolicy,
      enteredBy: currentUser.fullName,
    };
    if (isProvider) {
      updateSpecificUserData(activeClientId, "telehealth", (prev) => [entry, ...((prev || []))]);
    } else {
      updateCurrentUserData("telehealth", (prev) => [entry, ...((prev || []))]);
    }
    appendAuditLog({
      action: "Saved telehealth session entry",
      details: `${sessionForm.sessionType} telehealth entry saved with consent and recording documentation.`,
      clientId: activeClientId,
      clientName: activeClient?.profile?.fullName || "Client",
      category: "Telehealth",
    });
  };
  const copyConsentText = async () => {
    try {
      await navigator.clipboard.writeText(`${sessionForm.consentVerbiage}
${sessionForm.recordingVerbiage}`);
      setCopyNotice("Telehealth consent and recording text copied.");
      setTimeout(() => setCopyNotice(""), 2500);
    } catch {
      setCopyNotice("Copy is not available in this preview.");
      setTimeout(() => setCopyNotice(""), 2500);
    }
  };
  const generateClinicalDocumentation = () => {
    const docs = buildGeneratedClinicalDocumentation();
    setGeneratedDocs(docs);
    appendAuditLog({
      action: "Generated AI telehealth documentation",
      details: `${scribeTemplate} draft generated with mapped chief complaint, onset, time, ICD diagnosis, CPT/HCPCS billing, consent, and signature fields. Audio retention policy: ${audioRetentionPolicy}`,
      clientId: activeClientId,
      clientName: activeClient?.profile?.fullName || "Client",
      category: "Telehealth AI",
    });
  };
  const copyTextBlock = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice(`${label} copied.`);
      setTimeout(() => setCopyNotice(""), 2500);
    } catch {
      setCopyNotice("Copy is not available in this preview.");
      setTimeout(() => setCopyNotice(""), 2500);
    }
  };
  const saveStructuredDraftToChart = () => {
    if (!generatedDocs?.structuredNote || !activeClientId) return;
    const structured = generatedDocs.structuredNote;
    updateSpecificUserData(activeClientId, "notes", (prev) => [
      {
        id: `note-scribe-${Date.now()}`,
        title: structured.title,
        content: `Provider Review Required: AI-generated draft must be reviewed, edited, and signed by the provider before final use.\nAudio Retention Policy: ${audioRetentionPolicy}\n\n${structured.content}`,
        modality: sessionForm.sessionType === "Video" ? "Telehealth" : "Audio Telehealth",
        noteType: structured.noteType,
        status: "Provider review required",
        audioRetentionPolicy,
        createdAt: new Date().toLocaleString(),
      },
      ...((prev || [])),
    ]);
    if (structured.intakeFields) {
      const currentIntake = activeClient?.intake || {};
      updateSpecificUserData(activeClientId, "intake", {
        ...currentIntake,
        presentingProblem: structured.intakeFields.presentingProblem,
        treatmentGoals: currentIntake.treatmentGoals || structured.intakeFields.treatmentGoals,
        biopsychosocialSummary: structured.intakeFields.biopsychosocialSummary,
        scribeUpdatedAt: new Date().toLocaleString(),
      });
    }
    appendAuditLog({
      action: "Saved AI scribe draft to client chart",
      details: `${structured.noteType} draft saved to chart for provider review. ${audioRetentionPolicy}`,
      clientId: activeClientId,
      clientName: activeClient?.profile?.fullName || "Client",
      category: "EHR Scribe",
    });
    setCopyNotice("Generated draft saved into the client chart for provider review/signature. Temporary audio remains governed by overnight/next-business-day deletion policy.");
    setTimeout(() => setCopyNotice(""), 4000);
  };
  const mergeScribeToEhr = () => {
    if (!activeClientId) return;
    const requiredMissing = [
      !scribeMeta.chiefComplaint.trim() ? "chief complaint / reason for visit" : null,
      !scribeSessionMinutes ? "session time" : null,
      !scribeMeta.primaryDiagnosis ? "primary ICD diagnosis" : null,
      !scribeMeta.serviceCode ? "billing CPT/HCPCS code" : null,
    ].filter(Boolean);
    if (requiredMissing.length) {
      setCopyNotice(`Missing required fields before merging to EHR: ${requiredMissing.join(", ")}.`);
      setTimeout(() => setCopyNotice(""), 4000);
      return;
    }
    const docs = buildGeneratedClinicalDocumentation();
    const structured = docs.structuredNote;
    setGeneratedDocs(docs);
    updateSpecificUserData(activeClientId, "notes", (prev) => [
      {
        id: `note-scribe-merge-${Date.now()}`,
        title: structured.title,
        content: `Provider Review Required: AI-generated draft must be reviewed, edited, and signed by the provider before final use.\nAudio Retention Policy: ${audioRetentionPolicy}\n\n${structured.content}`,
        modality: sessionForm.sessionType === "Video" ? "Telehealth" : "Audio Telehealth",
        noteType: structured.noteType,
        status: "Merged to EHR - provider review required",
        sessionMinutes: scribeSessionMinutes,
        codeDraft: docs.scribeMeta,
        signature: {
          provider: scribeMeta.providerSignature || "",
          client: scribeMeta.clientSignature || "",
          signedAt: new Date().toLocaleString(),
        },
        audioRetentionPolicy,
        createdAt: new Date().toLocaleString(),
      },
      ...((prev || [])),
    ]);
    const currentIntake = activeClient?.intake || {};
    updateSpecificUserData(activeClientId, "intake", {
      ...currentIntake,
      chiefComplaint: scribeMeta.chiefComplaint,
      onset: scribeMeta.onset,
      presentingProblem: docs.intakeDraft.presentingProblem,
      treatmentGoals: currentIntake.treatmentGoals || docs.intakeDraft.treatmentGoals,
      biopsychosocialSummary: docs.intakeDraft.biopsychosocialSummary,
      diagnoses: [scribeMeta.primaryDiagnosis, scribeMeta.secondaryDiagnosis, scribeMeta.tertiaryDiagnosis].filter(Boolean),
      billingCodes: [scribeMeta.serviceCode, scribeMeta.interpreterCode].filter(Boolean),
      sessionMinutes: scribeSessionMinutes,
      scribeUpdatedAt: new Date().toLocaleString(),
    });
    if (scribeTemplate === "Treatment Plan Update") {
      updateSpecificUserData(activeClientId, "treatmentPlans", (prev) => [
        {
          id: `plan-scribe-${Date.now()}`,
          problem: scribeMeta.chiefComplaint || "AI transcriber treatment plan update",
          longTermGoal: "Review and refine with provider.",
          shortTermGoal: "Review and refine with provider.",
          intervention: docs.structuredNote.content,
          createdAt: new Date().toLocaleString(),
        },
        ...((prev || [])),
      ]);
    }
    if (docs.riskFlags.summary.length > 0) {
      updateSpecificUserData(activeClientId, "documents", (prev) => [
        {
          id: `risk-scribe-${Date.now()}`,
          title: "AI Transcriber Risk Flag Review",
          type: "Clinical Document",
          status: "Draft",
          viewedAt: "",
          signature: null,
          uploadedFileName: "",
          createdAt: new Date().toLocaleString(),
          category: "Risk Review",
          generatedLetterText: docs.riskFlags.summary.join("\n"),
        },
        ...((prev || [])),
      ]);
    }
    appendAuditLog({
      action: "Merged AI transcriber fields to EHR",
      details: `${scribeTemplate} merged into Progress Notes, Intake/Biopsychosocial fields, diagnosis, billing, time, and signature metadata.`,
      clientId: activeClientId,
      clientName: activeClient?.profile?.fullName || "Client",
      category: "EHR Scribe",
    });
    setCopyNotice("AI transcriber fields merged to EHR: note, intake/biopsychosocial fields, diagnosis, billing, time, and signatures are in the chart for provider review.");
    setTimeout(() => setCopyNotice(""), 5000);
  };
  const pushToProgressNotes = () => {
    if (!generatedDocs || !activeClientId) return;
    updateSpecificUserData(activeClientId, "notes", (prev) => [
      {
        id: `note-ai-${Date.now()}`,
        title: "AI Telehealth SOAP Note",
        content: generatedDocs.soapNote,
        modality: sessionForm.sessionType === "Video" ? "Telehealth" : "Audio Telehealth",
        noteType: "Medical Record Note",
        createdAt: new Date().toLocaleString(),
      },
      ...prev,
    ]);
    appendAuditLog({
      action: "Saved telehealth AI documentation to progress notes",
      details: "SOAP note generated from transcript and saved as medical record note.",
      clientId: activeClientId,
      clientName: activeClient?.profile?.fullName || "Client",
      category: "Telehealth AI",
    });
    setCopyNotice("SOAP note saved to Progress Notes for provider review/signature.");
    setTimeout(() => setCopyNotice(""), 2500);
  };
  const pushToIntake = () => {
    if (!generatedDocs || !activeClientId) return;
    const currentIntake = activeClient?.intake || {};
    updateSpecificUserData(activeClientId, "intake", {
      ...currentIntake,
      presentingProblem: generatedDocs.intakeDraft.presentingProblem,
      treatmentGoals: currentIntake.treatmentGoals || generatedDocs.intakeDraft.treatmentGoals,
      biopsychosocialSummary: generatedDocs.intakeDraft.biopsychosocialSummary,
    });
    appendAuditLog({
      action: "Saved telehealth AI documentation to intake",
      details: "Transcript-derived intake summary saved to intake fields.",
      clientId: activeClientId,
      clientName: activeClient?.profile?.fullName || "Client",
      category: "Telehealth AI",
    });
    setCopyNotice("Transcript summary saved to Intake and Biopsychosocial fields.");
    setTimeout(() => setCopyNotice(""), 2500);
  };
  const pushRiskFlagsToDocuments = () => {
    if (!generatedDocs || !activeClientId) return;
    updateSpecificUserData(activeClientId, "documents", (prev) => [
      {
        id: `risk-ai-${Date.now()}`,
        title: "AI Risk Flag Review",
        type: "Clinical Document",
        status: "Draft",
        viewedAt: "",
        signature: null,
        uploadedFileName: "",
        createdAt: new Date().toLocaleString(),
        category: "Risk Review",
        generatedLetterText: generatedDocs.riskFlags.summary.length
          ? generatedDocs.riskFlags.summary.join("\n")
          : "No automatic risk flags detected from transcript text.",
      },
      ...(activeClient?.documents || []),
    ]);
    appendAuditLog({
      action: "Saved telehealth AI risk review to chart documents",
      details: "Risk flag review saved to the document library for provider follow-up.",
      clientId: activeClientId,
      clientName: activeClient?.profile?.fullName || "Client",
      category: "Telehealth AI",
    });
    setCopyNotice("Risk review saved to Document Library.");
    setTimeout(() => setCopyNotice(""), 2500);
  };
  return (
    <div>
      <SectionHeader
        title="Telehealth"
        description="Audio/visual session workflow with consent, Spruce-supported transcript intake, EHR scribe note generation, overnight audio deletion policy, and telehealth chart history."
      />
      {copyNotice && <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{copyNotice}</div>}
      <div className="grid xl:grid-cols-[1fr_1fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Telehealth session setup</CardTitle>
            <CardDescription>Document modality, consent, recording language, interpreter use, and technical details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isProvider && (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={sessionForm.sessionType} onValueChange={(value) => setSessionForm({ ...sessionForm, sessionType: value })}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Video">Video session</SelectItem>
                <SelectItem value="Audio Only">Audio only</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid md:grid-cols-2 gap-3">
              <Input value={sessionForm.platform} onChange={(e) => setSessionForm({ ...sessionForm, platform: e.target.value })} placeholder="Video platform / room" />
              <Input value={sessionForm.dialNumber} onChange={(e) => setSessionForm({ ...sessionForm, dialNumber: e.target.value })} placeholder="Dialer / call-back number" />
            </div>
            <label className="rounded-2xl border p-3 flex items-center gap-3 text-sm">
              <input type="checkbox" checked={sessionForm.consentObtained} onChange={(e) => setSessionForm({ ...sessionForm, consentObtained: e.target.checked })} />
              Telehealth consent obtained verbally
            </label>
            <Textarea value={sessionForm.consentVerbiage} onChange={(e) => setSessionForm({ ...sessionForm, consentVerbiage: e.target.value })} className="min-h-[110px] rounded-2xl" placeholder="Telehealth consent verbiage" />
            <label className="rounded-2xl border p-3 flex items-center gap-3 text-sm">
              <input type="checkbox" checked={sessionForm.recordingConsent} onChange={(e) => setSessionForm({ ...sessionForm, recordingConsent: e.target.checked })} />
              Recording consent obtained
            </label>
            <Textarea value={sessionForm.recordingVerbiage} onChange={(e) => setSessionForm({ ...sessionForm, recordingVerbiage: e.target.value })} className="min-h-[110px] rounded-2xl" placeholder="Recording disclosure / verbiage" />
            <div className="grid md:grid-cols-2 gap-3">
              <Input value={sessionForm.languageUsed} onChange={(e) => setSessionForm({ ...sessionForm, languageUsed: e.target.value })} placeholder="Language used in session" />
              <Input value={sessionForm.interpreterName} onChange={(e) => setSessionForm({ ...sessionForm, interpreterName: e.target.value })} placeholder="Interpreter / translator name" />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="rounded-2xl border p-3 flex items-center gap-3 text-sm">
                <input type="checkbox" checked={sessionForm.interpreterNeeded} onChange={(e) => setSessionForm({ ...sessionForm, interpreterNeeded: e.target.checked })} />
                Interpreter or translator used
              </label>
              <Select value={sessionForm.interpreterType} onValueChange={(value) => setSessionForm({ ...sessionForm, interpreterType: value })}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional Interpreter">Professional Interpreter</SelectItem>
                  <SelectItem value="Bilingual Provider">Bilingual Provider</SelectItem>
                  <SelectItem value="Family / Support Person">Family / Support Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea value={sessionForm.translationNotes} onChange={(e) => setSessionForm({ ...sessionForm, translationNotes: e.target.value })} className="min-h-[90px] rounded-2xl" placeholder="Translation / interpreter notes, language access details, communication barriers, accommodations" />
            <Textarea value={sessionForm.technicalNotes} onChange={(e) => setSessionForm({ ...sessionForm, technicalNotes: e.target.value })} className="min-h-[90px] rounded-2xl" placeholder="Technical notes, privacy verification, audio/video quality, interruptions" />
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl" onClick={saveTelehealthEntry}><Mic className="mr-2 h-4 w-4" />Save telehealth entry</Button>
              <Button variant="outline" className="rounded-2xl" onClick={copyConsentText}><Copy className="mr-2 h-4 w-4" />Copy consent text</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>EHR clinical scribe</CardTitle>
            <CardDescription>Use Spruce transcript/summary or EHR-recorded transcript to generate structured note fields directly inside the client chart.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600 space-y-1">
              <p className="font-medium text-slate-800">Consent and retention rule</p>
              <p>Recording/AI scribe consent must be documented before audio is used for note generation.</p>
              <p>{audioRetentionPolicy}</p>
            </div>
            <Select value={scribeTemplate} onValueChange={handleScribeTemplateChange}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Progress Note - SOAP">Progress Note - SOAP</SelectItem>
                <SelectItem value="Initial Progress Note">Initial Progress Note</SelectItem>
                <SelectItem value="Follow-up Progress Note">Follow-up Progress Note</SelectItem>
                <SelectItem value="Biopsychosocial">Biopsychosocial</SelectItem>
                <SelectItem value="Psychosocial">Psychosocial</SelectItem>
                <SelectItem value="Intake Session">Intake Session</SelectItem>
                <SelectItem value="Treatment Plan Update">Treatment Plan Update</SelectItem>
              </SelectContent>
            </Select>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
              <p className="text-sm font-medium text-slate-900">Scribe timing and EHR merge fields</p>
              <div className="grid md:grid-cols-2 gap-3">
                <Input label="Chief Complaint / Reason for Visit" value={scribeMeta.chiefComplaint} onChange={(e) => setScribeMeta({ ...scribeMeta, chiefComplaint: e.target.value })} placeholder="Chief complaint / reason for visit" />
                <Input label="Onset / Duration" value={scribeMeta.onset} onChange={(e) => setScribeMeta({ ...scribeMeta, onset: e.target.value })} placeholder="Onset / duration" />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-white p-3 space-y-2">
                  <p className="text-sm font-medium">Transcriber timer</p>
                  <p className="text-2xl font-semibold">{formattedScribeTimer}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" className="rounded-2xl" onClick={() => setIsScribeTimerRunning((value) => !value)}>{isScribeTimerRunning ? "Pause" : "Start"}</Button>
                    <Button type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => { setIsScribeTimerRunning(false); setScribeSeconds(0); }}>Reset</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Session Minutes (manual or timer)</label>
                  <Input value={scribeMeta.manualMinutes} onChange={(e) => setScribeMeta({ ...scribeMeta, manualMinutes: e.target.value })} placeholder="Enter minutes manually, e.g. 90" />
                  <p className="text-xs text-slate-500">Merged minutes: {scribeSessionMinutes || "Not entered"}</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <Input label="Primary ICD-10-CM Diagnosis" value={scribeMeta.primaryDiagnosis} onChange={(e) => setScribeMeta({ ...scribeMeta, primaryDiagnosis: e.target.value })} placeholder="Primary ICD-10-CM" />
                <Input label="Secondary ICD-10-CM Diagnosis" value={scribeMeta.secondaryDiagnosis} onChange={(e) => setScribeMeta({ ...scribeMeta, secondaryDiagnosis: e.target.value })} placeholder="Secondary ICD-10-CM" />
                <Input label="Tertiary ICD-10-CM Diagnosis" value={scribeMeta.tertiaryDiagnosis} onChange={(e) => setScribeMeta({ ...scribeMeta, tertiaryDiagnosis: e.target.value })} placeholder="Tertiary ICD-10-CM" />
              </div>
              <div className="grid md:grid-cols-[0.8fr_1.2fr] gap-3">
                <Select value={scribeDiagnosisTarget} onValueChange={setScribeDiagnosisTarget}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primaryDiagnosis">Apply to primary diagnosis</SelectItem>
                    <SelectItem value="secondaryDiagnosis">Apply to secondary diagnosis</SelectItem>
                    <SelectItem value="tertiaryDiagnosis">Apply to tertiary diagnosis</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={scribeDiagnosisSearch} onChange={(e) => setScribeDiagnosisSearch(e.target.value)} placeholder="Type ICD code or diagnosis keyword" />
              </div>
              {scribeDiagnosisMatches.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {scribeDiagnosisMatches.map((item) => (
                    <Button key={item.code} type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => applyScribeDiagnosisCode(item)}>{item.code} | {item.label}</Button>
                  ))}
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                <Input label="CPT / HCPCS Service Code" value={scribeMeta.serviceCode} onChange={(e) => setScribeMeta({ ...scribeMeta, serviceCode: e.target.value })} placeholder="CPT/HCPCS service code" />
                <Input label="Interpreter Code" value={scribeMeta.interpreterCode} onChange={(e) => setScribeMeta({ ...scribeMeta, interpreterCode: e.target.value })} placeholder="Interpreter code, if used" />
              </div>
              <Input value={scribeBillingSearch} onChange={(e) => setScribeBillingSearch(e.target.value)} placeholder="Type billing keyword, e.g. bio, intake, 60, interpreter" />
              {scribeBillingMatches.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {scribeBillingMatches.map((item) => (
                    <Button key={`${item.type}-${item.code}`} type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => item.code === "T1013" ? setScribeMeta({ ...scribeMeta, interpreterCode: `${item.code} | ${item.type} | ${item.label}` }) : setScribeMeta({ ...scribeMeta, serviceCode: `${item.code} | ${item.type} | ${item.label}` })}>{item.code} | {item.label}</Button>
                  ))}
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                <Input label="Provider Electronic Signature" value={scribeMeta.providerSignature} onChange={(e) => setScribeMeta({ ...scribeMeta, providerSignature: e.target.value })} placeholder="Provider electronic signature" />
                <Input label="Client Electronic Signature" value={scribeMeta.clientSignature} onChange={(e) => setScribeMeta({ ...scribeMeta, clientSignature: e.target.value })} placeholder="Client electronic signature, if required" />
              </div>
              <p className="text-xs text-slate-500">Merge writes matching fields into Progress Notes and Intake/Biopsychosocial. Treatment plan templates also create a plan draft.</p>
            </div>
            <Textarea value={transcriptText} onChange={(e) => setTranscriptText(e.target.value)} className="min-h-[180px] rounded-2xl" placeholder="Paste Spruce transcript/summary or EHR session transcript here. The EHR maps it into the selected note template fields." />
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl" onClick={generateClinicalDocumentation}><Sparkles className="mr-2 h-4 w-4" />Generate mapped note draft</Button>
              <Button variant="outline" className="rounded-2xl" onClick={mergeScribeToEhr}><Save className="mr-2 h-4 w-4" />Merge to EHR fields</Button>
              <Button variant="outline" className="rounded-2xl" disabled={!generatedDocs} onClick={saveStructuredDraftToChart}>Save generated draft to chart</Button>
            </div>
            {generatedDocs && (
              <div className="space-y-4 pt-2">
                <Card className="rounded-2xl border shadow-none">
                  <CardHeader><CardTitle className="text-base">Structured EHR note draft</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border bg-slate-50 p-4 text-sm whitespace-pre-wrap">{generatedDocs.structuredNote?.content || generatedDocs.soapNote}</div>
                    <Button variant="outline" className="rounded-2xl" onClick={saveStructuredDraftToChart}>Save structured draft to chart</Button>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border shadow-none">
                  <CardHeader><CardTitle className="text-base">Intake / biopsychosocial field mapping</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border bg-slate-50 p-4 text-sm whitespace-pre-wrap">{`Presenting Problem:
${generatedDocs.intakeDraft.presentingProblem}

Treatment Goals:
${generatedDocs.intakeDraft.treatmentGoals}

Biopsychosocial Summary:
${generatedDocs.intakeDraft.biopsychosocialSummary}`}</div>
                    <Button variant="outline" className="rounded-2xl" onClick={pushToIntake}>Save to Intake / Biopsychosocial</Button>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border shadow-none">
                  <CardHeader><CardTitle className="text-base">Risk flag detection</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border bg-slate-50 p-4 text-sm">
                      {generatedDocs.riskFlags.summary.length === 0
                        ? "No automatic risk flags detected from transcript text."
                        : generatedDocs.riskFlags.summary.map((item) => <p key={item} className="mb-1">| {item}</p>)}
                    </div>
                    <Button variant="outline" className="rounded-2xl" onClick={pushRiskFlagsToDocuments}>Save risk review to Document Library</Button>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border shadow-none">
                  <CardHeader><CardTitle className="text-base">Session summary for client portal</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border bg-slate-50 p-4 text-sm whitespace-pre-wrap">{generatedDocs.sessionSummary}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border shadow-none">
                  <CardHeader><CardTitle className="text-base">Insurance-ready clinical documentation</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border bg-slate-50 p-4 text-sm whitespace-pre-wrap">{generatedDocs.insuranceReady}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>      </div>
      <Card className="rounded-2xl shadow-sm mt-4">
        <CardHeader>
          <CardTitle>Telehealth chart history</CardTitle>
          <CardDescription>Client-specific telehealth entries with consent, recording, interpreter, and language documentation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[520px] overflow-auto">
          {(telehealthLog || []).length === 0 && <p className="text-sm text-slate-500">No telehealth entries saved yet.</p>}
          {(telehealthLog || []).map((entry) => (
            <div key={entry.id} className="rounded-2xl border p-4 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="font-medium">{entry.sessionType}</p>
                <Badge className="rounded-xl">{entry.platform}</Badge>
              </div>
              <p className="text-xs text-slate-500">Created: {entry.createdAt} | Entered by: {entry.enteredBy}</p>
              <p className="text-sm"><span className="font-medium">Dialer:</span> {entry.dialNumber || "Not entered"}</p>
              <p className="text-sm"><span className="font-medium">Consent obtained:</span> {entry.consentObtained ? "Yes" : "No"}</p>
              <p className="text-sm whitespace-pre-wrap"><span className="font-medium">Consent text:</span> {entry.consentVerbiage}</p>
              <p className="text-sm"><span className="font-medium">Recording consent:</span> {entry.recordingConsent ? "Yes" : "No"}</p>
              <p className="text-sm whitespace-pre-wrap"><span className="font-medium">Recording text:</span> {entry.recordingVerbiage}</p>
              <p className="text-sm"><span className="font-medium">Language used:</span> {entry.languageUsed || "Not entered"}</p>
              <p className="text-sm"><span className="font-medium">Interpreter used:</span> {entry.interpreterNeeded ? "Yes" : "No"}</p>
              <p className="text-sm"><span className="font-medium">Interpreter type:</span> {entry.interpreterType || "Not entered"}</p>
              <p className="text-sm"><span className="font-medium">Interpreter / translator:</span> {entry.interpreterName || "Not entered"}</p>
              <p className="text-sm whitespace-pre-wrap"><span className="font-medium">Translation notes:</span> {entry.translationNotes || "None"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
function ClientManagementPage() {
  const { store } = useAuth();
  const { setPage, setSelectedChartClientId } = usePage();
  const clients = Object.entries(store.users)
    .filter(([, bucket]) => bucket.profile.role === "client")
    .map(([id, bucket]) => ({ id, ...bucket.profile, bucket }));
  return (
    <div>
      <SectionHeader
        title="Client Management"
        description="Provider-facing client list. In the full system this becomes the central chart access point, with consent-aware visibility, assessments, notes, plans, outcomes, and messaging."
      />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map((client) => (
          <Card key={client.id} className="rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{client.fullName}</p>
                  <p className="text-sm text-slate-500 mt-1">{client.email}</p>
                </div>
                <Badge className="rounded-xl">client</Badge>
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm text-slate-600">
                <p>Journal entries: {client.bucket.journalEntries.length}</p>
                <p>Homework items: {client.bucket.homework.length}</p>
                <p>Appointments: {client.bucket.appointments.length}</p>
                <p>Diagnoses: {(client.bucket.intake?.diagnoses || []).join(", ") || "None entered"}</p>
              </div>
              <Button
                className="w-full mt-4 rounded-2xl"
                onClick={() => {
                  setSelectedChartClientId(client.id);
                  setPage("chart");
                }}
              >
                Open client chart
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
function ClientChartPage() {
  const { store } = useAuth();
  const { selectedChartClientId, setPage } = usePage();
  const clientBucket = selectedChartClientId ? store.users[selectedChartClientId] : null;
  if (!clientBucket) {
    return (
      <div>
        <SectionHeader title="Client Chart" description="Select a client from Client Management to open a chart." />
      </div>
    );
  }
  const profile = clientBucket.profile || {};
  const intake = clientBucket.intake || {};
  const diagnoses = intake.diagnoses || [];
  const homework = clientBucket.homework || [];
  const appointments = clientBucket.appointments || [];
  const journalEntries = clientBucket.journalEntries || [];
  const sharedJournalEntries = journalEntries.filter((entry) => entry.visibility === "shared");
  const messages = clientBucket.messages || [];
  const clientNotes = clientBucket.notes || [];
  const clientPlans = clientBucket.treatmentPlans || [];
  const documents = clientBucket.documents || [];
  const assessments = clientBucket.assessments || {};
  const telehealthEntries = clientBucket.telehealth || [];
  const advocacyDocs = documents.filter((doc) => doc.type === "Advocacy Letter Template");
  return (
    <div>
      <SectionHeader
        title="Client Chart"
        description="Centralized client record for intake, diagnoses, provider-only documentation, assessments, shared journal, telehealth, and chart documents."
        right={<Button variant="outline" className="rounded-2xl" onClick={() => setPage("clients")}>Back to client list</Button>}
      />
      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-4">
        <div className="space-y-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{profile.fullName || "Client"}</CardTitle>
              <CardDescription>{profile.email || "No email on file"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-2xl border p-4 bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Date of birth</p>
                  <p className="mt-1 font-medium">{intake.dateOfBirth || "Not entered"}</p>
                </div>
                <div className="rounded-2xl border p-4 bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Contact phone</p>
                  <p className="mt-1 font-medium">{intake.phone || "Not entered"}</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-2xl border p-4 bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Chief complaint / reason for visit</p>
                  <p className="mt-2 whitespace-pre-wrap">{intake.chiefComplaint || "Not entered"}</p>
                </div>
                <div className="rounded-2xl border p-4 bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Onset / duration</p>
                  <p className="mt-2 whitespace-pre-wrap">{intake.onset || "Not entered"}</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-2xl border p-4 bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Session minutes</p>
                  <p className="mt-1 font-medium">{intake.sessionMinutes || "Not entered"}</p>
                </div>
                <div className="rounded-2xl border p-4 bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Billing codes</p>
                  <p className="mt-1 font-medium">{(intake.billingCodes || []).join(", ") || "Not entered"}</p>
                </div>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="font-medium">Presenting problem</p>
                <p className="mt-2 whitespace-pre-wrap">{intake.presentingProblem || "Not entered"}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="font-medium">Clinical objectives and treatment goals</p>
                <p className="mt-2 whitespace-pre-wrap">{intake.treatmentGoals || "Not entered"}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="font-medium">Biopsychosocial summary</p>
                <p className="mt-2 whitespace-pre-wrap">{intake.biopsychosocialSummary || "Not entered"}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="font-medium">Diagnostic formulation</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {diagnoses.length === 0 ? <p className="text-slate-500">No diagnoses entered.</p> : diagnoses.map((dx) => <Badge key={dx} variant="secondary" className="rounded-xl">{dx}</Badge>)}
                </div>
              </div>
            </CardContent>
          </Card>
          <Tabs defaultValue="notes">
            <TabsList className="grid grid-cols-6 rounded-2xl w-full">
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="plans">Plans</TabsTrigger>
              <TabsTrigger value="assessments">Assessments</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="journal">Shared Journal</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="mt-4">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Provider-only notes</CardTitle>
                  <CardDescription>Medical record notes and psychotherapy notes are not visible in the client portal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[360px] overflow-auto">
                  {clientNotes.length === 0 && <p className="text-sm text-slate-500">No saved notes yet.</p>}
                  {clientNotes.map((note) => (
                    <div key={note.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="font-medium">{note.title}</p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge className="rounded-xl">{note.modality}</Badge>
                          <Badge variant="secondary" className="rounded-xl">{note.noteType || "Medical Record Note"}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-slate-400 mt-2">{note.createdAt}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="plans" className="mt-4">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Provider-only treatment plans</CardTitle>
                  <CardDescription>Treatment plans remain provider visible unless released through a formal records process.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[360px] overflow-auto">
                  {clientPlans.length === 0 && <p className="text-sm text-slate-500">No treatment plans saved yet.</p>}
                  {clientPlans.map((plan) => (
                    <div key={plan.id} className="rounded-2xl border p-4">
                      <p className="font-medium">{plan.problem}</p>
                      <p className="text-sm mt-2"><span className="font-medium">Long-term:</span> {plan.longTermGoal}</p>
                      <p className="text-sm mt-1"><span className="font-medium">Short-term:</span> {plan.shortTermGoal}</p>
                      <p className="text-sm mt-1"><span className="font-medium">Intervention:</span> {plan.intervention}</p>
                      <p className="text-xs text-slate-400 mt-2">{plan.createdAt}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="assessments" className="mt-4">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Assessment summary</CardTitle>
                  <CardDescription>Completed clinical assessment data saved to this chart.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[360px] overflow-auto text-sm">
                  {Object.entries(assessments).filter(([, value]) => !!value).length === 0 && <p className="text-slate-500">No completed assessments saved yet.</p>}
                  {Object.entries(assessments).filter(([, value]) => !!value).map(([key, value]) => (
                    <div key={key} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{key}</p>
                        <Badge className="rounded-xl">{value.completedAt || "Saved"}</Badge>
                      </div>
                      {typeof value.score !== "undefined" && <p className="mt-2">Score: {value.score}</p>}
                      {value.severity && <p className="mt-1">Severity: {value.severity}</p>}
                      {value.riskLevel && <p className="mt-1">Risk Level: {value.riskLevel}</p>}
                      {typeof value.concernCount !== "undefined" && <p className="mt-1">Concern Count: {value.concernCount}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="documents" className="mt-4">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Chart documents</CardTitle>
                  <CardDescription>Clinical forms, uploads, signatures, and advocacy letters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[360px] overflow-auto">
                  {documents.length === 0 && <p className="text-sm text-slate-500">No chart documents available.</p>}
                  {documents.map((doc) => (
                    <div key={doc.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{doc.type} | {doc.category || "General"}</p>
                        </div>
                        <Badge className="rounded-xl">{doc.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Viewed: {doc.viewedAt || "Not viewed"}</p>
                      <p className="text-xs text-slate-500 mt-1">Signature: {doc.signature ? `${doc.signature.signer} | ${doc.signature.signedAt}` : "Not signed"}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="journal" className="mt-4">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Shared journal reflections</CardTitle>
                  <CardDescription>Client-authorized journal entries visible to the provider.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[360px] overflow-auto">
                  {sharedJournalEntries.length === 0 && <p className="text-sm text-slate-500">No shared journal entries available.</p>}
                  {sharedJournalEntries.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{entry.title}</p>
                        <Badge variant="secondary" className="rounded-xl">Shared with provider</Badge>
                      </div>
                      <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{entry.content}</p>
                      <p className="text-xs text-slate-400 mt-2">{entry.createdAt}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="messages" className="mt-4">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Message history</CardTitle>
                  <CardDescription>Client-provider communication items connected to this chart.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[360px] overflow-auto">
                  {messages.length === 0 && <p className="text-sm text-slate-500">No messages on file.</p>}
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium capitalize">{message.from}</p>
                        <p className="text-xs text-slate-400">{message.timestamp}</p>
                      </div>
                      <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{message.text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        <div className="space-y-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Chart snapshot</CardTitle>
              <CardDescription>Quick client totals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between"><span>Homework</span><Badge className="rounded-xl">{homework.length}</Badge></div>
              <div className="flex items-center justify-between"><span>Appointments</span><Badge className="rounded-xl">{appointments.length}</Badge></div>
              <div className="flex items-center justify-between"><span>Telehealth entries</span><Badge className="rounded-xl">{telehealthEntries.length}</Badge></div>
              <div className="flex items-center justify-between"><span>Journal entries</span><Badge className="rounded-xl">{journalEntries.length}</Badge></div>
              <div className="flex items-center justify-between"><span>Shared journal entries</span><Badge className="rounded-xl">{sharedJournalEntries.length}</Badge></div>
              <div className="flex items-center justify-between"><span>Documents</span><Badge className="rounded-xl">{documents.length}</Badge></div>
              <div className="flex items-center justify-between"><span>Advocacy letters</span><Badge className="rounded-xl">{advocacyDocs.length}</Badge></div>
              <div className="flex items-center justify-between"><span>Intake status</span><Badge className="rounded-xl">{intake.status || "Draft"}</Badge></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
function IntakePage() {
  const { store, updateSpecificUserData, appendAuditLog } = useAuth();
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.[0] || "");
  const selectedClient = selectedClientId ? store.users[selectedClientId] : null;
  const intake = selectedClient?.intake || { firstName: "", lastName: "", dateOfBirth: "", phone: "", chiefComplaint: "", onset: "", presentingProblem: "", treatmentGoals: "", biopsychosocialSummary: "", demographicsSummary: "", socialFamilyHistory: "", mentalHealthHistory: "", hospitalizationHistory: "", medicalPhysicalHistory: "", abuseTraumaHistory: "", substanceUseHistory: "", riskSafetySummary: "", strengthsProtectiveFactors: "", clinicalFormulation: "", primaryDiagnosis: "", secondaryDiagnosis: "", tertiaryDiagnosis: "", diagnoses: [], billingCodes: [], sessionMinutes: "", providerSignature: PRACTITIONER_NAME, clientSignature: "" };
  const [diagnosisInput, setDiagnosisInput] = useState("");
  const [intakeDiagnosisSearch, setIntakeDiagnosisSearch] = useState("");
  const [intakeDiagnosisTarget, setIntakeDiagnosisTarget] = useState("primaryDiagnosis");
  const [intakeBillingSearch, setIntakeBillingSearch] = useState("");
  const intakeDiagnosisMatches = diagnosisCodeOptions.filter((item) => {
    const query = intakeDiagnosisSearch.trim().toLowerCase();
    return query && `${item.code} ${item.label} ${item.keywords}`.toLowerCase().includes(query);
  }).slice(0, 6);
  const intakeBillingMatches = billingCodeOptions.filter((item) => {
    const query = intakeBillingSearch.trim().toLowerCase();
    return query && `${item.code} ${item.type} ${item.label} ${item.keywords}`.toLowerCase().includes(query);
  }).slice(0, 6);
  const applyIntakeDiagnosisCode = (item) => {
    if (!selectedClientId) return;
    const value = `${item.code} | ${item.label}`;
    const current = store.users[selectedClientId].intake || intake;
    updateSpecificUserData(selectedClientId, "intake", {
      ...current,
      [intakeDiagnosisTarget]: value,
      diagnoses: Array.from(new Set([...(current.diagnoses || []), value])),
    });
  };
  const applyIntakeBillingCode = (item) => {
    if (!selectedClientId) return;
    const value = `${item.code} | ${item.type} | ${item.label}`;
    const current = store.users[selectedClientId].intake || intake;
    updateSpecificUserData(selectedClientId, "intake", {
      ...current,
      billingCodes: Array.from(new Set([...(current.billingCodes || []), value])),
    });
  };
  const [saveNotice, setSaveNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateIntakeField = (field, value) => {
    if (!selectedClientId) return;
    updateSpecificUserData(selectedClientId, "intake", {
      ...(store.users[selectedClientId].intake || {
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        phone: "",
        chiefComplaint: "",
        onset: "",
        presentingProblem: "",
        demographicsSummary: "",
        socialFamilyHistory: "",
        mentalHealthHistory: "",
        hospitalizationHistory: "",
        medicalPhysicalHistory: "",
        abuseTraumaHistory: "",
        substanceUseHistory: "",
        riskSafetySummary: "",
        strengthsProtectiveFactors: "",
        clinicalFormulation: "",
        treatmentGoals: "",
        biopsychosocialSummary: "",
        billingCodes: [],
        sessionMinutes: "",
        diagnoses: [],
        primaryDiagnosis: "",
        secondaryDiagnosis: "",
        tertiaryDiagnosis: "",
        providerSignature: PRACTITIONER_NAME,
        clientSignature: "",
      }),
      [field]: value,
    });
  };
  const addDiagnosis = () => {
    if (!diagnosisInput.trim() || !selectedClientId) return;
    const diagnoses = [...(store.users[selectedClientId].intake?.diagnoses || [])];
    if (!diagnoses.includes(diagnosisInput.trim())) diagnoses.push(diagnosisInput.trim());
    updateIntakeField("diagnoses", diagnoses);
    setDiagnosisInput("");
  };
  const handleSubmitIntake = () => {
    if (!selectedClientId) return;
    setIsSubmitting(true);
    updateSpecificUserData(selectedClientId, "intake", {
      ...(store.users[selectedClientId].intake || intake),
      status: "submitted",
      submittedAt: new Date().toLocaleString(),
      designation: "HIPAA Medical Record Entry",
    });
    appendAuditLog({
      action: "Submitted intake",
      details: "HIPAA medical record intake entry submitted to secure chart.",
      clientId: selectedClientId,
      clientName: selectedClient?.profile?.fullName || "Client",
      category: "Medical Record",
    });
    setSaveNotice("Intake saved to the secure chart for this client.");
    setTimeout(() => {
      setSaveNotice("");
      setIsSubmitting(false);
    }, 3000);
  };
  return (
    <div>
      <SectionHeader title="Intake" description="Revealing Leads to Healing Wellness Services LLC | EHR Proprietary System | Licensed for RLHW Services LLC" />
      <Card className="rounded-2xl shadow-sm mb-4">
        <CardContent className="p-4">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="rounded-2xl max-w-md"><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>
              {clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      {saveNotice && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{saveNotice}</div>}
      {selectedClient && (
        <Card className="rounded-[2rem] shadow-sm border border-slate-100 bg-white">
          <CardContent className="p-6 md:p-10 space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Client Intake</h3>
                <p className="text-indigo-600 font-semibold tracking-wide text-sm uppercase mt-2">Revealing Leads to Healing Wellness Services LLC</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">EHR Proprietary System</p>
                <p className="text-slate-600 font-bold text-sm">Licensed for RLHW Services LLC</p>
              </div>
            </div>
            <section className="bg-slate-50/70 p-6 md:p-8 rounded-[1.5rem] border border-slate-100">
              <h4 className="text-xl font-bold text-slate-800 mb-6">Patient Identification</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">First Name</label>
                  <Input value={intake.firstName || ""} onChange={(e) => updateIntakeField("firstName", e.target.value)} placeholder="First Name" className="rounded-2xl h-12" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Last Name</label>
                  <Input value={intake.lastName || ""} onChange={(e) => updateIntakeField("lastName", e.target.value)} placeholder="Last Name" className="rounded-2xl h-12" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date of Birth</label>
                  <Input type="date" value={intake.dateOfBirth || ""} onChange={(e) => updateIntakeField("dateOfBirth", e.target.value)} className="rounded-2xl h-12" />
                  <p className="text-xs text-slate-400 ml-1">mm/dd/yyyy</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Contact Phone</label>
                  <Input value={intake.phone || ""} onChange={(e) => updateIntakeField("phone", e.target.value)} placeholder="Contact Phone" className="rounded-2xl h-12" />
                </div>
              </div>
            </section>
            <section className="space-y-6">
              <h4 className="text-xl font-bold text-slate-800">Clinical Assessment Summary</h4>
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700">Chief Complaint / Reason for Visit</label>
                    <Input value={intake.chiefComplaint || ""} onChange={(e) => updateIntakeField("chiefComplaint", e.target.value)} placeholder="Chief complaint / reason for visit" className="rounded-2xl" />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700">Onset / Duration</label>
                    <Input value={intake.onset || ""} onChange={(e) => updateIntakeField("onset", e.target.value)} placeholder="Onset / duration" className="rounded-2xl" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700">Session Minutes</label>
                    <Input value={intake.sessionMinutes || ""} onChange={(e) => updateIntakeField("sessionMinutes", e.target.value)} placeholder="Session minutes" className="rounded-2xl" />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700">Billing Codes</label>
                    <Input value={(intake.billingCodes || []).join(", ")} onChange={(e) => updateIntakeField("billingCodes", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="CPT/HCPCS billing codes" className="rounded-2xl" />
                    <Input value={intakeBillingSearch} onChange={(e) => setIntakeBillingSearch(e.target.value)} placeholder="Type billing code or keyword for intake, e.g. 90791, bio, interpreter" className="rounded-2xl" />
                    {intakeBillingMatches.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {intakeBillingMatches.map((item) => (
                          <Button key={`${item.type}-${item.code}`} type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => applyIntakeBillingCode(item)}>{item.code} | {item.label}</Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Presenting Problem / Reason for Therapy</label>
                  <Textarea value={intake.presentingProblem || ""} onChange={(e) => updateIntakeField("presentingProblem", e.target.value)} className="min-h-[150px] rounded-[1.25rem]" placeholder="Document the current symptoms, duration, and life impact..." />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Clinical Objectives & Treatment Goals</label>
                  <Textarea value={intake.treatmentGoals || ""} onChange={(e) => updateIntakeField("treatmentGoals", e.target.value)} className="min-h-[150px] rounded-[1.25rem]" placeholder="Specify measurable goals for the clinical intervention..." />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Complete Biopsychosocial Summary</label>
                  <Textarea value={intake.biopsychosocialSummary || ""} onChange={(e) => updateIntakeField("biopsychosocialSummary", e.target.value)} className="min-h-[190px] rounded-[1.25rem]" placeholder="Demographics, social/family history, abuse/trauma history, medical and mental health history, hospitalizations, substance use, risk, strengths, diagnostic rationale, and clinical formulation..." />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <p className="text-sm font-bold text-slate-800">Detailed biopsychosocial fields</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Textarea label="Demographics / Household / Access Needs" value={intake.demographicsSummary || ""} onChange={(e) => updateIntakeField("demographicsSummary", e.target.value)} className="min-h-[120px] rounded-[1.25rem]" placeholder="Demographics, household, housing, work/school, language, culture, access needs" />
                    <Textarea label="Social / Family History" value={intake.socialFamilyHistory || ""} onChange={(e) => updateIntakeField("socialFamilyHistory", e.target.value)} className="min-h-[120px] rounded-[1.25rem]" placeholder="Social and family history, supports, relationships, family mental health/substance history" />
                    <Textarea label="Mental Health History" value={intake.mentalHealthHistory || ""} onChange={(e) => updateIntakeField("mentalHealthHistory", e.target.value)} className="min-h-[120px] rounded-[1.25rem]" placeholder="Mental health history, prior therapy, diagnoses, medications, response to treatment" />
                    <Textarea label="Hospitalization / Crisis History" value={intake.hospitalizationHistory || ""} onChange={(e) => updateIntakeField("hospitalizationHistory", e.target.value)} className="min-h-[120px] rounded-[1.25rem]" placeholder="Psychiatric hospitalizations, ER/crisis episodes, higher level of care history" />
                    <Textarea label="Medical / Physical Health History" value={intake.medicalPhysicalHistory || ""} onChange={(e) => updateIntakeField("medicalPhysicalHistory", e.target.value)} className="min-h-[120px] rounded-[1.25rem]" placeholder="Medical/physical health history, medications, allergies, sleep, appetite, pain, PCP coordination" />
                    <Textarea label="Abuse / Trauma History" value={intake.abuseTraumaHistory || ""} onChange={(e) => updateIntakeField("abuseTraumaHistory", e.target.value)} className="min-h-[120px] rounded-[1.25rem]" placeholder="Abuse, trauma, violence exposure, grief/loss, safety concerns, triggers" />
                    <Textarea label="Substance Use History" value={intake.substanceUseHistory || ""} onChange={(e) => updateIntakeField("substanceUseHistory", e.target.value)} className="min-h-[120px] rounded-[1.25rem]" placeholder="Substance use history, frequency, consequences, recovery supports, stage of change" />
                    <Textarea label="Risk / Safety Summary" value={intake.riskSafetySummary || ""} onChange={(e) => updateIntakeField("riskSafetySummary", e.target.value)} className="min-h-[120px] rounded-[1.25rem]" placeholder="Risk/safety: SI/HI, self-harm, violence, protective factors, crisis plan, level of care" />
                    <Textarea label="Strengths / Protective Factors" value={intake.strengthsProtectiveFactors || ""} onChange={(e) => updateIntakeField("strengthsProtectiveFactors", e.target.value)} className="min-h-[120px] rounded-[1.25rem]" placeholder="Strengths, coping skills, protective factors, support systems, motivation" />
                    <Textarea label="Clinical Formulation" value={intake.clinicalFormulation || ""} onChange={(e) => updateIntakeField("clinicalFormulation", e.target.value)} className="min-h-[120px] rounded-[1.25rem]" placeholder="Clinical formulation: predisposing, precipitating, perpetuating, protective factors and diagnostic rationale" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Diagnostic Formulation</label>
                  <div className="grid md:grid-cols-3 gap-3">
                    <Input label="Primary ICD-10-CM Diagnosis" value={intake.primaryDiagnosis || ""} onChange={(e) => updateIntakeField("primaryDiagnosis", e.target.value)} placeholder="Primary ICD-10-CM" className="rounded-2xl" />
                    <Input label="Secondary ICD-10-CM Diagnosis" value={intake.secondaryDiagnosis || ""} onChange={(e) => updateIntakeField("secondaryDiagnosis", e.target.value)} placeholder="Secondary ICD-10-CM" className="rounded-2xl" />
                    <Input label="Tertiary ICD-10-CM Diagnosis" value={intake.tertiaryDiagnosis || ""} onChange={(e) => updateIntakeField("tertiaryDiagnosis", e.target.value)} placeholder="Tertiary ICD-10-CM" className="rounded-2xl" />
                  </div>
                  <div className="grid md:grid-cols-[0.8fr_1.2fr] gap-3">
                    <Select value={intakeDiagnosisTarget} onValueChange={setIntakeDiagnosisTarget}>
                      <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primaryDiagnosis">Apply to primary diagnosis</SelectItem>
                        <SelectItem value="secondaryDiagnosis">Apply to secondary diagnosis</SelectItem>
                        <SelectItem value="tertiaryDiagnosis">Apply to tertiary diagnosis</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={intakeDiagnosisSearch} onChange={(e) => setIntakeDiagnosisSearch(e.target.value)} placeholder="Type ICD code or diagnosis keyword for intake" className="rounded-2xl" />
                  </div>
                  {intakeDiagnosisMatches.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {intakeDiagnosisMatches.map((item) => (
                        <Button key={item.code} type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => applyIntakeDiagnosisCode(item)}>{item.code} | {item.label}</Button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input value={diagnosisInput} onChange={(e) => setDiagnosisInput(e.target.value)} placeholder="Add diagnosis" className="rounded-2xl" />
                    <Button type="button" className="rounded-2xl" onClick={addDiagnosis}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(intake.diagnoses || []).map((dx) => (
                      <Badge key={dx} variant="secondary" className="rounded-xl flex items-center gap-1">
                        {dx}
                        <button
                          type="button"
                          className="ml-1 text-xs opacity-70 hover:opacity-100"
                          onClick={() => {
                            const list = (store.users[selectedClientId].intake?.diagnoses || []).filter((d) => d !== dx);
                            updateIntakeField("diagnoses", list);
                          }}
                        >
                          
x
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-sm font-bold text-slate-800">Intake electronic signatures</p>
              <div className="grid md:grid-cols-2 gap-3">
                <Input label="Provider Electronic Signature" value={intake.providerSignature || PRACTITIONER_NAME} onChange={(e) => updateIntakeField("providerSignature", e.target.value)} placeholder="Provider electronic signature" className="rounded-2xl" />
                <Input label="Client Electronic Signature" value={intake.clientSignature || ""} onChange={(e) => updateIntakeField("clientSignature", e.target.value)} placeholder="Client electronic signature, if required" className="rounded-2xl" />
              </div>
            </section>
            <button type="button" className="w-full rounded-2xl h-14 text-base font-bold bg-slate-900 text-white hover:bg-black transition" onClick={handleSubmitIntake}>
              <span className="inline-flex items-center justify-center gap-2">
                <Save className="h-4 w-4" />
                {isSubmitting ? "Saving Intake..." : "Submit Intake to Secure Chart"}
              </span>
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Status: {selectedClient?.intake?.status === "submitted" ? "Submitted" : "Draft"}
              {selectedClient?.intake?.submittedAt ? ` | Last submitted ${selectedClient.intake.submittedAt}` : ""}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
function ProgressNotesPage() {
  const { store, updateSpecificUserData, appendAuditLog } = useAuth();
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.[0] || "");
  const notes = selectedClientId ? store.users[selectedClientId]?.notes || [] : [];
  const selectedClient = selectedClientId ? store.users[selectedClientId] : null;
  const selectedClientName = selectedClientId ? store.users[selectedClientId]?.profile?.fullName || "Client" : "Client";
  const [draft, setDraft] = useState({
    title: "",
    content: "",
    modality: "CBT",
    noteType: "Medical Record Note",
  });
  const [aiNotice, setAiNotice] = useState("");
  const [ehrDestination, setEhrDestination] = useState("treatment-plan");
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [diagnosisSearch, setDiagnosisSearch] = useState("");
  const [diagnosisTarget, setDiagnosisTarget] = useState("primaryDiagnosis");
  const [billingSearch, setBillingSearch] = useState("");
  const [codeDraft, setCodeDraft] = useState({
    chiefComplaint: "",
    onset: "",
    primaryDiagnosis: "",
    secondaryDiagnosis: "",
    tertiaryDiagnosis: "",
    serviceCode: "90837 | CPT | Psychotherapy, 60 minutes",
    interpreterCode: "",
    manualMinutes: "",
    providerSignature: PRACTITIONER_NAME,
    clientSignature: "",
  });
  const diagnosisMatches = diagnosisCodeOptions.filter((item) => {
    const query = diagnosisSearch.trim().toLowerCase();
    return query && `${item.code} ${item.label} ${item.keywords}`.toLowerCase().includes(query);
  }).slice(0, 6);
  const billingMatches = billingCodeOptions.filter((item) => {
    const query = billingSearch.trim().toLowerCase();
    return query && `${item.code} ${item.type} ${item.label} ${item.keywords}`.toLowerCase().includes(query);
  }).slice(0, 6);
  const applyDiagnosisCode = (item) => {
    setCodeDraft((prev) => ({ ...prev, [diagnosisTarget]: `${item.code} | ${item.label}` }));
  };
  useEffect(() => {
    if (!isTimerRunning) return;
    const id = window.setInterval(() => setSessionSeconds((prev) => prev + 1), 1000);
    return () => window.clearInterval(id);
  }, [isTimerRunning]);
  const formattedTimer = `${String(Math.floor(sessionSeconds / 3600)).padStart(2, "0")}:${String(Math.floor((sessionSeconds % 3600) / 60)).padStart(2, "0")}:${String(sessionSeconds % 60).padStart(2, "0")}`;
  const sessionMinutes = codeDraft.manualMinutes || (sessionSeconds ? String(Math.ceil(sessionSeconds / 60)) : "");
  const save = () => {
    if (!selectedClientId || !draft.title.trim() || !draft.content.trim()) return;
    const requiredMissing = [
      !codeDraft.chiefComplaint.trim() ? "chief complaint / reason for visit" : null,
      !sessionMinutes ? "session time" : null,
      !codeDraft.primaryDiagnosis ? "primary ICD diagnosis" : null,
      !codeDraft.serviceCode ? "billing CPT/HCPCS code" : null,
    ].filter(Boolean);
    if (requiredMissing.length) {
      setAiNotice(`Missing required fields before saving note: ${requiredMissing.join(", ")}.`);
      return;
    }
    const metadata = [
      `Chief complaint / reason for visit: ${codeDraft.chiefComplaint || "Not entered"}`,
      `Onset / duration: ${codeDraft.onset || "Not entered"}`,
      `Session minutes: ${sessionMinutes || "Not entered"}`,
      `Primary ICD-10-CM: ${codeDraft.primaryDiagnosis || "Not selected"}`,
      `Secondary ICD-10-CM: ${codeDraft.secondaryDiagnosis || "Not selected"}`,
      `Tertiary ICD-10-CM: ${codeDraft.tertiaryDiagnosis || "Not selected"}`,
      `Service / CPT-HCPCS: ${codeDraft.serviceCode || "Not selected"}`,
      `Interpreter service code: ${codeDraft.interpreterCode || "Not used"}`,
      `Provider e-signature: ${codeDraft.providerSignature || "Not signed"}`,
      `Client e-signature: ${codeDraft.clientSignature || "Not signed / not required"}`,
    ].join("\n");
    const noteWithMetadata = `${metadata}\n\nClinical Note:\n${draft.content}`;
    updateSpecificUserData(selectedClientId, "notes", (prev) => [
      {
        id: `note-${Date.now()}`,
        ...draft,
        content: noteWithMetadata,
        sessionMinutes,
        codeDraft,
        signature: {
          provider: codeDraft.providerSignature || "",
          client: codeDraft.clientSignature || "",
          signedAt: new Date().toLocaleString(),
        },
        createdAt: new Date().toLocaleString(),
      },
      ...prev,
    ]);
    appendAuditLog({
      action: `Saved ${draft.noteType}`,
      details: `${draft.noteType} saved with ${draft.modality} modality, ${sessionMinutes || "no"} minutes, billing/diagnosis helper fields, and e-signature metadata.`,
      clientId: selectedClientId,
      clientName: selectedClientName,
      category: draft.noteType === "Psychotherapy Note" ? "Psychotherapy Notes" : "Medical Record",
    });
    setDraft({ title: "", content: "", modality: "CBT", noteType: "Medical Record Note" });
  };
  const generateStarter = () => {
    setDraft((prev) => ({
      ...prev,
      content:
        "Client presented for follow-up session. Symptoms, stressors, and functional impact were reviewed. Interventions utilized included supportive exploration, symptom monitoring, and evidence-based coping strategies within the selected modality. Client response, progress, and plan for next session should be documented here.",
    }));
    setAiNotice("Starter note generated.");
  };
  const autofillFromChart = () => {
    if (!selectedClient) return;
    const intake = selectedClient.intake || {};
    const diagnoses = (intake.diagnoses || []).join(", ") || "No diagnosis entered";
    const homeworkSummary = (selectedClient.homework || []).slice(0, 2).map((item) => `${item.title} (${item.status})`).join("; ") || "No homework on file";
    const sharedJournalSummary = (selectedClient.journalEntries || []).filter((entry) => entry.visibility === "shared").slice(0, 1).map((entry) => entry.content).join(" ") || "No shared journal entry available";
    setDraft((prev) => ({
      ...prev,
      content:
        `Client presented for scheduled session. Presenting concerns include ${intake.presentingProblem || "concerns not yet documented"}. Diagnoses on file: ${diagnoses}. Session focus included review of symptoms, current functioning, treatment progress, and barriers. Shared client reflection: ${sharedJournalSummary}. Current homework summary: ${homeworkSummary}. Interventions utilized within the ${prev.modality} framework included symptom exploration, reinforcement of coping strategies, and treatment planning. Client response, level of engagement, and next-step recommendations should be finalized by provider review.`,
    }));
    setAiNotice("Chart-based autofill completed.");
  };
  const polishClinicalLanguage = () => {
    if (!draft.content.trim()) return;
    const polished = `${draft.content.trim()}
Clinical formulation summary: Symptoms, functional impact, treatment engagement, and next-session priorities were reviewed and documented in alignment with provider clinical judgment.`;
    setDraft((prev) => ({ ...prev, content: polished }));
    setAiNotice("Note language refined for a more clinical draft.");
  };
  const copyDraftToEhrSection = () => {
    if (!selectedClientId || !draft.content.trim()) return;
    if (ehrDestination === "intake-presenting") {
      const currentIntake = selectedClient?.intake || {};
      updateSpecificUserData(selectedClientId, "intake", {
        ...currentIntake,
        presentingProblem: currentIntake.presentingProblem
          ? `${currentIntake.presentingProblem}
AI documentation assist addendum:
${draft.content}`
          : `AI documentation assist addendum:
${draft.content}`,
      });
      appendAuditLog({
        action: "AI documentation assist copied to intake presenting problem",
        details: "Progress note draft copied into intake presenting problem section.",
        clientId: selectedClientId,
        clientName: selectedClientName,
        category: "Medical Record",
      });
      setAiNotice("Draft copied to Intake to Presenting Problem.");
      return;
    }
    if (ehrDestination === "treatment-goals") {
      const currentIntake = selectedClient?.intake || {};
      updateSpecificUserData(selectedClientId, "intake", {
        ...currentIntake,
        treatmentGoals: currentIntake.treatmentGoals
          ? `${currentIntake.treatmentGoals}
AI documentation assist addendum:
${draft.content}`
          : `AI documentation assist addendum:
${draft.content}`,
      });
      appendAuditLog({
        action: "AI documentation assist copied to treatment goals",
        details: "Progress note draft copied into intake treatment goals section.",
        clientId: selectedClientId,
        clientName: selectedClientName,
        category: "Medical Record",
      });
      setAiNotice("Draft copied to Intake to Treatment Goals.");
      return;
    }
    if (ehrDestination === "treatment-plan") {
      const existingPlans = selectedClient?.treatmentPlans || [];
      if (existingPlans.length > 0) {
        updateSpecificUserData(selectedClientId, "treatmentPlans", (prev) =>
          prev.map((plan, index) =>
            index === 0
              ? {
                  ...plan,
                  intervention: plan.intervention
                    ? `${plan.intervention}
AI documentation assist addendum:
${draft.content}`
                    : `AI documentation assist addendum:
${draft.content}`,
                }
              : plan
          )
        );
      } else {
        updateSpecificUserData(selectedClientId, "treatmentPlans", (prev) => [
          {
            id: `plan-${Date.now()}`,
            problem: draft.title || "AI-generated treatment planning entry",
            longTermGoal: "Review and refine with provider.",
            shortTermGoal: "Review and refine with provider.",
            intervention: `AI documentation assist addendum:
${draft.content}`,
            createdAt: new Date().toLocaleString(),
          },
          ...prev,
        ]);
      }
      appendAuditLog({
        action: "AI documentation assist copied to treatment plan",
        details: "Progress note draft copied into treatment plan intervention section.",
        clientId: selectedClientId,
        clientName: selectedClientName,
        category: "Medical Record",
      });
      setAiNotice("Draft copied to Treatment Plan to Intervention.");
      return;
    }
    if (ehrDestination === "homework") {
      updateSpecificUserData(selectedClientId, "homework", (prev) => [
        {
          id: `hw-ai-${Date.now()}`,
          title: draft.title || "AI-assisted homework",
          content: draft.content,
          dueDate: "",
          status: "Assigned",
          assignedAt: new Date().toLocaleString(),
          completedAt: "",
        },
        ...prev,
      ]);
      appendAuditLog({
        action: "AI documentation assist copied to homework",
        details: "Progress note draft copied into a new homework assignment.",
        clientId: selectedClientId,
        clientName: selectedClientName,
        category: "Homework",
      });
      setAiNotice("Draft copied to Homework as a new assignment.");
      return;
    }
    if (ehrDestination === "document-library") {
      const existingDocs = selectedClient?.documents || [];
      updateSpecificUserData(selectedClientId, "documents", [
        {
          id: `doc-ai-${Date.now()}`,
          title: draft.title || "AI Documentation Assist Entry",
          type: "Clinical Document",
          status: "Draft",
          viewedAt: "",
          signature: null,
          uploadedFileName: "",
          createdAt: new Date().toLocaleString(),
          generatedLetterText: draft.content,
          category: "AI Documentation Assist",
        },
        ...existingDocs,
      ]);
      appendAuditLog({
        action: "AI documentation assist copied to document library",
        details: "Progress note draft copied into chart documents.",
        clientId: selectedClientId,
        clientName: selectedClientName,
        category: "Document",
      });
      setAiNotice("Draft copied to Document Library as a draft clinical document.");
    }
  };
  return (
    <div>
      <SectionHeader
        title="Progress Notes"
        description="Provider note-writing workspace with note type separation for HIPAA medical record entries and provider-restricted psychotherapy notes."
        right={<div className="flex flex-wrap gap-2"><Button className="rounded-2xl" onClick={generateStarter}><Sparkles className="mr-2 h-4 w-4" />Generate starter</Button><Button variant="outline" className="rounded-2xl" onClick={autofillFromChart}><Sparkles className="mr-2 h-4 w-4" />AI autofill from chart</Button><Button variant="outline" className="rounded-2xl" onClick={polishClinicalLanguage}><Sparkles className="mr-2 h-4 w-4" />AI polish note</Button></div>}
      />
      <div className="grid xl:grid-cols-[1fr_1fr] gap-4">
        {aiNotice && <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{aiNotice}</div>}
      <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 space-y-3">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Note title" />
            <Select value={draft.modality} onValueChange={(value) => setDraft({ ...draft, modality: value })}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CBT">CBT</SelectItem>
                <SelectItem value="Trauma-Focused">Trauma-Focused</SelectItem>
                <SelectItem value="EMDR">EMDR</SelectItem>
                <SelectItem value="DBT">DBT</SelectItem>
                <SelectItem value="Psychodynamic">Psychodynamic</SelectItem>
                <SelectItem value="Grief">Grief</SelectItem>
              </SelectContent>
            </Select>
            <Select value={draft.noteType} onValueChange={(value) => setDraft({ ...draft, noteType: value })}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Medical Record Note">Medical Record Note | HIPAA Medical Record</SelectItem>
                <SelectItem value="Psychotherapy Note">Psychotherapy Note | Provider Restricted</SelectItem>
                <SelectItem value="Initial Progress Note">Initial Progress Note | First session</SelectItem>
                <SelectItem value="Follow-up Progress Note">Follow-up Progress Note | Continuing care</SelectItem>
                <SelectItem value="Biopsychosocial Assessment">Biopsychosocial Assessment | Intake/BPS</SelectItem>
              </SelectContent>
            </Select>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-medium text-slate-800">Access policy:</span>{" "}
              {draft.noteType === "Psychotherapy Note"
                ? "Provider Only | Excluded from routine client portal access and separate from the standard medical record."
                : "Provider Only in portal | Client access by formal medical records request and provider review."}
            </div>
            <Card className="rounded-2xl border border-slate-200 bg-slate-50 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Billing, diagnosis, time, and signatures</CardTitle>
                <CardDescription>Helper fields for service documentation. Verify payer rules before billing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <Input label="Chief Complaint / Reason for Visit" value={codeDraft.chiefComplaint} onChange={(e) => setCodeDraft({ ...codeDraft, chiefComplaint: e.target.value })} placeholder="Chief complaint / reason for visit" />
                  <Input label="Onset / Duration" value={codeDraft.onset} onChange={(e) => setCodeDraft({ ...codeDraft, onset: e.target.value })} placeholder="Onset / duration" />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-2xl border bg-white p-3 space-y-2">
                    <p className="text-sm font-medium">Session timer</p>
                    <p className="text-2xl font-semibold">{formattedTimer}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" className="rounded-2xl" onClick={() => setIsTimerRunning((value) => !value)}>{isTimerRunning ? "Pause" : "Start"}</Button>
                      <Button type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => { setIsTimerRunning(false); setSessionSeconds(0); }}>Reset</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Session Minutes (manual or timer)</label>
                    <Input value={codeDraft.manualMinutes} onChange={(e) => setCodeDraft({ ...codeDraft, manualMinutes: e.target.value })} placeholder="Enter minutes manually" />
                    <p className="text-xs text-slate-500">Saved minutes: {sessionMinutes || "Not entered"}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <Input label="Primary ICD-10-CM Diagnosis" value={codeDraft.primaryDiagnosis} onChange={(e) => setCodeDraft({ ...codeDraft, primaryDiagnosis: e.target.value })} placeholder="Primary ICD-10-CM" />
                  <Input label="Secondary ICD-10-CM Diagnosis" value={codeDraft.secondaryDiagnosis} onChange={(e) => setCodeDraft({ ...codeDraft, secondaryDiagnosis: e.target.value })} placeholder="Secondary ICD-10-CM" />
                  <Input label="Tertiary ICD-10-CM Diagnosis" value={codeDraft.tertiaryDiagnosis} onChange={(e) => setCodeDraft({ ...codeDraft, tertiaryDiagnosis: e.target.value })} placeholder="Tertiary ICD-10-CM" />
                </div>
                <div className="grid md:grid-cols-[0.8fr_1.2fr] gap-3">
                  <Select value={diagnosisTarget} onValueChange={setDiagnosisTarget}>
                    <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primaryDiagnosis">Apply to primary diagnosis</SelectItem>
                      <SelectItem value="secondaryDiagnosis">Apply to secondary diagnosis</SelectItem>
                      <SelectItem value="tertiaryDiagnosis">Apply to tertiary diagnosis</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={diagnosisSearch} onChange={(e) => setDiagnosisSearch(e.target.value)} placeholder="Type ICD code or diagnosis keywords, e.g. anxiety, trauma, F41" />
                </div>
                {diagnosisMatches.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {diagnosisMatches.map((item) => (
                      <Button key={item.code} type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => applyDiagnosisCode(item)}>{item.code} | {item.label}</Button>
                    ))}
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-3">
                  <Input label="CPT / HCPCS Service Code" value={codeDraft.serviceCode} onChange={(e) => setCodeDraft({ ...codeDraft, serviceCode: e.target.value })} placeholder="CPT/HCPCS service code" />
                  <Input label="Interpreter Code" value={codeDraft.interpreterCode} onChange={(e) => setCodeDraft({ ...codeDraft, interpreterCode: e.target.value })} placeholder="Interpreter code, if used" />
                </div>
                <Input value={billingSearch} onChange={(e) => setBillingSearch(e.target.value)} placeholder="Type billing keywords, e.g. intake, 60, interpreter, family" />
                {billingMatches.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {billingMatches.map((item) => (
                      <Button key={`${item.type}-${item.code}`} type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => item.code === "T1013" ? setCodeDraft({ ...codeDraft, interpreterCode: `${item.code} | ${item.type} | ${item.label}` }) : setCodeDraft({ ...codeDraft, serviceCode: `${item.code} | ${item.type} | ${item.label}` })}>{item.code} | {item.label}</Button>
                    ))}
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-3">
                  <Input label="Provider Electronic Signature" value={codeDraft.providerSignature} onChange={(e) => setCodeDraft({ ...codeDraft, providerSignature: e.target.value })} placeholder="Provider electronic signature" />
                  <Input label="Client Electronic Signature" value={codeDraft.clientSignature} onChange={(e) => setCodeDraft({ ...codeDraft, clientSignature: e.target.value })} placeholder="Client electronic signature, if required" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-indigo-200 bg-indigo-50/50 shadow-none">
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">AI Documentation Assist</p>
                  <p className="text-xs text-slate-600 mt-1">Copy the current draft into another EHR section when clinically appropriate. Review before relying on copied text.</p>
                </div>
                <Select value={ehrDestination} onValueChange={setEhrDestination}>
                  <SelectTrigger className="rounded-2xl bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="treatment-plan">Treatment Plan to Intervention</SelectItem>
                    <SelectItem value="intake-presenting">Intake to Presenting Problem</SelectItem>
                    <SelectItem value="treatment-goals">Intake to Treatment Goals</SelectItem>
                    <SelectItem value="homework">Homework to New Assignment</SelectItem>
                    <SelectItem value="document-library">Document Library to Draft Clinical Document</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" className="rounded-2xl" onClick={copyDraftToEhrSection}>
                  <Sparkles className="mr-2 h-4 w-4" />AI copy to selected EHR section
                </Button>
              </CardContent>
            </Card>
            <Textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} className="min-h-[260px] rounded-2xl" placeholder="Write note..." />
            <Button className="rounded-2xl" onClick={save}><Save className="mr-2 h-4 w-4" />Save note</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Saved notes</CardTitle>
            <CardDescription>Most recent first for selected client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[620px] overflow-auto">
            {notes.length === 0 && <p className="text-sm text-slate-500">No notes saved yet.</p>}
            {notes.map((note) => (
              <div key={note.id} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-medium">{note.title}</p>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Badge className="rounded-xl">{note.modality}</Badge>
                    <Badge variant="secondary" className="rounded-xl">{note.noteType || "Medical Record Note"}</Badge>
                  </div>
                </div>
                <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-slate-400 mt-2">{note.createdAt}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function BillingPage() {
  const { store, updateSpecificUserData, appendAuditLog } = useAuth();
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.[0] || "");
  const selectedClient = selectedClientId ? store.users[selectedClientId] : null;
  const intake = selectedClient?.intake || {};
  const [diagnosisSearch, setDiagnosisSearch] = useState("");
  const [diagnosisTarget, setDiagnosisTarget] = useState("primaryDiagnosis");
  const [billingSearch, setBillingSearch] = useState("");
  const [notice, setNotice] = useState("");
  const diagnosisMatches = diagnosisCodeOptions.filter((item) => {
    const query = diagnosisSearch.trim().toLowerCase();
    return query && `${item.code} ${item.label} ${item.keywords}`.toLowerCase().includes(query);
  }).slice(0, 8);
  const billingMatches = billingCodeOptions.filter((item) => {
    const query = billingSearch.trim().toLowerCase();
    return query && `${item.code} ${item.type} ${item.label} ${item.keywords}`.toLowerCase().includes(query);
  }).slice(0, 8);
  const updateBillingField = (field, value) => {
    if (!selectedClientId) return;
    updateSpecificUserData(selectedClientId, "intake", {
      ...(store.users[selectedClientId].intake || {}),
      [field]: value,
    });
  };
  const applyDiagnosisCode = (item) => {
    if (!selectedClientId) return;
    const value = `${item.code} | ${item.label}`;
    const current = store.users[selectedClientId].intake || {};
    updateSpecificUserData(selectedClientId, "intake", {
      ...current,
      [diagnosisTarget]: value,
      diagnoses: Array.from(new Set([...(current.diagnoses || []), value])),
    });
  };
  const applyBillingCode = (item) => {
    if (!selectedClientId) return;
    const value = `${item.code} | ${item.type} | ${item.label}`;
    const current = store.users[selectedClientId].intake || {};
    updateSpecificUserData(selectedClientId, "intake", {
      ...current,
      billingCodes: Array.from(new Set([...(current.billingCodes || []), value])),
    });
  };
  const saveBillingSnapshot = () => {
    if (!selectedClientId) return;
    const current = store.users[selectedClientId].intake || {};
    const summary = `Quick Billing Snapshot\nClient: ${selectedClient?.profile?.fullName || "Client"}\nChief complaint: ${current.chiefComplaint || "Not entered"}\nSession minutes: ${current.sessionMinutes || "Not entered"}\nPrimary ICD-10-CM: ${current.primaryDiagnosis || "Not selected"}\nSecondary ICD-10-CM: ${current.secondaryDiagnosis || "Not selected"}\nTertiary ICD-10-CM: ${current.tertiaryDiagnosis || "Not selected"}\nBilling codes: ${(current.billingCodes || []).join(", ") || "Not selected"}\nProvider signature: ${current.providerSignature || PRACTITIONER_NAME}\nClient signature: ${current.clientSignature || "Not signed / not required"}`;
    updateSpecificUserData(selectedClientId, "documents", (prev) => [
      {
        id: `billing-${Date.now()}`,
        title: "Quick Billing Snapshot",
        type: "Billing",
        status: "Draft",
        viewedAt: "",
        signature: null,
        uploadedFileName: "",
        generatedLetterText: summary,
        createdAt: new Date().toLocaleString(),
      },
      ...((prev || [])),
    ]);
    appendAuditLog({
      action: "Saved quick billing snapshot",
      details: "Billing diagnosis, CPT/HCPCS, time, and signature fields saved to chart documents.",
      clientId: selectedClientId,
      clientName: selectedClient?.profile?.fullName || "Client",
      category: "Billing",
    });
    setNotice("Quick billing snapshot saved to Document Library.");
    setTimeout(() => setNotice(""), 3000);
  };
  return (
    <div>
      <SectionHeader title="Billing" description="Quick billing workspace for ICD diagnosis, CPT/HCPCS service codes, interpreter code, session minutes, and signatures." />
      {notice && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</div>}
      <div className="grid xl:grid-cols-[1fr_1fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Billing fields</CardTitle>
            <CardDescription>Codes save back to the selected client chart.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Chief Complaint / Reason for Visit" value={intake.chiefComplaint || ""} onChange={(e) => updateBillingField("chiefComplaint", e.target.value)} placeholder="Chief complaint / reason for visit" />
              <Input label="Session Minutes" value={intake.sessionMinutes || ""} onChange={(e) => updateBillingField("sessionMinutes", e.target.value)} placeholder="Session minutes" />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <Input label="Primary ICD-10-CM Diagnosis" value={intake.primaryDiagnosis || ""} onChange={(e) => updateBillingField("primaryDiagnosis", e.target.value)} placeholder="Primary ICD-10-CM" />
              <Input label="Secondary ICD-10-CM Diagnosis" value={intake.secondaryDiagnosis || ""} onChange={(e) => updateBillingField("secondaryDiagnosis", e.target.value)} placeholder="Secondary ICD-10-CM" />
              <Input label="Tertiary ICD-10-CM Diagnosis" value={intake.tertiaryDiagnosis || ""} onChange={(e) => updateBillingField("tertiaryDiagnosis", e.target.value)} placeholder="Tertiary ICD-10-CM" />
            </div>
            <div className="grid md:grid-cols-[0.8fr_1.2fr] gap-3">
              <Select value={diagnosisTarget} onValueChange={setDiagnosisTarget}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primaryDiagnosis">Apply to primary diagnosis</SelectItem>
                  <SelectItem value="secondaryDiagnosis">Apply to secondary diagnosis</SelectItem>
                  <SelectItem value="tertiaryDiagnosis">Apply to tertiary diagnosis</SelectItem>
                </SelectContent>
              </Select>
              <Input value={diagnosisSearch} onChange={(e) => setDiagnosisSearch(e.target.value)} placeholder="Type ICD code or diagnosis keyword" />
            </div>
            {diagnosisMatches.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {diagnosisMatches.map((item) => <Button key={item.code} type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => applyDiagnosisCode(item)}>{item.code} | {item.label}</Button>)}
              </div>
            )}
            <Input label="CPT / HCPCS Billing Codes" value={(intake.billingCodes || []).join(", ")} onChange={(e) => updateBillingField("billingCodes", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="CPT/HCPCS billing codes" />
            <Input value={billingSearch} onChange={(e) => setBillingSearch(e.target.value)} placeholder="Type billing keyword, e.g. intake, bio, 60, interpreter" />
            {billingMatches.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {billingMatches.map((item) => <Button key={`${item.type}-${item.code}`} type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => applyBillingCode(item)}>{item.code} | {item.label}</Button>)}
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Provider Electronic Signature" value={intake.providerSignature || PRACTITIONER_NAME} onChange={(e) => updateBillingField("providerSignature", e.target.value)} placeholder="Provider electronic signature" />
              <Input label="Client Electronic Signature" value={intake.clientSignature || ""} onChange={(e) => updateBillingField("clientSignature", e.target.value)} placeholder="Client electronic signature, if required" />
            </div>
            <Button className="rounded-2xl" onClick={saveBillingSnapshot}><Save className="mr-2 h-4 w-4" />Save quick billing snapshot</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Current billing summary</CardTitle>
            <CardDescription>Review before claim entry or payer submission.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="font-medium">Client:</span> {selectedClient?.profile?.fullName || "No client selected"}</p>
            <p><span className="font-medium">Chief complaint:</span> {intake.chiefComplaint || "Not entered"}</p>
            <p><span className="font-medium">Session minutes:</span> {intake.sessionMinutes || "Not entered"}</p>
            <p><span className="font-medium">Primary:</span> {intake.primaryDiagnosis || "Not selected"}</p>
            <p><span className="font-medium">Secondary:</span> {intake.secondaryDiagnosis || "Not selected"}</p>
            <p><span className="font-medium">Tertiary:</span> {intake.tertiaryDiagnosis || "Not selected"}</p>
            <p><span className="font-medium">Billing codes:</span> {(intake.billingCodes || []).join(", ") || "Not selected"}</p>
            <p><span className="font-medium">Provider signature:</span> {intake.providerSignature || PRACTITIONER_NAME}</p>
            <p><span className="font-medium">Client signature:</span> {intake.clientSignature || "Not signed / not required"}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}function TreatmentPlansPage() {
  const { store, updateSpecificUserData, appendAuditLog } = useAuth();
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.[0] || "");
  const plans = selectedClientId ? store.users[selectedClientId]?.treatmentPlans || [] : [];
  const selectedClientName = selectedClientId ? store.users[selectedClientId]?.profile?.fullName || "Client" : "Client";
  const [draft, setDraft] = useState({
    problem: "",
    longTermGoal: "",
    shortTermGoal: "",
    intervention: "",
  });
  const save = () => {
    if (!selectedClientId || !draft.problem.trim()) return;
    updateSpecificUserData(selectedClientId, "treatmentPlans", (prev) => [
      { id: `plan-${Date.now()}`, ...draft, createdAt: new Date().toLocaleString() },
      ...prev,
    ]);
    appendAuditLog({
      action: "Saved treatment plan",
      details: "Treatment plan updated in provider-only clinical record.",
      clientId: selectedClientId,
      clientName: selectedClientName,
      category: "Medical Record",
    });
    setDraft({ problem: "", longTermGoal: "", shortTermGoal: "", intervention: "" });
  };
  return (
    <div>
      <SectionHeader title="Treatment Plans" description="Structured treatment planning starter for measurable goals and modality-specific interventions." />
      <div className="grid xl:grid-cols-[1fr_1fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 space-y-3">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={draft.problem} onChange={(e) => setDraft({ ...draft, problem: e.target.value })} placeholder="Problem" />
            <Textarea value={draft.longTermGoal} onChange={(e) => setDraft({ ...draft, longTermGoal: e.target.value })} className="min-h-[90px] rounded-2xl" placeholder="Long-term goal" />
            <Textarea value={draft.shortTermGoal} onChange={(e) => setDraft({ ...draft, shortTermGoal: e.target.value })} className="min-h-[90px] rounded-2xl" placeholder="Short-term goal" />
            <Textarea value={draft.intervention} onChange={(e) => setDraft({ ...draft, intervention: e.target.value })} className="min-h-[90px] rounded-2xl" placeholder="Intervention" />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-medium text-slate-800">Access policy:</span> Provider Only | Client access by formal records request and provider review.
            </div>
            <Button className="rounded-2xl" onClick={save}><Save className="mr-2 h-4 w-4" />Save plan</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Saved plans</CardTitle>
            <CardDescription>Most recent first for selected client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[620px] overflow-auto">
            {plans.length === 0 && <p className="text-sm text-slate-500">No treatment plans saved yet.</p>}
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border p-4">
                <p className="font-medium">{plan.problem}</p>
                <p className="text-sm mt-2"><span className="font-medium">Long-term:</span> {plan.longTermGoal}</p>
                <p className="text-sm mt-1"><span className="font-medium">Short-term:</span> {plan.shortTermGoal}</p>
                <p className="text-sm mt-1"><span className="font-medium">Intervention:</span> {plan.intervention}</p>
                <p className="text-xs text-slate-400 mt-2">{plan.createdAt}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function HomeworkPage() {
  const { store, updateSpecificUserData, appendAuditLog } = useAuth();
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.[0] || "");
  const [draft, setDraft] = useState({ title: "", content: "", dueDate: "" });
  const assignments = selectedClientId ? store.users[selectedClientId].homework || [] : [];
  const assign = () => {
    if (!selectedClientId || !draft.title.trim() || !draft.content.trim()) return;
    updateSpecificUserData(selectedClientId, "homework", (prev) => [
      {
        id: `hw-${Date.now()}`,
        title: draft.title,
        content: draft.content,
        dueDate: draft.dueDate || "",
        status: "Assigned",
        assignedAt: new Date().toLocaleString(),
        completedAt: "",
      },
      ...prev,
    ]);
    appendAuditLog({
      action: "Assigned homework",
      details: `Homework assigned: ${draft.title}`,
      clientId: selectedClientId,
      clientName: store.users[selectedClientId]?.profile?.fullName || "Client",
      category: "Homework",
    });
    setDraft({ title: "", content: "", dueDate: "" });
  };
  return (
    <div>
      <SectionHeader title="Homework" description="Provider homework builder. This is where diagnosis-specific exercises, journaling prompts, and skills practice expand next." />
      <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 space-y-3">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Homework title" />
            <Input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} placeholder="Due date" />
            <Textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} className="min-h-[220px] rounded-2xl" placeholder="Assignment details" />
            <Button className="rounded-2xl" onClick={assign}><BookOpen className="mr-2 h-4 w-4" />Assign homework</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>For selected client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[620px] overflow-auto">
            {assignments.length === 0 && <p className="text-sm text-slate-500">No assignments yet.</p>}
            {assignments.map((item) => (
              <div key={item.id} className="rounded-2xl border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.title}</p>
                  <Badge className="rounded-xl">{item.status}</Badge>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.content}</p>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>Assigned: {item.assignedAt || "Not recorded"}</p>
                  <p>Due date: {item.dueDate || "Not set"}</p>
                  <p>Completed: {item.completedAt || "Not completed"}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function ClientHomeworkPage() {
  const { currentUser, store, updateCurrentUserData, appendAuditLog } = useAuth();
  const assignments = store.users[currentUser.id].homework || [];
  const updateHomeworkStatus = (itemId, nextStatus) => {
    updateCurrentUserData("homework", (prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: nextStatus,
              completedAt: nextStatus === "Completed" ? new Date().toLocaleString() : "",
            }
          : item
      )
    );
    appendAuditLog({
      action: `Updated homework status to ${nextStatus}`,
      details: "Client updated homework progress.",
      clientId: currentUser.id,
      clientName: currentUser.fullName,
      category: "Homework",
    });
  };
  return (
    <div>
      <SectionHeader title="Homework" description="Client homework assignments, progress tracking, and completion updates." />
      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Your assignments</CardTitle>
            <CardDescription>Assignments shared by your provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[650px] overflow-auto">
            {assignments.length === 0 && <p className="text-sm text-slate-500">No homework assignments yet.</p>}
            {assignments.map((item) => (
              <div key={item.id} className="rounded-2xl border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-1">Assigned {item.assignedAt || "Not recorded"}</p>
                  </div>
                  <Badge className="rounded-xl">{item.status}</Badge>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.content}</p>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>Due date: {item.dueDate || "Not set"}</p>
                  <p>Completed: {item.completedAt || "Not completed"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={item.status === "Assigned" ? "default" : "outline"} className="rounded-2xl" onClick={() => updateHomeworkStatus(item.id, "Assigned")}>Assigned</Button>
                  <Button type="button" variant={item.status === "In Progress" ? "default" : "outline"} className="rounded-2xl" onClick={() => updateHomeworkStatus(item.id, "In Progress")}>In Progress</Button>
                  <Button type="button" variant={item.status === "Completed" ? "default" : "outline"} className="rounded-2xl" onClick={() => updateHomeworkStatus(item.id, "Completed")}>Completed</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>How to use this page</CardTitle>
            <CardDescription>Simple client completion workflow</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-3">
            <p>Use <span className="font-medium text-slate-800">Assigned</span> when the task has been given but not started.</p>
            <p>Use <span className="font-medium text-slate-800">In Progress</span> when you have started working on it.</p>
            <p>Use <span className="font-medium text-slate-800">Completed</span> when the assignment is done. The system will record the completion time automatically.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function ClientRecordRequestPage() {
  const { store, currentUser, submitRecordRequest, appendAuditLog } = useAuth();
  const [requestType, setRequestType] = useState("Medical Record Copy");
  const [reason, setReason] = useState("");
  const requests = (store.recordRequests || []).filter((item) => item.clientId === currentUser.id);
  const handleSubmit = () => {
    if (!reason.trim()) return;
    submitRecordRequest({ requestType, reason });
    appendAuditLog({
      action: "Submitted records request",
      details: `${requestType} requested by client through portal.`,
      clientId: currentUser.id,
      clientName: currentUser.fullName,
      category: "Records Request",
    });
    setReason("");
  };
  return (
    <div>
      <SectionHeader
        title="Record Request"
        description="Clients may formally request access to parts of the medical record. Psychotherapy notes remain provider restricted."
      />
      <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Submit request</CardTitle>
            <CardDescription>HIPAA medical record request workflow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Medical Record Copy">Medical Record Copy</SelectItem>
                <SelectItem value="Treatment Plan Request">Treatment Plan Request</SelectItem>
                <SelectItem value="Progress Note Request">Progress Note Request</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[220px] rounded-2xl" placeholder="Reason for request" />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Psychotherapy notes are provider restricted and are not released through routine portal access.
            </div>
            <Button className="rounded-2xl" onClick={handleSubmit}><FileText className="mr-2 h-4 w-4" />Submit request</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Your requests</CardTitle>
            <CardDescription>Status tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[620px] overflow-auto">
            {requests.length === 0 && <p className="text-sm text-slate-500">No record requests submitted yet.</p>}
            {requests.map((item) => (
              <div key={item.id} className="rounded-2xl border p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.requestType}</p>
                  <Badge className="rounded-xl">{item.status}</Badge>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.reason}</p>
                <p className="text-xs text-slate-500">Submitted: {item.submittedAt}</p>
                <p className="text-xs text-slate-500">Resolved: {item.resolvedAt || "Pending"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function ProviderRecordRequestsPage() {
  const { store, updateRecordRequestStatus, appendAuditLog } = useAuth();
  const requests = store.recordRequests || [];
  const handleStatus = (id, status) => {
    updateRecordRequestStatus(id, status);
    appendAuditLog({
      action: `Updated record request to ${status}`,
      details: "Provider reviewed a client records request.",
      category: "Records Request",
    });
  };
  return (
    <div>
      <SectionHeader
        title="Record Requests"
        description="Provider review queue for client medical record requests. Psychotherapy notes remain provider restricted."
      />
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 space-y-3 max-h-[700px] overflow-auto">
          {requests.length === 0 && <p className="text-sm text-slate-500">No record requests available.</p>}
          {requests.map((item) => (
            <div key={item.id} className="rounded-2xl border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.clientName}</p>
                  <p className="text-xs text-slate-400 mt-1">{item.requestType}</p>
                </div>
                <Badge className="rounded-xl">{item.status}</Badge>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.reason}</p>
              <div className="text-xs text-slate-500">
                <p>Submitted: {item.submittedAt}</p>
                <p>Resolved: {item.resolvedAt || "Pending"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => handleStatus(item.id, "Pending Review")}>Pending Review</Button>
                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => handleStatus(item.id, "Approved")}>Approved</Button>
                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => handleStatus(item.id, "Denied")}>Denied</Button>
                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => handleStatus(item.id, "Completed")}>Completed</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
function AuditLogPage() {
  const { store } = useAuth();
  const logs = store.auditLog || [];
  return (
    <div>
      <SectionHeader
        title="Audit Log"
        description="HIPAA-oriented activity tracking for portal actions, chart updates, requests, and documentation events."
      />
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 space-y-3 max-h-[760px] overflow-auto">
          {logs.length === 0 && <p className="text-sm text-slate-500">No audit events recorded yet.</p>}
          {logs.map((item) => (
            <div key={item.id} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium">{item.action}</p>
                  <p className="text-xs text-slate-400 mt-1">{item.timestamp}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge className="rounded-xl">{item.category}</Badge>
                  <Badge variant="secondary" className="rounded-xl">{item.actorRole}</Badge>
                </div>
              </div>
              <div className="text-sm text-slate-700 mt-3 space-y-1">
                <p><span className="font-medium">Actor:</span> {item.actorName}</p>
                <p><span className="font-medium">Details:</span> {item.details || "No details"}</p>
                <p><span className="font-medium">Client:</span> {item.clientName || "N/A"}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
function AssessmentsPage() {
  const { store, updateSpecificUserData, appendAuditLog } = useAuth();
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.[0] || "");
  const selectedClient = selectedClientId ? store.users[selectedClientId] : null;
  const assessments = selectedClient?.assessments || {};
  const [phq9, setPhq9] = useState(Array(9).fill(0));
  const [gad7, setGad7] = useState(Array(7).fill(0));
  const [suicideRisk, setSuicideRisk] = useState({ ideationFrequency: 0, planSpecificity: 0, intentLevel: 0, pastAttemptHistory: 0, protectiveFactors: 0, notes: "" });
  const [substanceUse, setSubstanceUse] = useState({ usesDrugs: "No", frequency: "", concernLevel: "Low", notes: "", sbirtUsePastYear: "No", sbirtFrequency: 0, sbirtCraving: 0, sbirtRoleImpact: 0, sbirtReadiness: 0, sbirtIntervention: "Education / Monitoring", sbirtReferral: "No" });
  const [violenceRisk, setViolenceRisk] = useState({ historyOfViolence: "No", recentViolence: "No", legalHistory: "No", victimizationHistory: "No", accessToWeapons: "No", impulsivity: "No", substanceRelatedAggression: "No", triggers: "", protectiveFactors: "", clinicalSummary: "" });
  const [dast10, setDast10] = useState(Array(10).fill(0));
  const [aces10, setAces10] = useState(Array(10).fill(0));
  const [wecare, setWecare] = useState({ housing: "No concern", food: "No concern", utilities: "No concern", transportation: "No concern", employment: "No concern", childcare: "No concern", education: "No concern", safety: "No concern", notes: "" });
  const [safetyPlan, setSafetyPlan] = useState({ warningSigns: "", copingStrategies: "", contacts: "", emergencySteps: "" });

  useEffect(() => {
    const a = selectedClient?.assessments || {};
    setPhq9(a.phq9?.responses || Array(9).fill(0));
    setGad7(a.gad7?.responses || Array(7).fill(0));
    setSuicideRisk(a.suicideRisk?.data || { ideationFrequency: 0, planSpecificity: 0, intentLevel: 0, pastAttemptHistory: 0, protectiveFactors: 0, notes: "" });
    setSubstanceUse(a.substanceUse?.data || { usesDrugs: "No", frequency: "", concernLevel: "Low", notes: "", sbirtUsePastYear: "No", sbirtFrequency: 0, sbirtCraving: 0, sbirtRoleImpact: 0, sbirtReadiness: 0, sbirtIntervention: "Education / Monitoring", sbirtReferral: "No" });
    setViolenceRisk(a.violenceRisk?.data || { historyOfViolence: "No", recentViolence: "No", legalHistory: "No", victimizationHistory: "No", accessToWeapons: "No", impulsivity: "No", substanceRelatedAggression: "No", triggers: "", protectiveFactors: "", clinicalSummary: "" });
    setDast10(a.dast?.responses || Array(10).fill(0));
    setAces10(a.aces?.responses || Array(10).fill(0));
    setWecare(a.wecare?.data || { housing: "No concern", food: "No concern", utilities: "No concern", transportation: "No concern", employment: "No concern", childcare: "No concern", education: "No concern", safety: "No concern", notes: "" });
    setSafetyPlan(a.safetyPlan?.data || { warningSigns: "", copingStrategies: "", contacts: "", emergencySteps: "" });
  }, [selectedClientId]);

  const phqScore = phq9.reduce((a, b) => a + b, 0);
  const gadScore = gad7.reduce((a, b) => a + b, 0);
  const suicideRiskScore = suicideRisk.ideationFrequency + suicideRisk.planSpecificity + suicideRisk.intentLevel + suicideRisk.pastAttemptHistory + Math.max(0, 3 - suicideRisk.protectiveFactors);
  const sbirtScore = substanceUse.sbirtFrequency + substanceUse.sbirtCraving + substanceUse.sbirtRoleImpact;
  const dastScore = dast10.reduce((a, b) => a + b, 0);
  const acesScore = aces10.reduce((a, b) => a + b, 0);
  const wecareConcernCount = Object.values(wecare).filter((value) => value === "Concern present").length;
  const phqSeverity = phqScore <= 4 ? "Minimal" : phqScore <= 9 ? "Mild" : phqScore <= 14 ? "Moderate" : phqScore <= 19 ? "Moderately Severe" : "Severe";
  const gadSeverity = gadScore <= 4 ? "Minimal" : gadScore <= 9 ? "Mild" : gadScore <= 14 ? "Moderate" : "Severe";
  const suicideRiskLevel = suicideRiskScore <= 4 ? "Low" : suicideRiskScore <= 8 ? "Moderate" : "High";
  const sbirtRiskLevel = sbirtScore <= 2 ? "Low Risk" : sbirtScore <= 5 ? "Moderate Risk" : "High Risk";
  const dastSeverity = dastScore === 0 ? "No problems reported" : dastScore <= 2 ? "Low level" : dastScore <= 5 ? "Moderate level" : dastScore <= 8 ? "Substantial level" : "Severe level";

  const saveAssessment = (key, payload, label) => {
    if (!selectedClientId) return;
    updateSpecificUserData(selectedClientId, "assessments", {
      ...(selectedClient?.assessments || {}),
      [key]: { ...payload, completedAt: new Date().toLocaleString(), reviewedByProvider: true },
    });
    appendAuditLog({
      action: `Completed ${label}`,
      details: `${label} saved to clinical assessments.`,
      clientId: selectedClientId,
      clientName: selectedClient?.profile?.fullName || "Client",
      category: "Assessment",
    });
  };

  const scoreOptions = [
    ["0", "0 - Not at all"],
    ["1", "1 - Several days"],
    ["2", "2 - More than half"],
    ["3", "3 - Nearly every day"],
  ];
  const yesNoOptions = [["No", "No"], ["Yes", "Yes"]];
  const scaleOptions = [["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]];

  const NumberSelect = ({ value, onChange, options = scaleOptions, placeholder = "Select" }) => (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger className="rounded-2xl"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map(([optionValue, label]) => <SelectItem key={optionValue} value={optionValue}>{label}</SelectItem>)}</SelectContent>
    </Select>
  );

  const YesNoSelect = ({ value, onChange, placeholder = "Select" }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="rounded-2xl"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{yesNoOptions.map(([optionValue, label]) => <SelectItem key={optionValue} value={optionValue}>{label}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <div>
      <SectionHeader title="Assessments" description="Interactive clinical forms with scoring, completion status, and provider review state." />
      <Card className="rounded-2xl shadow-sm mb-4">
        <CardContent className="p-4">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="rounded-2xl max-w-md"><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>{clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="phq9">
        <TabsList className="grid grid-cols-2 lg:grid-cols-9 rounded-2xl w-full">
          <TabsTrigger value="phq9">PHQ-9</TabsTrigger>
          <TabsTrigger value="gad7">GAD-7</TabsTrigger>
          <TabsTrigger value="suicide">Suicide Risk</TabsTrigger>
          <TabsTrigger value="substance">SBIRT</TabsTrigger>
          <TabsTrigger value="dast">DAST</TabsTrigger>
          <TabsTrigger value="aces">ACES</TabsTrigger>
          <TabsTrigger value="wecare">WECARE</TabsTrigger>
          <TabsTrigger value="violence">Violence Risk</TabsTrigger>
          <TabsTrigger value="safety">Safety Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="phq9" className="mt-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>PHQ-9 Depression Screening</CardTitle><CardDescription>Auto-scored 0-27 with severity band.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {phq9.map((value, i) => (
                <div key={i} className="grid md:grid-cols-[1fr_180px] gap-3 items-center">
                  <p className="text-sm">Question {i + 1}</p>
                  <NumberSelect value={value} options={scoreOptions} onChange={(next) => setPhq9((prev) => prev.map((x, idx) => idx === i ? next : x))} />
                </div>
              ))}
              <div className="rounded-2xl border p-4 bg-slate-50 text-sm">Score: <span className="font-semibold">{phqScore}</span> | Severity: <span className="font-semibold">{phqSeverity}</span> | Completed: {assessments.phq9?.completedAt || "Not completed"}</div>
              <Button className="rounded-2xl" onClick={() => saveAssessment("phq9", { responses: phq9, score: phqScore, severity: phqSeverity }, "PHQ-9")}>Save PHQ-9</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gad7" className="mt-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>GAD-7 Anxiety Screening</CardTitle><CardDescription>Auto-scored 0-21 with severity band.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {gad7.map((value, i) => (
                <div key={i} className="grid md:grid-cols-[1fr_180px] gap-3 items-center">
                  <p className="text-sm">Question {i + 1}</p>
                  <NumberSelect value={value} options={scoreOptions} onChange={(next) => setGad7((prev) => prev.map((x, idx) => idx === i ? next : x))} />
                </div>
              ))}
              <div className="rounded-2xl border p-4 bg-slate-50 text-sm">Score: <span className="font-semibold">{gadScore}</span> | Severity: <span className="font-semibold">{gadSeverity}</span> | Completed: {assessments.gad7?.completedAt || "Not completed"}</div>
              <Button className="rounded-2xl" onClick={() => saveAssessment("gad7", { responses: gad7, score: gadScore, severity: gadSeverity }, "GAD-7")}>Save GAD-7</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suicide" className="mt-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>Suicide Risk Assessment</CardTitle><CardDescription>Structured scored assessment with risk stratification.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <NumberSelect value={suicideRisk.ideationFrequency} onChange={(next) => setSuicideRisk({ ...suicideRisk, ideationFrequency: next })} placeholder="Ideation frequency" />
                <NumberSelect value={suicideRisk.planSpecificity} onChange={(next) => setSuicideRisk({ ...suicideRisk, planSpecificity: next })} placeholder="Plan specificity" />
                <NumberSelect value={suicideRisk.intentLevel} onChange={(next) => setSuicideRisk({ ...suicideRisk, intentLevel: next })} placeholder="Intent level" />
                <NumberSelect value={suicideRisk.pastAttemptHistory} onChange={(next) => setSuicideRisk({ ...suicideRisk, pastAttemptHistory: next })} placeholder="Past attempts" />
                <NumberSelect value={suicideRisk.protectiveFactors} onChange={(next) => setSuicideRisk({ ...suicideRisk, protectiveFactors: next })} placeholder="Protective factors" />
              </div>
              <Textarea value={suicideRisk.notes} onChange={(event) => setSuicideRisk({ ...suicideRisk, notes: event.target.value })} className="min-h-[140px] rounded-2xl" placeholder="Clinical notes, means/access, buffers, and disposition" />
              <div className="rounded-2xl border p-4 bg-slate-50 text-sm">Score: <span className="font-semibold">{suicideRiskScore}</span> | Risk: <span className="font-semibold">{suicideRiskLevel}</span> | Completed: {assessments.suicideRisk?.completedAt || "Not completed"}</div>
              <Button className="rounded-2xl" onClick={() => saveAssessment("suicideRisk", { data: suicideRisk, score: suicideRiskScore, riskLevel: suicideRiskLevel }, "Suicide Risk Assessment")}>Save Suicide Risk Assessment</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="substance" className="mt-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>Substance Use / Drug Abuse Assessment</CardTitle><CardDescription>Brief substance use screen with SBIRT elements.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <YesNoSelect value={substanceUse.usesDrugs} onChange={(next) => setSubstanceUse({ ...substanceUse, usesDrugs: next })} placeholder="Current use" />
                <Input value={substanceUse.frequency} onChange={(event) => setSubstanceUse({ ...substanceUse, frequency: event.target.value })} placeholder="Primary substance and frequency / pattern" />
                <Select value={substanceUse.concernLevel} onValueChange={(next) => setSubstanceUse({ ...substanceUse, concernLevel: next })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Moderate">Moderate</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select>
                <YesNoSelect value={substanceUse.sbirtUsePastYear} onChange={(next) => setSubstanceUse({ ...substanceUse, sbirtUsePastYear: next })} placeholder="SBIRT past year use" />
                <NumberSelect value={substanceUse.sbirtFrequency} onChange={(next) => setSubstanceUse({ ...substanceUse, sbirtFrequency: next })} placeholder="Frequency" />
                <NumberSelect value={substanceUse.sbirtCraving} onChange={(next) => setSubstanceUse({ ...substanceUse, sbirtCraving: next })} placeholder="Craving / urge" />
                <NumberSelect value={substanceUse.sbirtRoleImpact} onChange={(next) => setSubstanceUse({ ...substanceUse, sbirtRoleImpact: next })} placeholder="Role impact" />
                <NumberSelect value={substanceUse.sbirtReadiness} onChange={(next) => setSubstanceUse({ ...substanceUse, sbirtReadiness: next })} placeholder="Readiness" />
              </div>
              <Textarea value={substanceUse.notes} onChange={(event) => setSubstanceUse({ ...substanceUse, notes: event.target.value })} className="min-h-[140px] rounded-2xl" placeholder="Clinical notes, observed impact, and treatment recommendations" />
              <div className="rounded-2xl border p-4 bg-slate-50 text-sm">SBIRT score: <span className="font-semibold">{sbirtScore}</span> | Risk: <span className="font-semibold">{sbirtRiskLevel}</span> | Completed: {assessments.substanceUse?.completedAt || "Not completed"}</div>
              <Button className="rounded-2xl" onClick={() => saveAssessment("substanceUse", { data: substanceUse, score: sbirtScore, riskLevel: sbirtRiskLevel }, "Substance Use Assessment")}>Save Substance Use Assessment</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dast" className="mt-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>DAST-10</CardTitle><CardDescription>Drug Abuse Screening Test with auto score and severity guidance.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {dast10.map((value, i) => (
                <div key={i} className="grid md:grid-cols-[1fr_180px] gap-3 items-center"><p className="text-sm">DAST item {i + 1}</p><NumberSelect value={value} options={[["0", "No"], ["1", "Yes"]]} onChange={(next) => setDast10((prev) => prev.map((x, idx) => idx === i ? next : x))} /></div>
              ))}
              <div className="rounded-2xl border p-4 bg-slate-50 text-sm">Score: <span className="font-semibold">{dastScore}</span> | Severity: <span className="font-semibold">{dastSeverity}</span> | Completed: {assessments.dast?.completedAt || "Not completed"}</div>
              <Button className="rounded-2xl" onClick={() => saveAssessment("dast", { responses: dast10, score: dastScore, severity: dastSeverity }, "DAST-10")}>Save DAST-10</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aces" className="mt-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>ACES</CardTitle><CardDescription>Adverse Childhood Experiences screen with total ACE score.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {aces10.map((value, i) => (
                <div key={i} className="grid md:grid-cols-[1fr_180px] gap-3 items-center"><p className="text-sm">ACE item {i + 1}</p><NumberSelect value={value} options={[["0", "No"], ["1", "Yes"]]} onChange={(next) => setAces10((prev) => prev.map((x, idx) => idx === i ? next : x))} /></div>
              ))}
              <div className="rounded-2xl border p-4 bg-slate-50 text-sm">ACE score: <span className="font-semibold">{acesScore}</span> | Completed: {assessments.aces?.completedAt || "Not completed"}</div>
              <Button className="rounded-2xl" onClick={() => saveAssessment("aces", { responses: aces10, score: acesScore }, "ACES")}>Save ACES</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wecare" className="mt-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>WECARE</CardTitle><CardDescription>Social needs screening for housing, food, utilities, transportation, employment, childcare, education, and safety concerns.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">{[["housing","Housing"],["food","Food"],["utilities","Utilities"],["transportation","Transportation"],["employment","Employment"],["childcare","Childcare"],["education","Education"],["safety","Safety"]].map(([key, label]) => (
                <Select key={key} value={wecare[key]} onValueChange={(next) => setWecare({ ...wecare, [key]: next })}><SelectTrigger><SelectValue placeholder={label} /></SelectTrigger><SelectContent><SelectItem value="No concern">{label} - No concern</SelectItem><SelectItem value="Concern present">{label} - Concern present</SelectItem></SelectContent></Select>
              ))}</div>
              <Textarea value={wecare.notes} onChange={(event) => setWecare({ ...wecare, notes: event.target.value })} className="min-h-[140px] rounded-2xl" placeholder="Notes, identified social needs, and referral follow-up" />
              <div className="rounded-2xl border p-4 bg-slate-50 text-sm">Concern count: <span className="font-semibold">{wecareConcernCount}</span> | Completed: {assessments.wecare?.completedAt || "Not completed"}</div>
              <Button className="rounded-2xl" onClick={() => saveAssessment("wecare", { data: wecare, concernCount: wecareConcernCount }, "WECARE")}>Save WECARE</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violence" className="mt-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>Violence Risk / Personal History of Violence Assessment</CardTitle><CardDescription>Expanded clinical review focused on aggression patterns and contextual risk factors.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                {["historyOfViolence", "recentViolence", "legalHistory", "victimizationHistory", "accessToWeapons", "impulsivity", "substanceRelatedAggression"].map((key) => (
                  <YesNoSelect key={key} value={violenceRisk[key]} onChange={(next) => setViolenceRisk({ ...violenceRisk, [key]: next })} placeholder={key} />
                ))}
              </div>
              <Textarea value={violenceRisk.triggers} onChange={(event) => setViolenceRisk({ ...violenceRisk, triggers: event.target.value })} className="min-h-[100px] rounded-2xl" placeholder="Known triggers, patterns, or precipitants" />
              <Textarea value={violenceRisk.protectiveFactors} onChange={(event) => setViolenceRisk({ ...violenceRisk, protectiveFactors: event.target.value })} className="min-h-[100px] rounded-2xl" placeholder="Protective factors, supports, or stabilizers" />
              <Textarea value={violenceRisk.clinicalSummary} onChange={(event) => setViolenceRisk({ ...violenceRisk, clinicalSummary: event.target.value })} className="min-h-[140px] rounded-2xl" placeholder="Clinical summary and disposition" />
              <div className="rounded-2xl border p-4 bg-slate-50 text-sm">Completed: {assessments.violenceRisk?.completedAt || "Not completed"}</div>
              <Button className="rounded-2xl" onClick={() => saveAssessment("violenceRisk", { data: violenceRisk }, "Violence Risk Assessment")}>Save Violence Risk Assessment</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safety" className="mt-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>Safety Plan</CardTitle><CardDescription>Interactive multi-step safety planning template.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={safetyPlan.warningSigns} onChange={(event) => setSafetyPlan({ ...safetyPlan, warningSigns: event.target.value })} className="min-h-[100px] rounded-2xl" placeholder="Warning signs" />
              <Textarea value={safetyPlan.copingStrategies} onChange={(event) => setSafetyPlan({ ...safetyPlan, copingStrategies: event.target.value })} className="min-h-[100px] rounded-2xl" placeholder="Internal coping strategies" />
              <Textarea value={safetyPlan.contacts} onChange={(event) => setSafetyPlan({ ...safetyPlan, contacts: event.target.value })} className="min-h-[100px] rounded-2xl" placeholder="Support people / crisis contacts" />
              <Textarea value={safetyPlan.emergencySteps} onChange={(event) => setSafetyPlan({ ...safetyPlan, emergencySteps: event.target.value })} className="min-h-[100px] rounded-2xl" placeholder="Emergency steps" />
              <Button className="rounded-2xl" onClick={() => saveAssessment("safetyPlan", { data: safetyPlan }, "Safety Plan")}>Save Safety Plan</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
function InfrastructurePage() {
  return (
    <div>
      <SectionHeader title="Infrastructure" description="Production EHR infrastructure, HIPAA data structure, security rules, immutable audit logging, access logging, and deployment readiness." />
      <Tabs defaultValue="data-model">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl w-full">
          <TabsTrigger value="data-model">Data Structure</TabsTrigger>
          <TabsTrigger value="rules">Security Rules</TabsTrigger>
          <TabsTrigger value="audit">Audit / Access</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
        </TabsList>
        <TabsContent value="data-model" className="mt-4"><Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>HIPAA data structure</CardTitle><CardDescription>Recommended AWS-backed production EHR layout.</CardDescription></CardHeader><CardContent><pre className="whitespace-pre-wrap text-sm bg-slate-50 rounded-2xl p-4 border border-slate-200">{`/practices/{practiceId}
/providers/{providerId}
/clients/{clientId}
/profile
/intake
/diagnoses
/assessments
/medical_record_notes
/psychotherapy_notes
/treatment_plans
/homework
/shared_journal_entries
/messages
/appointments
/documents
/record_requests
/audit_logs`}</pre></CardContent></Card></TabsContent>
        <TabsContent value="rules" className="mt-4"><Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>Authorization rules scaffold</CardTitle><CardDescription>Production authorization still requires real auth, API, and database enforcement.</CardDescription></CardHeader><CardContent><pre className="whitespace-pre-wrap text-sm bg-slate-50 rounded-2xl p-4 border border-slate-200">{`API authorization policy:
- Require Cognito JWT on every EHR API request.
- Require practiceId on every PHI record.
- Providers may access only assigned client charts.
- Clients may access only their own portal records.
- Psychotherapy notes remain provider-only.
- Audit log writes are append-only.
- S3 documents are private and opened only through short-lived signed URLs after authorization checks.
- Runtime logs must never contain PHI.`}</pre></CardContent></Card></TabsContent>
        <TabsContent value="audit" className="mt-4"><Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>Immutable audit and access logging</CardTitle><CardDescription>Prototype policy and production expectations.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm text-slate-700"><div className="rounded-2xl border p-4 bg-slate-50"><p className="font-medium">Immutable log policy</p><p className="mt-2">Audit events are append-only. Production logs should never be edited or deleted from the user interface.</p></div><div className="rounded-2xl border p-4 bg-slate-50"><p className="font-medium">Access logging</p><p className="mt-2">Track who opened a chart, who viewed a document, who signed a form, and who released a record request.</p></div><div className="rounded-2xl border p-4 bg-slate-50"><p className="font-medium">Document view tracking</p><p className="mt-2">Each document view should stamp actor, timestamp, client, and document title into audit logs.</p></div></CardContent></Card></TabsContent>
        <TabsContent value="production" className="mt-4"><Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>Production completion checklist</CardTitle><CardDescription>What still exists beyond the prototype.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm text-slate-700"><div className="rounded-2xl border p-4 bg-slate-50">Cognito auth, encrypted database, private S3 document storage, BAA-backed AWS account, encrypted backups, incident procedures, secure deployment, and legal/compliance review.</div><div className="rounded-2xl border p-4 bg-slate-50">Electronic signatures should be persisted with signer name, timestamp, IP or device metadata if appropriate, and document version.</div><div className="rounded-2xl border p-4 bg-slate-50">Document uploads should be moved from metadata-only preview mode to secure file storage with signed access URLs and role-based access rules.</div></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
function ProviderTrainingsPage() {
  const trainings = [
    {
      title: "Clinical Documentation Excellence",
      focus: "Progress notes, treatment plans, chart hygiene, and medical record boundaries.",
      outcome: "Stronger note quality, consistency, and defensible documentation practice.",
    },
    {
      title: "Telehealth Session Operations",
      focus: "Consent workflow, language access, interpreter use, recording policy, and privacy checks.",
      outcome: "Safer remote workflow with clearer session setup and risk management.",
    },
    {
      title: "Assessment Integration Training",
      focus: "PHQ-9, GAD-7, SBIRT, DAST, ACES, WECARE, safety planning, and violence-risk workflow.",
      outcome: "More efficient clinical screening and structured chart integration.",
    },
    {
      title: "Advocacy and Care Coordination Writing",
      focus: "Letters for HR, leave, waivers, outside providers, benefits, and resource coordination.",
      outcome: "Cleaner advocacy workflow with stronger interdisciplinary communication.",
    },
    {
      title: "Provider Essential Work Enhancement",
      focus: "Workflow design, burnout prevention, task organization, time efficiency, and quality improvement.",
      outcome: "Improved provider sustainability, efficiency, and operational clarity.",
    },
  ];
  return (
    <div>
      <SectionHeader
        title="Provider Essential Work Enhancement Trainings"
        description="Internal provider-development modules to strengthen workflow, documentation, telehealth operations, assessments, and advocacy practice."
      />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {trainings.map((training) => (
          <Card key={training.title} className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{training.title}</CardTitle>
              <CardDescription>{training.focus}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p><span className="font-medium text-slate-800">Expected outcome:</span> {training.outcome}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
function DocumentLibraryPage() {
  const { store, updateSpecificUserData, appendAuditLog } = useAuth();
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.[0] || "");
  const selectedClient = selectedClientId ? store.users[selectedClientId] : null;
  const documents = selectedClient?.documents || [];
  const [signatureDocId, setSignatureDocId] = useState("");
  const [signatureName, setSignatureName] = useState(PRACTITIONER_NAME);
  const [signatureRole, setSignatureRole] = useState("Provider");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState("Clinical Document");
  const [uploadFileName, setUploadFileName] = useState("");
  const [advocacyTemplateType, setAdvocacyTemplateType] = useState("Human Resources / Leave");
  const [advocacyDetails, setAdvocacyDetails] = useState({ recipient: "", purpose: "", limitations: "", recommendations: "", collaboration: "" });
  const buildAdvocacyLetterText = () => {
    const clientName = selectedClient?.profile?.fullName || "Client";
    const providerName = PRACTITIONER_NAME;
    const organization = APP_NAME;
    return `${new Date().toLocaleDateString()}
To: ${advocacyDetails.recipient || "[Recipient / Agency / Department]"}
Re: ${clientName}
I am writing in my professional capacity on behalf of ${clientName} in support of ${advocacyDetails.purpose || "an identified advocacy need"}. I am affiliated with ${organization}. This communication is being prepared for care coordination / advocacy purposes consistent with the client's treatment needs and any applicable authorization requirements.
Relevant clinical / functional considerations:
${advocacyDetails.limitations || "[Insert clinically relevant symptoms, functional limitations, or psychosocial barriers here.]"}
Recommended accommodations / supports / requested action:
${advocacyDetails.recommendations || "[Insert requested accommodations, leave support, waiver-related support, resource linkage, or coordination needs here.]"}
Collateral / collaboration details:
${advocacyDetails.collaboration || "[Insert coordination details with medical providers, behavioral health professionals, human resources, housing staff, case management, or outside agencies here.]"}
Please consider this letter in support of continued review of the client's needs and appropriate assistance. Additional information may be provided through proper authorization and release procedures.
Sincerely,
${providerName}
${organization}`;
  };
  const baseTemplates = [
    ...consentTemplateDefinitions.map((item) => [item.title, item.status, item.category, item.body]),
    ["Biopsychosocial Intake", "In progress", "Clinical Form", "Complete biopsychosocial assessment template: demographics, referral/presenting problem, mental health history, medical history, medications, substance use history, trauma history, family/social history, education/employment, housing/legal/cultural factors, risk assessment, strengths, diagnostic impression, and clinical formulation."],
    ["Initial Progress Note Template", "Available", "Clinical Form", "Initial session progress note template: session purpose, presenting concerns, mental status, interventions, client response, risk/safety, diagnosis, plan, follow-up, billing/service code, session minutes, and provider signature."],
    ["PHQ-9 Depression Screening", "Not completed", "Screening", "Depression symptom screening and score tracking."],
    ["GAD-7 Anxiety Screening", "Not completed", "Screening", "Anxiety symptom screening and score tracking."],
    ["Suicide Risk Assessment", "Not completed", "Risk Assessment", "Risk assessment template for suicidal ideation, intent, plan, means, protective factors, safety plan, and disposition."],
    ["Substance Use / Drug Abuse Assessment", "Not completed", "Risk Assessment", "Substance use history, frequency, consequences, readiness, recovery supports, and treatment recommendations."],
    ["Violence Risk Assessment", "Not completed", "Risk Assessment", "Violence risk screening, protective factors, safety actions, and reporting considerations."],
    ["Safety Plan", "Not created", "Safety", "Warning signs, coping strategies, support contacts, crisis resources, emergency steps, and means-safety planning."],
    ["Treatment Plan", "Draft", "Treatment Plan", "Problem statement, long-term goal, short-term objectives, interventions, frequency, target dates, and review/signature workflow."],
    ["Treatment Plan Signature", "Pending", "Signature", "Client/provider treatment plan signature acknowledgement."],
    ["Homework Handout", "Available", "Client Education", "Client homework or between-session practice handout."],
    ["Clinical Outcome Measures", "Not started", "Outcome Measures", "Clinical measurement tracking for symptoms, functioning, progress, and review dates."],
    ["Advocacy Letter Template | Human Resources / Leave", "Available", "Advocacy Letter", "Reusable HR/leave support letter template."],
    ["Advocacy Letter Template | Housing / Waiver / Benefits", "Available", "Advocacy Letter", "Reusable housing, waiver, or benefits support letter template."],
    ["Advocacy Letter Template | Care Coordination / Collaboration", "Available", "Advocacy Letter", "Reusable care coordination/collaboration letter template."],
    ["Advocacy Letter Template | General Outside Resource Support", "Available", "Advocacy Letter", "Reusable general outside-resource support letter template."],
  ];
  const addTemplateDocuments = () => {
    if (!selectedClientId) return;
    const existingTitles = new Set(documents.map((d) => d.title));
    const nextDocs = baseTemplates
      .filter(([title]) => !existingTitles.has(title))
      .map(([title, status, category, body], index) => ({
        id: `doc-${Date.now()}-${index}`,
        title,
        type: category || "Clinical Form",
        category: category || "Clinical Form",
        status,
        viewedAt: "",
        signature: null,
        uploadedFileName: "",
        generatedLetterText: body || "",
        createdAt: new Date().toLocaleString(),
      }));
    updateSpecificUserData(selectedClientId, "documents", [...documents, ...nextDocs]);
    appendAuditLog({ action: "Added document templates", details: "Clinical document templates added to chart.", clientId: selectedClientId, clientName: selectedClient?.profile?.fullName || "Client", category: "Document" });
  };
  const signDocument = () => {
    if (!selectedClientId || !signatureDocId || !signatureName.trim()) return;
    updateSpecificUserData(selectedClientId, "documents", (prev) =>
      prev.map((doc) =>
        doc.id === signatureDocId
          ? { ...doc, status: "Signed", signature: { signer: signatureName, role: signatureRole, signedAt: new Date().toLocaleString() } }
          : doc
      )
    );
    appendAuditLog({ action: "Electronic signature applied", details: `${signatureRole} signature applied by ${signatureName}.`, clientId: selectedClientId, clientName: selectedClient?.profile?.fullName || "Client", category: "Document Signature" });
    setSignatureName(signatureRole === "Provider" ? PRACTITIONER_NAME : "");
  };
  const uploadDocument = () => {
    if (!selectedClientId || !uploadTitle.trim() || !uploadFileName.trim()) return;
    updateSpecificUserData(selectedClientId, "documents", (prev) => [
      {
        id: `upload-${Date.now()}`,
        title: uploadTitle,
        type: uploadType,
        status: "Uploaded",
        viewedAt: "",
        signature: null,
        uploadedFileName: uploadFileName,
        createdAt: new Date().toLocaleString(),
      },
      ...prev,
    ]);
    appendAuditLog({ action: "Uploaded document metadata", details: `${uploadTitle} uploaded as ${uploadFileName}.`, clientId: selectedClientId, clientName: selectedClient?.profile?.fullName || "Client", category: "Document Upload" });
    setUploadTitle("");
    setUploadFileName("");
  };
  const viewDocument = (doc) => {
    updateSpecificUserData(selectedClientId, "documents", (prev) =>
      prev.map((item) => (item.id === doc.id ? { ...item, viewedAt: new Date().toLocaleString() } : item))
    );
    appendAuditLog({ action: "Viewed document", details: `${doc.title} opened from chart library.`, clientId: selectedClientId, clientName: selectedClient?.profile?.fullName || "Client", category: "Document Access" });
  };
  return (
    <div>
      <SectionHeader title="Document Library" description="Interactive document workflow with templates, mock upload, electronic signatures, immutable audit logging, access logging, and document view tracking." />
      <Card className="rounded-2xl shadow-sm mb-4">
        <CardContent className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="rounded-2xl max-w-md"><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>{clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}</SelectContent>
          </Select>
          <Button className="rounded-2xl" onClick={addTemplateDocuments}>Load clinical templates</Button>
        </CardContent>
      </Card>
      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader><CardTitle>Chart documents</CardTitle><CardDescription>Client-specific document set</CardDescription></CardHeader>
          <CardContent className="space-y-3 max-h-[760px] overflow-auto">
            {documents.length === 0 && <p className="text-sm text-slate-500">No chart documents available yet.</p>}
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-2xl border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{doc.type} | Created {doc.createdAt}</p>
                  </div>
                  <Badge className="rounded-xl">{doc.status}</Badge>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>Viewed: {doc.viewedAt || "Not viewed"}</p>
                  <p>File: {doc.uploadedFileName || "No file uploaded"}</p>
                  <p>Signature: {doc.signature ? `${doc.signature.role || "Signer"}: ${doc.signature.signer} | ${doc.signature.signedAt}` : "Not signed"}</p>
                  {doc.generatedLetterText && <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 whitespace-pre-line text-slate-600">{doc.generatedLetterText}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" className="rounded-2xl" onClick={() => viewDocument(doc)}>View / track access</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>Electronic signatures</CardTitle><CardDescription>Mock e-signature workflow for consents and plan signatures</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Select value={signatureDocId} onValueChange={setSignatureDocId}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select document to sign" /></SelectTrigger>
                <SelectContent>{documents.map((doc) => <SelectItem key={doc.id} value={doc.id}>{doc.title}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={signatureRole} onValueChange={(value) => { setSignatureRole(value); setSignatureName(value === "Provider" ? PRACTITIONER_NAME : ""); }}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Provider">Provider signature</SelectItem>
                  <SelectItem value="Client">Client / patient signature</SelectItem>
                  <SelectItem value="Guardian">Guardian / representative signature</SelectItem>
                </SelectContent>
              </Select>
              <Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Signer full name" />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">Prototype signature capture only. Production signature workflow should include signer authentication, document versioning, and storage metadata.</div>
              <Button className="rounded-2xl" onClick={signDocument}>Apply electronic signature</Button>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>Document upload</CardTitle><CardDescription>Mock upload metadata capture for production file storage workflow</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Document title" />
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clinical Document">Clinical Document</SelectItem>
                  <SelectItem value="Assessment">Assessment</SelectItem>
                  <SelectItem value="Consent">Consent</SelectItem>
                  <SelectItem value="Signed Form">Signed Form</SelectItem>
                </SelectContent>
              </Select>
              <Input type="file" onChange={(e) => setUploadFileName(e.target.files?.[0]?.name || "")} className="rounded-2xl" />
              <div className="text-xs text-slate-500">Selected file: {uploadFileName || "No file selected"}</div>
              <Button className="rounded-2xl" onClick={uploadDocument}>Upload document metadata</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
export default function RevealingLeadsToHealingEhrApp() {
  return (
    <div className="ehr-ui">
      <EhrScopedStyles />
      <ErrorBoundary>
      <AuthProvider>
        <PageProvider>
          <AppShell />
        </PageProvider>
      </AuthProvider>
      </ErrorBoundary>
    </div>
  );
}





















