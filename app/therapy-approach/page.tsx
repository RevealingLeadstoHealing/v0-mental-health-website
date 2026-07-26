import { PublicSiteShell } from "../_components/public-site-shell";

const specialties = [
  {
    title: "Addiction & Recovery Care (CASAC & International Credential)",
    text: "Long-standing expertise in substance use disorders, co-occurring conditions, and family recovery.",
  },
  {
    title: "Somatic & Trauma Healing",
    text: "Specialized training in body-based trauma techniques, Polyvagal Theory, and somatic approaches.",
  },
  {
    title: "Neurodiversity & Autism Support",
    text: "Neurodiversity-affirming care, interoceptive awareness skills, and support for autistic individuals and their families.",
  },
  {
    title: "Geriatric & Older Adult Care",
    text: "Specialized support for older adults, family caregivers, individuals navigating Alzheimer's/dementia, and end-of-life care.",
  },
  {
    title: "Integrative Mental Health",
    text: "Incorporating nutritional, environmental, and whole-person wellness strategies.",
  },
];

export default function TherapyApproachPage() {
  return (
    <PublicSiteShell active="Therapy Approach">
      <section className="section-shell">
        <div className="content-card">
          <h1>Therapy Approach</h1>
          <p>
            My clinical approach is integrative and trauma-informed, grounded in
            Cognitive Behavioral Therapy (CBT), supportive psychotherapy, and
            mind-body wellness. I believe in meeting you where you are, using
            evidence-based practices to help you develop practical tools, build
            resilience, and enhance self-awareness. We will work collaboratively
            to treat the whole person—mind, body, and spirit—creating a path
            forward that feels authentic, manageable, and tailored to your
            unique goals.
          </p>
          {specialties.map((specialty) => (
            <article key={specialty.title}>
              <h2>{specialty.title}</h2>
              <p>{specialty.text}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicSiteShell>
  );
}
