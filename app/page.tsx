export default function HomePage() {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Revealing Leads to Healing Wellness Services home">
          Revealing Leads to Healing
          <span>Wellness Services, LLC</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#home">Home</a>
          <a href="#about">About Us</a>
          <a href="#therapy">Therapy Approach</a>
          <a href="#faqs">FAQs</a>
          <a href="#contact">Contact</a>
          <a href="https://vercel-ai-gateway-demo.vercel.app/" target="_blank" rel="noopener noreferrer">Login</a>
        </nav>
      </header>
      <main id="home">
        <section className="intro section-shell" aria-labelledby="welcome-heading">
          <h1 id="welcome-heading">Welcome</h1>
          <p>This is where our journey begins. Get to know our practice, what we do, and how we are committed to quality and great service. We are glad you are here to be a part of our story.</p>
        </section>
        <section id="therapy" className="content-card section-shell" aria-label="Therapy and provider information">
          <article>
            <h2>Therapy Approach</h2>
            <p>Compassionate, personalized, and trauma-informed therapy is tailored to each person&apos;s age, identity, needs, and goals. The practice provides a safe, affirming, culturally responsive, and nonjudgmental space for healing and growth.</p>
          </article>
          <article id="about">
            <h2>Meet Kenseener</h2>
            <p>Kenseener Carpenter, MA, LCSW, CCTP, CGP, CASAC-M, is a Licensed Clinical Social Worker based in Yonkers, New York. She supports adolescents, adults, couples, and families through trauma, grief, anxiety, depression, relationship challenges, addiction recovery, and life transitions.</p>
          </article>
          <article>
            <h2>Interventions</h2>
            <p>Treatment integrates evidence-based interventions including EMDR, DBT skills, CBT, person-centered therapy, trauma-informed care, and substance use recovery support. Each treatment plan is developed collaboratively and adjusted to the client&apos;s individual journey.</p>
          </article>
        </section>
        <section className="portrait section-shell" aria-label="Professional profile">
          <img src="/kenseener-carpenter-headshot.jpg" alt="Kenseener Carpenter, Licensed Clinical Social Worker" />
        </section>
        <section id="faqs" className="content-card section-shell">
          <h2>FAQs</h2>
          <details open><summary>How do I request an appointment?</summary><p>Use the contact information below or call <a href="tel:+19149432501">914-943-2501</a> to request an appointment.</p></details>
          <details><summary>Are telehealth appointments available?</summary><p>Telehealth services are available throughout New York State. Limited in-person appointments are available at the Yonkers office.</p></details>
          <details><summary>Who does the practice serve?</summary><p>The practice supports adolescents, adults, couples, and families with compassionate, individualized care.</p></details>
        </section>
        <section className="testimonials section-shell" aria-labelledby="testimonials-heading">
          <h2 id="testimonials-heading">Client Experiences</h2>
          <blockquote>&quot;RTH has been an incredible help to me during this journey of self-awareness. Completely unbiased and supportive throughout.&quot; <strong>Amanda D.</strong></blockquote>
          <blockquote>&quot;Very thoughtful therapist who gives me tools to help better my life and improve the quality of my relationship with myself and others.&quot; <strong>M.P.</strong></blockquote>
          <blockquote>&quot;Kenseener challenges my thinking, while also still being compassionate and listening.&quot; <strong>B.W.</strong></blockquote>
        </section>
        <section id="contact" className="content-card section-shell">
          <h2>Contact</h2>
          <p><strong>Revealing Leads to Healing Wellness Services, LLC</strong></p>
          <p>119 Dehaven Drive, Suite 229<br />Yonkers, NY 10703</p>
          <p><a href="tel:+19149432501">914-943-2501</a></p>
          <div className="actions">
            <a className="button" href="https://www.zocdoc.com/practice/revealing-leads-to-healing-wellness-services-llc-126225" target="_blank" rel="noopener noreferrer">Book Online</a>
            <a className="button button-light" href="http://www.wellnite.co/practice/register/61689f088ba1550017135ead" target="_blank" rel="noopener noreferrer">Request Appointment</a>
          </div>
        </section>
        <section className="map section-shell" aria-labelledby="location-heading">
          <h2 id="location-heading">Location</h2>
          <iframe title="Map showing 119 Dehaven Drive, Yonkers, New York" src="https://www.google.com/maps?q=119%20Dehaven%20Dr%20%23229%2C%20Yonkers%2C%20NY%2010703&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </section>
      </main>
      <footer><p>&copy; 2026 Revealing Leads to Healing Wellness Services, LLC</p></footer>
    </>
  );
}
