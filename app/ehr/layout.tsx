export default function EhrLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* EHR shell-only overrides. Clinical content and workflows are untouched. */
        @media (min-width: 1024px) {
          .ehr-ui .lg\\:grid-cols-\\[320px_1fr\\] {
            grid-template-columns: 320px minmax(0, 1fr) !important;
          }

          .ehr-ui > .min-h-screen > .grid > aside {
            position: sticky;
            top: 0;
            height: 100vh;
            overflow-y: auto;
            align-self: start;
          }

          .ehr-ui > .min-h-screen > .grid > main {
            min-width: 0;
            width: 100%;
          }
        }

        /* Keep the selected module visually clear without changing module behavior. */
        .ehr-ui nav a.bg-slate-900 {
          background: #2563eb !important;
          color: #ffffff !important;
        }

        .ehr-ui nav a:not(.bg-slate-900):hover {
          background: #eff6ff !important;
        }
      `}</style>
      {children}
    </>
  );
}
