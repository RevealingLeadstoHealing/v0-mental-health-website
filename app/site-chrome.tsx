"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

export const EHR_LOGIN_URL = "https://ehr.revealing-leads-to-healing-wellness-services.org/login";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About Us" },
  { href: "/therapy-approach", label: "Therapy Approach" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="site-topbar">
        <div className="site-topbar-inner">
          <a href="/" className="topbar-brand">Revealing Leads to Healing Wellness Services, LLC</a>
          <button
            type="button"
            className="hamburger-btn"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {open ? (
        <div className="nav-overlay" role="dialog" aria-modal="true" aria-label="Site menu">
          <div className="nav-overlay-top">
            <button
              type="button"
              className="nav-overlay-close"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              &times;
            </button>
          </div>
          <nav aria-label="Primary">
            <ul className="nav-overlay-list">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={pathname === link.href ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </>
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
