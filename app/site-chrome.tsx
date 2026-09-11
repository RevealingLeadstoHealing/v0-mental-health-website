import Link from "next/link";

// Shared site header (logo + brand + navigation) and footer.
// Brand and colors are defined in globals.css and BRAND.md — champagne gold
// (#EBC94E), charcoal (#3A3A3A), white, black; fonts Bevan + Montserrat.

// The EHR lives on its own secured subdomain (patient portal).
export const EHR_LOGIN_URL = "https://ehr.revealing-leads-to-healing-wellness-services.org/login";

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About Us" },
  { href: "/therapy-approach", label: "Therapy Approach" },
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
          Existing Patient EHR Login
        </a>
        <form action="/search" method="get" role="search" className="nav-search">
          <input type="text" name="q" aria-label="Search" placeholder="Search…" />
          <button type="submit" aria-label="Search">&#9906;</button>
        </form>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <p>&copy; 2024 - 2026 Revealing Leads to Healing Wellness Services, LLC</p>
      <p>119 DeHaven Dr, Yonkers, NY 10703 &middot; (914) 635-2687 &middot; Fax (914) 371-3845</p>
    </footer>
  );
}
