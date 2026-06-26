"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    try {
      localStorage.removeItem("rlth-ehr-demo-v3-stable");
      localStorage.removeItem("rlth-firebase-architecture-demo-v2-stable");
      localStorage.removeItem("rlth:ehr:savedAssessments");
      localStorage.removeItem("rlth:ehr:savedNotes");
    } catch {
      // Keep logout usable if storage is unavailable.
    }
  }, []);

  return (
    <main className="ehr-logout">
      <style jsx global>{`
        .ehr-logout,
        .ehr-logout * {
          box-sizing: border-box;
        }
        .ehr-logout {
          min-height: 100vh;
          margin: 0;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f7f3ea;
          color: #2b2926;
          font-family: Montserrat, Arial, sans-serif;
          line-height: 1.45;
        }
        .ehr-logout-card {
          width: min(100%, 34rem);
          padding: 1.5rem;
          border: 1px solid #ddd3c1;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(43, 41, 38, 0.08);
        }
        .ehr-logout-eyebrow {
          margin: 0;
          color: #796f63;
          font-size: .85rem;
          font-weight: 600;
        }
        .ehr-logout h1 {
          margin: .5rem 0 0;
          color: #2b2926;
          font-family: Montserrat, Arial, sans-serif;
          font-size: 1.35rem;
          line-height: 1.2;
          text-transform: none;
          letter-spacing: 0;
        }
        .ehr-logout-copy {
          margin: .75rem 0 0;
          color: #675f54;
          font-size: .95rem;
        }
        .ehr-logout-actions {
          display: flex;
          flex-wrap: wrap;
          gap: .75rem;
          margin-top: 1.25rem;
        }
        .ehr-logout-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 2.5rem;
          padding: .6rem 1rem;
          border: 1px solid #2b2926;
          border-radius: 8px;
          color: #2b2926;
          font-size: .9rem;
          font-weight: 700;
          text-decoration: none;
        }
        .ehr-logout-link.primary {
          background: #2b2926;
          color: #fff;
        }
      `}</style>
      <div className="ehr-logout-card">
        <p className="ehr-logout-eyebrow">Revealing Leads to Healing EHR</p>
        <h1>You are logged out</h1>
        <p className="ehr-logout-copy">Return to the client/provider login when you are ready.</p>
        <div className="ehr-logout-actions">
          <Link className="ehr-logout-link primary" href="/login">
              Back to Login
            </Link>
          <Link className="ehr-logout-link" href="/">
              Return to Website
            </Link>
        </div>
      </div>
    </main>
  );
}
