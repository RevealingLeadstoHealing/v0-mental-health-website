// @ts-nocheck
"use client";

import { completedAssessmentSummary, composeBiopsychosocialSummary, assessmentTabs as completedAssessmentTabs } from "../../lib/ehr/assessment-summary";
import { flushModuleSaves } from "../../lib/ehr/flush-module-saves";
import { assessmentHistory, recordAssessment } from "../../lib/ehr/assessment-history";
import { providerIdentifiersForName, providerNpiForName, providerSignatureText, documentSignatureText } from "../../lib/ehr/provider-signature";
import { demographicGroups, editableDemographicFields, patientAge } from "../../lib/ehr/patient-demographics";
import { readableTranscript, isIntakeTemplate, groundedDraft, supportedClinicalSections, intakeFieldPatch } from "../../lib/ehr/scribe-presentation";
import { appointmentStatuses, updateAppointmentStatus, appointmentPreventsSession, appointmentMessageDraft } from "../../lib/ehr/appointment-status";
import NativeTelehealthRoom from "./native-telehealth-room";
import FaxInbox from "./fax-inbox";
import SignedDocuments from "./signed-documents";
import TelehealthEntry from "./telehealth-entry";
import SpecialtyAssessmentForm from "./specialty-assessment-form";
import { specialtyAssessments } from "../../lib/ehr/specialty-assessments";
import React, { Component, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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

function ProviderSignatureInput(props) {
  const identifiers = providerIdentifiersForName(props.value || "");
  return <div className="space-y-2">
    <Input {...props} />
    <Input label="Provider NPI" value={identifiers.npi} readOnly placeholder="Provider NPI not configured" />
    <Input label="Provider license number" value={identifiers.licenseNumber} readOnly placeholder="Provider license not configured" />
  </div>;
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
    @font-face { font-family: "Great Vibes"; src: url("/fonts/great-vibes.ttf") format("truetype"); font-style: normal; font-weight: 400; font-display: swap; }
    .ehr-ui, .ehr-ui * { box-sizing: border-box; }
    .ehr-ui .ehr-workspace-shell { height: 100dvh; display: flex; flex-direction: column; background: #fff; color: #1a1c1f; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .ehr-ui .ehr-workspace-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 24px 18px; border-bottom: 1px solid #e7e7e8; }
    .ehr-ui .ehr-workspace-brand { display: flex; align-items: center; gap: 12px; }
    .ehr-ui .ehr-workspace-brand-name { font-family: "Great Vibes", cursive; font-size: 30px; line-height: 1.3; color: #956d35; }
    .ehr-ui .ehr-workspace-identity { display: grid; gap: 3px; text-align: right; font-size: 13px; }
    .ehr-ui .ehr-workspace-identity span { font-weight: 400; }
    .ehr-ui .ehr-workspace-body { display: grid; grid-template-columns: minmax(188px, 220px) minmax(0, 1fr); flex: 1; min-height: 0; gap: 24px; padding: 20px 24px 0; }
    .ehr-ui .ehr-workspace-sidebar { min-height: 0; overflow-y: auto; padding-bottom: 20px; }
    .ehr-ui nav.ehr-feature-navigation { display: grid; gap: 17px; margin: 0; }
    .ehr-ui .ehr-navigation-group { display: grid; gap: 5px; }
    .ehr-ui .ehr-navigation-label { font-size: 12px; font-weight: 500; padding-bottom: 5px; }
    .ehr-ui nav.ehr-feature-navigation a { display: flex; align-items: center; gap: 9px; padding: 9px 10px; border: 0; border-radius: 8px; font-family: inherit; font-size: 14px; line-height: 1.35; font-weight: 500; text-transform: none; color: #1a1c1f !important; background: transparent; }
    .ehr-ui nav.ehr-feature-navigation a svg { flex-shrink: 0; }
    .ehr-ui nav.ehr-feature-navigation a:hover { background: #e5f2ff; }
    .ehr-ui nav.ehr-feature-navigation a[aria-current="page"] { background: #339cff; color: #fff !important; }
    .ehr-ui nav.ehr-feature-navigation a:focus-visible, .ehr-ui .ehr-menu-toggle:focus-visible { outline: 2px solid #1764ad; outline-offset: 2px; }
    .ehr-ui .ehr-workspace-content { min-width: 0; min-height: 0; overflow: auto; padding: 0 4px 24px; scroll-behavior: auto; }
    .ehr-ui .ehr-workspace-content:focus { outline: none; }
    .ehr-ui .ehr-workspace-content button.bg-slate-50,
    .ehr-ui .ehr-workspace-content button.bg-white,
    .ehr-ui .ehr-workspace-content button.bg-stone-100 { color: #2b2926; }
    .ehr-ui .ehr-patient-dashboard-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }
    .ehr-ui .ehr-patient-list { display: grid; gap: 8px; max-height: 150px; overflow: auto; }
    .ehr-ui .ehr-patient-list button { display: grid; gap: 4px; padding: 10px; text-align: left; background: white; color: #202020; border: 1px solid #ddd; border-radius: 8px; font: inherit; }
    .ehr-ui .ehr-patient-list button[aria-pressed="true"] { background: #e5f2ff; border-color: #339cff; }
    .ehr-ui .ehr-patient-list button span { font-size: 11px; overflow-wrap: anywhere; }
    .ehr-ui .ehr-demographic-group { padding: 16px 0; border-top: 1px solid #e7e7e8; }
    .ehr-ui .ehr-demographic-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 20px; margin-top: 14px; }
    .ehr-ui .ehr-demographic-value { min-width: 0; overflow-wrap: anywhere; }
    .ehr-ui .ehr-demographic-value > span { display: block; color: #675f54; font-size: 12px; margin-bottom: 4px; }
    .ehr-ui .ehr-demographic-value input[type="file"] { font: inherit; max-width: 100%; padding: 6px 0; }
    @media (min-width: 1100px) { .ehr-ui .ehr-patient-dashboard-grid { grid-template-columns: 230px minmax(0, 1fr); } .ehr-ui .ehr-patient-list { max-height: 55dvh; } }
    @media (max-width: 590px) { .ehr-ui .ehr-demographic-fields { grid-template-columns: minmax(0, 1fr); } }
    .ehr-ui .ehr-menu-toggle { display: none; }
    @media (max-width: 590px) {
      .ehr-ui .ehr-workspace-header { padding: 12px; flex-wrap: wrap; gap: 8px; }
      .ehr-ui .ehr-workspace-brand-name { font-size: 26px; }
      .ehr-ui .ehr-workspace-identity { text-align: left; }
      .ehr-ui .ehr-workspace-body { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); gap: 12px; padding: 12px 12px 0; }
      .ehr-ui .ehr-workspace-sidebar { padding: 0; max-height: 40dvh; }
      .ehr-ui .ehr-menu-toggle { display: block; width: 100%; padding: 10px; border-radius: 8px; text-align: left; font: inherit; }
      .ehr-ui nav.ehr-feature-navigation { display: none; }
      .ehr-ui nav.ehr-feature-navigation.is-open { display: grid; margin-top: 12px; padding-bottom: 12px; }
    }
    .ehr-ui { min-height: 100vh; background: #f7f3ea; color: #2b2926; font-family: Montserrat, Arial, sans-serif; font-size: 14px; line-height: 1.45; }
    .ehr-ui h1, .ehr-ui h2, .ehr-ui h3 { color: #2b2926 !important; font-family: Montserrat, Arial, sans-serif !important; letter-spacing: 0 !important; line-height: 1.2 !important; text-transform: none !important; }
    .ehr-ui h1 { font-size: 1.35rem !important; margin: 0; }
    .ehr-ui h2 { font-size: 1.2rem !important; margin: 0; }
    .ehr-ui h3 { font-size: 1rem !important; margin: 0; }
    .ehr-ui p { margin: 0; }
    .ehr-ui a { color: inherit; text-decoration: none; }
    .ehr-ui button, .ehr-ui a { cursor: pointer; }
    .ehr-ui button { border: 1px solid #2b2926; background: #2b2926; color: #fff; }
    .ehr-ui input, .ehr-ui textarea, .ehr-ui select { background: #fff; color: #2b2926; border-color: #bdb4a5; }
    .ehr-ui nav a { display: flex; color: #514a41 !important; background: transparent; }
    .ehr-ui nav a.bg-slate-900 { background: #2b2926 !important; color: #fff !important; }
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
    .ehr-ui .bg-stone-900 { background-color: #2b2926 !important; }
    .ehr-ui .bg-stone-100 { background-color: #eee7d9 !important; }
    .ehr-ui .text-white { color: #fff; }
    .ehr-ui .text-stone-950, .ehr-ui .text-stone-900, .ehr-ui .text-stone-800 { color: #2b2926 !important; }
    .ehr-ui .text-stone-700, .ehr-ui .text-stone-600 { color: #675f54 !important; }
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
const PRACTITIONER_NAME = "Kenseener Carpenter";
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
const mockSeed = { currentUserId: null, auditLog: [], recordRequests: [], users: {} };
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
    billingClaims: Array.isArray(bucket.billingClaims) ? bucket.billingClaims : [],
    intake: typeof bucket.intake !== "undefined" ? bucket.intake : (isClient ? { fullName: profile.fullName || "", presentingProblem: "", diagnoses: [] } : null),
    messages: Array.isArray(bucket.messages) ? bucket.messages : [],
    appointments: Array.isArray(bucket.appointments) ? bucket.appointments : [],
    patientOnboarding: bucket.patientOnboarding && typeof bucket.patientOnboarding === "object" ? bucket.patientOnboarding : {},
    telehealth: Array.isArray(bucket.telehealth) ? bucket.telehealth : [],
    recordRequests: Array.isArray(bucket.recordRequests) ? bucket.recordRequests : [],
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
  return { currentUserId: null, auditLog: [], recordRequests: [], users: {} };
}
function writeStore(data) {
  return data;
}
async function productionApi(path, options) {
  const requestOptions = { credentials: "include", cache: "no-store", ...options };
  let response = await fetch(path, requestOptions);
  if (response.status === 401 && path !== "/api/ehr/auth/refresh") {
    const refresh = await fetch("/api/ehr/auth/refresh", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    if (refresh.ok) response = await fetch(path, requestOptions);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The EHR request could not be completed.");
  return data;
}
const AuthContext = createContext(null);
const PageContext = createContext(null);
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || "Unknown EHR interface error" };
  }
  componentDidCatch(error, info) {
    console.error("RLTH EHR component error:", error, info);
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
              <CardTitle className="text-red-700">The EHR safety boundary caught an error</CardTitle>
              <CardDescription>
                One section could not open, but the safety layer kept the rest of the EHR available.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 whitespace-pre-wrap">
                {this.state.errorMessage}
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
                Reset this view once. If the error returns, record the page name and time for technical review.
              </div>
              <Button className="rounded-2xl" onClick={this.resetPreview}>Reset EHR view</Button>
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
  const [store, setStore] = useState(() => readStore());
  const [currentUser, setCurrentUser] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const storeRef = useRef(store);
  const saveQueuesRef = useRef(new Map());
  const saveFailuresRef = useRef(new Map());
  useEffect(() => { storeRef.current = store; }, [store]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await productionApi("/api/ehr/auth/session");
        if (!session.authenticated) {
          const returnTo = window.location.pathname.startsWith("/ehr") ? window.location.pathname : "/ehr";
          window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }
        const sessionUser = session.user;
        const clientsResponse = await productionApi("/api/ehr/clients");
        const clients = clientsResponse.clients || [];
        const recordResponses = await Promise.all(
          clients.map((client) =>
            productionApi(`/api/ehr/records?clientId=${encodeURIComponent(client.clientId)}&limit=100`)
              .catch(() => ({ records: [] }))
          )
        );
        const auditResponse = sessionUser.role === "client"
          ? { events: [] }
          : await productionApi("/api/ehr/audit?limit=100").catch(() => ({ events: [] }));
        const users = {};
        users[sessionUser.id] = normalizeUserBucket({
          profile: {
            fullName: sessionUser.fullName,
            email: sessionUser.email,
            role: sessionUser.role === "client" ? "client" : "provider",
          },
        });
        clients.forEach((client, index) => {
          const bucket = normalizeUserBucket({
            profile: {
              ...Object.fromEntries(editableDemographicFields.filter(key => client[key] !== undefined).map(key => [key, client[key]])),
              fullName: client.fullName,
              email: client.email || "",
              role: "client",
              preferredName: client.preferredName || "",
              dateOfBirth: client.dateOfBirth || "",
              sex: client.sex || "",
              medicalRecordNumber: client.medicalRecordNumber || "",
              phone: client.phone || "",
              addressLine1: client.addressLine1 || "",
              addressLine2: client.addressLine2 || "",
              city: client.city || "",
              state: client.state || "",
              zipCode: client.zipCode || "",
              insurancePayer: client.insurancePayer || "",
              insuranceNetworkStatus: client.insuranceNetworkStatus || "",
              insurancePlanName: client.insurancePlanName || "",
              insuranceMemberId: client.insuranceMemberId || "",
              insuranceGroupNumber: client.insuranceGroupNumber || "",
              status: client.status || "active",
            },
          });
          const records = recordResponses[index]?.records || [];
          records.slice().reverse().forEach((record) => {
            if (record.recordType === "ehr-module-snapshot" && record.payload?.moduleKey) {
              bucket[record.payload.moduleKey] = record.payload.value;
            } else if (record.recordType === "clinical-note") {
              bucket.notes = [...(bucket.notes || []), { id: record.recordId, ...record.payload, status: record.status, createdAt: record.createdAt }];
            } else if (record.recordType === "treatment-plan") {
              bucket.treatmentPlans = [...(bucket.treatmentPlans || []), { id: record.recordId, ...record.payload, status: record.status, createdAt: record.createdAt }];
            } else if (record.recordType === "assessment") {
              const key = String(record.payload?.assessmentType || "assessment").toLowerCase().replace(/[^a-z0-9]+/g, "");
              bucket.assessments = { ...(bucket.assessments || {}), [key]: record.payload };
            } else if (record.recordType === "homework") {
              bucket.homework = [...(bucket.homework || []), { id: record.recordId, ...record.payload, createdAt: record.createdAt }];
            } else if (record.recordType === "journal-entry") {
              bucket.journalEntries = [...(bucket.journalEntries || []), { id: record.recordId, ...record.payload, createdAt: record.createdAt }];
            } else if (record.recordType === "appointment") {
              bucket.appointments = [...(bucket.appointments || []), { id: record.recordId, ...record.payload, createdAt: record.createdAt }];
            }
          });
          users[client.clientId] = bucket;
        });
        if (!active) return;
        const auditLog = (auditResponse.events || []).map((event) => ({
          id: event.auditId,
          timestamp: event.timestamp,
          actorId: event.actorId,
          actorName: event.actorName,
          actorRole: event.actorRole,
          category: event.category,
          action: event.action,
          details: event.summary || "",
          clientId: event.clientId || "",
          clientName: users[event.clientId]?.profile?.fullName || "",
        }));
        const recordRequests = Object.values(users).flatMap((bucket) => bucket.recordRequests || []);
        const chartClientId = sessionUser.role === "client" ? (clients[0]?.clientId || sessionUser.id) : "";
        const nextStore = { currentUserId: sessionUser.id, auditLog, recordRequests, users };
        setStore(nextStore);
        setCurrentUser({ id: sessionUser.id, chartClientId, ...(users[chartClientId || sessionUser.id]?.profile || users[sessionUser.id].profile) });
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to open the production EHR.");
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const persistModuleSnapshot = async (clientId, moduleKey, value) => {
    if (!clientId || !moduleKey) return;
    await productionApi("/api/ehr/records", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId,
        recordType: "ehr-module-snapshot",
        status: "draft",
        payload: { moduleKey, value, providerReviewRequired: true },
      }),
    });
  };
  const enqueueModuleSave = (clientId, moduleKey, value) => {
    const queueKey = `${clientId}:${moduleKey}`;
    setSaveStatus("Saving securely to AWS…");
    const previous = saveQueuesRef.current.get(queueKey) || Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(() => persistModuleSnapshot(clientId, moduleKey, value))
      .then(() => {
        saveFailuresRef.current.delete(queueKey);
        setSaveStatus(saveFailuresRef.current.size ? "Some chart changes have not saved. Please retry them." : "Saved securely to AWS.");
      })
      .catch((error) => {
        saveFailuresRef.current.set(queueKey, error);
        setSaveStatus(`AWS save failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      })
      .finally(() => {
        if (saveQueuesRef.current.get(queueKey) === next) saveQueuesRef.current.delete(queueKey);
      });
    saveQueuesRef.current.set(queueKey, next);
  };

  const flushClientModuleSaves = async (clientId) => {
    await flushModuleSaves(saveQueuesRef.current, saveFailuresRef.current, clientId);
  };
  const login = () => window.location.replace("/login");
  const signup = () => { throw new Error("Public self-registration is disabled in production."); };
  const logout = async () => {
    await fetch("/api/ehr/auth/logout", { method: "POST", credentials: "include" });
    window.location.replace("/login");
  };
  const appendAuditLog = ({ action, details = "", clientId = "", clientName = "", category = "General" }) => {
    const event = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      actorId: currentUser?.id || "system",
      actorName: currentUser?.fullName || "System",
      actorRole: currentUser?.role || "system",
      category, action, details, clientId, clientName,
    };
    setStore((previous) => ({
      ...previous,
      auditLog: [event, ...(previous.auditLog || [])],
    }));
    void productionApi("/api/ehr/audit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, category, clientId, entityType: "ehr-action", summary: details }),
    }).catch((error) => setSaveStatus(`Audit save failed: ${error instanceof Error ? error.message : "Unknown error"}`));
  };
  const submitRecordRequest = ({ requestType, reason }) => {
    if (!currentUser) return;
    const clientId = currentUser.chartClientId || currentUser.id;
    const request = { id: `request-${Date.now()}`, clientId, clientName: currentUser.fullName, requestType, reason, status: "Pending Review", submittedAt: new Date().toLocaleString(), resolvedAt: "" };
    const clientRequests = [request, ...(storeRef.current.users[clientId]?.recordRequests || [])];
    setStore((previous) => {
      const next = {
        ...previous,
        recordRequests: [request, ...(previous.recordRequests || [])],
        users: {
          ...previous.users,
          [clientId]: { ...previous.users[clientId], recordRequests: clientRequests },
        },
      };
      storeRef.current = next;
      return next;
    });
    enqueueModuleSave(clientId, "recordRequests", clientRequests);
  };
  const updateRecordRequestStatus = (requestId, status) => {
    const request = (storeRef.current.recordRequests || []).find((item) => item.id === requestId);
    if (!request?.clientId) return;
    const resolvedAt = status === "Pending Review" ? "" : new Date().toLocaleString();
    const clientRequests = (storeRef.current.users[request.clientId]?.recordRequests || []).map((item) => item.id === requestId ? { ...item, status, resolvedAt } : item);
    setStore((previous) => {
      const next = {
        ...previous,
        recordRequests: (previous.recordRequests || []).map((item) => item.id === requestId ? { ...item, status, resolvedAt } : item),
        users: {
          ...previous.users,
          [request.clientId]: { ...previous.users[request.clientId], recordRequests: clientRequests },
        },
      };
      storeRef.current = next;
      return next;
    });
    enqueueModuleSave(request.clientId, "recordRequests", clientRequests);
  };
  const updateCurrentUserData = (key, updater) => {
    if (!currentUser) return;
    const clientId = currentUser.chartClientId || currentUser.id;
    const userBucket = storeRef.current.users[clientId];
    if (!userBucket) return;
    const updatedValue = typeof updater === "function" ? updater(userBucket[key]) : updater;
    if (currentUser.role !== "client") {
      setSaveStatus("This provider action is not connected to a client chart and was not saved.");
      return;
    }
    setStore((previous) => {
      const next = { ...previous, users: { ...previous.users, [clientId]: { ...previous.users[clientId], [key]: updatedValue } } };
      storeRef.current = next;
      return next;
    });
    enqueueModuleSave(clientId, key, updatedValue);
  };
  const updateSpecificUserData = (userId, key, updater, persist = true) => {
    const userBucket = storeRef.current.users[userId];
    if (!userBucket) return;
    const updatedValue = typeof updater === "function" ? updater(userBucket[key]) : updater;
    setStore((previous) => {
      const next = { ...previous, users: { ...previous.users, [userId]: { ...previous.users[userId], [key]: updatedValue } } };
      storeRef.current = next;
      return next;
    });
    if (persist) enqueueModuleSave(userId, key, updatedValue);
  };
  const createClient = async (profile) => {
    const fullName = String(profile?.fullName || "").trim();
    if (!fullName) throw new Error("Patient full name is required.");
    const insuranceCardFiles = [
      { file: profile?.insuranceCardFrontFile, title: "Insurance Card - Front", documentType: "insurance-card-front" },
      { file: profile?.insuranceCardBackFile, title: "Insurance Card - Back", documentType: "insurance-card-back" },
      { file: profile?.photoIdFrontFile, title: "Photo ID - Front", documentType: "photo-id-front" },
      { file: profile?.photoIdBackFile, title: "Photo ID - Back", documentType: "photo-id-back" },
    ].filter((item) => item.file);
    for (const item of insuranceCardFiles) {
      if (item.file.size > 10 * 1024 * 1024) throw new Error(`${item.title} must be 10 MB or smaller.`);
      if (item.file.type && !item.file.type.startsWith("image/") && item.file.type !== "application/pdf") {
        throw new Error(`${item.title} must be an image or PDF.`);
      }
    }
    const response = await productionApi("/api/ehr/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName,
        preferredName: String(profile?.preferredName || "").trim(),
        email: String(profile?.email || "").trim(),
        phone: String(profile?.phone || "").trim(),
        dateOfBirth: String(profile?.dateOfBirth || ""),
        sex: String(profile?.sex || "").trim(),
        addressLine1: String(profile?.addressLine1 || "").trim(),
        addressLine2: String(profile?.addressLine2 || "").trim(),
        city: String(profile?.city || "").trim(),
        state: String(profile?.state || "").trim(),
        zipCode: String(profile?.zipCode || "").trim(),
        insuranceNetworkStatus: String(profile?.insuranceNetworkStatus || "").trim(),
        insurancePlanName: String(profile?.insurancePlanName || "").trim(),
      }),
    });
    const client = response.client;
    if (!client?.clientId) throw new Error("The patient record could not be created.");
    const onboardingDocuments = consentTemplateDefinitions.map((template, index) => ({
      id: `onboarding-${client.clientId}-${index}`,
      title: template.title,
      type: template.category,
      category: template.category,
      status: "Pending patient signature",
      viewedAt: "",
      signature: null,
      signatures: [],
      uploadedFileName: "",
      generatedLetterText: template.body,
      clientVisible: true,
      onboardingRequired: template.category !== "ROI",
      createdAt: new Date().toISOString(),
    }));
    for (const item of insuranceCardFiles) {
      const authorization = await productionApi("/api/ehr/documents/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: client.clientId,
          documentType: item.documentType,
          fileName: item.file.name,
          contentType: item.file.type || "application/octet-stream",
        }),
      });
      const uploadResponse = await fetch(authorization.uploadUrl, {
        method: "PUT",
        headers: authorization.uploadHeaders,
        body: item.file,
      });
      if (!uploadResponse.ok) throw new Error(`${item.title} could not be uploaded to encrypted AWS storage.`);
      const uploadedInsuranceDocument = {
        id: authorization.documentId,
        title: item.title,
        type: "Insurance",
        category: "Insurance",
        status: "Uploaded",
        viewedAt: "",
        signature: null,
        signatures: [],
        uploadedFileName: item.file.name,
        generatedLetterText: "",
        clientVisible: true,
        onboardingRequired: false,
        createdAt: new Date().toISOString(),
        contentType: item.file.type || "application/octet-stream",
        sizeBytes: item.file.size,
        storageKey: authorization.key,
        uploadedByRole: currentUser.role,
      };
      onboardingDocuments.push(uploadedInsuranceDocument);
    }
    const onboardingIntake = {
      fullName: client.fullName,
      firstName: client.fullName.split(/\s+/)[0] || "",
      lastName: client.fullName.split(/\s+/).slice(1).join(" "),
      dateOfBirth: client.dateOfBirth || "",
      sex: client.sex || "",
      medicalRecordNumber: client.medicalRecordNumber || "",
      phone: client.phone || "",
      addressLine1: client.addressLine1 || "",
      addressLine2: client.addressLine2 || "",
      city: client.city || "",
      state: client.state || "",
      zipCode: client.zipCode || "",
      presentingProblem: "",
      diagnoses: [],
      insurancePayer: String(profile?.insurancePayer || "").trim(),
      insuranceNetworkStatus: String(profile?.insuranceNetworkStatus || "").trim(),
      insurancePlanName: String(profile?.insurancePlanName || "").trim(),
      insuranceMemberId: String(profile?.insuranceMemberId || "").trim(),
      insuranceGroupNumber: String(profile?.insuranceGroupNumber || "").trim(),
      insuranceVerificationStatus: "Not verified",
      onboardingStatus: "Pending patient completion",
    };
    const bucket = normalizeUserBucket({
      profile: {
        fullName: client.fullName,
        email: client.email || "",
        phone: client.phone || "",
        role: "client",
        preferredName: client.preferredName || "",
        dateOfBirth: client.dateOfBirth || "",
        sex: client.sex || "",
        medicalRecordNumber: client.medicalRecordNumber || "",
        addressLine1: client.addressLine1 || "",
        addressLine2: client.addressLine2 || "",
        city: client.city || "",
        state: client.state || "",
        zipCode: client.zipCode || "",
        status: client.status || "active",
      },
      intake: onboardingIntake,
      documents: onboardingDocuments,
    });
    setStore((previous) => {
      const next = {
        ...previous,
        users: { ...previous.users, [client.clientId]: bucket },
      };
      storeRef.current = next;
      return next;
    });
    await Promise.all([
      persistModuleSnapshot(client.clientId, "documents", onboardingDocuments),
      persistModuleSnapshot(client.clientId, "intake", onboardingIntake),
    ]);
    setSaveStatus(response.invitationSent
      ? "Patient chart, onboarding packet, and secure email invitation are ready."
      : "Patient chart and onboarding packet saved. Add an email address to send a portal invitation.");
    return client;
  };
  const value = useMemo(() => ({
    currentUser, store, login, signup, logout, createClient, updateCurrentUserData, updateSpecificUserData, flushClientModuleSaves,
    appendAuditLog, submitRecordRequest, updateRecordRequestStatus, saveStatus, isMockMode: false,
  }), [currentUser, store]);

  if (!hydrated) return <div className="min-h-screen flex items-center justify-center"><p>Opening secure EHR…</p></div>;
  if (!currentUser) return <div className="min-h-screen flex items-center justify-center p-6"><div><h1>Secure session required</h1><p>{loadError}</p><a href="/login">Return to login</a></div></div>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
function PageProvider({ children, initialPage = "dashboard" }) {
  const [page, setPageState] = useState(initialPage);
  const [workflowTarget, setWorkflowTarget] = useState(null);
  const [selectedChartClientId, setSelectedChartClientId] = useState("client-1");
  const setPage = (requestedPage, target = null) => {
    setPageState(requestedPage);
    setWorkflowTarget(target);
    if (target?.clientId) setSelectedChartClientId(target.clientId);
    const requestedPath = `/ehr/${encodeURIComponent(requestedPage)}`;
    if (window.location.pathname !== requestedPath) {
      window.history.pushState({}, "", requestedPath);
    }
  };
  useEffect(() => {
    const syncPageFromPath = () => {
      const requestedPage = window.location.pathname.split("/").filter(Boolean)[1] || "dashboard";
      setPageState(requestedPage);
      setWorkflowTarget(null);
    };
    setPageState(initialPage);
    window.addEventListener("popstate", syncPageFromPath);
    return () => window.removeEventListener("popstate", syncPageFromPath);
  }, [initialPage]);
  return (
    <PageContext.Provider value={{ page, setPage, workflowTarget, selectedChartClientId, setSelectedChartClientId }}>
      {children}
    </PageContext.Provider>
  );
}
function AppShell() {
  const { currentUser } = useAuth();
  return currentUser ? <MainApp /> : <AuthPage />;
}
function AuthPage() {
  const { login, signup } = useAuth();
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <Card className="rounded-3xl shadow-sm border-slate-200">
          <CardContent className="p-8 lg:p-10">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-slate-900 text-white">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Secure behavioral-health record platform</p>
                <h1 className="text-3xl font-semibold mt-1">{APP_NAME}</h1>
                <p className="text-slate-600 mt-3 max-w-2xl">
                  AWS-hosted EHR with role-based provider and client workflows, secure documentation,
                  messaging, scheduling, telehealth, assessments, and collaborative care tools.
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mt-8">
              {[
                [BookOpen, "Private and shared journaling"],
                [Sparkles, "Daily affirmations"],
                [Users, "Provider/client role routing"],
                [MessageSquare, "Portal communication"],
                [Calendar, "Client-linked scheduling"],
                [FileText, "Encrypted record workflow"],
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
              Sign in through the production AWS Cognito authentication service.
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
              Access is restricted to authorized practice users and linked clients. Activity is recorded in the EHR audit history.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function MainApp() {
  const { currentUser, logout, saveStatus } = useAuth();
  const { page, setPage } = usePage();
  const clientItems = [
    ["dashboard", "Dashboard", HeartHandshake],
    ["journal", "Journal", PenSquare],
    ["affirmations", "Affirmations", Sparkles],
    ["psychoeducation", "Psychoeducation", BookOpen],
    ["homework-client", "Homework", BookOpen],
    ["messages", "Messages", MessageSquare],
    ["documents", "Documents", Lock],
    ["records-request", "Record Request", FileText],
    ["telehealth", "Telehealth", Video],
    ["schedule", "Scheduling", Calendar],
  ];
  const providerItems = [
    ["dashboard", "Patient Dashboard", HeartHandshake],
    ["clients", "Client Management", Users],
    ["chart", "Client Chart", FileText],
    ["schedule", "Scheduling", Calendar],
    ["documents", "Patient Intake & Consents", Lock],
    ["intake", "Biopsychosocial Assessment", ClipboardList],
    ["plans", "Treatment Plans", Stethoscope],
    ["notes", "Follow-Up Notes", FileText],
    ["assessments", "Assessments", ClipboardList],
    ["telehealth", "Telehealth", Video],
    ["messages", "Messages", MessageSquare],
    ["billing", "Billing", ClipboardList],
    ["audit-log", "Audit Log", Lock],
    ["infrastructure", "Infrastructure", Shield],
    ["affirmations", "Affirmations", Sparkles],
    ["journal", "Journaling", PenSquare],
    ["homework", "Homework", BookOpen],
    ["psychoeducation", "Psychoeducation", Brain],
    ["trainings", "Provider Trainings", GraduationCap],
    ["record-requests", "Record Requests", FileText],
  ];
  const navItems = currentUser.role === "provider" ? providerItems : clientItems;
  const groups = currentUser.role === "provider" ? [
    ["Overview", providerItems.slice(0, 4)],
    ["Clinical documentation", providerItems.slice(4, 9)],
    ["Communication", providerItems.slice(9, 11)],
    ["Billing & Review", providerItems.slice(11, 14)],
    ["Wellness tools", providerItems.slice(14, 18)],
    ["Practice resources", providerItems.slice(18)],
  ] : [["Overview", clientItems]];
  const [menuOpen, setMenuOpen] = useState(false);
  const workspaceRef = useRef(null);
  useEffect(() => {
    setMenuOpen(false);
    workspaceRef.current?.scrollTo({ top: 0 });
    workspaceRef.current?.focus({ preventScroll: true });
  }, [page]);
  return (
    <div className="ehr-workspace-shell">
      <header className="ehr-workspace-header">
        <div className="ehr-workspace-brand">
          <Shield className="h-5 w-5" aria-hidden="true" />
          <div>
            <div className="ehr-workspace-brand-name">Revealing Leads to Healing</div>
            <p className="text-xs">{VERSION}</p>
          </div>
        </div>
        <div className="ehr-workspace-identity">
          <strong>{currentUser.fullName}</strong>
          <span>{currentUser.role === "provider" ? "Provider" : "Client"}</span>
          {currentUser.role === "provider" && providerNpiForName(currentUser.fullName) && <span className="text-xs">NPI: {providerNpiForName(currentUser.fullName)} | License: {providerIdentifiersForName(currentUser.fullName).licenseNumber}</span>}
        </div>
      </header>
      <div className="ehr-workspace-body">
        <aside className="ehr-workspace-sidebar">
          <button type="button" className="ehr-menu-toggle" aria-expanded={menuOpen}
            aria-controls="ehr-feature-navigation" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? "Close menu" : `Menu · ${navItems.find(([id]) => id === page)?.[1] || "EHR"}`}
          </button>
          <nav id="ehr-feature-navigation" aria-label="EHR features" className={menuOpen ? "ehr-feature-navigation is-open" : "ehr-feature-navigation"}>
            {groups.map(([title, items]) => (
              <section className="ehr-navigation-group" key={title} aria-label={title}>
                <div className="ehr-navigation-label">{title}</div>
                {items.map(([id, label, Icon]) => (
                  <a key={id} href={`/ehr/${encodeURIComponent(id)}`}
                    aria-current={page === id ? "page" : undefined}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault();
                      setMenuOpen(false);
                      setPage(id);
                    }}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{label}</span>
                  </a>
                ))}
              </section>
            ))}
            <Button variant="outline" className="w-full mt-6 rounded-2xl" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />Logout
            </Button>
          </nav>
        </aside>
        <main className="ehr-workspace-content" ref={workspaceRef} tabIndex={-1} aria-label={navItems.find(([id]) => id === page)?.[1] || "EHR workspace"}>
          {saveStatus && <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${saveStatus.includes("failed") || saveStatus.includes("not saved") ? "border-red-200 bg-red-50 text-red-800" : saveStatus.includes("Saving") ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{saveStatus}</div>}
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
  if (page === "dashboard") return currentUser.role === "provider" ? <ProviderPatientDashboard /> : <DashboardPage />;
  if (page === "journal") return currentUser.role === "provider" ? <SharedJournalingPage /> : <JournalPage />;
  if (page === "affirmations") return <AffirmationsPage />;
  if (page === "psychoeducation") return <PsychoeducationPage />;
  if (page === "homework-client" && currentUser.role === "client") return <ClientHomeworkPage />;
  if (page === "messages") return <MessagingPage />;
  if (page === "records-request" && currentUser.role === "client") return <ClientRecordRequestPage />;
  if (page === "record-requests" && currentUser.role === "provider") return <ProviderRecordRequestsPage />;
  if (page === "audit-log" && currentUser.role === "provider") return <AuditLogPage />;
  if (page === "telehealth" && currentUser.role === "client") return <ClientTelehealthPage />;
  if (page === "telehealth" && currentUser.role === "provider") return <TelehealthPage />;
  if (page === "schedule") return <SchedulingPage />;
  if (page === "clients" && currentUser.role === "provider") return <ClientManagementPage />;
  if (page === "chart" && currentUser.role === "provider") return <ClientChartPage />;
  if (page === "intake" && currentUser.role === "provider") return <IntakePage />;
  if (page === "notes" && currentUser.role === "provider") return <ProgressNotesPage />;
  if (page === "billing" && currentUser.role === "provider") return <BillingPage />;
  if (page === "plans" && currentUser.role === "provider") return <TreatmentPlansPage />;
  if (page === "homework" && currentUser.role === "provider") return <HomeworkPage />;
  if (page === "assessments" && currentUser.role === "provider") return <AssessmentsPage />;
  if (page === "documents") return <DocumentLibraryPage />;
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
function ProviderPatientDashboard() {
  const { store, updateSpecificUserData } = useAuth();
  const { selectedChartClientId, setSelectedChartClientId, setPage } = usePage();
  const [patientSearch, setPatientSearch] = useState("");
  const [editingPatient, setEditingPatient] = useState(false);
  const [editDraft, setEditDraft] = useState({});
  const [editFiles, setEditFiles] = useState({});
  const [editNotice, setEditNotice] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const patients = Object.entries(store.users)
    .filter(([, bucket]) => bucket.profile.role === "client")
    .map(([id, bucket]) => ({ id, profile: bucket.profile, intake: bucket.intake || {}, documents: bucket.documents || [] }));
  const normalizedSearch = patientSearch.trim().toLowerCase();
  const matchingPatients = normalizedSearch
    ? patients.filter(({ profile }) => [profile.fullName, profile.medicalRecordNumber, profile.email].some((value) => String(value || "").toLowerCase().includes(normalizedSearch)))
    : patients;
  const selectedPatient = patients.find(({ id }) => id === selectedChartClientId) || matchingPatients[0] || null;
  const profile = selectedPatient?.profile || {};
  const intake = selectedPatient?.intake || {};
  const address = [profile.addressLine1 || intake.addressLine1, profile.addressLine2 || intake.addressLine2, profile.city || intake.city, profile.state || intake.state, profile.zipCode || intake.zipCode].filter(Boolean).join(", ");

  const beginPatientEdit = () => {
    if (!selectedPatient) return;
    const value = (key) => String(profile[key] || intake[key] || "");
    setEditDraft(Object.fromEntries(editableDemographicFields.map(key => [key,
      key === "contactEmail" ? String(profile.contactEmail ?? profile.email ?? "") : String(profile[key] || intake[key] || "")
    ])));
    setEditFiles({});
    setEditNotice("");
    setEditingPatient(true);
  };
  const savePatientEdit = async () => {
    if (!selectedPatient) return;
    if (!String(editDraft.fullName || "").trim()) {
      setEditNotice("Patient name is required.");
      return;
    }
    setEditBusy(true);
    setEditNotice("Saving patient record securely…");
    try {
      for (const file of Object.values(editFiles).filter(Boolean)) {
        if (file.size > 10 * 1024 * 1024) throw new Error("Each file must be 10 MB or smaller.");
        if (!file.type.startsWith("image/") && file.type !== "application/pdf") throw new Error("Choose an image or PDF.");
      }
      const persistValue = async (key, value) => {
        await productionApi("/api/ehr/records", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientId: selectedPatient.id, recordType: "ehr-module-snapshot", status: "draft", payload: { moduleKey: key, value, providerReviewRequired: true } }),
        });
        updateSpecificUserData(selectedPatient.id, key, value, false);
      };
      const result = await productionApi("/api/ehr/clients", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: selectedPatient.id, ...editDraft }),
      });
      const updatedClient = result.client || {};
      const updatedProfile = { ...profile, ...editDraft, ...updatedClient };
      const updatedIntake = {
        ...intake,
        ...editDraft,
        fullName: updatedClient.fullName || editDraft.fullName,
        medicalRecordNumber: profile.medicalRecordNumber || intake.medicalRecordNumber || updatedClient.medicalRecordNumber || "",
      };
      await persistValue("profile", updatedProfile);
      await persistValue("intake", updatedIntake);
      const uploads = [
        { file: editFiles.insuranceFront, title: "Insurance Card - Front", documentType: "insurance-card-front", category: "Insurance" },
        { file: editFiles.insuranceBack, title: "Insurance Card - Back", documentType: "insurance-card-back", category: "Insurance" },
        { file: editFiles.photoIdFront, title: "Photo ID - Front", documentType: "photo-id-front", category: "Identification" },
        { file: editFiles.photoIdBack, title: "Photo ID - Back", documentType: "photo-id-back", category: "Identification" },
      ].filter((item) => item.file);
      const uploadedDocuments = [];
      for (const item of uploads) {
        if (item.file.size > 10 * 1024 * 1024) throw new Error(`${item.title} must be 10 MB or smaller.`);
        if (item.file.type && !item.file.type.startsWith("image/") && item.file.type !== "application/pdf") {
          throw new Error(`${item.title} must be an image or PDF.`);
        }
        const authorization = await productionApi("/api/ehr/documents/presign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            clientId: selectedPatient.id,
            documentType: item.documentType,
            fileName: item.file.name,
            contentType: item.file.type || "application/octet-stream",
          }),
        });
        const uploadResponse = await fetch(authorization.uploadUrl, {
          method: "PUT",
          headers: authorization.uploadHeaders,
          body: item.file,
        });
        if (!uploadResponse.ok) throw new Error(`${item.title} could not be uploaded to encrypted AWS storage.`);
        uploadedDocuments.push({
          id: authorization.documentId, title: item.title, type: item.category, category: item.category,
          status: "Uploaded", viewedAt: "", signature: null, signatures: [],
          uploadedFileName: item.file.name, generatedLetterText: "", clientVisible: true,
          onboardingRequired: false, createdAt: new Date().toISOString(),
          contentType: item.file.type || "application/octet-stream", sizeBytes: item.file.size,
          storageKey: authorization.key, uploadedByRole: "provider",
        });
        await persistValue("documents", [...(selectedPatient.documents || []), ...uploadedDocuments]);
      }
      setEditNotice("Patient record saved securely.");
      setEditingPatient(false);
    } catch (error) {
      setEditNotice(error instanceof Error ? error.message : "Patient record could not be saved.");
    } finally {
      setEditBusy(false);
    }
  };
  const choosePatient = (id) => {
    if (editBusy) return;
    if (editingPatient && !window.confirm("Discard unsaved changes before selecting another patient?")) return;
    setSelectedChartClientId(id);
    setEditingPatient(false);
    setEditDraft({});
    setEditFiles({});
    setEditNotice("");
  };
  const valueFor = (key) => key === "contactEmail"
    ? String(profile.contactEmail ?? profile.email ?? "")
    : String(profile[key] || intake[key] || "");
  const documentSlots = [
    ["insuranceFront", "Insurance Card - Front"], ["insuranceBack", "Insurance Card - Back"],
    ["photoIdFront", "Photo ID - Front"], ["photoIdBack", "Photo ID - Back"],
  ];
  return (
    <div>
      <SectionHeader title="Patient Dashboard" description="Patient demographics, contact information, insurance, and identification." right={<Button className="rounded-2xl" onClick={() => setPage("clients")}>Client Management</Button>} />
      <div className="ehr-patient-dashboard-grid">
        <Card className="ehr-patient-picker"><CardHeader><CardTitle>Patient records</CardTitle></CardHeader><CardContent className="space-y-3">
          <Input label="Search patients" value={patientSearch} disabled={editBusy} onChange={event => setPatientSearch(event.target.value)} />
          <div className="ehr-patient-list">
            {matchingPatients.length === 0 && <p>No matching patients.</p>}
            {matchingPatients.map(({ id, profile: item }) => <button key={id} type="button" disabled={editBusy} aria-pressed={selectedPatient?.id === id} onClick={() => choosePatient(id)}><strong>{item.fullName}</strong><span>{item.medicalRecordNumber || "Medical record number pending"}</span></button>)}
          </div>
        </CardContent></Card>
        {!selectedPatient ? <Card><CardContent>Select a patient or open Client Management to add a new patient.</CardContent></Card> :
          <Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>{profile.fullName || "Patient"}</CardTitle><CardDescription>Medical record number: {profile.medicalRecordNumber || intake.medicalRecordNumber || "Pending"}</CardDescription></div>
            {!editingPatient && <Button variant="outline" onClick={beginPatientEdit}>Edit</Button>}
          </div><p className="text-xs text-slate-600">Optional details may be left blank. Age is calculated from date of birth.</p></CardHeader>
          <CardContent className="space-y-4">
            {editNotice && <div role="status" className="rounded-2xl border p-3">{editNotice}</div>}
            {editingPatient && <div className="flex gap-2"><Button disabled={editBusy} onClick={savePatientEdit}>{editBusy ? "Saving…" : "Save Changes"}</Button><Button variant="outline" disabled={editBusy} onClick={() => { setEditingPatient(false); setEditFiles({}); }}>Cancel</Button></div>}
            {demographicGroups.map(group => <section className="ehr-demographic-group" aria-label={group.title} key={group.title}>
              <h3>{group.title}</h3>
              <div className="ehr-demographic-fields">
                {group.fields.map(([key, label, type]) => <div key={key}>{editingPatient
                  ? <Input label={label} type={type || "text"} value={editDraft[key] || ""} disabled={editBusy} onChange={event => setEditDraft(previous => {
                    const next = { ...previous, [key]: event.target.value };
                    if (key === "firstName" || key === "lastName") next.fullName = [next.firstName, next.lastName].filter(Boolean).join(" ");
                    return next;
                  })} />
                  : <div className="ehr-demographic-value"><span>{label}</span><p>{valueFor(key) || "Not entered"}</p></div>}
                </div>)}
                {group.title === "Patient information" && <div className="ehr-demographic-value"><span>Age</span><p>{patientAge(editingPatient ? editDraft.dateOfBirth || "" : valueFor("dateOfBirth"))}</p></div>}
              </div>
            </section>)}
            <section className="ehr-demographic-group" aria-label="Insurance cards and photo ID">
              <h3>Insurance cards and photo ID</h3><p className="text-xs">Images or PDFs, up to 10 MB each.</p>
              <div className="ehr-demographic-fields">{documentSlots.map(([key, label]) => {
                const uploaded = (selectedPatient.documents || []).filter(doc => doc.title === label && doc.storageKey);
                return <div className="ehr-demographic-value" key={key}><span>{label}</span>
                  <p>{uploaded.length ? uploaded.map(doc => doc.uploadedFileName || "Uploaded").join(", ") : "Not uploaded"}</p>
                  <label className="block text-sm">Upload {label}<input key={`${selectedPatient.id}-${editingPatient}-${key}`} className="block w-full" type="file" accept="image/*,application/pdf" disabled={editBusy} onChange={event => {
                    const file = event.target.files?.[0]; if (!file) return;
                    if (!editingPatient) beginPatientEdit();
                    setEditFiles(previous => ({ ...previous, [key]: file }));
                  }} /></label>
                  {editFiles[key] && editingPatient && <p className="text-xs">Selected: {editFiles[key].name} — use Save Changes to upload.</p>}
                </div>;
              })}</div>
            </section>
            {editingPatient && <Button disabled={editBusy} onClick={savePatientEdit}>{editBusy ? "Saving…" : "Save Changes"}</Button>}
            <div className="flex gap-2"><Button onClick={() => { setSelectedChartClientId(selectedPatient.id); setPage("chart"); }}>Open Client Chart</Button><Button variant="outline" onClick={() => { setSelectedChartClientId(selectedPatient.id); setPage("schedule"); }}>Scheduling</Button></div>
          </CardContent></Card>}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { currentUser, store } = useAuth();
  const currentClientId = currentUser.chartClientId || currentUser.id;
  const bucket = store.users[currentUser.role === "client" ? currentClientId : currentUser.id];
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
      {currentUser.role === "client" && <TelehealthEntry />}
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
                <p className="font-medium">Provider operations</p>
                <p className="mt-2">Secure authentication and role management</p>
                <p>Secure messaging and scheduling</p>
                <p>Clinical intake, notes, treatment plans, and assessments</p>
                <p>Encrypted documents and authenticated signatures</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="font-medium">Client collaboration</p>
                <p className="mt-2">Linked client portal and chart access</p>
                <p>Messages, homework, scheduling, and shared journal entries</p>
                <p>Document review, upload, record requests, and signatures</p>
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
              AWS Cognito authentication, role-based chart access, encrypted workflows, audit logging, backups,
              and retention controls support the practice’s security operations. Required operating policies and BAAs must remain current.
            </div>
            <p className="text-xs text-slate-400">Practice owner: {PRACTITIONER_NAME}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function SharedJournalingPage() {
  const { store } = useAuth();
  const { selectedChartClientId, setSelectedChartClientId } = usePage();
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const clientId = clients.some(([id]) => id === selectedChartClientId) ? selectedChartClientId : clients[0]?.[0] || "";
  const sharedEntries = (store.users[clientId]?.journalEntries || []).filter(entry => entry.visibility === "shared");
  return <div>
    <SectionHeader title="Journaling" description="Journal entries the client has chosen to share with the provider." />
    <Select value={clientId} onValueChange={setSelectedChartClientId}>
      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
      <SelectContent>{clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}</SelectContent>
    </Select>
    <div className="space-y-3 mt-4">
      {!sharedEntries.length && <p>No shared journal entries for this client.</p>}
      {sharedEntries.map(entry => <Card key={entry.id}><CardHeader><CardTitle>{entry.title}</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap">{entry.content}</p></CardContent></Card>)}
    </div>
  </div>;
}
function JournalPage() {
  const { currentUser, store, updateCurrentUserData, appendAuditLog } = useAuth();
  const currentClientId = currentUser.chartClientId || currentUser.id;
  const entries = store.users[currentClientId]?.journalEntries || [];
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
        clientId: currentClientId,
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
        clientId: currentClientId,
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
      clientId: currentClientId,
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
        description="Client-facing emotional support tool for brief grounding and supportive reflection."
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
            <CardTitle>Therapeutic use</CardTitle>
            <CardDescription>Ways to use affirmations between sessions</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-3">
            <p>Review an affirmation during grounding, emotional regulation, or preparation for a session.</p>
            <p>Use the Journal to record what resonates, feels difficult, or connects to a treatment goal.</p>
            <p>Discuss meaningful affirmations with the provider through secure Messages.</p>
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
        description="Searchable education library for authenticated clients and providers."
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
  const { currentUser, store, updateCurrentUserData, updateSpecificUserData, appendAuditLog, flushClientModuleSaves } = useAuth();
  const { selectedChartClientId, setPage, workflowTarget } = usePage();
  const isProvider = currentUser.role === "provider";
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const currentClientId = currentUser.chartClientId || currentUser.id;
  const [selectedClientId, setSelectedClientId] = useState(store.users[selectedChartClientId]?.profile.role === "client" ? selectedChartClientId : clients[0]?.[0] || currentClientId);
  const activeClientId = isProvider ? selectedClientId : currentClientId;
  const bucket = store.users[activeClientId];
  const linkedAppointment = (bucket?.appointments || []).find(item => item.id === workflowTarget?.appointmentId);
  const [draft, setDraft] = useState(() => workflowTarget?.prepareAppointmentMessage ? appointmentMessageDraft(linkedAppointment) : "");
  const [sending, setSending] = useState(false);
  const [messageNotice, setMessageNotice] = useState("");
  const pendingMessage = useRef(null);
  const preparedDraftLogged = useRef(false);
  useEffect(() => {
    if (!preparedDraftLogged.current && isProvider && workflowTarget?.prepareAppointmentMessage && linkedAppointment && draft.trim()) {
      preparedDraftLogged.current = true;
      appendAuditLog({ action: "Prepared non-billable appointment outreach draft", details: `Draft prepared for appointment ${linkedAppointment.id}; not sent.`, clientId: activeClientId, category: "Non-billable communication" });
    }
  }, []);
  const send = async () => {
    if (!draft.trim() || !bucket || sending) return;
    setSending(true); setMessageNotice("");
    const retry = pendingMessage.current;
    const message = {
      id: retry?.clientId === activeClientId && retry?.text === draft.trim() ? retry.id : `message-${Date.now()}`,
      billingCategory: "Non-billable communication",
      billable: false,
      appointmentId: linkedAppointment?.id || "",
      from: currentUser.role,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      text: draft.trim(),
      timestamp: new Date().toISOString(),
    };
    pendingMessage.current = { ...message, clientId: activeClientId };
    const updateMessages = (prev) => [
      message,
      ...(prev || []).filter(item => item.id !== message.id),
    ];
    try {
    if (isProvider) {
      updateSpecificUserData(activeClientId, "messages", updateMessages);
    } else {
      updateCurrentUserData("messages", updateMessages);
    }
    await flushClientModuleSaves(activeClientId);
    appendAuditLog({
      action: "Saved non-billable secure portal message",
      details: `Message ${message.id} saved to the client portal from authenticated ${currentUser.role}. Appointment: ${linkedAppointment?.id || "Not linked"}. Non-billable; no charge or claim created. Recipient reading is not confirmed.`,
      clientId: activeClientId,
      clientName: bucket.profile.fullName || currentUser.fullName,
      category: "Non-billable communication",
    });
    setDraft(""); pendingMessage.current = null;
    setMessageNotice("Message saved to the client portal as non-billable communication. This does not confirm it has been read.");
    } catch (error) {
      setMessageNotice(`Message save could not be confirmed. Your draft is retained for retry. ${error instanceof Error ? error.message : ""}`);
    } finally { setSending(false); }
  };
  return (
    <div>
      <SectionHeader
        title="Messaging"
        description="Secure chart messaging between authenticated clients and assigned practice users, with encrypted AWS persistence and audit logging."
      />
      {isProvider && (
        <Card className="rounded-2xl shadow-sm mb-4">
          <CardContent className="p-4 space-y-2">
            <p className="font-bold text-slate-950">Select authorized client conversation</p>
            <Select disabled={sending} value={selectedClientId} onValueChange={id => { setSelectedClientId(id); setDraft(""); }}>
              <SelectTrigger className="min-h-12 rounded-xl border-2 border-slate-800 bg-white"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map(([id, clientBucket]) => <SelectItem key={id} value={id}>{clientBucket.profile.fullName}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}
      {isProvider && linkedAppointment && <p className="mb-4">{linkedAppointment.date} {linkedAppointment.time} · {linkedAppointment.status}</p>}
      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Conversation stream</CardTitle>
            <CardDescription>{bucket?.profile?.fullName || "Authorized client"} — encrypted chart conversation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[560px] overflow-auto">
            {(bucket?.messages || []).length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
            {(bucket?.messages || []).map((m) => (
              <div key={m.id} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{m.senderName || m.from}</p>
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
            <CardDescription>Message will be stored in the selected encrypted client chart</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea disabled={sending} value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[260px] rounded-2xl" placeholder="Type message..." />
            <p className="text-sm">Non-billable communication · Recorded in the client chart and audit log.</p>
            {messageNotice && <p role="status" className="text-sm">{messageNotice}</p>}
            <Button disabled={sending || !draft.trim()} className="rounded-2xl" onClick={send}><MessageSquare className="mr-2 h-4 w-4" />Send</Button>
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
  const { currentUser, store, updateCurrentUserData, updateSpecificUserData, appendAuditLog } = useAuth();
  const isProvider = currentUser.role === "provider";
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const currentClientId = currentUser.chartClientId || currentUser.id;
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.[0] || currentClientId);
  const activeClientId = isProvider ? selectedClientId : currentClientId;
  const activeClient = store.users[activeClientId];
  const appointments = activeClient?.appointments || [];
  const [draft, setDraft] = useState({ date: "", time: "", format: "Telehealth", purpose: "Follow-up psychotherapy" });
  const add = () => {
    if (!activeClientId || !draft.date || !draft.time) return;
    const appointment = { id: `appt-${Date.now()}`, ...draft, status: "Scheduled", createdAt: new Date().toISOString() };
    if (isProvider) updateSpecificUserData(activeClientId, "appointments", (prev) => [appointment, ...(prev || [])]);
    else updateCurrentUserData("appointments", (prev) => [appointment, ...(prev || [])]);
    appendAuditLog({
      action: "Scheduled client appointment",
      details: `${draft.purpose} scheduled for ${draft.date} at ${draft.time}.`,
      clientId: activeClientId,
      clientName: activeClient?.profile?.fullName || currentUser.fullName,
      category: "Scheduling",
    });
    setDraft({ date: "", time: "", format: "Telehealth", purpose: "Follow-up psychotherapy" });
  };
  const cancel = (appointmentId) => {
    const update = (prev) => (prev || []).map((appointment) => appointment.id === appointmentId
      ? { ...appointment, status: "Cancelled", cancelledAt: new Date().toISOString() }
      : appointment);
    if (isProvider) updateSpecificUserData(activeClientId, "appointments", update);
    else updateCurrentUserData("appointments", update);
    appendAuditLog({ action: "Cancelled client appointment", details: `Appointment ${appointmentId} was cancelled and retained in audit history.`, clientId: activeClientId, clientName: activeClient?.profile?.fullName || currentUser.fullName, category: "Scheduling" });
  };
  return (
    <div>
      <SectionHeader
        title="Scheduling"
        description="Client-linked appointment scheduling with status tracking and audited cancellation."
      />
      <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Schedule appointment</CardTitle>
            <CardDescription>Appointments are saved to the selected encrypted client chart.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isProvider && (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(([clientId, bucket]) => <SelectItem key={clientId} value={clientId}>{bucket.profile.fullName}</SelectItem>)}</SelectContent>
              </Select>
            )}
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
            <Button className="rounded-2xl" disabled={!activeClientId || !draft.date || !draft.time} onClick={add}><Plus className="mr-2 h-4 w-4" />Schedule appointment</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Appointment list</CardTitle>
            <CardDescription>{activeClient?.profile?.fullName || "Select a client"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[560px] overflow-auto">
            {appointments.length === 0 && <p className="text-sm text-slate-500">No appointments yet.</p>}
            {appointments.map((appt) => (
              <div key={appt.id} className="rounded-2xl border p-4">
                <p className="font-medium">{appt.purpose}</p>
                <p className="text-sm text-slate-600 mt-1">{appt.date} at {appt.time}</p>
                <p className="text-xs text-slate-400 mt-1">{appt.format}</p>
                <p className="text-xs font-semibold mt-2">{appt.status || "Scheduled"}</p>
                {(appt.status || "Scheduled") !== "Cancelled" && <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={() => cancel(appt.id)}>Cancel appointment</Button>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function ClientTelehealthPage() {
  const { currentUser, store } = useAuth();
  const currentClientId = currentUser.chartClientId || currentUser.id;
  const client = store.users[currentClientId];
  const telehealthAppointments = (client?.appointments || []).filter((item) => item.format === "Telehealth" && item.status !== "Cancelled");
  const sessionConnections = (client?.telehealth || []).filter((item) => typeof item.sessionUrl === "string" && /^https:\/\//i.test(item.sessionUrl));
  return (
    <div>
      <SectionHeader
        title="Telehealth"
        description="Secure access to your scheduled telehealth appointments. Clinical recording, transcription, diagnosis, billing, and provider documentation controls are available only to authenticated practice providers."
      />
      <TelehealthEntry />
      <NativeTelehealthRoom key={currentClientId} clientId={currentClientId} provider={false} />
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Your telehealth appointments</CardTitle>
          <CardDescription>Appointment information from your linked chart</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {telehealthAppointments.length === 0 && <p className="text-sm text-slate-600">No active telehealth appointments are currently scheduled.</p>}
          {telehealthAppointments.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">{item.purpose || "Telehealth appointment"}</p>
              <p className="mt-2 text-sm text-slate-700">{item.date} at {item.time}</p>
              <p className="mt-1 text-xs text-slate-500">Status: {item.status || "Scheduled"}</p>
            </div>
          ))}
          {sessionConnections.length > 0 && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Secure session connection</p>
              {sessionConnections.map((item) => (
                <a key={item.id} href={item.sessionUrl} target="_blank" rel="noreferrer noopener" className="flex items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-white p-4 text-slate-900 hover:bg-slate-50">
                  <span>
                    <span className="block font-semibold">Open secure telehealth session</span>
                    <span className="mt-1 block text-xs text-slate-500">{item.platform || "Approved telehealth platform"}</span>
                  </span>
                  <Video className="h-5 w-5" />
                </a>
              ))}
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Return to this same portal page for every appointment. Your signed-in account opens your own waiting room; no new weekly link is needed.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function TelehealthPage() {
  const { currentUser, store, updateCurrentUserData, updateSpecificUserData, appendAuditLog, flushClientModuleSaves } = useAuth();
  const isProvider = currentUser.role === "provider";
  const { selectedChartClientId, setSelectedChartClientId, setPage } = usePage();
  const [nativeCallActive, setNativeCallActive] = useState(false);
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const currentClientId = currentUser.chartClientId || currentUser.id;
  const [selectedClientId, setSelectedClientId] = useState(store.users[selectedChartClientId] ? selectedChartClientId : clients[0]?.[0] || currentClientId);
  const activeClientId = isProvider ? selectedClientId : currentClientId;
  const activeClient = store.users[activeClientId];
  const [appointmentId, setAppointmentId] = useState("");
  const [statusDraft, setStatusDraft] = useState("Scheduled");
  const [statusBusy, setStatusBusy] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const appointments = activeClient?.appointments || [];
  const selectedAppointment = appointments.find(item => item.id === appointmentId);
  const appointmentBlocked = appointmentPreventsSession(selectedAppointment?.status);
  const telehealthLog = activeClient?.telehealth || [];
  const [sessionForm, setSessionForm] = useState({
    sessionType: "Video",
    dialNumber: "",
    platform: "Secure video room",
    sessionUrl: "",
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
  const [savingDraft, setSavingDraft] = useState(false);
  const [supportedSections, setSupportedSections] = useState({});
  const [microphoneTest, setMicrophoneTest] = useState(true);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const recordingStartRef = useRef(0);
  const [scribeTemplate, setScribeTemplate] = useState("Progress Note - SOAP");
  const audioRetentionPolicy = "Temporary audio only. Delete overnight or no later than the next business day after documentation review. Final signed note, consent record, and audit log remain in the EHR.";
  const [scribeSeconds, setScribeSeconds] = useState(0);
  const [isScribeTimerRunning, setIsScribeTimerRunning] = useState(false);
  const [scribeDiagnosisSearch, setScribeDiagnosisSearch] = useState("");
  const [scribeDiagnosisTarget, setScribeDiagnosisTarget] = useState("primaryDiagnosis");
  const [scribeBillingSearch, setScribeBillingSearch] = useState("");
  const [awsScribeJob, setAwsScribeJob] = useState({ jobName: "", mediaKey: "", status: "" });
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [isAudioBusy, setIsAudioBusy] = useState(false);
  const mediaRecorderRef = useRef(null);
  const mediaChunksRef = useRef([]);
  useEffect(() => () => {
    const recorder = mediaRecorderRef.current;
    if (recorder) { recorder.onstop = null; if (recorder.state !== "inactive") recorder.stop(); recorder.stream.getTracks().forEach(track => track.stop()); }
  }, []);
  useEffect(() => {
    if ((!sessionForm.recordingConsent || !sessionForm.consentObtained) && mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null; setIsAudioRecording(false); setIsScribeTimerRunning(false);
      setCopyNotice("Recording stopped and discarded because recording consent was withdrawn.");
    }
  }, [sessionForm.recordingConsent, sessionForm.consentObtained]);
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
  const resetTestBusy = isAudioRecording || isAudioBusy || nativeCallActive || savingDraft || statusBusy || awsScribeJob.status === "IN_PROGRESS";
  const startNewMicrophoneTest = () => {
    if (resetTestBusy) return;
    setMicrophoneTest(true);
    setAppointmentId(""); setStatusDraft("Scheduled"); setRescheduleDate(""); setRescheduleTime("");
    setAwsScribeJob({ jobName: "", mediaKey: "", status: "" });
    setTranscriptText(""); setSupportedSections({}); setGeneratedDocs(null); setReviewConfirmed(false);
    setScribeSeconds(0); setIsScribeTimerRunning(false); recordingStartRef.current = 0;
    mediaChunksRef.current = []; mediaRecorderRef.current = null;
    setScribeTemplate("Progress Note - SOAP"); setScribeDiagnosisSearch(""); setScribeBillingSearch("");
    setScribeMeta(current => ({ ...current, chiefComplaint: "", onset: "", primaryDiagnosis: "", secondaryDiagnosis: "", tertiaryDiagnosis: "", serviceCode: "", interpreterCode: "", manualMinutes: "", clientSignature: "" }));
    setSessionForm(current => ({ ...current, consentObtained: false, recordingConsent: false, dialNumber: "", sessionUrl: "", interpreterNeeded: false, interpreterName: "", translationNotes: "", technicalNotes: "" }));
    setCopyNotice("New test ready. Timer, transcript, draft and appointment selection cleared. Confirm both consents above. Saved chart history has not changed.");
  };
  const recordingBlockedReason = appointmentBlocked ? `The selected appointment is ${selectedAppointment.status}. Choose Start new test for a fresh test without changing that appointment.`
    : nativeCallActive ? "End the active call before recording a local microphone test."
    : isAudioBusy ? "Waiting for microphone access or audio processing. Check the browser's microphone permission if recording has not started."
    : awsScribeJob.status === "IN_PROGRESS" ? "AWS transcription is still processing. Check its status before starting another test."
    : !activeClientId ? "Select a test client below before recording."
    : !sessionForm.consentObtained ? "Confirm telehealth consent above before using audio or video."
    : !sessionForm.recordingConsent ? "Check Recording consent obtained above to enable recording."
    : "";
  const scribeDiagnosisMatches = diagnosisCodeOptions.filter((item) => {
    const query = scribeDiagnosisSearch.trim().toLowerCase();
    return query && `${item.code} ${item.label} ${item.keywords}`.toLowerCase().includes(query);
  }).slice(0, 6);
  const scribeBillingMatches = billingCodeOptions.filter((item) => {
    const query = scribeBillingSearch.trim().toLowerCase();
    return query && `${item.code} ${item.type} ${item.label} ${item.keywords}`.toLowerCase().includes(query);
  }).slice(0, 6);
  const healthScribeTemplate = (() => {
    if (scribeTemplate.includes("GIRP")) return "GIRPP";
    if (scribeTemplate.includes("BIRP")) return "BIRP";
    if (scribeTemplate.includes("SIRP")) return "SIRP";
    if (scribeTemplate.includes("DAP")) return "DAP";
    return "BEHAVIORAL_SOAP";
  })();
  const uploadAudioAndStartHealthScribe = async (audio) => {
    if (!activeClientId) throw new Error("Select a client chart first.");
    if (!sessionForm.consentObtained || !sessionForm.recordingConsent) throw new Error("Confirm telehealth and recording consent before uploading audio.");
    setAwsScribeJob({ jobName: "", mediaKey: "", status: "" }); setTranscriptText(""); setGeneratedDocs(null); setReviewConfirmed(false); setSupportedSections({});
    const contentType = (audio.type || "audio/webm").split(";")[0];
    const upload = await productionApi("/api/ehr/scribe/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId: activeClientId, contentType, consentConfirmed: true }),
    });
    const uploadResponse = await fetch(upload.uploadUrl, { method: "PUT", headers: upload.uploadHeaders, body: audio });
    if (!uploadResponse.ok) throw new Error("Encrypted audio upload failed.");
    const job = await productionApi("/api/ehr/scribe/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId: activeClientId, mediaKey: upload.key, noteTemplate: healthScribeTemplate, consentConfirmed: true }),
    });
    setAwsScribeJob({ jobName: job.jobName, mediaKey: upload.key, status: job.status });
    setCopyNotice("AWS HealthScribe securely received the consented audio and started preliminary documentation.");
  };
  const startSecureAudioCapture = async () => {
    if (isAudioBusy || isAudioRecording || appointmentBlocked) return;
    setIsAudioBusy(true);
    try {
      if (!sessionForm.consentObtained || !sessionForm.recordingConsent) throw new Error("Confirm telehealth and recording consent above before recording.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: preferred });
      mediaChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) mediaChunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsAudioRecording(false); setIsScribeTimerRunning(false);
        setIsAudioBusy(true);
        try { await uploadAudioAndStartHealthScribe(new Blob(mediaChunksRef.current, { type: preferred })); }
        catch (error) { setCopyNotice(error instanceof Error ? error.message : "Unable to start transcription."); }
        finally { setIsAudioBusy(false); }
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      recordingStartRef.current = Date.now();
      setScribeSeconds(0); setIsScribeTimerRunning(true);
      setAwsScribeJob({ jobName: "", mediaKey: "", status: "" }); setSupportedSections({}); setTranscriptText(""); setGeneratedDocs(null); setReviewConfirmed(false);
      setIsAudioRecording(true);
      setCopyNotice("Secure audio capture started. Stop recording to encrypt, upload, and transcribe it.");
    } catch (error) { setCopyNotice(error instanceof Error ? error.message : "Microphone access failed."); }
    finally { setIsAudioBusy(false); }
  };
  const stopSecureAudioCapture = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    setIsScribeTimerRunning(false);
    mediaRecorderRef.current = null;
    setIsAudioRecording(false);
  };
  const uploadConsentedAudioFile = async (file) => {
    if (!file) return;
    setIsAudioBusy(true);
    try { await uploadAudioAndStartHealthScribe(file); }
    catch (error) { setCopyNotice(error instanceof Error ? error.message : "Unable to upload the audio file."); }
    finally { setIsAudioBusy(false); }
  };
  const checkHealthScribeJob = async () => {
    if (!awsScribeJob.jobName) return;
    setIsAudioBusy(true);
    try {
      const result = await productionApi(`/api/ehr/scribe/jobs?clientId=${encodeURIComponent(activeClientId)}&jobName=${encodeURIComponent(awsScribeJob.jobName)}&mediaKey=${encodeURIComponent(awsScribeJob.mediaKey)}`);
      setAwsScribeJob((current) => ({ ...current, status: result.status }));
      if (result.status === "COMPLETED") {
        setSupportedSections(microphoneTest ? {} : supportedClinicalSections(result.transcript, result.clinicalDocument));
        setTranscriptText(readableTranscript(result.transcript));
        setGeneratedDocs(null); setReviewConfirmed(false);
        setCopyNotice("Transcription completed. Review the words below, then generate the selected note draft. Microphone tests cannot be merged into a chart.");
      } else if (result.status === "FAILED") setCopyNotice(result.failureReason || "AWS HealthScribe failed.");
      else setCopyNotice(`AWS HealthScribe status: ${result.status}.`);
    } catch (error) { setCopyNotice(error instanceof Error ? error.message : "Unable to check transcription."); }
    finally { setIsAudioBusy(false); }
  };
  useEffect(() => {
    if (!awsScribeJob.jobName || ["COMPLETED", "FAILED"].includes(awsScribeJob.status)) return;
    const id = window.setInterval(() => { void checkHealthScribeJob(); }, 10000);
    return () => window.clearInterval(id);
  }, [awsScribeJob.jobName, awsScribeJob.status]);
  useEffect(() => {
    if (!isScribeTimerRunning) return;
    const id = window.setInterval(() => setScribeSeconds(Math.floor((Date.now() - recordingStartRef.current) / 1000)), 1000);
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
    `Provider e-signature: ${providerSignatureText(scribeMeta.providerSignature)}`,
    `Client e-signature: ${scribeMeta.clientSignature || "Not signed / not required"}`,
  ].join("\n");
  const applyScribeDiagnosisCode = (item) => {
    setScribeMeta((prev) => ({ ...prev, [scribeDiagnosisTarget]: `${item.code} | ${item.label}` }));
  };
  const handleScribeTemplateChange = (value) => {
    setScribeTemplate(value); setGeneratedDocs(null); setReviewConfirmed(false);
    setScribeMeta((prev) => {
      if (value === "Biopsychosocial") {
        return { ...prev, serviceCode: "90791 | CPT | Psychiatric diagnostic evaluation / biopsychosocial assessment" };
      }
      if (value === "Initial Progress Note") {
        return { ...prev, serviceCode: "90791 | CPT | Psychiatric diagnostic evaluation / biopsychosocial assessment" };
      }
      return { ...prev, serviceCode: prev.serviceCode || "90837 | CPT | Psychotherapy, 60 minutes" };
    });
  };
  const buildGeneratedClinicalDocumentation = (sourceTranscript = transcriptText) => {
    const clean = readableTranscript(sourceTranscript);
    const structuredNote = groundedDraft(clean, scribeTemplate, supportedSections);
    const intakeDraft = isIntakeTemplate(scribeTemplate) ? {
      presentingProblem: scribeMeta.chiefComplaint || supportedSections.Subjective || "Not documented",
      treatmentGoals: "Not documented — provider review required",
      biopsychosocialSummary: structuredNote.content,
    } : null;
    return { draftId: `note-scribe-${Date.now()}`, structuredNote: { ...structuredNote, intakeFields: intakeDraft }, intakeDraft,
      soapNote: structuredNote.content, riskFlags: extractRiskFlags(clean),
      sessionSummary: clean, insuranceReady: "Provider must document medical necessity and interventions from the reviewed session.",
      scribeMeta: { ...scribeMeta, sessionMinutes: scribeSessionMinutes } };
  };

  const saveAppointmentStatus = async () => {
    setStatusBusy(true);
    try {
      const updated = updateAppointmentStatus(selectedAppointment, statusDraft, { minutes: scribeSessionMinutes, date: rescheduleDate, time: rescheduleTime, now: new Date().toISOString(), actor: currentUser.id });
      updateSpecificUserData(activeClientId, "appointments", previous => (previous || []).map(item => item.id === appointmentId ? updated : item));
      await flushClientModuleSaves(activeClientId);
      appendAuditLog({ action: "Updated appointment status from Telehealth", details: `${appointmentId}: ${statusDraft}`, clientId: activeClientId, category: "Scheduling" });
      setCopyNotice(`Appointment status saved: ${statusDraft}.`);
    } catch (error) { setCopyNotice(error instanceof Error ? error.message : "Appointment status could not be saved."); }
    finally { setStatusBusy(false); }
  };
  const saveTelehealthEntry = () => {
    if (!activeClientId) return;
    const entry = {
      id: `telehealth-${Date.now()}`,
      createdAt: new Date().toLocaleString(),
      appointmentId: selectedAppointment?.id || "",
      appointmentStatus: selectedAppointment?.status || "Not linked",
      sessionMinutes: scribeSessionMinutes,
      sessionType: sessionForm.sessionType,
      dialNumber: sessionForm.dialNumber,
      platform: sessionForm.platform,
      sessionUrl: /^https:\/\//i.test(sessionForm.sessionUrl.trim()) ? sessionForm.sessionUrl.trim() : "",
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
      setCopyNotice("Copy is not available in this browser session.");
      setTimeout(() => setCopyNotice(""), 2500);
    }
  };
  const generateClinicalDocumentation = () => {
    if (microphoneTest || isAudioRecording || isScribeTimerRunning) { setCopyNotice("Finish a clinical recording and review its transcript first. Microphone tests do not generate clinical notes."); return; }
    if (!transcriptText.trim()) {
      setGeneratedDocs(null);
      setCopyNotice("A completed AWS HealthScribe transcript or a pasted Spruce transcript is required before generating a clinical draft.");
      return;
    }
    let docs;
    try { docs = buildGeneratedClinicalDocumentation(); }
    catch (error) { setCopyNotice(error instanceof Error ? error.message : "Unable to read the transcript."); return; }
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
      setCopyNotice("Copy is not available in this browser session.");
      setTimeout(() => setCopyNotice(""), 2500);
    }
  };
  const saveStructuredDraftToChart = async () => {
    if (savingDraft) return;
    if (microphoneTest || !reviewConfirmed) { setCopyNotice("Review and confirm the clinical draft before saving."); return; }
    if (!generatedDocs?.structuredNote || !activeClientId || !transcriptText.trim()) {
      setCopyNotice("A completed transcript is required before a generated draft can be saved to the chart.");
      return;
    }
    setSavingDraft(true);
    try {
    const structured = generatedDocs.structuredNote;
    updateSpecificUserData(activeClientId, "notes", (prev) => [
      {
        id: generatedDocs.draftId,
        title: structured.title,
        content: `Provider Review Required: AI-generated draft must be reviewed, edited, and signed by the provider before final use.\nAudio Retention Policy: ${audioRetentionPolicy}\n\n${structured.content}`,
        modality: sessionForm.sessionType === "Video" ? "Telehealth" : "Audio Telehealth",
        appointmentId: selectedAppointment?.id || "",
        appointmentStatus: selectedAppointment?.status || "Not linked",
        noteType: structured.noteType,
        structuredFields: structured.fields,
        status: "Provider review required",
        audioRetentionPolicy,
        createdAt: new Date().toLocaleString(),
      },
      ...((prev || []).filter(item => ![generatedDocs.draftId, `${generatedDocs.draftId}-plan`, `${generatedDocs.draftId}-risk`].includes(item.id))),
    ]);
    if (structured.intakeFields) {
      const currentIntake = activeClient?.intake || {};
      updateSpecificUserData(activeClientId, "intake", {
        ...currentIntake,
        ...intakeFieldPatch(scribeTemplate, generatedDocs.structuredNote.fields),
        biopsychosocialSummary: structured.content,
        scribeUpdatedAt: new Date().toLocaleString(),
      });
    }
    await flushClientModuleSaves(activeClientId);
    appendAuditLog({
      action: "Saved AI scribe draft to client chart",
      details: `${structured.noteType} draft saved to chart for provider review. ${audioRetentionPolicy}`,
      clientId: activeClientId,
      clientName: activeClient?.profile?.fullName || "Client",
      category: "EHR Scribe",
    });
    setCopyNotice("Generated draft saved into the client chart for provider review/signature. Temporary audio remains governed by overnight/next-business-day deletion policy.");
    setReviewConfirmed(false);
    } catch (error) { setCopyNotice(`Chart save could not be confirmed. Retry this draft. ${error instanceof Error ? error.message : ""}`); }
    finally { setSavingDraft(false); }
  };
  const mergeScribeToEhr = async () => {
    if (savingDraft) return;
    if (microphoneTest || !reviewConfirmed || !generatedDocs) { setCopyNotice("Generate and review the selected clinical note before merging."); return; }
    if (!activeClientId) return;
    if (!transcriptText.trim()) {
      setCopyNotice("A completed AWS HealthScribe transcript or a pasted Spruce transcript is required before merging into the EHR.");
      return;
    }
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
    setSavingDraft(true);
    try {
    const docs = generatedDocs;
    const structured = docs.structuredNote;
    setGeneratedDocs(docs);
    updateSpecificUserData(activeClientId, "notes", (prev) => [
      {
        id: generatedDocs.draftId,
        title: structured.title,
        content: `Provider Review Required: AI-generated draft must be reviewed, edited, and signed by the provider before final use.\nAudio Retention Policy: ${audioRetentionPolicy}\n\n${structured.content}`,
        modality: sessionForm.sessionType === "Video" ? "Telehealth" : "Audio Telehealth",
        appointmentId: selectedAppointment?.id || "",
        appointmentStatus: selectedAppointment?.status || "Not linked",
        noteType: structured.noteType,
        structuredFields: structured.fields,
        status: "Merged to EHR - provider review required",
        sessionMinutes: scribeSessionMinutes,
        codeDraft: docs.scribeMeta,
        signature: null,
        audioRetentionPolicy,
        createdAt: new Date().toLocaleString(),
      },
      ...((prev || []).filter(item => ![generatedDocs.draftId, `${generatedDocs.draftId}-plan`, `${generatedDocs.draftId}-risk`].includes(item.id))),
    ]);
    if (isIntakeTemplate(scribeTemplate) && docs.intakeDraft) {
    const currentIntake = activeClient?.intake || {};
    updateSpecificUserData(activeClientId, "intake", {
      ...currentIntake,
      chiefComplaint: scribeMeta.chiefComplaint,
      onset: scribeMeta.onset,
      ...intakeFieldPatch(scribeTemplate, generatedDocs.structuredNote.fields),
      biopsychosocialSummary: structured.content,
      diagnoses: [scribeMeta.primaryDiagnosis, scribeMeta.secondaryDiagnosis, scribeMeta.tertiaryDiagnosis].filter(Boolean),
      billingCodes: [scribeMeta.serviceCode, scribeMeta.interpreterCode].filter(Boolean),
      sessionMinutes: scribeSessionMinutes,
      scribeUpdatedAt: new Date().toLocaleString(),
    });
    }
    if (scribeTemplate === "Treatment Plan Update") {
      updateSpecificUserData(activeClientId, "treatmentPlans", (prev) => [
        {
          id: `${generatedDocs.draftId}-plan`,
          problem: scribeMeta.chiefComplaint || "AI transcriber treatment plan update",
          longTermGoal: "Review and refine with provider.",
          shortTermGoal: "Review and refine with provider.",
          intervention: docs.structuredNote.content,
          createdAt: new Date().toLocaleString(),
        },
        ...((prev || []).filter(item => ![generatedDocs.draftId, `${generatedDocs.draftId}-plan`, `${generatedDocs.draftId}-risk`].includes(item.id))),
      ]);
    }
    if (docs.riskFlags.summary.length > 0) {
      updateSpecificUserData(activeClientId, "documents", (prev) => [
        {
          id: `${generatedDocs.draftId}-risk`,
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
        ...((prev || []).filter(item => ![generatedDocs.draftId, `${generatedDocs.draftId}-plan`, `${generatedDocs.draftId}-risk`].includes(item.id))),
      ]);
    }
    await flushClientModuleSaves(activeClientId);
    appendAuditLog({
      action: "Merged AI transcriber fields to EHR",
      details: `${scribeTemplate} draft saved with the linked appointment, reviewed fields, and session time. Provider signature remains pending.`,
      clientId: activeClientId,
      clientName: activeClient?.profile?.fullName || "Client",
      category: "EHR Scribe",
    });
    setCopyNotice("Reviewed draft merged into the selected documentation type in the client chart.");
    setReviewConfirmed(false);
    } catch (error) { setCopyNotice(`Chart merge could not be confirmed. Retry this draft. ${error instanceof Error ? error.message : ""}`); }
    finally { setSavingDraft(false); }
  };
  const pushToProgressNotes = () => {
    if (microphoneTest || !reviewConfirmed) return;
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
    if (!generatedDocs || !activeClientId || !isIntakeTemplate(scribeTemplate) || microphoneTest || !reviewConfirmed) return;
    const currentIntake = activeClient?.intake || {};
    updateSpecificUserData(activeClientId, "intake", {
      ...currentIntake,
      ...intakeFieldPatch(scribeTemplate, generatedDocs.structuredNote.fields),
      biopsychosocialSummary: generatedDocs.structuredNote.content,
    });
    appendAuditLog({
      action: "Saved telehealth AI documentation to intake",
      details: "Transcript-derived intake summary saved to intake fields.",
      clientId: activeClientId,
      clientName: activeClient?.profile?.fullName || "Client",
      category: "Telehealth AI",
    });
    setCopyNotice("Reviewed fields saved to the Biopsychosocial assessment.");
    setTimeout(() => setCopyNotice(""), 2500);
  };
  const pushRiskFlagsToDocuments = () => {
    if (microphoneTest || !reviewConfirmed) return;
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
        description="In-EHR audio/video sessions, consented recording, AI documentation, and client-specific session history."
      />
      {copyNotice && <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{copyNotice}</div>}
<section aria-label="Client and consent before audio or video" className="mb-4 rounded-2xl border p-4 space-y-3">
<h2 className="font-semibold">Client and consent — before audio or video</h2>
<p className="text-sm">Confirm telehealth consent first. Recording and AI transcription require separate recording consent.</p>
              <label className="block"><input type="checkbox" checked={microphoneTest} disabled={isAudioRecording || nativeCallActive || isAudioBusy || awsScribeJob.status === "IN_PROGRESS"} onChange={e => { setMicrophoneTest(e.target.checked); setAwsScribeJob({ jobName: "", mediaKey: "", status: "" }); setSupportedSections({}); setTranscriptText(""); setGeneratedDocs(null); setReviewConfirmed(false); }} /> Microphone test — no clinical note or chart merge</label>
              <Button type="button" variant="outline" disabled={resetTestBusy} onClick={startNewMicrophoneTest}>Start new test</Button>
              <p className="text-sm">Current client: {activeClient?.profile?.fullName || "None selected"}. {selectedAppointment ? `Appointment: ${selectedAppointment.date || ""} · ${selectedAppointment.status}` : "No appointment selected."}</p>
            {isProvider && (
              <Select disabled={savingDraft || statusBusy || nativeCallActive || isAudioRecording || isAudioBusy || awsScribeJob.status === "IN_PROGRESS"} value={selectedClientId} onValueChange={id => { setScribeMeta(current => ({ ...current, chiefComplaint: "", onset: "", primaryDiagnosis: "", secondaryDiagnosis: "", tertiaryDiagnosis: "", manualMinutes: "", clientSignature: "" })); setAppointmentId(""); setStatusDraft("Scheduled"); setRescheduleDate(""); setRescheduleTime(""); setAwsScribeJob({ jobName: "", mediaKey: "", status: "" }); setSupportedSections({}); setTranscriptText(""); setGeneratedDocs(null); setReviewConfirmed(false); setAwsScribeJob({ jobName: "", mediaKey: "", status: "" }); setScribeSeconds(0); setSelectedClientId(id); setSelectedChartClientId(id); setSessionForm(current => ({ ...current, consentObtained: false, recordingConsent: false, sessionUrl: "", dialNumber: "" })); }}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <label className="rounded-2xl border p-3 flex items-center gap-3 text-sm">
              <input type="checkbox" checked={sessionForm.recordingConsent} onChange={(e) => setSessionForm({ ...sessionForm, recordingConsent: e.target.checked })} />
              Recording consent obtained
            </label>
            <label className="rounded-2xl border p-3 flex items-center gap-3 text-sm">
              <input type="checkbox" checked={sessionForm.consentObtained} onChange={(e) => setSessionForm({ ...sessionForm, consentObtained: e.target.checked })} />
              Telehealth consent obtained verbally
            </label>
<details><summary className="cursor-pointer text-sm">Review or edit consent wording</summary>
            <Textarea value={sessionForm.consentVerbiage} onChange={(e) => setSessionForm({ ...sessionForm, consentVerbiage: e.target.value })} className="min-h-[110px] rounded-2xl" placeholder="Telehealth consent verbiage" />

            <Textarea value={sessionForm.recordingVerbiage} onChange={(e) => setSessionForm({ ...sessionForm, recordingVerbiage: e.target.value })} className="min-h-[110px] rounded-2xl" placeholder="Recording disclosure / verbiage" />
</details>
</section>
      {isProvider && <div className="mb-4">            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
              <p className="font-medium text-slate-900">Microphone and recording</p>
              <p role="timer" className="text-2xl font-semibold tabular-nums">{formattedScribeTimer} · {isScribeTimerRunning ? "Recording" : "Not recording"}</p>
              <p className="text-xs text-slate-600">Audio is uploaded to AWS for transcription for the selected client. Microphone test results cannot be merged into clinical notes. Temporary audio is deleted after successful retrieval.</p>
              {!isAudioRecording && recordingBlockedReason && <p role="status" className="text-sm font-medium">{recordingBlockedReason}</p>}
              <p className="text-xs font-medium text-slate-800">Recording starts the timer automatically. Stop recording to transcribe. Camera preview does not record audio.</p>
              <div className="flex flex-wrap gap-2">
                {isAudioRecording
                  ? <Button type="button" onClick={stopSecureAudioCapture}>Stop and securely transcribe</Button>
                  : <Button type="button" disabled={appointmentBlocked || nativeCallActive || isAudioBusy || awsScribeJob.status === "IN_PROGRESS" || !sessionForm.consentObtained || !sessionForm.recordingConsent || !activeClientId} onClick={startSecureAudioCapture}>Record local microphone only</Button>}
                <label className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold cursor-pointer">
                  Upload an existing audio file
                  <input disabled={!sessionForm.consentObtained || !sessionForm.recordingConsent || isAudioRecording || isAudioBusy || nativeCallActive || awsScribeJob.status === "IN_PROGRESS"} hidden type="file" accept="audio/*" onChange={(event) => uploadConsentedAudioFile(event.target.files?.[0])} />
                </label>
                {awsScribeJob.jobName && <Button type="button" variant="outline" disabled={isAudioBusy || isScribeTimerRunning} onClick={checkHealthScribeJob}>Check AWS transcription</Button>}
              </div>
              {awsScribeJob.status && <p className="text-sm">HealthScribe status: <strong>{awsScribeJob.status}</strong></p>}
            </div>
</div>}
      <NativeTelehealthRoom key={activeClientId} clientId={activeClientId} provider={isProvider} externalRecording={isAudioRecording || isAudioBusy || appointmentBlocked} timerLabel={formattedScribeTimer} providerConsent={sessionForm.consentObtained} recordingConsent={sessionForm.recordingConsent} onRecordingReady={uploadAudioAndStartHealthScribe} onConnectionChange={setNativeCallActive} onRecordingChange={active => { if (active) { recordingStartRef.current = Date.now(); setScribeSeconds(0); setAwsScribeJob({ jobName: "", mediaKey: "", status: "" }); setSupportedSections({}); setTranscriptText(""); setGeneratedDocs(null); setReviewConfirmed(false); } setIsScribeTimerRunning(active); }} />
{isProvider && <section aria-label="Transcript review" className="mb-4">            <p className="text-sm">Transcript: words appear after AWS processing. Live captions are not connected yet.</p>
            <Textarea aria-label="Session transcript" value={transcriptText} onChange={(e) => { setSupportedSections({}); setTranscriptText(e.target.value); setGeneratedDocs(null); setReviewConfirmed(false); }} className="min-h-[180px] rounded-2xl" placeholder="Recorded words will appear here after processing. Review transcription accuracy before creating the note." />
</section>}
      <div className="grid gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Telehealth session setup</CardTitle>
            <CardDescription>Document modality, consent, recording language, interpreter use, and technical details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={sessionForm.sessionType} onValueChange={(value) => setSessionForm({ ...sessionForm, sessionType: value })}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Video">Video session</SelectItem>
                <SelectItem value="Audio Only">Audio only</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid md:grid-cols-2 gap-3">
              <Input value={sessionForm.platform} onChange={(e) => setSessionForm({ ...sessionForm, platform: e.target.value })} placeholder="Video platform / room" />
            </div>
            <p className="text-sm">Clients join through their own signed-in EHR telehealth link. If disconnected, reopen the same link to rejoin. No dial-in or callback number is used.</p>
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
            {isProvider && <div className="rounded-2xl border p-4 space-y-3">
              <h3 className="font-semibold">Appointment status and session time</h3>
              <Select disabled={savingDraft || statusBusy || nativeCallActive || isAudioRecording || isAudioBusy || awsScribeJob.status === "IN_PROGRESS"} value={appointmentId} onValueChange={id => { const item = appointments.find(appt => appt.id === id); setTranscriptText(""); setGeneratedDocs(null); setReviewConfirmed(false); setSupportedSections({}); setScribeSeconds(0); setScribeMeta(current => ({ ...current, manualMinutes: "" })); setAppointmentId(id); setStatusDraft(item?.status || "Scheduled"); setRescheduleDate(item?.date || ""); setRescheduleTime(item?.time || ""); }}>
                <SelectTrigger><SelectValue placeholder="Choose the appointment" /></SelectTrigger>
                <SelectContent>{appointments.map(item => <SelectItem key={item.id} value={item.id}>{item.date} {item.time} — {item.purpose} ({item.status})</SelectItem>)}</SelectContent>
              </Select>
              {!appointments.length && <p className="text-sm">No appointment is scheduled for this client yet.</p>}
              <Select disabled={savingDraft || !selectedAppointment || statusBusy || nativeCallActive || isAudioRecording} value={statusDraft} onValueChange={setStatusDraft}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{appointmentStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
              </Select>
              {statusDraft === "Rescheduled" && <div className="grid md:grid-cols-2 gap-3">
                <Input label="New appointment date" type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
                <Input label="New appointment time" type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} />
              </div>}
              <p className="text-sm">Recording timer: {formattedScribeTimer}</p>
              <Input label="Actual session minutes (manual override)" type="number" min="1" max="1440" value={scribeMeta.manualMinutes} onChange={e => setScribeMeta({ ...scribeMeta, manualMinutes: e.target.value })} placeholder="Use timer or enter actual minutes" />
              <p className="text-sm">Session minutes: {scribeSessionMinutes || "Not entered"}</p>
              <Button disabled={savingDraft || !selectedAppointment || statusBusy || nativeCallActive || isAudioRecording} onClick={saveAppointmentStatus}>{statusBusy ? "Saving status…" : "Confirm appointment status"}</Button>
              <Button variant="outline" disabled={statusBusy || nativeCallActive || isAudioRecording} onClick={async () => { try { await flushClientModuleSaves(activeClientId); setSelectedChartClientId(activeClientId); setPage("messages", { clientId: activeClientId, appointmentId: selectedAppointment?.id, prepareAppointmentMessage: true }); } catch { setCopyNotice("The chart changes have not saved yet. Retry before opening Messages."); } }}>Open Messages for this client</Button>
              {appointmentBlocked && <p className="text-sm">This appointment is marked {selectedAppointment.status}. Update its status before starting a new session.</p>}
            </div>}
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl" onClick={saveTelehealthEntry}><Mic className="mr-2 h-4 w-4" />Save telehealth entry</Button>
              <Button variant="outline" className="rounded-2xl" onClick={copyConsentText}><Copy className="mr-2 h-4 w-4" />Copy consent text</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>EHR clinical scribe</CardTitle>
            <CardDescription>Use consented EHR session audio or an imported transcript to prepare documentation for provider review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600 space-y-1">
              <p className="font-medium text-slate-800">Consent and retention rule</p>
              <p>Recording/AI scribe consent must be documented before audio is used for note generation.</p>
              <p>{audioRetentionPolicy}</p>
            </div>
            <Select disabled={savingDraft || isScribeTimerRunning || isAudioBusy || awsScribeJob.status === "IN_PROGRESS"} value={scribeTemplate} onValueChange={handleScribeTemplateChange}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Progress Note - SOAP">Progress Note - SOAP</SelectItem>
                <SelectItem value="Initial Progress Note">Initial Progress Note</SelectItem>
                <SelectItem value="Follow-up Progress Note">Follow-up Progress Note</SelectItem>
                <SelectItem value="Biopsychosocial">Biopsychosocial</SelectItem>
                <SelectItem value="Psychosocial">Psychosocial</SelectItem>
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
                  <p className="text-sm">Starts and stops with recording.</p>
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
                <ProviderSignatureInput label="Provider Electronic Signature" value={scribeMeta.providerSignature} onChange={(e) => setScribeMeta({ ...scribeMeta, providerSignature: e.target.value })} placeholder="Provider electronic signature" />
                <Input label="Client Electronic Signature" value={scribeMeta.clientSignature} onChange={(e) => setScribeMeta({ ...scribeMeta, clientSignature: e.target.value })} placeholder="Client electronic signature, if required" />
              </div>
              <p className="text-xs text-slate-500">Merge saves the selected note type. Only the biopsychosocial template updates assessment fields. Review the draft below before merging.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl" disabled={savingDraft || !transcriptText.trim() || microphoneTest || isScribeTimerRunning} onClick={generateClinicalDocumentation}><Sparkles className="mr-2 h-4 w-4" />Generate mapped note draft</Button>
              <Button variant="outline" className="rounded-2xl" disabled={savingDraft || !generatedDocs || !reviewConfirmed || microphoneTest} onClick={mergeScribeToEhr}><Save className="mr-2 h-4 w-4" />Merge to EHR fields</Button>
              <Button variant="outline" className="rounded-2xl" disabled={savingDraft || !generatedDocs || !reviewConfirmed || microphoneTest} onClick={saveStructuredDraftToChart}>Save generated draft to chart</Button>
            </div>
            {generatedDocs && (
              <div className="space-y-4 pt-2">
                <Card className="rounded-2xl border shadow-none">
                  <CardHeader><CardTitle className="text-base">Structured EHR note draft</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm font-semibold">{scribeTemplate} fields</p>
                    {Object.entries(generatedDocs.structuredNote.fields || {}).map(([heading, value]) => (
                      <Textarea key={heading} label={heading} aria-label={`${heading} note field`} value={value} onChange={e => {
                        setGeneratedDocs(current => {
                          const fields = { ...current.structuredNote.fields, [heading]: e.target.value };
                          const content = `${scribeTemplate}\n\n${Object.entries(fields).map(([name, text]) => `${name}:\n${text}`).join("\n\n")}`;
                          return { ...current, structuredNote: { ...current.structuredNote, fields, content } };
                        }); setReviewConfirmed(false);
                      }} />
                    ))}
                    <Textarea aria-label="Clinical note preview" readOnly className="min-h-[260px]" value={generatedDocs.structuredNote.content} />
                    <label className="block text-sm"><input type="checkbox" checked={reviewConfirmed} onChange={e => setReviewConfirmed(e.target.checked)} /> I reviewed the transcript and note and verified the documented findings.</label>
                    <Button variant="outline" className="rounded-2xl" disabled={savingDraft || !reviewConfirmed} onClick={saveStructuredDraftToChart}>Save structured draft to chart</Button>
                  </CardContent>
                </Card>
                {isIntakeTemplate(scribeTemplate) && generatedDocs.intakeDraft && (
                <Card className="rounded-2xl border shadow-none">
                  <CardHeader><CardTitle className="text-base">Biopsychosocial field mapping</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border bg-slate-50 p-4 text-sm whitespace-pre-wrap">{`Presenting Problem:
${generatedDocs.intakeDraft.presentingProblem}

Treatment Goals:
${generatedDocs.intakeDraft.treatmentGoals}

Biopsychosocial Summary:
${generatedDocs.structuredNote.content}`}</div>
                    <Button variant="outline" className="rounded-2xl" onClick={pushToIntake}>Save to Biopsychosocial</Button>
                  </CardContent>
                </Card>
                )}
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
          <CardTitle>Previously saved telehealth chart history</CardTitle>
          <CardDescription>These are saved entries, separate from the current test. Starting a new test does not reuse or delete them.</CardDescription>
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
              {entry.dialNumber && <p className="text-sm"><span className="font-medium">Previously documented callback number:</span> {entry.dialNumber}</p>}
              {entry.sessionUrl && <p className="text-sm"><span className="font-medium">Previously documented session link:</span> {entry.sessionUrl}</p>}
              <p className="text-sm"><span className="font-medium">Consent obtained:</span> {entry.consentObtained ? "Yes" : "No"}</p>
              <p className="text-sm whitespace-pre-wrap"><span className="font-medium">Consent text:</span> {entry.consentVerbiage}</p>
              <p className="text-sm"><span className="font-medium">Recording consent:</span> {entry.recordingConsent ? "Yes" : "No"}</p>
              {entry.recordingConsent && <p className="text-sm whitespace-pre-wrap"><span className="font-medium">Recording text:</span> {entry.recordingVerbiage}</p>}
              <p className="text-sm"><span className="font-medium">Language used:</span> {entry.languageUsed || "Not entered"}</p>
              <p className="text-sm"><span className="font-medium">Interpreter used:</span> {entry.interpreterNeeded ? "Yes" : "No"}</p>
              {entry.interpreterNeeded && <p className="text-sm"><span className="font-medium">Interpreter type:</span> {entry.interpreterType || "Not entered"}</p>}
              {entry.interpreterNeeded && <p className="text-sm"><span className="font-medium">Interpreter / translator:</span> {entry.interpreterName || "Not entered"}</p>}
              {entry.interpreterNeeded && <p className="text-sm whitespace-pre-wrap"><span className="font-medium">Translation notes:</span> {entry.translationNotes || "None"}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
      {isProvider && <FaxInbox />}
    </div>
  );
}
function ClientManagementPage() {
  const { store, createClient } = useAuth();
  const { setPage, setSelectedChartClientId } = usePage();
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [patientError, setPatientError] = useState("");
  const [patientNotice, setPatientNotice] = useState("");
  const [sendingInvitationId, setSendingInvitationId] = useState("");
  const [insuranceCardFrontFile, setInsuranceCardFrontFile] = useState<File | null>(null);
  const [insuranceCardBackFile, setInsuranceCardBackFile] = useState<File | null>(null);
  const [photoIdFrontFile, setPhotoIdFrontFile] = useState<File | null>(null);
  const [photoIdBackFile, setPhotoIdBackFile] = useState<File | null>(null);
  const [patientForm, setPatientForm] = useState({
    fullName: "", preferredName: "", email: "", phone: "", dateOfBirth: "", sex: "",
    addressLine1: "", addressLine2: "", city: "", state: "", zipCode: "",
    insurancePayer: "", insuranceNetworkStatus: "", insurancePlanName: "", insuranceMemberId: "", insuranceGroupNumber: "",
  });
  const clients = Object.entries(store.users)
    .filter(([, bucket]) => bucket.profile.role === "client")
    .map(([id, bucket]) => ({ id, ...bucket.profile, bucket }));
  const resendPatientInvitation = async (clientId) => {
    setSendingInvitationId(clientId);
    setPatientError("");
    setPatientNotice("");
    try {
      await productionApi("/api/ehr/clients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "resendInvitation", clientId }) });
      setPatientNotice("Patient invitation sent successfully.");
    } catch (error) {
      setPatientError(error instanceof Error ? error.message : "The patient invitation could not be sent.");
    } finally {
      setSendingInvitationId("");
    }
  };
  const savePatient = async () => {
    setSavingPatient(true);
    setPatientError("");
    try {
      const client = await createClient({ ...patientForm, insuranceCardFrontFile, insuranceCardBackFile, photoIdFrontFile, photoIdBackFile });
      setPatientNotice(patientForm.email.trim() ? "Patient record saved and secure invitation sent." : "Patient record saved. Add an email address to send an invitation.");
      setSelectedChartClientId(client.clientId);
      setPatientForm({ fullName: "", preferredName: "", email: "", phone: "", dateOfBirth: "", sex: "", addressLine1: "", addressLine2: "", city: "", state: "", zipCode: "", insurancePayer: "", insuranceNetworkStatus: "", insurancePlanName: "", insuranceMemberId: "", insuranceGroupNumber: "" });
      setInsuranceCardFrontFile(null);
      setInsuranceCardBackFile(null);
      setPhotoIdFrontFile(null);
      setPhotoIdBackFile(null);
      setShowAddPatient(false);
    } catch (error) {
      setPatientError(error instanceof Error ? error.message : "Unable to add the patient.");
    } finally {
      setSavingPatient(false);
    }
  };
  return (
    <div>
      <SectionHeader
        title="Client Management"
        description="Provider-facing client list and central access point for authorized charts, assessments, notes, plans, outcomes, and messaging."
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button className="rounded-2xl" onClick={() => {
          setPatientError("");
          setShowAddPatient((previous) => !previous);
        }}>
          <UserPlus className="h-4 w-4" />
          {showAddPatient ? "Close patient form" : "Add Patient"}
        </Button>
        <span className="text-sm text-slate-500">{clients.length} patient{clients.length === 1 ? "" : "s"}</span>
      </div>
      {patientNotice && <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{patientNotice}</p>}
      {!showAddPatient && patientError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{patientError}</p>}
      {showAddPatient && (
        <Card className="mb-5 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Add a new patient</CardTitle>
            <CardDescription>Create a secure patient chart for scheduling, intake, clinical documentation, and billing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Patient full name" value={patientForm.fullName} onChange={(event) => setPatientForm({ ...patientForm, fullName: event.target.value })} autoComplete="name" />
              <Input label="Preferred name" value={patientForm.preferredName} onChange={(event) => setPatientForm({ ...patientForm, preferredName: event.target.value })} />
              <Input label="Email address" type="email" value={patientForm.email} onChange={(event) => setPatientForm({ ...patientForm, email: event.target.value })} autoComplete="email" />
              <Input label="Phone number" type="tel" value={patientForm.phone} onChange={(event) => setPatientForm({ ...patientForm, phone: event.target.value })} autoComplete="tel" />
              <Input label="Date of birth" type="date" value={patientForm.dateOfBirth} onChange={(event) => setPatientForm({ ...patientForm, dateOfBirth: event.target.value })} />
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Sex
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={patientForm.sex} onChange={(event) => setPatientForm({ ...patientForm, sex: event.target.value })}>
                  <option value="">Select sex</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </label>
              <Input label="Street address" value={patientForm.addressLine1} onChange={(event) => setPatientForm({ ...patientForm, addressLine1: event.target.value })} autoComplete="address-line1" />
              <Input label="Apartment, suite, or unit" value={patientForm.addressLine2} onChange={(event) => setPatientForm({ ...patientForm, addressLine2: event.target.value })} autoComplete="address-line2" />
              <Input label="City" value={patientForm.city} onChange={(event) => setPatientForm({ ...patientForm, city: event.target.value })} autoComplete="address-level2" />
              <Input label="State" value={patientForm.state} onChange={(event) => setPatientForm({ ...patientForm, state: event.target.value })} autoComplete="address-level1" />
              <Input label="ZIP code" value={patientForm.zipCode} onChange={(event) => setPatientForm({ ...patientForm, zipCode: event.target.value })} autoComplete="postal-code" />
              <Input label="Insurance carrier" value={patientForm.insurancePayer} onChange={(event) => setPatientForm({ ...patientForm, insurancePayer: event.target.value })} />
              <Input label="Plan name" value={patientForm.insurancePlanName} onChange={(event) => setPatientForm({ ...patientForm, insurancePlanName: event.target.value })} />
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Network status
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={patientForm.insuranceNetworkStatus} onChange={(event) => setPatientForm({ ...patientForm, insuranceNetworkStatus: event.target.value })}>
                  <option value="">Select network status</option><option value="In-network">In-network</option><option value="Out-of-network">Out-of-network</option><option value="Not verified">Not verified</option>
                </select>
              </label>
              <Input label="Insurance member ID" value={patientForm.insuranceMemberId} onChange={(event) => setPatientForm({ ...patientForm, insuranceMemberId: event.target.value })} />
              <Input label="Insurance group number" value={patientForm.insuranceGroupNumber} onChange={(event) => setPatientForm({ ...patientForm, insuranceGroupNumber: event.target.value })} />
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Insurance card - front
                <input type="file" accept="image/*,.pdf,application/pdf" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setInsuranceCardFrontFile(event.target.files?.[0] || null)} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Insurance card - back
                <input type="file" accept="image/*,.pdf,application/pdf" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setInsuranceCardBackFile(event.target.files?.[0] || null)} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">Photo ID - front<input type="file" accept="image/*,.pdf,application/pdf" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setPhotoIdFrontFile(event.target.files?.[0] || null)} /></label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">Photo ID - back<input type="file" accept="image/*,.pdf,application/pdf" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setPhotoIdBackFile(event.target.files?.[0] || null)} /></label>
            </div>
            <p className="text-sm text-slate-600">An email address sends a secure portal invitation. Practice consent forms are automatically added to the patient chart. Insurance starts as not verified.</p>
            {patientError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{patientError}</p>}
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl" disabled={savingPatient || !patientForm.fullName.trim()} onClick={savePatient}>
                <Save className="h-4 w-4" />
                {savingPatient ? "Saving securely…" : "Save Patient"}
              </Button>
              <Button variant="outline" className="rounded-2xl" disabled={savingPatient} onClick={() => setShowAddPatient(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.length === 0 && <p className="text-sm text-slate-500">No patients yet. Select Add Patient to create the first secure chart.</p>}
        {clients.map((client) => (
          <Card key={client.id} className="rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{client.fullName}</p>
                  <p className="text-sm font-medium text-slate-700 mt-1">MRN: {client.medicalRecordNumber || "Not assigned"}</p>
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
              <Button variant="outline" className="w-full mt-2 rounded-2xl" disabled={sendingInvitationId === client.id || !client.email} onClick={() => resendPatientInvitation(client.id)}>
                {sendingInvitationId === client.id ? "Sending invitation…" : "Send / Resend Patient Invitation"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
function getDocumentWorkflow(doc) {
  if (doc.storageKey) return { label: "Open encrypted file", page: "documents", target: { documentMode: "library" } };
  if (doc.title === "Biopsychosocial Intake") return { label: "Open biopsychosocial intake", page: "intake" };
  if (doc.title === "Initial Progress Note Template") return { label: "Open progress-note form", page: "notes" };
  const assessmentTabs = {
    "PHQ-9 Depression Screening": "phq9",
    "GAD-7 Anxiety Screening": "gad7",
    "Suicide Risk Assessment": "suicide",
    "Substance Use / Drug Abuse Assessment": "substance",
    "Violence Risk Assessment": "violence",
    "Safety Plan": "safety",
    "Clinical Outcome Measures": "phq9",
  };
  if (assessmentTabs[doc.title]) return { label: `Open ${doc.title}`, page: "assessments", target: { tab: assessmentTabs[doc.title] } };
  if (doc.title === "Treatment Plan") return { label: "Open treatment-plan form", page: "plans" };
  if (doc.title === "Homework Handout") return { label: "Open homework assignment form", page: "homework" };
  if (doc.title.startsWith("Advocacy Letter Template")) return {
    label: "Open advocacy-letter builder",
    page: "documents",
    target: {
      documentMode: "library",
      anchor: "advocacy-letter-builder",
      advocacyTemplateType: doc.title.split(" | ")[1] || "General Outside Resource Support",
    },
  };
  return { label: "Review and sign this document", page: "documents", target: { documentMode: "library" } };
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
              <CardDescription>Medical record number: {profile.medicalRecordNumber || intake.medicalRecordNumber || "Not assigned"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-2xl border p-4"><p className="font-medium">Demographic information</p><p className="mt-2"><span className="font-medium">DOB:</span> {profile.dateOfBirth || intake.dateOfBirth || "Not entered"}</p><p className="mt-1"><span className="font-medium">Sex:</span> {profile.sex || intake.sex || "Not entered"}</p><p className="mt-1"><span className="font-medium">Address:</span> {[profile.addressLine1 || intake.addressLine1, profile.addressLine2 || intake.addressLine2, profile.city || intake.city, profile.state || intake.state, profile.zipCode || intake.zipCode].filter(Boolean).join(", ") || "Not entered"}</p></div>
                <div className="rounded-2xl border p-4"><p className="font-medium">Contact information</p><p className="mt-2"><span className="font-medium">Phone:</span> {profile.phone || intake.phone || "Not entered"}</p><p className="mt-1"><span className="font-medium">Email:</span> {profile.email || "Not entered"}</p></div>
              </div>
              <div className="rounded-2xl border p-4"><p className="font-medium">Insurance information</p><p className="mt-2"><span className="font-medium">Network:</span> {intake.insuranceNetworkStatus || profile.insuranceNetworkStatus || "Not verified"}</p><p className="mt-1"><span className="font-medium">Carrier:</span> {intake.insurancePayer || "Not entered"}</p><p className="mt-1"><span className="font-medium">Plan:</span> {intake.insurancePlanName || profile.insurancePlanName || "Not entered"}</p><p className="mt-1"><span className="font-medium">Member ID:</span> {intake.insuranceMemberId || "Not entered"}</p><p className="mt-1"><span className="font-medium">Group number:</span> {intake.insuranceGroupNumber || "Not entered"}</p><p className="mt-1"><span className="font-medium">Verification:</span> {intake.insuranceVerificationStatus || "Not verified"}</p></div>
            </CardContent>
          </Card>
          <Tabs defaultValue="intake">
            <TabsList className="flex flex-wrap rounded-2xl w-full h-auto">
              <TabsTrigger value="intake">Intake</TabsTrigger><TabsTrigger value="biopsychosocial">Biopsychosocial</TabsTrigger><TabsTrigger value="plans">Treatment Plan</TabsTrigger><TabsTrigger value="assessments">Assessments</TabsTrigger><TabsTrigger value="notes">Follow-Up Notes</TabsTrigger><TabsTrigger value="documents">Consents & Records</TabsTrigger>
            </TabsList>
            <TabsContent value="intake" className="mt-4"><Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>Patient intake</CardTitle><CardDescription>Brief intake submitted electronically by the patient.</CardDescription></CardHeader><CardContent><Button className="rounded-2xl" onClick={() => setPage("documents")}>Open patient intake</Button></CardContent></Card></TabsContent>
            <TabsContent value="biopsychosocial" className="mt-4"><Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>Biopsychosocial assessment</CardTitle><CardDescription>Provider-completed clinical evaluation and diagnostic formulation.</CardDescription></CardHeader><CardContent>{(intake.combinedBiopsychosocialSummary || intake.biopsychosocialSummary) && <p className="whitespace-pre-wrap mb-4 text-sm">{intake.combinedBiopsychosocialSummary || intake.biopsychosocialSummary}</p>}<Button className="rounded-2xl" onClick={() => setPage("intake")}>Open biopsychosocial assessment</Button></CardContent></Card></TabsContent>
            <TabsContent value="notes" className="mt-4">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Follow-up notes</CardTitle>
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
                  <CardTitle>Treatment plan</CardTitle>
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
                      <details className="mt-3">
                        <summary className="cursor-pointer font-medium">View saved assessment history ({assessmentHistory(value).length})</summary>
                        <div className="mt-3 space-y-3">
                          {assessmentHistory(value).map((result, index) => (
                            <div key={`${result.completedAt}-${index}`} className="rounded-xl border p-3">
                              <p className="whitespace-pre-wrap">{completedAssessmentSummary({ [key]: result })[0]?.text}</p>
                              {Array.isArray(result.responses) && <p className="mt-2">Recorded responses: {result.responses.join(", ")}</p>}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="documents" className="mt-4">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Forms, consents, and other records</CardTitle>
                  <CardDescription>Signed consents, identification, insurance cards, uploads, and later records.</CardDescription>
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
                      <p className="text-xs text-slate-500 mt-1">Signature: {doc.signature ? `${documentSignatureText(doc.signature)} | ${doc.signature.signedAt}` : "Not signed"}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl mt-3"
                        onClick={() => {
                          const workflow = getDocumentWorkflow(doc);
                          setPage(workflow.page, workflow.target || null);
                        }}
                      >
                        {getDocumentWorkflow(doc).label}
                      </Button>
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
  const { store, updateSpecificUserData, appendAuditLog, flushClientModuleSaves } = useAuth();
  const { setPage, selectedChartClientId, setSelectedChartClientId } = usePage();
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const [selectedClientId, setSelectedClientId] = useState(store.users[selectedChartClientId] ? selectedChartClientId : clients[0]?.[0] || "");
  const selectedClient = selectedClientId ? store.users[selectedClientId] : null;
  const intake = selectedClient?.intake ? { ...selectedClient.intake } : { firstName: "", lastName: "", dateOfBirth: "", phone: "", chiefComplaint: "", onset: "", presentingProblem: "", treatmentGoals: "", biopsychosocialSummary: "", demographicsSummary: "", socialFamilyHistory: "", mentalHealthHistory: "", hospitalizationHistory: "", medicalPhysicalHistory: "", abuseTraumaHistory: "", substanceUseHistory: "", riskSafetySummary: "", strengthsProtectiveFactors: "", clinicalFormulation: "", primaryDiagnosis: "", secondaryDiagnosis: "", tertiaryDiagnosis: "", diagnoses: [], billingCodes: [], sessionMinutes: "", providerSignature: PRACTITIONER_NAME, clientSignature: "" };
  const completedAssessments = completedAssessmentSummary(selectedClient?.assessments);
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
  const [saveFailed, setSaveFailed] = useState(false);
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
  const handleSubmitIntake = async () => {
    if (!selectedClientId || isSubmitting) return;
    setIsSubmitting(true);
    setSaveNotice("");
    setSaveFailed(false);
    try {
      await flushClientModuleSaves(selectedClientId);
      const value = {
        ...(store.users[selectedClientId].intake || intake),
        providerNpi: providerNpiForName(intake.providerSignature || PRACTITIONER_NAME),
        providerLicense: providerIdentifiersForName(intake.providerSignature || PRACTITIONER_NAME).licenseNumber,
        assessmentResults: completedAssessments,
        combinedBiopsychosocialSummary: composeBiopsychosocialSummary(intake.biopsychosocialSummary || "", selectedClient?.assessments),
        status: "submitted", submittedAt: new Date().toLocaleString(), designation: "HIPAA Medical Record Entry",
      };
      await productionApi("/api/ehr/records", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: selectedClientId, recordType: "ehr-module-snapshot", status: "draft", payload: { moduleKey: "intake", value, providerReviewRequired: true } }) });
      updateSpecificUserData(selectedClientId, "intake", value, false);
      setSaveNotice("Biopsychosocial assessment and completed assessment results saved to the secure chart.");
    } catch (error) { setSaveFailed(true); setSaveNotice(error instanceof Error ? error.message : "Assessment was not saved. Please try again."); }
    finally { setIsSubmitting(false); }
  };
  return (
    <div>
      <SectionHeader title="Biopsychosocial Assessment" description="Revealing Leads to Healing Wellness Services LLC | EHR Proprietary System | Licensed for RLHW Services LLC" />
      <Card className="rounded-2xl shadow-sm mb-4">
        <CardContent className="p-4">
          <Select disabled={isSubmitting} value={selectedClientId} onValueChange={(id) => { setSelectedClientId(id); setSelectedChartClientId(id); setSaveNotice(""); }}>
            <SelectTrigger className="rounded-2xl max-w-md"><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>
              {clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      {saveNotice && <div role={saveFailed ? "alert" : "status"} className={cn("mb-4 rounded-2xl border px-4 py-3 text-sm font-medium", saveFailed ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>{saveNotice}</div>}
      {selectedClient && (
        <Card className="rounded-[2rem] shadow-sm border border-slate-100 bg-white">
          <CardContent className="p-6 md:p-10 space-y-10">
            <fieldset disabled={isSubmitting} className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Biopsychosocial Assessment</h3>
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
              <h4 className="text-xl font-bold text-slate-800">Presenting Concerns & History</h4>
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
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Presenting Problem / Reason for Therapy</label>
                  <Textarea value={intake.presentingProblem || ""} onChange={(e) => updateIntakeField("presentingProblem", e.target.value)} className="min-h-[150px] rounded-[1.25rem]" placeholder="Document the current symptoms, duration, and life impact..." />
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
              </div>
            </section>
            <section className="space-y-6">
              <h4 className="text-xl font-bold text-slate-800">Summary, Diagnosis & Plan</h4>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Complete Biopsychosocial Summary</label>
                  <Textarea value={intake.biopsychosocialSummary || ""} onChange={(e) => updateIntakeField("biopsychosocialSummary", e.target.value)} className="min-h-[190px] rounded-[1.25rem]" placeholder="Demographics, social/family history, abuse/trauma history, medical and mental health history, hospitalizations, substance use, risk, strengths, diagnostic rationale, and clinical formulation..." />
                </div>
                <section aria-label="Completed Assessments" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h5 className="text-base font-bold">Completed Assessments</h5>
                  <p className="text-sm">Saved results for this patient are included with the summary when you submit this biopsychosocial assessment.</p>
                  {completedAssessments.length === 0 && <p>No completed assessments saved for this patient.</p>}
                  {completedAssessments.map((entry) => <div key={entry.key} className="border rounded-2xl p-3 space-y-2">
                    <p className="whitespace-pre-wrap text-sm">{entry.text}</p>
                    {completedAssessmentTabs[entry.key] && <Button type="button" variant="outline" onClick={() => { setSelectedChartClientId(selectedClientId); setPage("assessments", { tab: completedAssessmentTabs[entry.key], clientId: selectedClientId }); }}>Open full {entry.name}</Button>}
                  </div>)}
                  <Button type="button" variant="outline" onClick={() => { setSelectedChartClientId(selectedClientId); setPage("assessments", { clientId: selectedClientId }); }}>Open Assessments</Button>
                </section>
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
                    <Input value={intakeDiagnosisSearch} onChange={(e) => setIntakeDiagnosisSearch(e.target.value)} placeholder="Type ICD code or diagnosis keyword for assessment" className="rounded-2xl" />
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
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700">Session Minutes</label>
                    <Input value={intake.sessionMinutes || ""} onChange={(e) => updateIntakeField("sessionMinutes", e.target.value)} placeholder="Session minutes" className="rounded-2xl" />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700">Billing Codes</label>
                    <Input value={(intake.billingCodes || []).join(", ")} onChange={(e) => updateIntakeField("billingCodes", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="CPT/HCPCS billing codes" className="rounded-2xl" />
                    <Input value={intakeBillingSearch} onChange={(e) => setIntakeBillingSearch(e.target.value)} placeholder="Type billing code or keyword for assessment, e.g. 90791, bio, interpreter" className="rounded-2xl" />
                    {intakeBillingMatches.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {intakeBillingMatches.map((item) => (
                          <Button key={`${item.type}-${item.code}`} type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => applyIntakeBillingCode(item)}>{item.code} | {item.label}</Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <section aria-label="Follow-Up Plan" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h5 className="text-base font-bold text-slate-800">Follow-Up Plan</h5>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Agreed visit frequency" value={intake.followUpFrequency || ""} onChange={(e) => updateIntakeField("followUpFrequency", e.target.value)} placeholder="e.g., 2–3 times weekly, weekly, twice monthly, monthly" className="rounded-2xl" />
                    <Input label="Next follow-up interval" value={intake.followUpInterval || ""} onChange={(e) => updateIntakeField("followUpInterval", e.target.value)} placeholder="e.g., in 2–3 days, one week, two weeks, one month" className="rounded-2xl" />
                  </div>
                  <Textarea label="Follow-up comments / patient agreement" value={intake.followUpComments || ""} onChange={(e) => updateIntakeField("followUpComments", e.target.value)} placeholder="Document the provider recommendation, patient agreement, and adjustments based on progress." className="min-h-[110px] rounded-2xl" />
                </section>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Clinical Objectives & Treatment Goals</label>
                  <Textarea value={intake.treatmentGoals || ""} onChange={(e) => updateIntakeField("treatmentGoals", e.target.value)} className="min-h-[150px] rounded-[1.25rem]" placeholder="Specify measurable goals for the clinical intervention..." />
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-sm font-bold text-slate-800">Assessment electronic signatures</p>
              <div className="grid md:grid-cols-2 gap-3">
                <ProviderSignatureInput label="Provider Electronic Signature" value={intake.providerSignature || PRACTITIONER_NAME} onChange={(e) => updateIntakeField("providerSignature", e.target.value)} placeholder="Provider electronic signature" className="rounded-2xl" />
                <Input label="Client Electronic Signature" value={intake.clientSignature || ""} onChange={(e) => updateIntakeField("clientSignature", e.target.value)} placeholder="Client electronic signature, if required" className="rounded-2xl" />
              </div>
            </section>
            <button type="button" className="w-full rounded-2xl h-14 text-base font-bold bg-slate-900 text-white hover:bg-black transition" disabled={isSubmitting} onClick={handleSubmitIntake}>
              <span className="inline-flex items-center justify-center gap-2">
                <Save className="h-4 w-4" />
                {isSubmitting ? "Saving Assessment..." : "Submit Assessment to Secure Chart"}
              </span>
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Status: {selectedClient?.intake?.status === "submitted" ? "Submitted" : "Draft"}
              {selectedClient?.intake?.submittedAt ? ` | Last submitted ${selectedClient.intake.submittedAt}` : ""}
            </div>
            </fieldset>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
function ProgressNotesPage() {
  const { store, updateSpecificUserData, appendAuditLog } = useAuth();
  const [aiNotice, setAiNotice] = useState("");
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
      `Provider e-signature: ${providerSignatureText(codeDraft.providerSignature)}`,
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
          providerNpi: providerNpiForName(codeDraft.providerSignature || ""),
          providerLicense: providerIdentifiersForName(codeDraft.providerSignature || "").licenseNumber,
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
            <Input label="Note title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Note title" />
            <label className="block space-y-1"><span className="text-sm font-medium">Treatment approach / clinical focus</span>
            <Select aria-label="Treatment approach / clinical focus" value={draft.modality} onValueChange={(value) => setDraft({ ...draft, modality: value })}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CBT">CBT</SelectItem>
                <SelectItem value="Trauma-Focused">Trauma-Focused</SelectItem>
                <SelectItem value="EMDR">EMDR</SelectItem>
                <SelectItem value="DBT">DBT</SelectItem>
                <SelectItem value="Psychodynamic">Psychodynamic</SelectItem>
                <SelectItem value="Grief">Grief</SelectItem>
                <SelectItem value="Nutrition-Informed Mental Health">Nutrition-Informed Mental Health</SelectItem>
                <SelectItem value="Holistic Mental Health">Holistic Mental Health</SelectItem>
                <SelectItem value="Integrative Mental Health">Integrative Mental Health</SelectItem>
                <SelectItem value="Geriatric Mental Health">Geriatric Mental Health</SelectItem>
                <SelectItem value="Dementia Care">Dementia Care</SelectItem>
                <SelectItem value="Autism Support">Autism Support</SelectItem>
                <SelectItem value="Behavioral Health">Behavioral Health</SelectItem>
                <SelectItem value="Dual Diagnosis / Co-occurring Disorders">Dual Diagnosis / Co-occurring Disorders</SelectItem>
                <SelectItem value="Motivational Interviewing">Motivational Interviewing</SelectItem>
                <SelectItem value="Polyvagal-Informed">Polyvagal-Informed</SelectItem>
                <SelectItem value="Somatic Therapy">Somatic Therapy</SelectItem>
              </SelectContent>
            </Select>
            </label>
            <label className="block space-y-1"><span className="text-sm font-medium">Note type</span>
            <Select aria-label="Note type" value={draft.noteType} onValueChange={(value) => setDraft({ ...draft, noteType: value })}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Medical Record Note">Medical Record Note | HIPAA Medical Record</SelectItem>
                <SelectItem value="Psychotherapy Note">Psychotherapy Note | Provider Restricted</SelectItem>
                <SelectItem value="Initial Progress Note">Initial Progress Note | First session</SelectItem>
                <SelectItem value="Follow-up Progress Note">Follow-up Progress Note | Continuing care</SelectItem>
                <SelectItem value="Biopsychosocial Assessment">Biopsychosocial Assessment | Intake/BPS</SelectItem>
              </SelectContent>
            </Select>
            </label>
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
                  <ProviderSignatureInput label="Provider Electronic Signature" value={codeDraft.providerSignature} onChange={(e) => setCodeDraft({ ...codeDraft, providerSignature: e.target.value })} placeholder="Provider electronic signature" />
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
            <Textarea label="Note text" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} className="min-h-[260px] rounded-2xl" placeholder="Write note..." />
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
const billingPayerDefinitions = [
  { id: "all", label: "All Claims", aliases: [] },
  { id: "healthfirst", label: "Healthfirst", aliases: ["healthfirst", "health first"] },
  { id: "aetna", label: "Aetna", aliases: ["aetna"] },
  { id: "bcbs", label: "Blue Cross Blue Shield", aliases: ["blue cross", "blue shield", "bcbs", "anthem", "empire"] },
  { id: "cigna", label: "Cigna", aliases: ["cigna", "evernorth"] },
  { id: "medicare-medicaid", label: "Medicare / Medicaid", aliases: ["medicare", "medicaid", "emmedny", "emedny"] },
  { id: "self-pay", label: "Self-Pay", aliases: ["self pay", "self-pay", "private pay", "cash"] },
  { id: "other", label: "Other", aliases: [] },
];
const billingClaimStatuses = ["Draft", "Action Required", "Ready", "Queued", "Submitted", "Paid", "Rejected", "Denied"];
function classifyBillingPayer(value = "") {
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return "other";
  return billingPayerDefinitions.find((payer) => payer.id !== "all" && payer.id !== "other" && payer.aliases.some((alias) => normalized.includes(alias)))?.id || "other";
}
function billingPayerLabel(id) {
  return billingPayerDefinitions.find((payer) => payer.id === id)?.label || "Other";
}
function billingMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}
function billingStatusClass(status) {
  if (status === "Paid") return "bg-emerald-100 text-emerald-800";
  if (status === "Ready" || status === "Queued") return "bg-blue-100 text-blue-800";
  if (status === "Rejected" || status === "Denied" || status === "Action Required") return "bg-red-100 text-red-800";
  if (status === "Submitted") return "bg-violet-100 text-violet-800";
  return "bg-stone-100 text-stone-700";
}

function BillingPage() {
  const { store, updateSpecificUserData, appendAuditLog } = useAuth();
  const { selectedChartClientId, workflowTarget, setPage } = usePage();
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const [selectedClientId, setSelectedClientId] = useState(store.users[selectedChartClientId]?.profile.role === "client" ? selectedChartClientId : clients[0]?.[0] || "");
  const [activePayer, setActivePayer] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const selectedClient = selectedClientId ? store.users[selectedClientId] : null;
  const [billingAppointmentId, setBillingAppointmentId] = useState(workflowTarget?.appointmentId || "");
  const linkedAppointment = (selectedClient?.appointments || []).find(item => item.id === billingAppointmentId);
  const intake = { ...(selectedClient?.intake || {}) };
  const [diagnosisSearch, setDiagnosisSearch] = useState("");
  const [diagnosisTarget, setDiagnosisTarget] = useState("primaryDiagnosis");
  const [billingSearch, setBillingSearch] = useState("");
  const [notice, setNotice] = useState("");
  const claims = useMemo(() => clients.flatMap(([clientId, bucket]) =>
    (bucket.billingClaims || []).map((claim) => ({
      ...claim,
      clientId,
      clientName: bucket.profile.fullName || "Client",
      payerId: claim.payerId || classifyBillingPayer(claim.payerName),
    }))
  ).sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || ""))), [store.users]);
  const filteredClaims = claims.filter((claim) =>
    (activePayer === "all" || claim.payerId === activePayer) &&
    (statusFilter === "all" || claim.status === statusFilter)
  );
  const totals = filteredClaims.reduce((summary, claim) => ({
    billed: summary.billed + (Number(claim.chargeAmount) || 0),
    paid: summary.paid + (Number(claim.paidAmount) || 0),
  }), { billed: 0, paid: 0 });
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
    if (linkedAppointment && ["Cancelled", "Not seen"].includes(linkedAppointment.status)) {
      setNotice("This appointment was not attended. Review the cancellation policy and payer rules separately; a completed-session insurance claim was not created."); return;
    }
    const current = {
      ...(store.users[selectedClientId].intake || {}),
    };
    const payerName = current.insurancePayer || "Other";
    const payerId = classifyBillingPayer(payerName);
    const ready = Boolean(current.primaryDiagnosis && (current.billingCodes || []).length && current.dateOfService && current.chargeAmount);
    const claim = {
      id: `claim-${Date.now()}`,
      renderingProviderName: current.providerSignature || PRACTITIONER_NAME,
      renderingProviderNpi: providerNpiForName(current.providerSignature || PRACTITIONER_NAME),
      renderingProviderLicense: providerIdentifiersForName(current.providerSignature || PRACTITIONER_NAME).licenseNumber,
      payerId,
      payerName,
      dateOfService: current.dateOfService || "",
      status: ready ? "Ready" : "Action Required",
      billingCodes: current.billingCodes || [],
      diagnoses: [current.primaryDiagnosis, current.secondaryDiagnosis, current.tertiaryDiagnosis].filter(Boolean),
      chargeAmount: Number(current.chargeAmount) || 0,
      paidAmount: 0,
      transmissionEnabled: false,
      createdAt: new Date().toISOString(),
    };
    const summary = `Quick Billing Snapshot\nClient: ${selectedClient?.profile?.fullName || "Client"}\nPayer: ${payerName}\nDate of service: ${current.dateOfService || "Not entered"}\nChief complaint: ${current.chiefComplaint || "Not entered"}\nSession minutes: ${current.sessionMinutes || "Not entered"}\nPrimary ICD-10-CM: ${current.primaryDiagnosis || "Not selected"}\nSecondary ICD-10-CM: ${current.secondaryDiagnosis || "Not selected"}\nTertiary ICD-10-CM: ${current.tertiaryDiagnosis || "Not selected"}\nBilling codes: ${(current.billingCodes || []).join(", ") || "Not selected"}\nCharge: ${billingMoney(current.chargeAmount)}\nProvider signature: ${providerSignatureText(current.providerSignature || PRACTITIONER_NAME, current.providerNpi)}\nClient signature: ${current.clientSignature || "Not signed / not required"}`;
    updateSpecificUserData(selectedClientId, "billingClaims", (prev) => [claim, ...(prev || [])]);
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
      action: "Created billing claim draft",
      details: `Billing snapshot routed to ${billingPayerLabel(payerId)} with claim transmission disabled.`,
      clientId: selectedClientId,
      clientName: selectedClient?.profile?.fullName || "Client",
      category: "Billing",
    });
    setActivePayer(payerId);
    setNotice(`Claim draft saved to ${billingPayerLabel(payerId)} and Document Library. No claim was transmitted.`);
    setTimeout(() => setNotice(""), 5000);
  };
  return (
    <div>
      <SectionHeader title="Billing" description="Payer-organized claim workspace with a central ledger, review statuses, totals, and audit-ready routing." />
      <div className="mb-4 rounded-2xl border p-4 space-y-3">
        <h3 className="font-semibold">Appointment statuses from the client chart</h3>
        <p className="text-sm">Status and time saved in Telehealth appear here for billing review.</p>
        {(selectedClient?.appointments || []).map(item => <div key={item.id} className="flex flex-wrap items-center gap-3 border p-3">
          <span>{item.date} {item.time} · {item.status} · {item.sessionMinutes || "—"} minutes</span>
          <Button variant="outline" onClick={() => setBillingAppointmentId(item.id)}>Review this appointment</Button>
        </div>)}
        {!(selectedClient?.appointments || []).length && <p>No appointments recorded for this client.</p>}
      </div>
      {linkedAppointment && <div className="mb-4 rounded-2xl border p-4 space-y-2">
        <h3 className="font-semibold">Appointment carried forward from Telehealth</h3>
        <p>{selectedClient.profile.fullName} · {linkedAppointment.date} {linkedAppointment.time}</p>
        <p>Status: {linkedAppointment.status} · Session minutes: {linkedAppointment.sessionMinutes || "Not recorded"}</p>
        {["Cancelled", "Not seen"].includes(linkedAppointment.status) && <p>Cancellation-fee review: check the agreed notice period, cancellation timestamp, and applicable payer restrictions before adding a permitted charge. No fee has been created.</p>}
        {linkedAppointment.cancelledAt && <p>Cancellation recorded: {linkedAppointment.cancelledAt}</p>}
        <Button variant="outline" onClick={() => setPage("messages", { clientId: selectedClientId, appointmentId: linkedAppointment.id })}>Return to client outreach</Button>
      </div>}
      {notice && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</div>}
      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <span className="font-semibold">Claim transmission is disabled.</span> Drafts remain inside the EHR until payer enrollment, submission rules, and end-to-end testing are confirmed.
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Visible claims</p><p className="mt-1 text-2xl font-bold">{filteredClaims.length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Billed</p><p className="mt-1 text-2xl font-bold">{billingMoney(totals.billed)}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Paid</p><p className="mt-1 text-2xl font-bold text-emerald-700">{billingMoney(totals.paid)}</p></CardContent></Card>
      </div>
      <Card className="mb-4 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Central claim ledger</CardTitle>
          <CardDescription>One ledger, organized by payer. Payer views do not duplicate records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {billingPayerDefinitions.map((payer) => {
              const payerClaims = payer.id === "all" ? claims : claims.filter((claim) => claim.payerId === payer.id);
              const pendingCount = payerClaims.filter((claim) => ["Draft", "Action Required", "Ready", "Queued"].includes(claim.status || "Draft")).length;
              return (
                <Button key={payer.id} type="button" size="sm" variant={activePayer === payer.id ? "default" : "outline"} className="rounded-2xl" onClick={() => setActivePayer(payer.id)}>
                  {payer.label}
                  <span className={pendingCount > 0 ? "ml-1 inline-flex min-w-6 items-center justify-center rounded-full bg-amber-200 px-2 py-0.5 font-bold text-stone-950" : "ml-1 text-stone-500"}>
                    {pendingCount}
                  </span>
                </Button>
              );
            })}
          </div>
          <div className="max-w-xs">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {billingClaimStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {filteredClaims.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600">No claim drafts match this payer and status. Use the billing fields below to create one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead><tr className="border-b text-xs uppercase tracking-wide text-stone-500"><th className="p-3">Client</th><th className="p-3">Payer</th><th className="p-3">Date of service</th><th className="p-3">Status</th><th className="p-3 text-right">Billed</th><th className="p-3 text-right">Paid</th></tr></thead>
                <tbody>{filteredClaims.map((claim) => <tr key={claim.id} className="border-b border-stone-100"><td className="p-3 font-medium">{claim.clientName}</td><td className="p-3">{billingPayerLabel(claim.payerId)}</td><td className="p-3">{claim.dateOfService || "Not entered"}</td><td className="p-3"><Badge className={billingStatusClass(claim.status)}>{claim.status || "Draft"}</Badge></td><td className="p-3 text-right">{billingMoney(claim.chargeAmount)}</td><td className="p-3 text-right">{billingMoney(claim.paidAmount)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="grid xl:grid-cols-[1fr_1fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Billing fields</CardTitle>
            <CardDescription>Codes save to the selected chart; the payer determines the ledger view.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid md:grid-cols-3 gap-3">
              <Input label="Insurance / Payer" value={intake.insurancePayer || ""} onChange={(e) => updateBillingField("insurancePayer", e.target.value)} placeholder="Healthfirst, Aetna, BCBS..." />
              <Input label="Date of Service" type="date" value={intake.dateOfService || ""} onChange={(e) => updateBillingField("dateOfService", e.target.value)} />
              <Input label="Charge Amount" type="number" min="0" step="0.01" value={intake.chargeAmount || ""} onChange={(e) => updateBillingField("chargeAmount", e.target.value)} placeholder="0.00" />
            </div>
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
            {diagnosisMatches.length > 0 && <div className="flex flex-wrap gap-2">{diagnosisMatches.map((item) => <Button key={item.code} type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => applyDiagnosisCode(item)}>{item.code} | {item.label}</Button>)}</div>}
            <Input label="CPT / HCPCS Billing Codes" value={(intake.billingCodes || []).join(", ")} onChange={(e) => updateBillingField("billingCodes", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="CPT/HCPCS billing codes" />
            <Input value={billingSearch} onChange={(e) => setBillingSearch(e.target.value)} placeholder="Type billing keyword, e.g. intake, bio, 60, interpreter" />
            {billingMatches.length > 0 && <div className="flex flex-wrap gap-2">{billingMatches.map((item) => <Button key={`${item.type}-${item.code}`} type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => applyBillingCode(item)}>{item.code} | {item.label}</Button>)}</div>}
            <div className="grid md:grid-cols-2 gap-3">
              <ProviderSignatureInput label="Provider Electronic Signature" value={intake.providerSignature || PRACTITIONER_NAME} onChange={(e) => updateBillingField("providerSignature", e.target.value)} placeholder="Provider electronic signature" />
              <Input label="Client Electronic Signature" value={intake.clientSignature || ""} onChange={(e) => updateBillingField("clientSignature", e.target.value)} placeholder="Client electronic signature, if required" />
            </div>
            <Button className="rounded-2xl" onClick={saveBillingSnapshot}><Save className="mr-2 h-4 w-4" />Save claim draft and billing snapshot</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Current billing summary</CardTitle>
            <CardDescription>Review before saving the internal claim draft.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="font-medium">Client:</span> {selectedClient?.profile?.fullName || "No client selected"}</p>
            <p><span className="font-medium">Payer:</span> {intake.insurancePayer || "Not entered"} → {billingPayerLabel(classifyBillingPayer(intake.insurancePayer))}</p>
            <p><span className="font-medium">Date of service:</span> {intake.dateOfService || "Not entered"}</p>
            <p><span className="font-medium">Charge:</span> {billingMoney(intake.chargeAmount)}</p>
            <p><span className="font-medium">Chief complaint:</span> {intake.chiefComplaint || "Not entered"}</p>
            <p><span className="font-medium">Session minutes:</span> {intake.sessionMinutes || "Not entered"}</p>
            <p><span className="font-medium">Primary:</span> {intake.primaryDiagnosis || "Not selected"}</p>
            <p><span className="font-medium">Secondary:</span> {intake.secondaryDiagnosis || "Not selected"}</p>
            <p><span className="font-medium">Tertiary:</span> {intake.tertiaryDiagnosis || "Not selected"}</p>
            <p><span className="font-medium">Billing codes:</span> {(intake.billingCodes || []).join(", ") || "Not selected"}</p>
            <p><span className="font-medium">Provider signature:</span> {providerSignatureText(intake.providerSignature || PRACTITIONER_NAME, intake.providerNpi)}</p>
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
  const currentClientId = currentUser.chartClientId || currentUser.id;
  const assignments = store.users[currentClientId]?.homework || [];
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
      clientId: currentClientId,
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
  const currentClientId = currentUser.chartClientId || currentUser.id;
  const requests = (store.recordRequests || []).filter((item) => item.clientId === currentClientId);
  const handleSubmit = () => {
    const requestReason = reason.trim() || "No additional details provided.";
    submitRecordRequest({ requestType, reason: requestReason });
    appendAuditLog({
      action: "Submitted records request",
      details: `${requestType} requested by client through portal.`,
      clientId: currentClientId,
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
            <div className="space-y-2">
              <Label htmlFor="record-request-details" className="block text-sm font-semibold text-slate-900">
                Additional details (optional)
              </Label>
              <Textarea
                id="record-request-details"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[160px] rounded-2xl border-2 border-slate-400 bg-white text-slate-950 placeholder:text-slate-500"
                placeholder="Add any details you want the practice to know. You may leave this blank."
              />
            </div>
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
    const request = requests.find((item) => item.id === id);
    updateRecordRequestStatus(id, status);
    appendAuditLog({
      action: `Updated record request to ${status}`,
      details: "Provider reviewed a client records request.",
      clientId: request?.clientId || "",
      clientName: request?.clientName || "",
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
  const { store, currentUser, updateSpecificUserData, appendAuditLog, flushClientModuleSaves } = useAuth();
  const [specialtyKey, setSpecialtyKey] = useState("mse");
  const [specialtySearch, setSpecialtySearch] = useState("");
  const matchingSpecialties = specialtyAssessments.filter(item => item.key === specialtyKey || `${item.label} ${item.group}`.toLowerCase().includes(specialtySearch.trim().toLowerCase()));
  const [specialtyBusy, setSpecialtyBusy] = useState(false);
  const { workflowTarget, selectedChartClientId, setSelectedChartClientId } = usePage();
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const [selectedClientId, setSelectedClientId] = useState(workflowTarget?.clientId || (store.users[selectedChartClientId] ? selectedChartClientId : clients[0]?.[0] || ""));
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
    updateSpecificUserData(selectedClientId, "assessments", (previous) => ({
      ...(previous || {}),
      [key]: recordAssessment(previous?.[key], { ...payload, label, completedAt: new Date().toISOString(), reviewedByProvider: true }),
    }));
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
          <Select disabled={specialtyBusy} value={selectedClientId} onValueChange={(id) => { setSelectedClientId(id); setSelectedChartClientId(id); }}>
            <SelectTrigger className="rounded-2xl max-w-md"><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>{clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      <section className="mb-6 space-y-4">
        <h2 className="text-xl font-semibold">Mental status and specialty assessments</h2>
        <p className="text-sm text-slate-600">Screening questionnaires support initial screening and monitoring; they do not replace a structured clinical interview by a licensed professional.</p>
        <Input label="Find an assessment" placeholder="Search by name or specialty" value={specialtySearch} disabled={specialtyBusy} onChange={event => setSpecialtySearch(event.target.value)} />
        <label className="block space-y-1"><span className="text-sm font-medium">Choose specialty assessment</span>
          <select className="w-full rounded-xl border p-3" disabled={specialtyBusy} value={specialtyKey} onChange={event => setSpecialtyKey(event.target.value)}>
            {[...new Set(matchingSpecialties.map(item => item.group))].map(group => <optgroup key={group} label={group}>{matchingSpecialties.filter(item => item.group === group).map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</optgroup>)}
          </select>
        </label>
        <p className="text-sm text-slate-600">DAST-10 and the existing assessment tools remain below.</p>
        {selectedClientId && <SpecialtyAssessmentForm key={`${selectedClientId}:${specialtyKey}`} assessmentKey={specialtyKey} saved={assessments[specialtyKey]} examiner={currentUser?.fullName || ""} onBusy={setSpecialtyBusy} onSave={async (key, payload, label) => {
          saveAssessment(key, payload, label);
          await flushClientModuleSaves(selectedClientId);
        }} />}
      </section>

      <Tabs key={workflowTarget?.tab || "phq9"} defaultValue={workflowTarget?.tab || "phq9"}>
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
  const { currentUser } = useAuth();
  const identifiers = providerIdentifiersForName(currentUser?.fullName || "");
  return (
    <div>
      <SectionHeader title="Infrastructure" description="AWS production controls supporting authentication, encrypted chart storage, access boundaries, audit history, backups, and retention." />
      <Card className="rounded-2xl shadow-sm mb-4">
        <CardHeader><CardTitle>Provider identification</CardTitle><CardDescription>{currentUser?.fullName}</CardDescription></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm">
          <p><span className="font-medium">Individual NPI:</span> {identifiers.npi || "Not configured"}</p>
          <p><span className="font-medium">CAQH provider ID:</span> {identifiers.caqhId || "Not configured"}</p>
          <p><span className="font-medium">License number:</span> {identifiers.licenseNumber || "Not configured"}</p>
          <p><span className="font-medium">CASAC credential:</span> {identifiers.casacNumber ? `${identifiers.casacNumber} — ${identifiers.casacLevel}` : "Not configured"}</p>
          <p><span className="font-medium">CASAC effective date:</span> {identifiers.casacEffectiveDate || "Not configured"}</p>
          <p><span className="font-medium">CASAC expiration date:</span> {identifiers.casacExpirationDate || "Not configured"}</p>
          {identifiers.additionalCredentials.length > 0 && <div className="md:col-span-3"><p className="font-medium">Additional professional credentials</p><ul className="list-disc pl-5">{identifiers.additionalCredentials.map(credential => <li key={credential}>{credential}</li>)}</ul></div>}
          {identifiers.education.length > 0 && <div className="md:col-span-3"><p className="font-medium">Education</p><ul className="list-disc pl-5">{identifiers.education.map(degree => <li key={degree}>{degree}</li>)}</ul></div>}
          {identifiers.completedTraining.length > 0 && <div className="md:col-span-3"><p className="font-medium">Completed training</p><ul className="list-disc pl-5">{identifiers.completedTraining.map(training => <li key={training}>{training}</li>)}</ul></div>}
          {identifiers.trainingInProgress.length > 0 && <div className="md:col-span-3"><p className="font-medium">Training in progress</p><ul className="list-disc pl-5">{identifiers.trainingInProgress.map(training => <li key={training}>{training}</li>)}</ul></div>}
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>Authentication and access</CardTitle><CardDescription>AWS Cognito and server-enforced authorization</CardDescription></CardHeader><CardContent className="space-y-2 text-sm text-slate-700"><p>MFA-enabled Cognito accounts identify providers and clients.</p><p>Clients are linked to one authorized chart and cannot retrieve provider-only notes or records.</p><p>Secure HttpOnly session cookies protect authenticated browser sessions.</p></CardContent></Card>
        <Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>Encrypted clinical records</CardTitle><CardDescription>AWS DynamoDB, S3, and KMS</CardDescription></CardHeader><CardContent className="space-y-2 text-sm text-slate-700"><p>Clinical module snapshots and document metadata persist in encrypted AWS data stores.</p><p>Private chart files use encrypted S3 storage and time-limited authorized access links.</p><p>DynamoDB point-in-time recovery and deletion protection are defined in the foundation stack.</p></CardContent></Card>
        <Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>Audit and document access</CardTitle><CardDescription>Append-only activity history</CardDescription></CardHeader><CardContent className="space-y-2 text-sm text-slate-700"><p>Chart access, messages, record requests, signatures, document views, and clinical changes generate audit events.</p><p>Document signatures retain authenticated identity, timestamp, role, and a document-version fingerprint.</p><p>Provider-only records remain excluded from client API responses.</p></CardContent></Card>
        <Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>Monitoring, backup, and retention</CardTitle><CardDescription>AWS security-operations controls</CardDescription></CardHeader><CardContent className="space-y-2 text-sm text-slate-700"><p>CloudTrail, encrypted runtime logs, AWS Backup, WAF, Access Analyzer, and AWS Config rules are defined for the production environment.</p><p>Temporary HealthScribe audio is separated from the signed clinical record and governed by the documented deletion policy.</p><p>Practice BAAs, incident procedures, access reviews, and retention policies remain ongoing operational responsibilities.</p></CardContent></Card>
      </div>
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
  const { currentUser, store, updateCurrentUserData, updateSpecificUserData, appendAuditLog, flushClientModuleSaves } = useAuth();
  const { setPage, workflowTarget, selectedChartClientId } = usePage();
  const [libraryMode, setLibraryMode] = useState(Boolean(workflowTarget?.anchor || workflowTarget?.documentMode === "library"));
  const clients = Object.entries(store.users).filter(([, bucket]) => bucket.profile.role === "client");
  const [selectedClientId, setSelectedClientId] = useState(currentUser.role === "client" ? (currentUser.chartClientId || currentUser.id) : (store.users[selectedChartClientId] ? selectedChartClientId : clients[0]?.[0] || ""));
  const selectedClient = selectedClientId ? store.users[selectedClientId] : null;
  const documents = selectedClient?.documents || [];
  const clientAuthorizedDocumentTitles = new Set([
    ...consentTemplateDefinitions.map((item) => item.title),
    "Treatment Plan Signature",
  ]);
  const consentTitles = new Set(consentTemplateDefinitions.map((item) => item.title));
  const authorizedDocuments = currentUser.role === "client"
    ? documents.filter((doc) => doc.clientVisible === true || doc.uploadedByRole === "client" || clientAuthorizedDocumentTitles.has(doc.title))
    : documents;
  const visibleDocuments = libraryMode ? authorizedDocuments : authorizedDocuments.filter((doc) => consentTitles.has(doc.title));
  const [signatureDocId, setSignatureDocId] = useState("");
  const [signatureName, setSignatureName] = useState(currentUser?.fullName || PRACTITIONER_NAME);
  const [signatureRole, setSignatureRole] = useState("Provider");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState("Clinical Document");
  const [uploadFile, setUploadFile] = useState(null);
  const [documentNotice, setDocumentNotice] = useState("");
  const [documentBusy, setDocumentBusy] = useState(false);
  const makePatientDraft = () => {
    const saved = selectedClient?.patientOnboarding || {};
    const profile = selectedClient?.profile || {};
    return Object.fromEntries(["fullName", "dateOfBirth", "contactEmail", "phone", "addressLine1", "addressLine2", "city", "state", "zipCode", "chiefComplaint"].map((key) => [key, saved[key] ?? profile[key] ?? (key === "contactEmail" ? profile.email : "") ?? ""]));
  };
  const [patientIntakeDraft, setPatientIntakeDraft] = useState(makePatientDraft);
  useEffect(() => {
    setPatientIntakeDraft(makePatientDraft());
    setSignatureDocId("");
    setDocumentNotice("");
  }, [selectedClientId]);
  const savePatientOnboarding = async () => {
    if (currentUser.role !== "client" || !selectedClientId || documentBusy) return;
    if (!patientIntakeDraft.fullName.trim() || !patientIntakeDraft.chiefComplaint.trim()) {
      setDocumentNotice("Please enter your name and reason for seeking services."); return;
    }
    setDocumentBusy(true);
    setDocumentNotice("");
    const value = { ...(selectedClient.patientOnboarding || {}), ...patientIntakeDraft, onboardingStatus: "Submitted for provider review", patientSubmittedAt: new Date().toISOString() };
    try {
      await productionApi("/api/ehr/records", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: selectedClientId, recordType: "ehr-module-snapshot", status: "draft", payload: { moduleKey: "patientOnboarding", value, providerReviewRequired: true } }) });
      updateSpecificUserData(selectedClientId, "patientOnboarding", value, false);
      setDocumentNotice("Your intake was saved for provider review.");
    } catch (error) {
      setDocumentNotice(error instanceof Error ? error.message : "Intake was not saved. Please try again.");
    } finally { setDocumentBusy(false); }
  };
  const [advocacyTemplateType, setAdvocacyTemplateType] = useState("Human Resources / Leave");
  const [advocacyDetails, setAdvocacyDetails] = useState({ recipient: "", purpose: "", limitations: "", recommendations: "", collaboration: "" });
  useEffect(() => {
    if (workflowTarget?.advocacyTemplateType) {
      setAdvocacyTemplateType(workflowTarget.advocacyTemplateType);
    }
    if (workflowTarget?.anchor) {
      window.setTimeout(() => document.getElementById(workflowTarget.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  }, [workflowTarget]);
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
  const addTemplateDocuments = async () => {
    if (!selectedClientId || documentBusy) return;
    const existingTitles = new Set(documents.map((d) => d.title));
    const nextDocs = (libraryMode ? baseTemplates : baseTemplates.filter(([title]) => consentTitles.has(title)))
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
    if (!nextDocs.length) { setDocumentNotice("These forms are already in the chart."); return; }
    setDocumentBusy(true);
    try {
      const value = [...documents, ...nextDocs];
      await productionApi("/api/ehr/records", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: selectedClientId, recordType: "ehr-module-snapshot", status: "draft", payload: { moduleKey: "documents", value, providerReviewRequired: true } }) });
      updateSpecificUserData(selectedClientId, "documents", value, false);
      setDocumentNotice(libraryMode ? "Templates added to the chart." : "Practice consent forms are available in the patient's portal.");
    } catch (error) { setDocumentNotice(error instanceof Error ? error.message : "Forms were not saved. Please try again."); }
    finally { setDocumentBusy(false); }
  };
  const signDocument = async () => {
    if (!selectedClientId || !signatureDocId) return;
    const effectiveSignatureRole = currentUser?.role === "client" ? "Client" : signatureRole;
    const authenticatedProvider = effectiveSignatureRole === "Provider" && currentUser?.role === "provider";
    const authenticatedClient = effectiveSignatureRole === "Client" && currentUser?.role === "client" && selectedClientId === (currentUser.chartClientId || currentUser.id);
    if (!authenticatedProvider && !authenticatedClient) {
      setDocumentNotice("The selected signature role must match the currently authenticated EHR account. Guardian signatures require a separately authenticated guardian account.");
      return;
    }
    const selectedDocument = documents.find((doc) => doc.id === signatureDocId);
    if (!selectedDocument) return;
    const signer = currentUser?.fullName || signatureName.trim();
    const signedAt = new Date().toISOString();
    const versionSource = JSON.stringify({
      id: selectedDocument.id,
      title: selectedDocument.title,
      type: selectedDocument.type,
      storageKey: selectedDocument.storageKey || "",
      createdAt: selectedDocument.createdAt,
    });
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(versionSource));
    const documentVersionSha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    updateSpecificUserData(selectedClientId, "documents", (prev) =>
      prev.map((doc) =>
        doc.id === signatureDocId
          ? (() => {
              const nextSignature = { signer, signerId: currentUser.id, authenticatedRole: currentUser.role, role: effectiveSignatureRole, ...(authenticatedProvider ? { providerNpi: providerNpiForName(signer), providerLicense: providerIdentifiersForName(signer).licenseNumber } : {}), signedAt, documentVersionSha256 };
              const previousSignatures = Array.isArray(doc.signatures)
                ? doc.signatures.filter((entry) => entry.authenticatedRole !== currentUser.role)
                : doc.signature && doc.signature.authenticatedRole !== currentUser.role ? [doc.signature] : [];
              const signatures = [...previousSignatures, nextSignature];
              const signedByClient = signatures.some((entry) => entry.authenticatedRole === "client");
              const signedByProvider = signatures.some((entry) => entry.authenticatedRole === "provider" || entry.authenticatedRole === "owner");
              return {
                ...doc,
                status: signedByClient && signedByProvider ? "Signed by patient and provider" : signedByClient ? "Patient signed — provider review pending" : "Provider signed — patient signature pending",
                signature: nextSignature,
                signatures,
              };
            })()
          : doc
      )
    );
    appendAuditLog({ action: "Authenticated electronic signature applied", details: `${effectiveSignatureRole} signature applied by authenticated user ${signer} to document version ${documentVersionSha256}.`, clientId: selectedClientId, clientName: selectedClient?.profile?.fullName || "Client", category: "Document Signature" });
    setSignatureName(signer);
    try {
      await flushClientModuleSaves(selectedClientId);
      setDocumentNotice(`Authenticated ${effectiveSignatureRole.toLowerCase()} signature saved. Refresh Signed Documents to view your copy.`);
    } catch (error) {
      setDocumentNotice("Signature could not be saved. Please retry before leaving this page.");
    }
  };
  const uploadDocument = async () => {
    if (!selectedClientId || !uploadTitle.trim() || !uploadFile) {
      setDocumentNotice("Enter a document title and choose the file before uploading.");
      return;
    }
    setDocumentBusy(true);
    setDocumentNotice("Encrypting and uploading the document to AWS…");
    try {
      const authorization = await productionApi("/api/ehr/documents/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          documentType: uploadType,
          fileName: uploadFile.name,
          contentType: uploadFile.type || "application/octet-stream",
        }),
      });
      const uploadResponse = await fetch(authorization.uploadUrl, {
        method: "PUT",
        headers: authorization.uploadHeaders,
        body: uploadFile,
      });
      if (!uploadResponse.ok) throw new Error("The encrypted AWS file upload failed.");
      const uploadedAt = new Date().toISOString();
      updateSpecificUserData(selectedClientId, "documents", (prev) => [
        {
          id: authorization.documentId,
          title: uploadTitle.trim(),
          type: uploadType,
          status: "Uploaded",
          viewedAt: "",
          signature: null,
          uploadedFileName: uploadFile.name,
          contentType: uploadFile.type || "application/octet-stream",
          sizeBytes: uploadFile.size,
          storageKey: authorization.key,
          uploadedByRole: currentUser.role,
          clientVisible: currentUser.role === "client",
          createdAt: uploadedAt,
        },
        ...prev,
      ]);
      appendAuditLog({ action: "Uploaded encrypted chart document", details: `${uploadTitle.trim()} uploaded to private AWS storage as ${uploadFile.name}.`, clientId: selectedClientId, clientName: selectedClient?.profile?.fullName || "Client", category: "Document Upload" });
      setUploadTitle("");
      setUploadFile(null);
      setDocumentNotice("Encrypted document uploaded and saved to the client chart.");
    } catch (error) {
      setDocumentNotice(error instanceof Error ? error.message : "The document could not be uploaded.");
    } finally {
      setDocumentBusy(false);
    }
  };
  const viewDocument = async (doc) => {
    const documentWindow = doc.storageKey ? window.open("about:blank", "_blank") : null;
    if (documentWindow) {
      documentWindow.opener = null;
      documentWindow.document.title = "Opening encrypted document…";
      documentWindow.document.body.textContent = "Authorizing secure document access…";
    }
    if (doc.storageKey) {
      setDocumentBusy(true);
      setDocumentNotice("Authorizing private document access…");
      try {
        const result = await productionApi(`/api/ehr/documents/presign?clientId=${encodeURIComponent(selectedClientId)}&key=${encodeURIComponent(doc.storageKey)}`);
        if (documentWindow) {
          documentWindow.location.replace(result.downloadUrl);
        } else {
          window.location.assign(result.downloadUrl);
        }
        setDocumentNotice("Private document opened in a new tab.");
      } catch (error) {
        if (documentWindow) documentWindow.close();
        setDocumentNotice(error instanceof Error ? error.message : "The document could not be opened.");
        setDocumentBusy(false);
        return;
      }
      setDocumentBusy(false);
    }
    updateSpecificUserData(selectedClientId, "documents", (prev) =>
      prev.map((item) => (item.id === doc.id ? { ...item, viewedAt: new Date().toLocaleString() } : item))
    );
    appendAuditLog({ action: "Viewed document", details: `${doc.title} opened from chart library.`, clientId: selectedClientId, clientName: selectedClient?.profile?.fullName || "Client", category: "Document Access" });
  };
  const documentWorkflow = (doc) => {
    if (doc.storageKey) return { label: "Open encrypted file", type: "file" };
    if (doc.title === "Biopsychosocial Intake") return { label: "Open biopsychosocial intake", page: "intake" };
    if (doc.title === "Initial Progress Note Template") return { label: "Open progress-note form", page: "notes" };
    const assessmentTabs = {
      "PHQ-9 Depression Screening": "phq9",
      "GAD-7 Anxiety Screening": "gad7",
      "Suicide Risk Assessment": "suicide",
      "Substance Use / Drug Abuse Assessment": "substance",
      "Violence Risk Assessment": "violence",
      "Safety Plan": "safety",
      "Clinical Outcome Measures": "phq9",
    };
    if (assessmentTabs[doc.title]) return { label: `Open ${doc.title}`, page: "assessments", target: { tab: assessmentTabs[doc.title] } };
    if (doc.title === "Treatment Plan") return { label: "Open treatment-plan form", page: "plans" };
    if (doc.title === "Homework Handout") return { label: "Open homework assignment form", page: "homework" };
    if (doc.title.startsWith("Advocacy Letter Template")) return { label: "Open advocacy-letter builder", anchor: "advocacy-letter-builder" };
    return { label: "Review and sign this document", anchor: "document-signatures" };
  };
  const openDocumentWorkflow = (doc) => {
    const workflow = documentWorkflow(doc);
    if (workflow.type === "file") {
      void viewDocument(doc);
      return;
    }
    void viewDocument(doc);
    if (workflow.page) {
      setPage(workflow.page, workflow.target || null);
      return;
    }
    if (workflow.anchor === "document-signatures") setSignatureDocId(doc.id);
    if (workflow.anchor === "advocacy-letter-builder") setAdvocacyTemplateType(doc.title.split(" | ")[1] || "General Outside Resource Support");
    window.setTimeout(() => document.getElementById(workflow.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const saveAdvocacyLetter = () => {
    if (!selectedClientId || documentBusy) return;
    if (!advocacyDetails.recipient.trim() || !advocacyDetails.purpose.trim() || !advocacyDetails.limitations.trim() || !advocacyDetails.recommendations.trim()) {
      setDocumentNotice("Complete the recipient, purpose, clinical considerations, and requested action before saving the advocacy letter.");
      return;
    }
    setDocumentBusy(true);
    const generatedLetterText = buildAdvocacyLetterText();
    const title = `Advocacy Letter | ${advocacyTemplateType}`;
    updateSpecificUserData(selectedClientId, "documents", (prev) => [
      {
        id: `advocacy-${Date.now()}`,
        title,
        type: "Advocacy Letter",
        category: "Advocacy Letter",
        status: "Draft",
        viewedAt: "",
        signature: null,
        uploadedFileName: "",
        generatedLetterText,
        createdAt: new Date().toISOString(),
      },
      ...(prev || []),
    ]);
    appendAuditLog({ action: "Created advocacy letter draft", details: `${title} saved to the encrypted client chart for provider review.`, clientId: selectedClientId, clientName: selectedClient?.profile?.fullName || "Client", category: "Advocacy" });
    setDocumentNotice("Advocacy letter draft saved securely to the client chart.");
    window.setTimeout(() => setDocumentBusy(false), 1200);
  };
  const deleteIncompleteAdvocacyDraft = (doc) => {
    if (currentUser.role !== "provider" || doc.type !== "Advocacy Letter" || doc.status !== "Draft" || doc.signature) return;
    const confirmed = window.confirm(`Delete the incomplete unsigned draft "${doc.title}" from this client chart? The Audit Log will retain a record of the removal.`);
    if (!confirmed) return;
    updateSpecificUserData(selectedClientId, "documents", (prev) => (prev || []).filter((item) => item.id !== doc.id));
    appendAuditLog({ action: "Removed incomplete advocacy letter draft", details: `${doc.title} (${doc.createdAt}) was removed from the encrypted client chart as an incomplete duplicate.`, clientId: selectedClientId, clientName: selectedClient?.profile?.fullName || "Client", category: "Advocacy" });
    setDocumentNotice("The incomplete duplicate advocacy-letter draft was removed. The signed letter was not changed.");
  };
  return (
    <div>
      <SectionHeader title={libraryMode ? "Chart Document Library" : "Patient Intake & Consents"} description={libraryMode ? "Clinical documents, letters, and other chart records." : "Patient-completed intake and practice consent forms. This packet is separate from the clinical assessment and does not create a billing entry."} />
      <Button variant="outline" className="mb-4" onClick={() => { setLibraryMode(!libraryMode); setSignatureDocId(""); }}>{libraryMode ? "Return to Intake & Consents" : "Other chart documents"}</Button>
      {documentNotice && <div className="mb-4 rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-800">{documentNotice}</div>}
      {currentUser.role === "client" && <SignedDocuments clientId={selectedClientId} />}
      {currentUser.role === "client" && !libraryMode && (
        <Card className="mb-4 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Patient Intake</CardTitle>
            <CardDescription>Complete your information, then review and electronically sign the practice forms below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              {[ ["fullName", "Patient name"], ["dateOfBirth", "Date of birth"], ["contactEmail", "Contact email"], ["phone", "Phone number"], ["addressLine1", "Street address"], ["addressLine2", "Apartment / unit"], ["city", "City"], ["state", "State"], ["zipCode", "ZIP code"] ].map(([key, label]) => <Input key={key} label={label} type={key === "dateOfBirth" ? "date" : key === "contactEmail" ? "email" : "text"} disabled={documentBusy} value={patientIntakeDraft[key]} onChange={(event) => setPatientIntakeDraft({ ...patientIntakeDraft, [key]: event.target.value })} />)}
            </div>
            <Textarea label="Chief Complaint / Reason for Seeking Services" disabled={documentBusy} value={patientIntakeDraft.chiefComplaint} onChange={(event) => setPatientIntakeDraft({ ...patientIntakeDraft, chiefComplaint: event.target.value })} />
            <Button className="rounded-2xl" disabled={documentBusy} onClick={savePatientOnboarding}>{documentBusy ? "Saving…" : "Submit Intake to My Secure Chart"}</Button>
          </CardContent>
        </Card>
      )}
      <Card className="rounded-2xl shadow-sm mb-4">
        <CardContent className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          {currentUser.role === "provider" ? (
            <Select value={selectedClientId} onValueChange={(value) => { if (!documentBusy) setSelectedClientId(value); }}>
              <SelectTrigger className="rounded-2xl max-w-md"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map(([id, bucket]) => <SelectItem key={id} value={id}>{bucket.profile.fullName}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <p className="font-medium text-slate-900">{selectedClient?.profile?.fullName || currentUser.fullName}</p>
          )}
          {currentUser.role === "provider" && <Button className="rounded-2xl" disabled={documentBusy} onClick={addTemplateDocuments}>{libraryMode ? "Load clinical templates" : "Add practice consent forms"}</Button>}
        </CardContent>
      </Card>
      {currentUser.role === "provider" && !libraryMode && <Card className="mb-4"><CardHeader><CardTitle>Patient Intake</CardTitle><CardDescription>{selectedClient?.patientOnboarding?.patientSubmittedAt ? `Submitted ${new Date(selectedClient.patientOnboarding.patientSubmittedAt).toLocaleString()}` : "Awaiting patient submission"}</CardDescription></CardHeader><CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">{[["fullName", "Patient name"], ["dateOfBirth", "Date of birth"], ["contactEmail", "Contact email"], ["phone", "Phone number"], ["addressLine1", "Street address"], ["addressLine2", "Apartment / unit"], ["city", "City"], ["state", "State"], ["zipCode", "ZIP code"], ["chiefComplaint", "Chief complaint / reason for seeking services"]].map(([key, label]) => <div key={key}><p className="font-medium">{label}</p><p className="whitespace-pre-wrap">{selectedClient?.patientOnboarding?.[key] || "Not submitted"}</p></div>)}</div>
        <p>Patients complete this packet after signing into their secure portal. Use Client Management to add a patient or send their portal invitation.</p>
        <Button variant="outline" onClick={() => setPage("clients")}>Open patient invitations</Button>
      </CardContent></Card>}
      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader><CardTitle>{libraryMode ? "Chart documents" : "Practice consent forms"}</CardTitle><CardDescription>{libraryMode ? "Client-specific document set" : "Review and sign each applicable form"}</CardDescription></CardHeader>
          <CardContent className="space-y-3 max-h-[760px] overflow-auto">
            {visibleDocuments.length === 0 && <p className="text-sm text-slate-500">No client-authorized documents are available yet.</p>}
            {visibleDocuments.map((doc) => (
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
                  <p>Signature: {doc.signature ? `${doc.signature.role || "Signer"}: ${documentSignatureText(doc.signature)} | ${doc.signature.signedAt}` : "Not signed"}</p>
                  {(doc.signatures || []).map((entry) => <p key={`${entry.signerId}-${entry.authenticatedRole}`}>{entry.role}: {documentSignatureText(entry)} | {entry.signedAt}</p>)}
                  {doc.generatedLetterText && <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 whitespace-pre-line text-slate-600">{doc.generatedLetterText}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" className="rounded-2xl" onClick={() => openDocumentWorkflow(doc)}>{documentWorkflow(doc).label}</Button>
                  {currentUser.role === "provider" && doc.type === "Advocacy Letter" && doc.status === "Draft" && !doc.signature && (
                    <Button type="button" variant="destructive" className="rounded-2xl" onClick={() => deleteIncompleteAdvocacyDraft(doc)}>Delete incomplete draft</Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card id="document-signatures" className="rounded-2xl shadow-sm scroll-mt-4">
            <CardHeader><CardTitle>Electronic signatures</CardTitle><CardDescription>Authenticated signer identity, timestamp, and document-version fingerprint</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Select value={signatureDocId} onValueChange={setSignatureDocId}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select document to sign" /></SelectTrigger>
                <SelectContent>{visibleDocuments.map((doc) => <SelectItem key={doc.id} value={doc.id}>{doc.title}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={currentUser.role === "client" ? "Client" : signatureRole} onValueChange={(value) => { setSignatureRole(value); setSignatureName(currentUser?.fullName || PRACTITIONER_NAME); }}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currentUser.role === "provider" && <SelectItem value="Provider">Provider signature</SelectItem>}
                  {currentUser.role === "client" && <SelectItem value="Client">Client / patient signature</SelectItem>}
                </SelectContent>
              </Select>
              <Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Signer full name" />
              {currentUser.role === "provider" && <Input label="Provider NPI" value={providerNpiForName(currentUser.fullName || "")} readOnly placeholder="Provider NPI not configured" />}
              {currentUser.role === "provider" && <Input label="Provider license number" value={providerIdentifiersForName(currentUser.fullName || "").licenseNumber} readOnly placeholder="Provider license not configured" />}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">The signature uses the currently authenticated EHR identity. Providers sign from provider accounts; clients sign from their linked client accounts.</div>
              <Button className="rounded-2xl" disabled={documentBusy} onClick={signDocument}>Apply authenticated signature</Button>
            </CardContent>
          </Card>
          {libraryMode && <Card id="document-upload" className="rounded-2xl shadow-sm scroll-mt-4">
            <CardHeader><CardTitle>Document upload</CardTitle><CardDescription>Encrypted private AWS chart-document storage</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border-2 border-slate-800 bg-amber-50 p-4 space-y-2">
                <p className="font-bold text-slate-950">Step 1 — Enter document title</p>
                <Input aria-label="Document title" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Type the document title here" className="min-h-12 border-2 border-slate-950 bg-white text-base" />
              </div>
              <div className="rounded-2xl border-2 border-slate-800 bg-slate-50 p-4 space-y-2">
                <p className="font-bold text-slate-950">Step 2 — Select document type</p>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger className="min-h-12 rounded-xl border-2 border-slate-950 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Clinical Document">Clinical Document</SelectItem>
                    <SelectItem value="Assessment">Assessment</SelectItem>
                    <SelectItem value="Consent">Consent</SelectItem>
                    <SelectItem value="Signed Form">Signed Form</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-2xl border-2 border-slate-800 bg-slate-50 p-4 space-y-2">
                <p className="font-bold text-slate-950">Step 3 — Choose document file</p>
                <Input aria-label="Choose document file" type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="min-h-12 cursor-pointer border-2 border-slate-950 bg-white text-base" />
                <div className="font-medium text-slate-800">Selected file: {uploadFile?.name || "No file selected"}</div>
              </div>
              <Button className="min-h-12 w-full rounded-2xl text-base" disabled={documentBusy} onClick={uploadDocument}>{documentBusy ? "Working securely…" : "Upload encrypted document"}</Button>
            </CardContent>
          </Card>}
          {currentUser.role === "provider" && libraryMode && (
            <Card id="advocacy-letter-builder" className="rounded-2xl shadow-sm scroll-mt-4">
              <CardHeader><CardTitle>Advocacy-letter builder</CardTitle><CardDescription>Create a chart-linked draft for provider review and signature</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <Select value={advocacyTemplateType} onValueChange={setAdvocacyTemplateType}>
                  <SelectTrigger className="min-h-12 rounded-xl border-2 border-slate-800 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Human Resources / Leave">Human Resources / Leave</SelectItem>
                    <SelectItem value="Housing / Waiver / Benefits">Housing / Waiver / Benefits</SelectItem>
                    <SelectItem value="Care Coordination / Collaboration">Care Coordination / Collaboration</SelectItem>
                    <SelectItem value="General Outside Resource Support">General Outside Resource Support</SelectItem>
                  </SelectContent>
                </Select>
                <Input label="Recipient / agency / department" value={advocacyDetails.recipient} onChange={(event) => setAdvocacyDetails({ ...advocacyDetails, recipient: event.target.value })} />
                <Textarea label="Purpose of letter" value={advocacyDetails.purpose} onChange={(event) => setAdvocacyDetails({ ...advocacyDetails, purpose: event.target.value })} className="min-h-[90px]" />
                <Textarea label="Clinical or functional considerations" value={advocacyDetails.limitations} onChange={(event) => setAdvocacyDetails({ ...advocacyDetails, limitations: event.target.value })} className="min-h-[110px]" />
                <Textarea label="Recommended supports or requested action" value={advocacyDetails.recommendations} onChange={(event) => setAdvocacyDetails({ ...advocacyDetails, recommendations: event.target.value })} className="min-h-[110px]" />
                <Textarea label="Care coordination details" value={advocacyDetails.collaboration} onChange={(event) => setAdvocacyDetails({ ...advocacyDetails, collaboration: event.target.value })} className="min-h-[90px]" />
                <Button className="w-full rounded-2xl" disabled={documentBusy} onClick={saveAdvocacyLetter}>{documentBusy ? "Saving draft…" : "Save advocacy-letter draft to chart"}</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
export default function RevealingLeadsToHealingProductionEhr({ initialPage = "dashboard" }) {
  return (
    <div className="ehr-ui">
      <EhrScopedStyles />
      <ErrorBoundary>
      <AuthProvider>
        <PageProvider initialPage={initialPage}>
          <AppShell />
        </PageProvider>
      </AuthProvider>
      </ErrorBoundary>
    </div>
  );
}
