import { SiteHeader, SiteFooter } from "../site-chrome";

export const metadata = { title: "About Us | Revealing Leads to Healing Wellness Services, LLC" };

export default function AboutUs() {
  return (
    <>
      <SiteHeader />

      <section className="section-shell intro">
        <h1>Our Journey to Healing</h1>
        <p>
          Revealing Leads to Healing Wellness Services was founded with the belief that everyone
          deserves the opportunity to heal and grow. Situated in the heart of Yonkers, New York, our
          dedicated team of licensed therapists brings a wealth of experience and a compassionate
          approach to every session. We are committed to providing a safe, supportive environment
          where clients can explore their emotions, confront their challenges, and embark on a journey
          towards personal well-being. Our holistic approach integrates modern therapeutic practices
          with a deep understanding of individual needs, ensuring that each client receives tailored
          support. At Revealing Leads to Healing, we strive to illuminate paths to mental clarity and
          emotional resilience, empowering you to invest in yourself and your future.
        </p>
      </section>

      <section className="section-shell">
        <div className="content-card">
          <article>
            <h2>Begin Your Healing Journey Today</h2>
            <p>
              At Revealing Leads to Healing, we&rsquo;re here to support you every step of the way. Our
              dedicated therapists are ready to help you embark on a transformative path towards
              well-being and personal growth. Don&rsquo;t wait to start your journey towards a brighter
              future.
            </p>
          </article>
        </div>
        <div className="actions" style={{ justifyContent: "center" }}>
          <a className="button" href="/contact">Get Started</a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
