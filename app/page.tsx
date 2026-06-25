const practiceName = "Revealing Leads to Healing Wellness Services, LLC";

export default function Home() {
  return (
    <>
      <header className="rlth-header">
        <a href="/" className="rlth-practice-name">
          {practiceName}
        </a>
        <div className="rlth-logo-space">
          <img
            src="/logo.png"
            alt="Revealing Leads to Healing Wellness Services logo"
            className="rlth-logo"
          />
        </div>
        <nav className="rlth-nav" aria-label="Primary navigation">
          <a href="#home">Home</a>
          <a href="#about">About Us</a>
          <a href="#approach">Therapy Approach</a>
          <a href="#faqs">FAQs</a>
          <a href="#contact">Contact</a>
          <a href="/ehr?role=client">Patient Access</a>
          <a href="/ehr?role=provider">Provider Access</a>
        </nav>
      </header>

      <main id="home" className="rlth-page">
        <section className="rlth-hero" aria-label={practiceName}>
          <div className="rlth-hero-logo">
            <img src="/logo.png" alt="" />
          </div>
        </section>

        <section id="about" className="rlth-section rlth-white">
          <h1>Meet Kenseener &quot;Kay&quot; Carpenter, MA, LCSW, CASAC-M</h1>
          <p className="rlth-lead">
            Dedicated Psychotherapist, Trauma Specialist, and Practice Founder.
          </p>
          <p>
            Welcome to Revealing Leads to Healing Wellness Services, LLC. I am
            Kenseener &quot;Kay&quot; Carpenter, a licensed clinical social worker and
            credentialed master-level substance use counselor with over a decade
            of dedicated experience in the mental health field.
          </p>
          <p>
            My work is rooted in trauma recovery, mental health, addiction
            support, complex grief, loss, anxiety, and major life transitions.
          </p>
        </section>

        <section id="approach" className="rlth-section rlth-charcoal">
          <h2>An Integrative, Holistic Path to Healing</h2>
          <p>
            True healing requires looking at the whole person: mind, body, and
            spirit. Care is warm, person-centered, trauma-informed, and paced
            around your readiness.
          </p>
          <div className="rlth-service-list">
            <article>
              <h3>Trauma &amp; PTSD Recovery</h3>
              <p>
                Specialized clinical care for individuals navigating trauma,
                profound grief, loss, and life transitions.
              </p>
            </article>
            <article>
              <h3>Addiction &amp; Substance Use Support</h3>
              <p>
                Master-level CASAC-M expertise for alcohol and substance use
                disorders, recovery support, harm reduction, and co-occurring
                mental health challenges.
              </p>
            </article>
            <article>
              <h3>EMDR, DBT &amp; CBT</h3>
              <p>
                Evidence-based interventions are integrated into a holistic
                clinical plan tailored to the whole person.
              </p>
            </article>
          </div>
        </section>

        <section id="faqs" className="rlth-section rlth-gold">
          <h2>Frequently Asked Questions</h2>
          <details>
            <summary>What session formats do you offer?</summary>
            <p>
              In-person sessions are available in Yonkers, New York, with secure
              telehealth across New York State.
            </p>
          </details>
          <details>
            <summary>How do I access the secure portal?</summary>
            <p>
              Patients receive portal access after login credentials are issued.
              Providers use a separate secured provider access point.
            </p>
          </details>
        </section>

        <section id="contact" className="rlth-section rlth-white">
          <h2>Reach Out Today</h2>
          <p>
            Please share brief contact details only. Specific clinical
            information will be gathered safely during confidential intake.
          </p>
          <ul className="rlth-contact-list">
            <li>
              <strong>Office Location:</strong> 119 DeHaven Dr, Yonkers, NY 10703
            </li>
            <li>
              <strong>Phone:</strong> <a href="tel:9149432501">914-943-2501</a>
            </li>
            <li>
              <strong>Email:</strong>{" "}
              <a href="mailto:intake@revealing-leads-to-healing-wellness-services.org">
                intake@revealing-leads-to-healing-wellness-services.org
              </a>
            </li>
          </ul>
          <div className="rlth-actions">
            <a href="/ehr?role=client">Patient Access</a>
            <a href="/ehr?role=provider">Provider Access</a>
          </div>
        </section>
      </main>

      <footer className="rlth-footer">
        <p>Copyright 2024 - 2026 Revealing Leads to Healing Wellness Services</p>
      </footer>
    </>
  );
}
