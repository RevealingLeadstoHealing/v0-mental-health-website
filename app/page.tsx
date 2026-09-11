import { SiteHeader, SiteFooter, EHR_LOGIN_URL } from "./site-chrome";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <section className="section-shell intro">
        <h1>Your Path to Wellness Starts Here</h1>
        <p>
          At Revealing Leads to Healing Wellness Services, LLC, I believe that emotional wellness is
          a journey we navigate together. Whether you are seeking deep trauma processing, navigating
          the complexities of recovery, or looking to break through anxiety and grief, you deserve a
          space that respects your unique story.
        </p>
        <p>
          To ensure your care fits seamlessly into your life, I provide flexible options tailored to
          your comfort. You can choose to meet with me for dedicated, face-to-face sessions at my
          Yonkers office, or connect securely from anywhere across New York State through our premier
          Telehealth platform.
        </p>
        <p>
          Healing is entirely possible, and you do not have to take the first step alone. Let&rsquo;s
          work together to build the resilience, coping strategies, and insights necessary to reclaim
          your life.
        </p>
      </section>

      <section className="section-shell">
        <div className="content-card">
          <article>
            <h2>Therapy Approaches Tailored for Everyone</h2>
            <p>
              At Revealing Leads to Healing Wellness Services, we believe in providing compassionate
              and personalized care for individuals from all walks of life. Our therapy approaches are
              highly adaptable, designed to meet the unique needs of people across all ages, whether
              you&rsquo;re a child, teenager, adult, or senior. We are proud to support members of the
              LGBTQ+ community, ensuring a safe, affirming, and nonjudgmental space for exploration,
              healing, and growth. Using evidence-based techniques, we address a wide range of
              concerns, including anxiety, depression, relationship challenges, identity exploration,
              trauma, and more. No matter who you are or what you&rsquo;re going through, we are here
              to guide you on your journey toward mental wellness and self-discovery.
            </p>
          </article>

          <article className="portrait">
            <img
              src="/kenseener-carpenter-headshot.jpg"
              alt="Kenseener &quot;Kay&quot; Carpenter, LCSW"
            />
          </article>

          <article>
            <h2>Meet Kenseener &ldquo;Kay&rdquo; Carpenter, MA, LCSW, CCTP, CGP, CASAC-M, SIFI</h2>
            <p>
              Kenseener is a highly skilled and compassionate Licensed Clinical Social Worker based in
              Yonkers, New York. Fully licensed and certified across several clinical areas and
              modalities, with international credentials, master-level supervisory certification
              (CASAC-M), and SIFI certification. With a thriving private psychotherapy practice, Kay
              offers a range of counseling services tailored to meet the needs of her clients. She
              specializes in providing individual, marital, family, and group therapy, working closely
              with both adults and teenagers to foster growth, healing, and resilience. Whether you
              are navigating personal challenges or seeking support for your relationships, Kay&rsquo;s
              expertise ensures a safe and supportive environment where meaningful change can happen.
              At our office, we are dedicated to helping clients address their unique needs with a
              focus on personalized care and evidence-based techniques. Let us help you take the next
              step toward a more balanced and fulfilling life.
            </p>
          </article>

          <article>
            <h2>Compassionate Support for Healing and Growth</h2>
            <p>
              Kenseener specializes in guiding clients through a transformative journey of
              self-discovery and healing. By helping individuals pinpoint the origin of their
              suffering, uncover the beliefs and self-judgments formed during those experiences, and
              explore how these have shaped their lives, Kay fosters deeper understanding and personal
              growth. Through thoughtful and insightful questioning, coupled with active listening, Kay
              identifies core concerns and encourages healing in a compassionate and supportive
              environment. This approach empowers clients to move forward with clarity and confidence,
              creating space for meaningful change and a renewed sense of well-being.
            </p>
          </article>
        </div>
      </section>

      <section className="section-shell">
        <div className="content-card">
          <details open>
            <summary>How do I schedule a consultation or appointment?</summary>
            <p>
              Use the contact form to submit an inquiry for services. You may also call for additional
              information regarding availability, consultation requests, and scheduling options.
              Responses are typically returned within 24&ndash;48 business hours.
            </p>
          </details>
          <details>
            <summary>Do you offer telehealth services?</summary>
            <p>
              Yes. Telehealth services are available for eligible clients throughout New York State.
              In-person availability may be limited and discussed during consultation.
            </p>
          </details>
        </div>
      </section>

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
        <div className="actions" style={{ justifyContent: "center" }}>
          <a className="button" href="/contact">Start Here</a>
          <a className="button button-light" href={EHR_LOGIN_URL} target="_blank" rel="noopener noreferrer">
            Existing Patient EHR Login
          </a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
