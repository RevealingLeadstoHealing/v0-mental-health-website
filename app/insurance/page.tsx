import { SiteHeader, SiteFooter, EHR_LOGIN_URL } from "../site-chrome";

export const metadata = { title: "Insurance | Revealing Leads to Healing Wellness Services, LLC" };

export default function Insurance() {
  return (
    <>
      <SiteHeader />

      <section className="section-shell intro">
        <h1>Insurance &amp; Payment Options</h1>
        <p>
          We believe transparent communication regarding fees and insurance is essential to a
          positive care experience.
        </p>
      </section>

      <section className="section-shell">
        <div className="content-card">
          <article>
            <h2>Currently Active In-Network Plans</h2>
            <ul>
              <li>Carelon Behavioral Health</li>
              <li>Anthem Blue Cross and Blue Shield New York (formerly Empire)</li>
              <li>Cigna</li>
              <li>Aetna</li>
            </ul>
          </article>

          <article>
            <h2>Pending &amp; Upcoming In-Network Coverage</h2>
            <p>
              We are actively onboarding with additional major networks&mdash;including Optum
              (UnitedHealthcare, Oxford, Oscar) and Medicare Advantage. If your network is not listed
              above, please feel free to inquire about the timeline for your plan.
            </p>
          </article>

          <article>
            <h2>Private Pay &amp; Out-of-Network</h2>
            <p>
              Self-pay options and documentation (superbills) for out-of-network reimbursement are
              available upon request.
            </p>
          </article>
        </div>
        <div className="actions">
          <a className="button" href="/contact">Ask About Coverage</a>
          <a className="button button-light" href={EHR_LOGIN_URL} target="_blank" rel="noopener noreferrer">
            Existing Patient EHR Login
          </a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
