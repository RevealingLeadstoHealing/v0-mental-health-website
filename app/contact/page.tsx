import { SiteHeader, SiteFooter, EHR_LOGIN_URL } from "../site-chrome";
import AccessQrCode from "../ehr/access-qr-code";
import Script from "next/script";

// Cloudflare Turnstile (anti-spam, 2026-11-26): the widget only renders
// when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. Until Kay / the deployer
// creates keys in Cloudflare and sets them in Amplify, the form relies on
// the honeypot, rate limiting and server-side validation in
// app/api/contact/route.ts.
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export const metadata = { title: "Contact | Revealing Leads to Healing Wellness Services, LLC" };

export default function Contact({ searchParams }: { searchParams?: { sent?: string; error?: string } }) {
  return (
    <>
      <SiteHeader />

      <section className="section-shell">
        <div className="contact-top">
          <div>
            <h1>Contact Us</h1>
            <p>
              In-person sessions in Yonkers and secure telehealth services in states where Kenseener is licensed.
              Responses are typically returned within 24&ndash;48 business hours.
            </p>
          </div>
          {/* Amazon Music — an intentionally curated playlist of positive, uplifting songs,
              hand-picked to create an atmosphere of peace and new beginnings for clients. */}
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
          {searchParams?.sent ? (
            <p className="notice">Thank you &mdash; your message has been sent. We&rsquo;ll be in touch within 24&ndash;48 business hours.</p>
          ) : null}
          {searchParams?.error ? (
            <p className="notice">Something went wrong sending your message. Please try again or call the office directly.</p>
          ) : null}
          <form method="POST" action="/api/contact">
            <p>
              <label>
                Name *<br />
                <input type="text" name="name" required maxLength={100} style={fieldStyle} />
              </label>
            </p>
            <p>
              <label>
                Email address *<br />
                <input type="email" name="email" required maxLength={254} style={fieldStyle} />
              </label>
            </p>
            <p>
              <label>
                Message *<br />
                <textarea name="message" required rows={5} maxLength={5000} style={fieldStyle} />
              </label>
            </p>
            <p>
              <label>
                Phone number *<br />
                <input type="tel" name="phone" required maxLength={40} style={fieldStyle} />
              </label>
            </p>
            <p>
              <label>
                <input type="checkbox" name="copy" value="1" /> Send me a copy
              </label>
            </p>
            {/* Honeypot: hidden from real people (off-screen, not
                display:none, so bots that fill every field give
                themselves away). The server rejects any submission
                with this field filled — see app/api/contact/route.ts. */}
            <p aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
              <label>
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </p>
            {turnstileSiteKey ? (
              <>
                <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
                <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
              </>
            ) : null}
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
          <a className="button" href={EHR_LOGIN_URL} target="_blank" rel="noopener noreferrer">
            Provider Login
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
<p><strong>Other business contact numbers:</strong> (914) 969-3292 &middot; (410) 965-1234</p>
            <p><strong>Primary email:</strong> connect@rlth.org</p>
            {/* Webador mailbox — subscription ends 2026-12-16; remove this address then. */}
            <p><strong>Secondary email:</strong> info@revealing-leads-to-healing-wellness-services.org</p>
            <p>
              <strong>Availability:</strong> In-Person Sessions in Yonkers &amp; Secure Telehealth
              Services for clients in states where Kenseener is licensed.
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
  border: "1px solid var(--text)",
  fontFamily: "inherit",
  fontSize: "1rem",
};
