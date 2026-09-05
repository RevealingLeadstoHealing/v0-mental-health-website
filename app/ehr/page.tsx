"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type EhrUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  practiceId: string;
};

export default function EhrDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<EhrUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/ehr/auth/session", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          // Cookie present but token invalid/expired — send back to login
          router.replace("/login");
        }
      })
      .catch(() => {
        if (active) router.replace("/login");
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f3ea", fontFamily: "Montserrat, Arial, sans-serif" }}>
        <p style={{ color: "#675f54" }}>Verifying session…</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main style={{ minHeight: "100vh", padding: "2rem", background: "#f7f3ea", fontFamily: "Montserrat, Arial, sans-serif", color: "#2b2926" }}>
      <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
        <p style={{ margin: 0, color: "#796f63", fontSize: ".82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>
          Revealing Leads to Healing EHR
        </p>
        <h1 style={{ margin: ".5rem 0 0", fontSize: "1.5rem", lineHeight: 1.2 }}>EHR Dashboard</h1>

        <div style={{ marginTop: "1.25rem", padding: "1rem", border: "1px solid #ddd3c1", borderRadius: 8, background: "#fff" }}>
          <p style={{ margin: 0, fontSize: ".95rem" }}>
            Signed in as <strong>{user.fullName}</strong> ({user.email}) &mdash; role: <strong>{user.role}</strong>
          </p>
        </div>

        <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #fef3cd", borderRadius: 8, background: "#fffbeb", color: "#78350f", fontSize: ".9rem" }}>
          EHR clinical features are under active development. Do not enter PHI until authenticated API writes,
          audit logging, signed BAAs, backup verification, and operating policies are confirmed end-to-end.
        </div>

        <div style={{ marginTop: "1.25rem", display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          <Link href="/" style={{ padding: ".6rem 1rem", border: "1px solid #2b2926", borderRadius: 8, background: "#fff", color: "#2b2926", fontSize: ".9rem", fontWeight: 700, textDecoration: "none" }}>
            Back to website
          </Link>
          <Link href="/login" style={{ padding: ".6rem 1rem", border: "1px solid #2b2926", borderRadius: 8, background: "#2b2926", color: "#fff", fontSize: ".9rem", fontWeight: 700, textDecoration: "none" }}>
            Session &amp; API checks
          </Link>
        </div>
      </div>
    </main>
  );
}
