import { SiteHeader, SiteFooter, EHR_LOGIN_URL } from "../site-chrome";

export const metadata = { title: "About Us | Revealing Leads to Healing Wellness Services, LLC" };

export default function AboutUs() {
  return (
    <>
      <SiteHeader />

      <div className="container">
        <section className="section">
          <h2>Our Journey to Healing</h2>
          <div className="portrait" style={{ float: "right", margin: "0 0 1rem 1.5rem", maxWidth: 260 }}>
            <img
              src="/kenseener-carpenter-headshot.jpg"
              alt="Kenseener &quot;Kay&quot; Carpenter, LCSW"
            />
          </div>
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

        <section className="section">
          <h2>Meet Kenseener &ldquo;Kay&rdquo; Carpenter, MA, LCSW, CCTP, CGP, CASAC-M, SIFI</h2>
          <p>
            Kenseener is a highly skilled and compassionate Licensed Clinical Social Worker based in
            Yonkers, New York. Fully licensed and certified across several clinical areas and
            modalities, with international credentials, master-level supervisory certification
            (CASAC-M), and SIFI certification. With a thriving private psychotherapy practice, Kay
            offers a range of counseling services tailored to meet the needs of her clients. She
            specializes in providing individual, marital, family, and group therapy, working closely
            with both adults and teenagers to foster growth, healing, and resilience. Whether you are
            navigating personal challenges or seeking support for your relationships, Kay&rsquo;s
            expertise ensures a safe and supportive environment where meaningful change can happen. At
            our office, we are dedicated to helping clients address their unique needs with a focus on
            personalized care and evidence-based techniques. Let us help you take the next step toward a
            more balanced and fulfilling life.
          </p>
        </section>

        <section className="section">
          <h2>Compassionate Support for Healing and Growth</h2>
          <p>
            Kenseener specializes in guiding clients through a transformative journey of self-discovery
            and healing. By helping individuals pinpoint the origin of their suffering, uncover the
            beliefs and self-judgments formed during those experiences, and explore how these have
            shaped their lives, Kay fosters deeper understanding and personal growth. Through thoughtful
            and insightful questioning, coupled with active listening, Kay identifies core concerns and
            encourages healing in a compassionate and supportive environment. This approach empowers
            clients to move forward with clarity and confidence, creating space for meaningful change
            and a renewed sense of well-being.
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
