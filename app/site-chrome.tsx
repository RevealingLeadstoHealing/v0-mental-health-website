export const EHR_LOGIN_URL = "https://ehr.revealing-leads-to-healing-wellness-services.org/login";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About Us" },
  { href: "/therapy-approach", label: "Therapy Approach" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a href="/" className="brand-link">
          <img src="/rlth-logo.png" alt="Revealing Leads to Healing Wellness Services, LLC logo" className="brand-logo" />
          <span className="brand-text">Revealing Leads to Healing Wellness Services, LLC</span>
        </a>
        <nav aria-label="Primary">
          <ul className="nav-list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
            <li>
              <a href={EHR_LOGIN_URL} target="_blank" rel="noopener noreferrer" className="nav-ehr-link">
                Existing Patient EHR Login
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="footer-title">Revealing Leads to Healing Wellness Services, LLC</p>
        <p>Office: 119 DeHaven Dr, Yonkers, NY 10703</p>
        <p>Phone: (914) 635-2687 &middot; Fax: (914) 371-3845</p>
        <p>Email: info@revealing-leads-to-healing-wellness-services.org</p>
        <p>In-Person Sessions in Yonkers &amp; Secure Telehealth Services across New York State.</p>
        <p className="footer-copyright">&copy; 2024&ndash;2026 Revealing Leads to Healing Wellness Services, LLC</p>
      </div>
    </footer>
  );
}
