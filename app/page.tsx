import Image from "next/image";
import { getSiteContent } from "../lib/ehr/content-store";

export const revalidate = 60;

export default async function Home() {
  const c = await getSiteContent();

  return (
    <>
      {/* ── HEADER ── */}
      <header className="site-header">
        <a href="/" className="brand">
          {c.siteTitle}
        </a>
        <nav>
          <a href="#home">Home</a>
          <a href="#about-us">About Us</a>
          <a href="#our-services">Our Services</a>
          <a href="#faqs">FAQs</a>
          <a href="#contact">Contact</a>
          <a href="/login">EHR Login</a>
        </nav>
      </header>

      {/* ── HERO BANNER ── */}
      <section id="home" className="section-shell intro">
        <div className="content-card">
          <h1>{c.heroHeading}</h1>
          <p>{c.heroParagraph1}</p>
          <p>{c.heroParagraph2}</p>
          <p>{c.heroParagraph3}</p>
          <div className="actions">
            <a href={c.heroCtaHref} className="button">{c.heroCtaText}</a>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <main>

        {/* Therapy Approaches */}
        <div className="section-shell">
          <div className="content-card">
            <h2>{c.therapyHeading}</h2>
            <p>{c.therapyDescription}</p>
          </div>
        </div>

        {/* About */}
        <div id="about-us" className="section-shell">
          <div className="content-card">
            <h2>{c.aboutHeading}</h2>
            <div className="portrait">
              <Image
                src="/kenseener-carpenter-headshot.jpg"
                alt="Kenseener Carpenter"
                width={480}
                height={600}
                style={{ width: "min(100%, 480px)", height: "auto" }}
                priority
              />
            </div>
            <p>{c.aboutBio}</p>
            <p>{c.aboutDetails}</p>
          </div>
        </div>

        {/* Services & Availability */}
        <div id="our-services" className="section-shell">
          <div className="content-card">
            <h2>{c.servicesHeading}</h2>
            <p>{c.servicesDescription}</p>
            <p>{c.servicesSummary}</p>
            {c.serviceItems.map((svc, i) => (
              <article key={i}>
                <h3>{svc.title}</h3>
                <p>{svc.description}</p>
              </article>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div id="faqs" className="section-shell">
          <div className="content-card">
            <h2>{c.faqHeading}</h2>
            {c.faqItems.map((item, i) => (
              <details key={i}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="section-shell">
          <div className="testimonials">
            <h2>{c.testimonialHeading}</h2>
            {c.testimonials.map((t, i) => (
              <blockquote key={i}>
                <p>&ldquo;{t.quote}&rdquo;</p>
              </blockquote>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div id="contact" className="section-shell">
          <div className="content-card">
            <h2>{c.contactHeading}</h2>
            <ul>
              <li><strong>Business:</strong> {c.businessName}</li>
              <li><strong>Office Location:</strong> {c.officeAddress}</li>
              <li>
                <strong>Phone:</strong>{" "}
                <a href={`tel:${c.phone.replace(/\D/g, "")}`}>{c.phone}</a>
              </li>
              {c.fax && (
                <li><strong>Fax:</strong> {c.fax}</li>
              )}
              <li>
                <strong>Email:</strong>{" "}
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </li>
              <li><strong>Availability:</strong> {c.availability}</li>
            </ul>
          </div>
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer>
        <p>{c.footerText}</p>
        <p>
          <a href="/admin" style={{ fontSize: "0.75rem", opacity: 0.6 }}>Site Admin</a>
        </p>
      </footer>
    </>
  );
}

