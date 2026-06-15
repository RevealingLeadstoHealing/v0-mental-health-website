export default function HomePage() {
  return (
    <>
      <div style={{ backgroundColor: '#ffffff', color: '#202020', padding: '20px' }}>
        <h1>Revealing Leads to Healing</h1>
        <h2>Wellness Services, LLC</h2>
        
        <nav style={{ marginBottom: '20px' }}>
          <a href="#home" style={{ marginRight: '15px' }}>Home</a>
          <a href="#about" style={{ marginRight: '15px' }}>About Us</a>
          <a href="#therapy" style={{ marginRight: '15px' }}>Therapy Approach</a>
          <a href="#faq" style={{ marginRight: '15px' }}>FAQs</a>
          <a href="#contact" style={{ marginRight: '15px' }}>Contact</a>
          <a href="#login">Login</a>
        </nav>

        <section id="home" style={{ marginBottom: '40px' }}>
          <h2>Welcome</h2>
          <p>This is where our journey begins. Get to know our practice, what we do, and how we are committed to quality and great service.</p>
        </section>

        <section id="about" style={{ marginBottom: '40px' }}>
          <h2>About Kenseener</h2>
          <p>Kenseener Carpenter, MA, LCSW, CCTP, CGP, CASAC-M, is a Licensed Clinical Social Worker based in Yonkers, New York.</p>
        </section>

        <section id="contact" style={{ marginBottom: '40px' }}>
          <h2>Contact</h2>
          <p>119 Dehaven Drive, Suite 229 | Yonkers, NY 10703</p>
          <p>Phone: 914-943-2501</p>
        </section>

        <footer style={{ borderTop: '1px solid #ccc', paddingTop: '20px', marginTop: '40px' }}>
          <p>&copy; 2026 Revealing Leads to Healing Wellness Services, LLC</p>
        </footer>
      </div>
    </>
  );
}
