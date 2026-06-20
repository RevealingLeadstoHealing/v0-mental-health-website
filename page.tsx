import Image from "next/image";

export default function Home() {
  return (
    <>
      {/* ── HEADER ── */}
      <header className="site-header">
        <div className="site-logo-wrap">
          <img
            src="/logo.png"
            alt="Revealing Leads to Healing logo"
            className="site-logo"
          />
        </div>
        <a href="/" className="brand">
          Revealing Leads to Healing Wellness Services, LLC
        </a>
        <nav>
          <a href="#home" className="active">Home</a>
          <a href="#about-us">About Us</a>
          <a href="#our-services">Our Services</a>
          <a href="#faqs">FAQs</a>
          <a href="#contact">Contact</a>
          <a href="/ehr">EHR Login</a>
        </nav>
      </header>

      {/* ── HERO BANNER ── */}
      <section id="home" className="hero">
        <h1>Revealing Leads to Healing Wellness Services, LLC</h1>
      </section>

      {/* ── MAIN CONTENT ── */}
      <main className="main-content">

        {/* Welcome */}
        <div className="section-shell">
          <div className="content-card">
            <h2>Welcome</h2>
            <p>
              This is where our journey begins. Get to know our practice and
              what we do, and how we&apos;re committed to quality and great
              service. Join us as we grow and succeed together. We&apos;re glad
              you&apos;re here to be a part of our story.
            </p>
            <a href="#contact" className="btn">Start Here</a>
            <a href="/ehr" className="btn">Client & Provider EHR Login</a>
          </div>
        </div>

        {/* Our Services */}
        <div id="our-services" className="section-shell">
          <div className="content-card">
            <h1>Our Services</h1>
            <div className="service-grid">

              <div className="service-block">
                <h2>Trauma &amp; PTSD Recovery</h2>
                <p>
                  Specialized clinical care for individuals navigating trauma,
                  profound grief, loss, and life transitions. Utilizing my
                  credentials as a{" "}
                  <strong>Certified Clinical Trauma Professional (CCTP)</strong>,
                  we work together to process past experiences and build a path
                  toward lasting emotional freedom.
                </p>
              </div>

              <div className="service-block">
                <h2>Addiction &amp; Substance Use Support</h2>
                <p>
                  Master-level expertise{" "}
                  <strong>(CASAC-M)</strong> in treating alcohol and substance
                  use disorders. I provide a compassionate, non-judgmental space
                  for individuals and families focusing on recovery, harm
                  reduction, and co-occurring mental health challenges.
                </p>
              </div>

              <div className="service-block">
                <h2>Integrative &amp; Evidence-Based Modalities</h2>
                <p>
                  A holistic approach to healing that incorporates powerful,
                  proven clinical interventions tailored to you. My practice
                  actively integrates{" "}
                  <strong>
                    Eye Movement Desensitization and Reprocessing (EMDR),
                    Dialectical Behavior Therapy (DBT), and Cognitive Behavioral
                    Therapy (CBT)
                  </strong>{" "}
                  to treat the whole person.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Meet Kay */}
        <div id="about-us" className="section-shell">
          <div className="content-card">
            <h1>Meet Kay Carpenter, MA, LMSW, CASAC-T</h1>
            <div className="portrait">
              <Image
                src="/kenseener-carpenter-headshot.jpg"
                alt="Kay Carpenter, MA, LMSW, CASAC-T"
                width={480}
                height={600}
                style={{ width: "min(100%, 480px)", height: "auto" }}
                priority
              />
            </div>
            <p>
              Kay Carpenter is a licensed clinical social worker and certified
              addiction counselor dedicated to providing compassionate,
              culturally sensitive care. Kay specializes in trauma, anxiety,
              depression, and substance use disorders, helping clients uncover
              the path to healing.
            </p>
            <a href="#about-us" className="btn">About Us</a>
          </div>
        </div>

        {/* Your Path to Wellness */}
        <div className="section-shell">
          <div className="content-card">
            <h1>Your Path to Wellness Starts Here</h1>
            <p>
              At Revealing Leads to Healing Wellness Services, LLC, I believe
              that emotional wellness is a journey we navigate together. Whether
              you are seeking deep trauma processing, navigating the complexities
              of recovery, or looking to break through anxiety and grief, you
              deserve a space that respects your unique story.
            </p>
            <p>
              To ensure your care fits seamlessly into your life, I provide
              flexible options tailored to your comfort. You can choose to meet
              with me for dedicated, face-to-face sessions at my Yonkers office,
              or connect securely from anywhere across New York State through our
              premier <strong>Telehealth</strong> platform.
            </p>
            <p>
              Healing is entirely possible, and you do not have to take the
              first step alone. Let&apos;s work together to build the resilience,
              coping strategies, and insights necessary to reclaim your life.
            </p>
            <a
              href="mailto:intake@revealing-leads-to-healing-wellness-services.org"
              className="btn btn-cta"
            >
              Book a Complimentary Telehealth Consultation
            </a>
          </div>
        </div>

        {/* FAQ */}
        <div id="faqs" className="section-shell">
          <div className="content-card">
            <h3>FAQ</h3>
            <details>
              <summary>How do I contact for an appointment?</summary>
              <p>
                Use the contact form or call us at{" "}
                <a href="tel:9149432501">914-943-2501</a> to schedule an
                appointment, or use the booking link provided on the Contact
                page.
              </p>
            </details>
            <details>
              <summary>Do you offer telehealth / video visits?</summary>
              <p>
                Yes — we are now offering video visits for your convenience and
                safety.
              </p>
            </details>
            <details>
              <summary>What insurance do you accept?</summary>
              <p>
                Please contact us directly for current insurance and payment
                information.
              </p>
            </details>
            <details>
              <summary>What areas do you serve?</summary>
              <p>
                We are based in Yonkers, New York, and serve clients throughout
                the greater New York area via telehealth.
              </p>
            </details>
          </div>
        </div>

        {/* Testimonials */}
        <div className="section-shell">
          <div className="testimonials">
            <h3>What Our Clients Say</h3>
            <div className="testimonial-grid">
              <div className="testimonial-card">
                <p>
                  &ldquo;I can&apos;t say enough about the outstanding care I
                  received. Truly life-changing.&rdquo;
                </p>
              </div>
              <div className="testimonial-card">
                <p>
                  &ldquo;RTH has been an incredible help. The support I&apos;ve
                  received has been phenomenal.&rdquo;
                </p>
              </div>
              <div className="testimonial-card">
                <p>
                  &ldquo;RTH is helping me deal with things I&apos;ve never
                  been able to address before.&rdquo;
                </p>
              </div>
              <div className="testimonial-card">
                <p>
                  &ldquo;Very thoughtful therapist who truly listens and helps
                  you grow.&rdquo;
                </p>
              </div>
              <div className="testimonial-card">
                <p>
                  &ldquo;Kay challenges my thinking, which has helped me make
                  real progress.&rdquo;
                </p>
              </div>
              <div className="testimonial-card">
                <p>
                  &ldquo;Kay is helping me so much. She genuinely cares about
                  her clients.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div id="contact" className="section-shell">
          <div className="content-card">
            <h1>Contact Us</h1>
            <ul className="contact-details">
              <li>
                <strong>Office Location:</strong>{" "}
                119 DeHaven Dr, Yonkers, NY 10703
              </li>
              <li>
                <strong>Phone:</strong>{" "}
                <a href="tel:9149432501">914-943-2501</a>
              </li>
              <li>
                <strong>Email:</strong>{" "}
                <a href="mailto:intake@revealing-leads-to-healing-wellness-services.org">
                  intake@revealing-leads-to-healing-wellness-services.org
                </a>
              </li>
              <li>
                <strong>Availability:</strong>{" "}
                In-Person Sessions in Yonkers &amp; Secure Telehealth Services
                across New York State.
              </li>
            </ul>
            <form className="contact-form" action="#" method="POST">
              <input type="text" placeholder="Your Name" name="name" required />
              <input
                type="email"
                placeholder="Your Email"
                name="email"
                required
              />
              <textarea
                placeholder="Your Message"
                name="message"
                required
              ></textarea>
              <button type="submit">Send Message</button>
            </form>
          </div>
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <p>© 2024 – 2025 Revealing Leads to Healing Wellness Services</p>
        <p>
          Powered by{" "}
          <a href="https://www.webador.com/" rel="noopener noreferrer">
            Webador
          </a>
        </p>
      </footer>
    </>
  );
}

