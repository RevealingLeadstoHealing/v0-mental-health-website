// Amplify SSR can expose an internal request URL behind its public HTTPS host.
// Trust only this EHR's exact public origins, never caller-supplied proxy headers.
const productionOrigins = new Set([
  'https://ehr.revealing-leads-to-healing-wellness-services.org',
  'https://aws-ehr-production.d1mwc7x488m8xn.amplifyapp.com',
]);

export function isAllowedTelehealthOrigin(request: Request, production = true) {
  const origin = request.headers.get('origin');
  // Preserve authenticated non-browser clients; authentication is enforced by the route.
  if (!origin) return true;
  if (productionOrigins.has(origin)) return true;
  return !production && origin === new URL(request.url).origin;
}
