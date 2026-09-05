import FullProductionInterface from "./full-production-interface";

// The full EHR interface. Access is gated by middleware.ts (redirects to
// /login when the session cookie is absent) and the interface itself verifies
// the session via AuthProvider. Defaults to the dashboard page.
export default function EhrIndexPage() {
  return <FullProductionInterface initialPage="dashboard" />;
}
