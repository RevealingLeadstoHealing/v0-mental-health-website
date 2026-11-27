import { SiteHeader, SiteFooter } from "../site-chrome";

export const metadata = {
  title: "Therapy Approach | Revealing Leads to Healing Wellness Services, LLC",
};

export default function TherapyApproach() {
  return (
    <>
      <SiteHeader />

      <section className="section-shell">
        <div className="content-card">
          <article>
            <h2>Services &amp; Availability</h2>
            <p>
              Services are available for adolescents, adults, couples, and families through both
              in-person and telehealth sessions. Areas of support include anxiety, depression, trauma,
              life transitions, relationship concerns, substance use recovery support, identity
              exploration, emotional wellness, and personal growth. We strive to provide a safe,
              affirming, culturally responsive, and compassionate environment where healing and
              self-discovery can take place at your own pace.
            </p>
          </article>

          <article>
            <h2>Our Services</h2>
            <p>
              Individual therapy, couples counseling, family support services, trauma-informed care,
              anxiety and depression treatment, substance use recovery support, identity exploration,
              life transition support, and culturally responsive psychotherapy services are available
              based on client needs and clinical appropriateness.
            </p>
          </article>
        </div>
      </section>

      <section className="section-shell">
        <h2>Areas of Focus</h2>
        <div className="content-card">
          <article>
            <h3>Trauma &amp; PTSD Recovery</h3>
            <p>
              Specialized clinical care for individuals navigating trauma, profound grief, loss, and
              life transitions. Utilizing my credentials as a Certified Clinical Trauma Professional
              (CCTP), we work together to process past experiences and build a path toward lasting
              emotional freedom.
            </p>
          </article>
          <article>
            <h3>Addiction &amp; Substance Use Support</h3>
            <p>
              Master-level expertise (CASAC-M) in treating alcohol and substance use disorders. I
              provide a compassionate, non-judgmental space for individuals and families focusing on
              recovery, harm reduction, and co-occurring mental health challenges.
            </p>
          </article>
          <article>
            <h3>Integrative &amp; Evidence-Based Modalities</h3>
            <p>
              A holistic approach to healing that incorporates powerful, proven clinical interventions
              tailored to you. My practice actively integrates Eye Movement Desensitization and
              Reprocessing (EMDR), Dialectical Behavior Therapy (DBT), and Cognitive Behavioral Therapy
              (CBT) to treat the whole person.
            </p>
          </article>
          <article>
            <h3>Additional Areas of Focus</h3>
            <p>
              Somatic Therapy &middot; Geriatric Mental Health &middot; Sleep Disorders &middot; Dementia
              &amp; Alzheimer&rsquo;s Support &middot; Holistic &amp; Nutritional Wellness (training
              completed through PESI) &middot; Adolescent ADHD &middot; ABA (Applied Behavior Analysis)
              &middot; Dual Diagnosis
            </p>
          </article>
          <article>
            <p>Telehealth and in-person options.</p>
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
