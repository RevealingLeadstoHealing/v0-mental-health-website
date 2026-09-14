import { SiteHeader, SiteFooter } from "../site-chrome";

export const metadata = { title: "About Us | Revealing Leads to Healing Wellness Services, LLC" };

export default function AboutUs() {
  return (
    <>
      <SiteHeader />

      <section className="section-shell intro">
        <h1>Therapy Approaches Tailored for Everyone</h1>
        <p>
          At Revealing Leads to Healing Wellness Servicces, we believe in providing compassionate and
          personalized care for individuals from all walks of life. Our therapy approaches are
          highly adaptable, designed to meet the unique needs of people across all ages, whether
          you&rsquo;re a child, teenager, adult, or senior. We are proud to support members of the
          LGBTQ+ community, ensuring a safe, affirming, and nonjudgmental space for exploration,
          healing, and growth. Using evidence-based techniques, we address a wide range of concerns,
          including anxiety, depression, relationship challenges, identity exploration, trauma, and
          more. No matter who you are or what you&rsquo;re going through, we are here to guide you
          on your journey toward mental wellness and self-discovery.
        </p>
      </section>

      <section className="section-shell">
        <div className="content-card">
          <article className="portrait">
            <img className="headshot-photo" src="/kenseener-carpenter-headshot.jpg" alt="Kenseener Carpenter" />
          </article>

          <article>
            <h2>Meet Kenseener Carpenter, MA, LCSW, CCTP. CGP, CASAC-M, IFSP, CIMHP</h2>
            <p>
              Kenseener is a highly skilled and compassionate Licensed Social Worker based in Yonkers,
              New York. With a thriving private psychotherapy practice, Kay offers a range of counseling
              services tailored to meet the needs of her clients. She specializes in providing
              individual, marital, family, and group therapy, working closely with both adults and
              teenagers to foster growth, healing, and resilience. Whether you are navigating personal
              challenges or seeking support for your relationships, Kay&rsquo;s expertise ensures a safe
              and supportive environment where meaningful change can happen. At our office, we are
              dedicated to helping clients address their unique needs with a focus on personalized care
              and evidence-based techniques. Let us help you take the next step toward a more balanced
              and fulfilling life.
            </p>
          </article>

          <article>
            <h2>Compassionate Support for Healing and Growth</h2>
            <p>
              Kenseener specializes in guiding clients through a transformative journey of self-discovery
              and healing. By helping individuals pinpoint the origin of their suffering, uncover the
              beliefs and self-judgments formed during those experiences, and explore how these have
              shaped their lives, Kay fosters deeper understanding and personal growth. Through
              thoughtful and insightful questioning, coupled with active listening, Kay identifies core
              concerns and encourages healing in a compassionate and supportive environment. This
              approach empowers clients to move forward with clarity and confidence, creating space for
              meaningful change and a renewed sense of well-being.
            </p>
          </article>
        </div>
        <div className="actions">
          <a className="button" href="/contact">Get Started</a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
