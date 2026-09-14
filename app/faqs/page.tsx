import { SiteHeader, SiteFooter } from "../site-chrome";

export const metadata = { title: "FAQs | Revealing Leads to Healing Wellness Services, LLC" };

export default function Faqs() {
  return (
    <>
      <SiteHeader />

      <section className="section-shell">
        <div className="content-card">
          <article>
            <h2>FAQ</h2>
            <p><strong>How do I schedule a consultation or appointment?</strong></p>
            <p>
              Use the contact form to submit an inquiry for services. You may also call for additional
              information regarding availability, consultation requests, and scheduling options.
              Responses are typically returned within 24&ndash;48 business hours.
            </p>
            <p><strong>Do you offer telehealth services?</strong></p>
            <p>
              Yes. Telehealth services are available for eligible clients throughout New York State.
              In-person availability may be limited and discussed during consultation.
            </p>
          </article>
        </div>
        <div className="actions" style={{ justifyContent: "center" }}>
          <a className="button" href="/contact">Schedule Now</a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
