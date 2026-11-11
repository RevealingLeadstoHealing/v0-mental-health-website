import { SiteHeaderBar } from "./site-nav";

// Shared site header and footer.
// Look matches the owner's original Webador site (Dec 2024): site name and a
// plain, always-visible menu in white over a full-width banner with the round
// RLTH logo centered. Colors and fonts are in globals.css. Page content
// (credentials, footer contact details, etc.) stays as the owner last updated it.

// The EHR lives on its own secured subdomain (patient portal).
export const EHR_LOGIN_URL = "https://ehr.revealing-leads-to-healing-wellness-services.org/ehr";

export const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About Us" },
  { href: "/therapy-approach", label: "Therapy Approach" },
  { href: "/insurance", label: "Insurance" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <SiteHeaderBar links={NAV_LINKS} loginUrl={EHR_LOGIN_URL} />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="footer-title">Revealing Leads to Healing Wellness Services, LLC</p>
        <p>Office Location: 119 DeHaven Dr, Yonkers, NY 10703</p>
        <p>Phone: (914) 635-2687 &middot; Fax: (914) 371-3845</p>
        <p>Other business contact numbers: (914) 969-3292 &middot; (410) 965-1234</p>
        {/* Webador mailbox — subscription ends 2026-12-16; remove this address then. */}
        <p>Primary email: connect@rlth.org &middot; Secondary email: info@revealing-leads-to-healing-wellness-services.org</p>
        <p>Availability: In-Person Sessions in Yonkers &amp; Secure Telehealth Services for clients in states where Kenseener is licensed.</p>
      </div>
      <div className="footer-strip">
        <p className="footer-copyright">&copy; 2024&ndash;2026 Revealing Leads to Healing Wellness Services, LLC</p>
      </div>
    </footer>
  );
}
