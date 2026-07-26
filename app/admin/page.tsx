"use client";

import { useEffect, useState, useCallback } from "react";
import type { SiteContent, FaqItem, ServiceItem, TestimonialItem } from "../../lib/site-content";

type SessionUser = { id: string; email: string; fullName: string; role: string };

const FIELD_STYLE: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "2px solid #202020",
  background: "#fff",
  fontFamily: "inherit",
  fontSize: "0.95rem",
  boxSizing: "border-box",
  marginBottom: "0.25rem",
};

const TEXTAREA_STYLE: React.CSSProperties = {
  ...FIELD_STYLE,
  minHeight: "6rem",
  resize: "vertical",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontWeight: 700,
  fontSize: "0.85rem",
  marginBottom: "0.25rem",
  marginTop: "1rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const SECTION_STYLE: React.CSSProperties = {
  border: "3px solid #202020",
  background: "#fff",
  padding: "1.5rem",
  marginBottom: "2rem",
};

const BTN: React.CSSProperties = {
  display: "inline-block",
  padding: "0.72rem 1.5rem",
  border: "2px solid #202020",
  background: "#202020",
  color: "#fff",
  fontWeight: 700,
  fontFamily: "inherit",
  fontSize: "1rem",
  cursor: "pointer",
  textTransform: "uppercase",
};

const BTN_DANGER: React.CSSProperties = {
  ...BTN,
  background: "#b00020",
  border: "2px solid #b00020",
  padding: "0.4rem 0.8rem",
  fontSize: "0.8rem",
};

const BTN_LIGHT: React.CSSProperties = {
  ...BTN,
  background: "#fff",
  color: "#202020",
};

