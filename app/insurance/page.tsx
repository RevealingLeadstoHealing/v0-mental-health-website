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
            <h2>Insurance</h2>
            <p>
              We accept most major insurance plans. Please contact us to confirm your coverage before
              your first visit.
            </p>
          </article>

          <article>
            <h2>Self-Pay &amp; Sliding Scale</h2>
            <p>
              Self-pay and sliding-scale fees are available. Documentation (superbills) for
              out-of-network reimbursement is available upon request.
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
