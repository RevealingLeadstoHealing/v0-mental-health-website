import { SiteHeader, SiteFooter, EHR_LOGIN_URL } from "../site-chrome";
import AccessQrCode from "../ehr/access-qr-code";

export const metadata = { title: "Contact | Revealing Leads to Healing Wellness Services, LLC" };

export default function Contact() {
  return (
    <>
      <SiteHeader />

      <section className="section-shell">
        <div className="contact-top">
          <div>
            <h1>Contact Us</h1>
            <p>
              In-person sessions in Yonkers and secure telehealth services across New York State.
              Responses are typically returned within 24&ndash;48 business hours.
            </p>
          </div>
          {/* Amazon Music — the owner's intentionally chosen uplifting playlist. */}
          <iframe
            title="Revealing Leads to Healing playlist"
            src="https://music.amazon.com/embed/c66eb917a30e4447aa3c2c63d70f0884sune/?id=PXgtvEUsur&marketplaceId=ATVPDKIKX0DER&musicTerritory=US&autoplay=1"
            height="352"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            style={{ border: 0, borderRadius: 20, maxWidth: "100%", width: "100%" }}
          />
        </div>
      </section>

      <section className="section-shell">
        <div className="content-card">
          <form method="POST" action="/api/contact">
            <p>
              <label>
                Name *<br />
                <input type="text" name="name" required style={fieldStyle} />
              </label>
            </p>
            <p>
              <label>
                Email address *<br />
                <input type="email" name="email" required style={fieldStyle} />
              </label>
            </p>
            <p>
              <label>
                Message *<br />
                <textarea name="message" required rows={5} style={fieldStyle} />
              </label>
            </p>
            <p>
              <label>
                Phone number *<br />
                <input type="tel" name="phone" required style={fieldStyle} />
              </label>
            </p>
            <p>
              <label>
                <input type="checkbox" name="copy" value="1" /> Send me a copy
              </label>
            </p>
            <button type="submit" className="button">Submit form</button>
          </form>
        </div>
      </section>

      <section className="section-shell map">
        <iframe
          title="Office location map"
          src="https://www.google.com/maps?q=119+DeHaven+Dr,+Yonkers,+NY+10703&output=embed"
          loading="lazy"
        />
        <div className="actions">
          <a className="button" href={EHR_LOGIN_URL} target="_blank" rel="noopener noreferrer">
            Existing Patient EHR Login
          </a>
        </div>
      </section>

      <section className="section-shell">
        <div className="content-card">
          <article>
            <h2>Location</h2>
            <p><strong>Revealing Leads to Healing Wellness Services, LLC</strong></p>
            <p><strong>Office:</strong> 119 DeHaven Dr, Yonkers, NY 10703</p>
            <p><strong>Phone:</strong> (914) 635-2687</p>
            <p><strong>Fax:</strong> (914) 371-3845</p>
            <p><strong>Email:</strong> info@revealing-leads-to-healing-wellness-services.org</p>
            <p>
              <strong>Availability:</strong> In-Person Sessions in Yonkers &amp; Secure Telehealth
              Services across New York State.
            </p>
          </article>

          {/* EHR login QR — generated live from the real portal URL, always correct. */}
          <article className="portrait">
            <AccessQrCode url={EHR_LOGIN_URL} label="Scan to reach the EHR patient login" size={200} />
          </article>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem",
  marginTop: "0.35rem",
  border: "2px solid var(--charcoal)",
  fontFamily: "inherit",
  fontSize: "1rem",
};