function TextField({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <div>
      <label style={LABEL_STYLE}>{label}</label>
      {textarea ? (
        <textarea
          style={TEXTAREA_STYLE}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          style={FIELD_STYLE}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/ehr/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user?.role === "owner") {
          setUser(data.user);
          return fetch("/api/admin/content").then((r) => r.json());
        }
        setAuthChecked(true);
        return null;
      })
      .then((data) => {
        if (data) setContent(data);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const update = useCallback(<K extends keyof SiteContent>(key: K, value: SiteContent[K]) => {
    setContent((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const updateServiceItem = (index: number, field: keyof ServiceItem, value: string) => {
    if (!content) return;
    const updated = content.serviceItems.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    update("serviceItems", updated);
  };

  const addServiceItem = () => {
    if (!content) return;
    update("serviceItems", [...content.serviceItems, { title: "", description: "" }]);
  };

  const removeServiceItem = (index: number) => {
    if (!content) return;
    update(
      "serviceItems",
      content.serviceItems.filter((_, i) => i !== index)
    );
  };

  const updateFaqItem = (index: number, field: keyof FaqItem, value: string) => {
    if (!content) return;
    const updated = content.faqItems.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    update("faqItems", updated);
  };

  const addFaqItem = () => {
    if (!content) return;
    update("faqItems", [...content.faqItems, { question: "", answer: "" }]);
  };

  const removeFaqItem = (index: number) => {
    if (!content) return;
    update(
      "faqItems",
      content.faqItems.filter((_, i) => i !== index)
    );
  };

  const updateTestimonial = (index: number, value: string) => {
    if (!content) return;
    const updated = content.testimonials.map((item, i) =>
      i === index ? { quote: value } : item
    );
    update("testimonials", updated);
  };

  const addTestimonial = () => {
    if (!content) return;
    update("testimonials", [...content.testimonials, { quote: "" }]);
  };

  const removeTestimonial = (index: number) => {
    if (!content) return;
    update(
      "testimonials",
      content.testimonials.filter((_, i) => i !== index)
    );
  };

  const handleSave = async () => {
    if (!content) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(content),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage("Content saved! The website will reflect your changes shortly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <p>Checking authentication…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: "3rem", maxWidth: 480, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Bevan, Georgia, serif" }}>Site Admin</h1>
        <p>You must be signed in as an <strong>owner</strong> to access this page.</p>
        <a href="/login" style={BTN}>Go to Login</a>
      </div>
    );
  }

  if (!content) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <p>Loading content…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem", fontFamily: "Montserrat, Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontFamily: "Bevan, Georgia, serif", margin: 0 }}>Website Content Editor</h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
            Signed in as <strong>{user.fullName || user.email}</strong> ({user.role})
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="/" style={BTN_LIGHT}>View Site</a>
          <button style={BTN} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save All Changes"}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: "1rem", background: "#d4edda", border: "2px solid #155724", color: "#155724", marginBottom: "1.5rem" }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ padding: "1rem", background: "#f8d7da", border: "2px solid #721c24", color: "#721c24", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {/* ── Site Meta ── */}
      <section style={SECTION_STYLE}>
        <h2 style={{ marginTop: 0, fontFamily: "Bevan, Georgia, serif" }}>Site Settings</h2>
        <TextField label="Site Title" value={content.siteTitle} onChange={(v) => update("siteTitle", v)} />
        <TextField label="Meta Description (SEO)" value={content.metaDescription} onChange={(v) => update("metaDescription", v)} textarea />
        <TextField label="Footer Text" value={content.footerText} onChange={(v) => update("footerText", v)} />
      </section>

      {/* ── Hero / Banner ── */}
      <section style={SECTION_STYLE}>
        <h2 style={{ marginTop: 0, fontFamily: "Bevan, Georgia, serif" }}>Hero / Banner Section</h2>
        <TextField label="Main Heading" value={content.heroHeading} onChange={(v) => update("heroHeading", v)} />
        <TextField label="Paragraph 1" value={content.heroParagraph1} onChange={(v) => update("heroParagraph1", v)} textarea />
        <TextField label="Paragraph 2" value={content.heroParagraph2} onChange={(v) => update("heroParagraph2", v)} textarea />
        <TextField label="Paragraph 3" value={content.heroParagraph3} onChange={(v) => update("heroParagraph3", v)} textarea />
        <TextField label="Call-to-Action Button Text" value={content.heroCtaText} onChange={(v) => update("heroCtaText", v)} />
        <TextField label="Call-to-Action Button Link (URL or mailto:)" value={content.heroCtaHref} onChange={(v) => update("heroCtaHref", v)} />
      </section>

      {/* ── Therapy Approaches ── */}
      <section style={SECTION_STYLE}>
        <h2 style={{ marginTop: 0, fontFamily: "Bevan, Georgia, serif" }}>Therapy Approaches Section</h2>
        <TextField label="Heading" value={content.therapyHeading} onChange={(v) => update("therapyHeading", v)} />
        <TextField label="Description" value={content.therapyDescription} onChange={(v) => update("therapyDescription", v)} textarea />
      </section>

      {/* ── About ── */}
      <section style={SECTION_STYLE}>
        <h2 style={{ marginTop: 0, fontFamily: "Bevan, Georgia, serif" }}>About the Therapist</h2>
        <TextField label="Section Heading" value={content.aboutHeading} onChange={(v) => update("aboutHeading", v)} />
        <TextField label="Bio Paragraph" value={content.aboutBio} onChange={(v) => update("aboutBio", v)} textarea />
        <TextField label="Additional Details" value={content.aboutDetails} onChange={(v) => update("aboutDetails", v)} textarea />
      </section>

      {/* ── Services ── */}
      <section style={SECTION_STYLE}>
        <h2 style={{ marginTop: 0, fontFamily: "Bevan, Georgia, serif" }}>Services Section</h2>
        <TextField label="Section Heading" value={content.servicesHeading} onChange={(v) => update("servicesHeading", v)} />
        <TextField label="Section Description" value={content.servicesDescription} onChange={(v) => update("servicesDescription", v)} textarea />
        <TextField label="Services Summary" value={content.servicesSummary} onChange={(v) => update("servicesSummary", v)} textarea />

        <h3 style={{ fontFamily: "Bevan, Georgia, serif", marginTop: "1.5rem" }}>Service Items</h3>
        {content.serviceItems.map((svc, i) => (
          <div key={i} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem", background: "#fafafa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Service {i + 1}</strong>
              <button style={BTN_DANGER} onClick={() => removeServiceItem(i)}>Remove</button>
            </div>
            <TextField label="Title" value={svc.title} onChange={(v) => updateServiceItem(i, "title", v)} />
            <TextField label="Description" value={svc.description} onChange={(v) => updateServiceItem(i, "description", v)} textarea />
          </div>
        ))}
        <button style={BTN_LIGHT} onClick={addServiceItem}>+ Add Service</button>
      </section>

      {/* ── FAQ ── */}
      <section style={SECTION_STYLE}>
        <h2 style={{ marginTop: 0, fontFamily: "Bevan, Georgia, serif" }}>FAQ Section</h2>
        <TextField label="Section Heading" value={content.faqHeading} onChange={(v) => update("faqHeading", v)} />

        {content.faqItems.map((item, i) => (
          <div key={i} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem", background: "#fafafa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>FAQ {i + 1}</strong>
              <button style={BTN_DANGER} onClick={() => removeFaqItem(i)}>Remove</button>
            </div>
            <TextField label="Question" value={item.question} onChange={(v) => updateFaqItem(i, "question", v)} />
            <TextField label="Answer" value={item.answer} onChange={(v) => updateFaqItem(i, "answer", v)} textarea />
          </div>
        ))}
        <button style={BTN_LIGHT} onClick={addFaqItem}>+ Add FAQ</button>
      </section>

      {/* ── Testimonials ── */}
      <section style={SECTION_STYLE}>
        <h2 style={{ marginTop: 0, fontFamily: "Bevan, Georgia, serif" }}>Testimonials</h2>
        <TextField label="Section Heading" value={content.testimonialHeading} onChange={(v) => update("testimonialHeading", v)} />

        {content.testimonials.map((t: TestimonialItem, i: number) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <textarea
              style={{ ...TEXTAREA_STYLE, minHeight: "3.5rem", flex: 1 }}
              value={t.quote}
              onChange={(e) => updateTestimonial(i, e.target.value)}
              placeholder="Client quote…"
            />
            <button style={BTN_DANGER} onClick={() => removeTestimonial(i)}>✕</button>
          </div>
        ))}
        <button style={BTN_LIGHT} onClick={addTestimonial}>+ Add Testimonial</button>
      </section>

      {/* ── Contact Info ── */}
      <section style={SECTION_STYLE}>
        <h2 style={{ marginTop: 0, fontFamily: "Bevan, Georgia, serif" }}>Contact Information</h2>
        <TextField label="Section Heading" value={content.contactHeading} onChange={(v) => update("contactHeading", v)} />
        <TextField label="Business Name" value={content.businessName} onChange={(v) => update("businessName", v)} />
        <TextField label="Office Address" value={content.officeAddress} onChange={(v) => update("officeAddress", v)} />
        <TextField label="Phone Number" value={content.phone} onChange={(v) => update("phone", v)} />
        <TextField label="Fax Number" value={content.fax} onChange={(v) => update("fax", v)} />
        <TextField label="Email Address" value={content.email} onChange={(v) => update("email", v)} />
        <TextField label="Availability Note" value={content.availability} onChange={(v) => update("availability", v)} textarea />
      </section>

      {/* ── Save Button (bottom) ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "1rem" }}>
        <a href="/" style={BTN_LIGHT}>View Site</a>
        <button style={BTN} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save All Changes"}
        </button>
      </div>
      {message && (
        <div style={{ padding: "1rem", background: "#d4edda", border: "2px solid #155724", color: "#155724", marginTop: "1rem" }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ padding: "1rem", background: "#f8d7da", border: "2px solid #721c24", color: "#721c24", marginTop: "1rem" }}>
          {error}
        </div>
      )}
    </div>
  );
}
