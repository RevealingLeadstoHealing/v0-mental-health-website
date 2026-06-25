const services = [
  {
    title: "Trauma & PTSD Recovery",
    body:
      "Specialized clinical care for individuals navigating trauma, profound grief, loss, and life transitions. Utilizing my credentials as a Certified Clinical Trauma Professional (CCTP), we work together to process past experiences and build a path toward lasting emotional freedom.",
  },
  {
    title: "Addiction & Substance Use Support",
    body:
      "Master-level expertise (CASAC-M) in treating alcohol and substance use disorders. I provide a compassionate, non-judgmental space for individuals and families focusing on recovery, harm reduction, and co-occurring mental health challenges.",
  },
  {
    title: "Integrative & Evidence-Based Modalities",
    body:
      "A holistic approach to healing that incorporates powerful, proven clinical interventions tailored to you. My practice actively integrates Eye Movement Desensitization and Reprocessing (EMDR), Dialectical Behavior Therapy (DBT), and Cognitive Behavioral Therapy (CBT) to treat the whole person.",
  },
];

const faqs = [
  {
    question: "What types of session formats do you offer?",
    answer:
      "I offer dedicated face-to-face sessions at my office location in Yonkers, New York, as well as secure Telehealth sessions accessible from anywhere across New York State.",
  },
  {
    question: "What areas do you specialize in?",
    answer:
      "My practice provides master-level clinical expertise in treating trauma and PTSD, alcohol and substance use recovery, complex grief, loss, anxiety, and major life transitions.",
  },
  {
    question: "How do I schedule an initial session or intake?",
    answer:
      "You can use the secure contact form, email the practice directly, or call the practice line. The electronic client booking portal will connect once the patient access workflow is fully live.",
  },
];

export default function Home() {
  return (
    <main id="home" className="rlth-page">
      <header className="rlth-header">
        <a className="rlth-practice-name" href="#home">
          Revealing Leads to Healing Wellness Services, LLC
        </a>
        <div className="rlth-logo-space" aria-label="Revealing Leads to Healing logo">
          <img className="rlth-logo" src="/logo.png" alt="Revealing Leads to Healing logo" />
        </div>
        <nav className="rlth-nav" aria-label="Primary navigation">
          <a href="#home">Home</a>
          <a href="#about">About Us</a>
          <a href="#services">Our Services</a>
          <a href="#faqs">FAQs</a>
          <a href="#contact">Contact</a>
          <a href="/ehr?role=client">Patient Access</a>
          <a href="/ehr?role=provider">Provider Access</a>
        </nav>
      </header>

      <section className="rlth-hero" aria-label="Brand logo">
        <div className="rlth-hero-logo">
          <img src="/logo.png" alt="Revealing Leads to Healing Wellness Services logo" />
        </div>
      </section>

      <section id="about" className="rlth-section rlth-white">
        <h1>Meet Kenseener "Kay" Carpenter, MA, LCSW, CASAC-M</h1>
        <p className="rlth-lead">Dedicated Psychotherapist, Trauma Specialist, & Practice Founder</p>
        <p>
          Welcome to Revealing Leads to Healing Wellness Services, LLC. I am Kenseener "Kay" Carpenter, a licensed
          clinical social worker and credentialed master-level substance use counselor with over a decade of dedicated
          experience in the mental health field.
        </p>
        <p>
          My therapeutic philosophy is holistic, person-centered, and integrative. In my practice, I blend
          evidence-based modalities including EMDR, DBT, and CBT to tailor a clinical plan unique to your needs.
        </p>
      </section>

      <section id="services" className="rlth-section rlth-charcoal">
        <h2>Our Services</h2>
        <div className="rlth-service-list">
          {services.map((service) => (
            <article key={service.title}>
              <h3>{service.title}</h3>
              <p>{service.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rlth-section rlth-white">
        <h2>Your Path to Wellness Starts Here</h2>
        <p>
          At Revealing Leads to Healing Wellness Services, LLC, I believe that emotional wellness is a journey we
          navigate together. Whether you are seeking deep trauma processing, navigating the complexities of recovery, or
          looking to break through anxiety and grief, you deserve a space that respects your unique story.
        </p>
        <p>
          You can choose dedicated, face-to-face sessions at my Yonkers office or connect securely from anywhere across
          New York State through Telehealth.
        </p>
        <div className="rlth-actions">
          <a href="#contact">Schedule an Intake</a>
          <a href="/ehr?role=client">Patient Access</a>
        </div>
      </section>

      <section id="faqs" className="rlth-section rlth-gold">
        <h2>Frequently Asked Questions</h2>
        {faqs.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>

      <section id="contact" className="rlth-section rlth-white">
        <h2>Reach Out Today</h2>
        <ul className="rlth-contact-list">
          <li>Office Location: 119 DeHaven Dr, Yonkers, NY 10703</li>
          <li>Email: k@revealing-leads-to-healing-wellness-services.org</li>
          <li>Availability: In-Person Sessions in Yonkers & Secure Telehealth Services across New York State.</li>
        </ul>
        <form className="rlth-contact-form">
          <label>
            Full Name
            <input name="name" type="text" required />
          </label>
          <label>
            Email Address
            <input name="email" type="email" required />
          </label>
          <label>
            Phone Number
            <input name="phone" type="tel" required />
          </label>
          <label>
            Preferred Session Format
            <select name="format" defaultValue="">
              <option value="" disabled>
                Select one
              </option>
              <option>In-Person</option>
              <option>Telehealth</option>
            </select>
          </label>
          <label>
            Brief Message
            <textarea
              name="message"
              rows={5}
              placeholder="Please only share brief contact details; specific clinical information will be safely gathered during our confidential intake process."
            />
          </label>
          <button type="submit">Send Message</button>
        </form>
      </section>

      <footer className="rlth-footer">
        <p>Copyright 2024 - 2025 Revealing Leads to Healing Wellness Services, LLC</p>
      </footer>
    </main>
  );
}
