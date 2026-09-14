import { SiteHeader, SiteFooter } from "./site-chrome";

export const metadata = {
  title: "Revealing Leads to Healing Wellness Services, LLC",
};

export default function Home() {
  return (
    <>
      <SiteHeader />

      <div className="home-logo-hero">
        <img src="/rlth-logo.png" alt="Revealing Leads to Healing Wellness Services, LLC" />
      </div>

      <section className="section-shell intro">
        <h1>Your Path to Wellness Starts Here</h1>
        <p>
          At Revealing Leads to Healing Wellness Services, LLC, I believe that emotional wellness is a
          journey we navigate together. Whether you are seeking deep trauma processing, navigating the
          complexities of recovery, or looking to break through anxiety and grief, you deserve a space
          that respects your unique story.
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
        <div className="actions" style={{ justifyContent: "center" }}>
          <a className="button" href="/about-us">Meet Kenseener</a>
          <a className="button" href="/therapy-approach">Our Approach &amp; Services</a>
          <a className="button" href="/contact">Contact Us</a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
