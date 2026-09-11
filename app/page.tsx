import { SiteHeader, SiteFooter, EHR_LOGIN_URL } from "./site-chrome";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <div className="container">
        <section className="section" id="home">
          <h2>Your Path to Wellness Starts Here</h2>
          <p>
            At Revealing Leads to Healing Wellness Services, LLC, I believe that emotional wellness is
            a journey we navigate together. Whether you are seeking deep trauma processing, navigating
            the complexities of recovery, or looking to break through anxiety and grief, you deserve a
            space that respects your unique story.
          </p>
          <p>
            I don&rsquo;t believe in a one-size-fits-all approach to mental health. I blend advanced
            clinical specialties with holistic and spiritual guidance to treat the whole person, helping
            you address mental and behavioral health patterns directly at their root.
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

        <section className="section" id="about">
          <h2>Meet Kenseener &ldquo;Kay&rdquo; Carpenter, LCSW, CCTP, CGP, CASAC-M, SIFI</h2>
          <div className="portrait" style={{ float: "right", margin: "0 0 1rem 1.5rem", maxWidth: 260 }}>
            <img
              src="/kenseener-carpenter-headshot.jpg"
              alt="Kenseener &quot;Kay&quot; Carpenter, LCSW"
            />
          </div>
          <p>
            Kenseener is a highly skilled, compassionate, and culturally competent Licensed Clinical
            Social Worker based in Yonkers, New York. With a thriving private psychotherapy practice,
            Kay offers a range of counseling services tailored to meet the unique needs of her clients,
            working closely with teenagers, adults, couples, and families to foster growth, healing, and
            resilience.
          </p>
          <p>
            Kenseener specializes in guiding clients through a transformative journey of self-discovery
            and healing. By helping individuals pinpoint the origin of their suffering, uncover the
            beliefs formed during those experiences, and explore how these have shaped their lives, Kay
            fosters deeper understanding and personal growth in an empathetic, non-judgmental
            environment.
          </p>

          <h3>What to Expect in Our First Session</h3>
          <p>
            In our first session, you can expect an empathetic, welcoming, and non-judgmental space
            where your voice is heard and your story is honored. We will take time to discuss what
            brings you to therapy, explore your current needs and background, and answer any questions
            you have. Together, we will begin outlining a personalized, collaborative plan for your care
            so you leave feeling supported, understood, and clear about our next steps.
          </p>
        </section>

        <section className="section" id="approach">
          <h2>Therapy Approaches Tailored for Everyone</h2>
          <p>
            Our therapy approaches are highly adaptable, designed to meet the unique needs of people
            across all ages&mdash;whether you&rsquo;re an adolescent, adult, or senior. We are proud to
            support members of the LGBTQ+ community, ensuring a safe, affirming space for exploration,
            healing, and growth.
          </p>

          <h3>Areas of Focus</h3>
          <ul>
            <li>
              <strong>Trauma &amp; PTSD Recovery:</strong> Specialized clinical care utilizing
              credentials as a Certified Clinical Trauma Professional (CCTP) to process past experiences
              and build lasting emotional freedom.
            </li>
            <li>
              <strong>Addiction &amp; Substance Use Support:</strong> Master-level expertise (CASAC-M)
              in treating alcohol and substance use disorders, focusing on recovery, harm reduction,
              co-occurring conditions, and family recovery.
            </li>
            <li>
              <strong>Integrative &amp; Evidence-Based Modalities:</strong> Incorporating proven clinical
              interventions tailored to you, including Eye Movement Desensitization and Reprocessing
              (EMDR), Dialectical Behavior Therapy (DBT), Cognitive Behavioral Therapy (CBT), supportive
              psychotherapy, and mind-body wellness.
            </li>
          </ul>
        </section>

        <section className="section">
          <h2>Frequently Asked Questions</h2>
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
        </section>

        <section className="section">
          <h2>Services &amp; Availability</h2>
          <p>
            Services are available for adolescents, adults, couples, and families through both
            in-person and telehealth sessions. Areas of support include anxiety, depression, trauma,
            life transitions, relationship concerns, substance use recovery support, identity
            exploration, emotional wellness, and personal growth. We strive to provide a safe,
            affirming, culturally responsive, and compassionate environment where healing and
            self-discovery can take place at your own pace.
          </p>
          <h2>Our Services</h2>
          <p>
            Individual therapy, couples counseling, family support services, trauma-informed care,
            anxiety and depression treatment, substance use recovery support, identity exploration,
            life transition support, and culturally responsive psychotherapy services are available
            based on client needs and clinical appropriateness.
          </p>
          <div className="actions" style={{ justifyContent: "center" }}>
            <a className="button" href="/contact">Start Here</a>
            <a className="button button-light" href={EHR_LOGIN_URL} target="_blank" rel="noopener noreferrer">
              Existing Patient EHR Login
            </a>
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}
