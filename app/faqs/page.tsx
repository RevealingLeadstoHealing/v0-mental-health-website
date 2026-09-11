import { SiteHeader, SiteFooter } from "../site-chrome";

export const metadata = { title: "FAQs | Revealing Leads to Healing Wellness Services, LLC" };

export default function Faqs() {
  return (
    <>
      <SiteHeader />

      <section className="section-shell intro">
        <h1>Frequently Asked Questions</h1>
        <p>
          Welcome to the FAQs section of Revealing Leads to Healing Wellness Services. We understand
          that embarking on a journey towards mental wellness can bring many questions and
          uncertainties. Here, we aim to provide clear and concise answers to common inquiries about
          our psychotherapy services. Whether you&rsquo;re wondering about the types of therapies we
          offer, the benefits of counseling, or logistical details like appointment scheduling and
          fees, this section is designed to address your concerns and help you feel more informed and
          confident in taking the next step.
        </p>
      </section>

      <section className="section-shell">
        <div className="content-card">
          <details open>
            <summary>What types of therapy do you offer?</summary>
            <p>
              We offer a variety of therapy types including Cognitive Behavioral Therapy (CBT),
              Dialectical Behavior Therapy (DBT), and trauma-focused counseling. Our therapists are
              skilled in providing personalized treatment plans tailored to each client&rsquo;s unique
              needs.
            </p>
          </details>
          <details>
            <summary>How do I schedule an appointment?</summary>
            <p>
              You can schedule an appointment by visiting our website&rsquo;s booking page or by
              calling our office directly. Our friendly staff will guide you through the process and
              help you find a convenient time slot that fits your schedule.
            </p>
          </details>
          <details>
            <summary>What is your cancellation policy?</summary>
            <p>
              We require at least 24 hours&rsquo; notice for cancellations. This allows us to offer the
              time slot to another client. If cancellations are made less than 24 hours in advance, a
              cancellation fee may be charged.
            </p>
          </details>
          <details>
            <summary>Are your services covered by insurance?</summary>
            <p>
              Yes, many of our services are covered by insurance. We recommend checking with your
              insurance provider to understand your coverage benefits. Our office can assist with any
              necessary documentation required for claims.
            </p>
          </details>
          <details>
            <summary>What should I expect in my first session?</summary>
            <p>
              In your first session, you&rsquo;ll have the opportunity to discuss your goals and
              concerns with your therapist. This session is about getting to know each other and
              creating a safe space for you to express yourself. Together, you&rsquo;ll begin to
              outline a treatment plan tailored to your needs.
            </p>
          </details>
          <details>
            <summary>How long are the therapy sessions?</summary>
            <p>
              Standard therapy sessions typically last 50 minutes. However, depending on your
              therapeutic needs, longer sessions can be arranged. Your therapist will discuss the best
              session length for your treatment plan.
            </p>
          </details>
          <details>
            <summary>Do you offer online therapy sessions?</summary>
            <p>
              Yes, we offer online therapy sessions for clients who prefer or require remote
              consultations. These sessions are conducted via secure video conferencing platforms to
              ensure your privacy and comfort.
            </p>
          </details>
          <details>
            <summary>How can therapy benefit me?</summary>
            <p>
              Therapy can provide you with coping strategies, emotional support, and a deeper
              understanding of your thoughts and feelings. By working with a therapist, you can address
              challenges, improve your mental well-being, and work towards personal growth and healing.
            </p>
          </details>
        </div>
      </section>

      <section className="section-shell intro">
        <h2>Begin Your Healing Journey Today</h2>
        <p>
          Take the first step towards a brighter future. Schedule your initial consultation with us
          and start working towards a healthier, happier you. Our dedicated team is here to support
          you every step of the way.
        </p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <a className="button" href="/contact">Start Here</a>
          <a className="button button-light" href="/ehr">EHR Login</a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
