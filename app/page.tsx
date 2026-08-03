import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Revealing Leads to Healing Wellness Services</h1>
      <p>Website is online.</p>
      <nav style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <Link href="/login">Login</Link>
        <Link href="/ehr">EHR</Link>
        <Link href="/about-us">About Us</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </main>
  );
}
