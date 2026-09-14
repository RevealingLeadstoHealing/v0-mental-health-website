import Link from "next/link";

// Shared site header (logo + brand + navigation) and footer.
// Brand and colors: champagne gold (#EBC94E), charcoal (#3A3A3A), white,
// black; fonts Bevan + Montserrat. See BRAND.md and globals.css.
//
// The header/nav below matches the owner's actual original code (GitHub
// main branch, commit b25cadd, Sept 11 2026): a plain, always-visible row
// of nav links — no hamburger icon, no hidden overlay menu. Page content
// (credentials, Areas of Focus, footer contact details, etc.) is left as
// the owner's own later, explicitly-confirmed corrections — this file only
// changes the header/nav/visual treatment, not that content.

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
      <Link href="/" className="brand">
        Revealing Leads to Healing
        <span>Wellness Services, LLC</span>
      </Link>
      <nav aria-label="Primary">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <a href={EHR_LOGIN_URL} target="_blank" rel="noopener noreferrer">
          Client &amp; Provider Login
        </a>
      </nav>
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
        <p>Email: connect@rlth.org &middot; Info@revealing-leads-to-healing-wellness-services.org</p>
        <p>Availability: In-Person Sessions in Yonkers &amp; Secure Telehealth Services across New York State.</p>
        <p className="footer-copyright">&copy; 2024&ndash;2026 Revealing Leads to Healing Wellness Services, LLC</p>
      </div>
    </footer>
  );
}
