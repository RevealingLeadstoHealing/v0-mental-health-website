import Link from "next/link";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About Us" },
  { href: "/therapy-approach", label: "Therapy Approach" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "EHR Login" },
];

export function PublicSiteShell({
  active,
  children,
}: Readonly<{
  active: string;
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          Revealing Leads to Healing
          <span>Wellness Services, LLC</span>
        </Link>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active === item.label ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>© 2024–2026 Revealing Leads to Healing Wellness Services, LLC</p>
      </footer>
    </>
  );
}
