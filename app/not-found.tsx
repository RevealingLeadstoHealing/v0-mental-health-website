import { SiteHeader, SiteFooter } from "./site-chrome";

export const metadata = { title: "Page Not Found | Revealing Leads to Healing Wellness Services, LLC" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <section className="section-shell intro">
        <h1>We Couldn&rsquo;t Find That Page</h1>
        <p>
          The page you&rsquo;re looking for may have moved, been renamed, or no longer exists. If you
          followed a link or bookmark to get here, it may be out of date &mdash; our website address
          changed as part of a recent upgrade.
        </p>
      </section>

      <section className="section-shell">
        <div className="content-card">
          <article>
            <h2>Here&rsquo;s How to Get Back on Track</h2>
            <p>
              Head back to our homepage, or reach out directly and we&rsquo;ll help you find what
              you&rsquo;re looking for.
            </p>
          </article>
        </div>
        <div className="actions" style={{ justifyContent: "center", gap: "1rem" }}>
          <a className="button" href="/">Return Home</a>
          <a className="button" href="/contact">Contact Us</a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
