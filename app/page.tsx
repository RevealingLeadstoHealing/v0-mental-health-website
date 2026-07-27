import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xl font-bold text-teal-800 tracking-tight">
            Revealing Leads to Healing Wellness Services, LLC
          </div>
          <nav className="flex items-center space-x-6 text-sm font-semibold text-slate-600">
            <a href="#about" className="hover:text-teal-700 transition-colors">About</a>
            <a href="#services" className="hover:text-teal-700 transition-colors">Services</a>
            <a href="#insurance" className="hover:text-teal-700 transition-colors">Insurance</a>
            <a href="#contact" className="hover:text-teal-700 transition-colors">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-teal-900 to-teal-800 text-white py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Supportive, Person-Centered Therapy Tailored to You
          </h1>
          <p className="text-lg md:text-xl text-teal-100 max-w-2xl mx-auto">
            Empowering individuals through compassionate clinical social work and evidence-based care.
          </p>
          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <a
              href="#contact"
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-6 py-3 rounded-lg shadow-md transition-all"
            >
              Schedule Consultation
            </a>
            <a
              href="#insurance"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-lg border border-white/30 transition-all"
            >
              View Accepted Insurance
            </a>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-16 space-y-16">
        {/* About Section */}
        <section id="about" className="scroll-mt-24 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 border-b-2 border-teal-600 pb-2 inline-block">
            About the Practice
          </h2>
          <p className="text-lg leading-relaxed text-slate-700">
            At Revealing Leads to Healing Wellness Services, LLC, care is built on empathy, trust, and practical solutions. Whether navigating daily stress, life transitions, or complex emotional challenges, you will find a safe and structured environment to heal and grow.
          </p>
        </section>

        {/* Insurance Section */}
        <section id="insurance" className="scroll-mt-24 space-y-6 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 border-b-2 border-teal-600 pb-2 inline-block">
            In-Network Insurance Plans
          </h2>
          <p className="text-slate-600">
            We proudly accept the following major health insurance providers to make care accessible:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg text-center font-bold text-teal-900 shadow-sm">
              Aetna
            </div>
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg text-center font-bold text-teal-900 shadow-sm">
              Cigna
            </div>
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg text-center font-bold text-teal-900 shadow-sm">
              Optum / UnitedHealthcare
            </div>
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg text-center font-bold text-teal-900 shadow-sm">
              Oscar Health
            </div>
          </div>
        </section>

        {/* Contact & Location Section */}
        <section id="contact" className="scroll-mt-24 space-y-4 bg-slate-900 text-white p-8 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-amber-400 border-b-2 border-amber-400 pb-2 inline-block">
            Contact & Location
          </h2>
          <div className="space-y-2 text-slate-300">
            <p className="font-semibold text-lg text-white">Revealing Leads to Healing Wellness Services, LLC</p>
            <p>Yonkers, NY 10703</p>
            <p className="pt-2 text-sm text-slate-400">
              Ready to take the next step? Reach out today to confirm your coverage and set up your initial visit.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 py-6 text-center text-sm">
        © Revealing Leads to Healing Wellness Services, LLC. All rights reserved.
      </footer>
    </div>
  );
}
