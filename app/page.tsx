import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Revealing Leads to Healing Wellness Services, LLC</h1>
      <p>Your Path to Wellness Starts Here</p>

      <div style={{ marginTop: "2rem" }}>
        <Link
          href="/ehr"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Provider Login
        </Link>
      </div>
    </main>
  );
}
