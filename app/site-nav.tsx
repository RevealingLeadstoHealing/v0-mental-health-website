"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Header bar: site name + menu. Fixed at the top like the original Webador site:
// clear over the logo banner, grey (#737373) once the page is scrolled.
// The current page's menu item is outlined.
export function SiteHeaderBar({ links, loginUrl }: { links: Array<{ href: string; label: string }>; loginUrl: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={scrolled ? "header-bar is-scrolled" : "header-bar"}>
      <Link href="/" className="brand">
        Revealing Leads to Healing <span>Wellness Services, LLC</span>
      </Link>
      <nav aria-label="Primary">
        {links.map((link) => (
          <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
            {link.label}
          </Link>
        ))}
        <a href={loginUrl} target="_blank" rel="noopener noreferrer">
          Client &amp; Provider Login
        </a>
      </nav>
    </div>
  );
}
