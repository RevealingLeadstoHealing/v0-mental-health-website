export type FaqItem = {
  question: string;
  answer: string;
};

export type ServiceItem = {
  title: string;
  description: string;
};

export type TestimonialItem = {
  quote: string;
};

export type SiteContent = {
  // Site meta
  siteTitle: string;
  metaDescription: string;

  // Hero / banner
  heroHeading: string;
  heroParagraph1: string;
  heroParagraph2: string;
  heroParagraph3: string;
  heroCtaText: string;
  heroCtaHref: string;

  // Therapy approaches section
  therapyHeading: string;
  therapyDescription: string;

  // About the therapist
  aboutHeading: string;
  aboutBio: string;
  aboutDetails: string;

  // Services section
  servicesHeading: string;
  servicesDescription: string;
  servicesSummary: string;
  serviceItems: ServiceItem[];

  // FAQ
  faqHeading: string;
  faqItems: FaqItem[];

  // Testimonials
  testimonialHeading: string;
  testimonials: TestimonialItem[];

  // Contact info
  contactHeading: string;
  businessName: string;
  officeAddress: string;
  phone: string;
  fax: string;
  email: string;
  availability: string;

  // Footer
  footerText: string;
};

export const defaultSiteContent: SiteContent = {
  siteTitle: "Revealing Leads to Healing Wellness Services, LLC",
  metaDescription:
    "Compassionate mental health and wellness services providing trauma-informed care, counseling, case management, advocacy, and holistic support for individuals and families seeking healing, empowerment, and emotional wellness.",

  heroHeading: "Your Path to Wellness Starts Here",
  heroParagraph1:
    "At Revealing Leads to Healing Wellness Services, LLC, I believe that emotional wellness is a journey we navigate together. Whether you are seeking deep trauma processing, navigating the complexities of recovery, or looking to break through anxiety and grief, you deserve a space that respects your unique story.",
  heroParagraph2:
    "To ensure your care fits seamlessly into your life, I provide flexible options tailored to your comfort. You can choose to meet with me for dedicated, face-to-face sessions at my Yonkers office, or connect securely from anywhere across New York State through our premier Telehealth platform.",
  heroParagraph3:
    "Healing is entirely possible, and you do not have to take the first step alone. Let\u2019s work together to build the resilience, coping strategies, and insights necessary to reclaim your life.",
  heroCtaText: "Book a Complimentary Consultation",
  heroCtaHref: "mailto:revealtohealllc@gmail.com",

  therapyHeading: "Therapy Approaches Tailored for Everyone",
  therapyDescription:
    "At Revealing Leads to Healing Wellness Services, we believe in providing compassionate and personalized care for individuals from all walks of life. Our therapy approaches are highly adaptable, designed to meet the unique needs of people across all ages, whether you\u2019re a child, teenager, adult, or senior. We are proud to support members of the LGBTQ+ community, ensuring a safe, affirming, and nonjudgmental space for exploration, healing, and growth.",

  aboutHeading: "Meet Kenseener Carpenter, MA, LCSW, CCTP, CGP, CASAC-M",
  aboutBio:
    "Kenseener is a highly skilled and compassionate Licensed Social Worker based in Yonkers, New York. With a thriving private psychotherapy practice, Kay offers a range of counseling services tailored to meet the needs of her clients. She specializes in providing individual, marital, family, and group therapy, working closely with both adults and teenagers to foster growth, healing, and resilience. Whether you are navigating personal challenges or seeking support for your relationships, Kay\u2019s expertise ensures a safe and supportive environment where meaningful change can happen.",
  aboutDetails:
    "Kenseener specializes in guiding clients through a transformative journey of self-discovery and healing. By helping individuals pinpoint the origin of their suffering, uncover the beliefs and self-judgments formed during those experiences, and explore how these have shaped their lives, Kay fosters deeper understanding and personal growth. Through thoughtful and insightful questioning, coupled with active listening, Kay identifies core concerns and encourages healing in a compassionate and supportive environment.",

  servicesHeading: "Services & Availability",
  servicesDescription:
    "Services are available for adolescents, adults, couples, and families through both in-person and telehealth sessions. Areas of support include anxiety, depression, trauma, life transitions, relationship concerns, substance use recovery support, identity exploration, emotional wellness, and personal growth. We strive to provide a safe, affirming, culturally responsive, and compassionate environment where healing and self-discovery can take place at your own pace.",
  servicesSummary:
    "Individual therapy, couples counseling, family support services, trauma-informed care, anxiety and depression treatment, substance use recovery support, identity exploration, life transition support, and culturally responsive psychotherapy services are available based on client needs and clinical appropriateness.",

  serviceItems: [
    {
      title: "Trauma & PTSD Recovery",
      description:
        "Specialized clinical care for individuals navigating trauma, profound grief, loss, and life transitions. Utilizing my credentials as a Certified Clinical Trauma Professional (CCTP), we work together to process past experiences and build a path toward lasting emotional freedom.",
    },
    {
      title: "Addiction & Substance Use Support",
      description:
        "Master-level expertise (CASAC-M) in treating alcohol and substance use disorders. I provide a compassionate, non-judgmental space for individuals and families focusing on recovery, harm reduction, and co-occurring mental health challenges.",
    },
    {
      title: "Integrative & Evidence-Based Modalities",
      description:
        "A holistic approach to healing that incorporates powerful, proven clinical interventions tailored to you. My practice actively integrates Eye Movement Desensitization and Reprocessing (EMDR), Dialectical Behavior Therapy (DBT), and Cognitive Behavioral Therapy (CBT) to treat the whole person.",
    },
  ],

  faqHeading: "FAQ",
  faqItems: [
    {
      question: "How do I schedule a consultation or appointment?",
      answer:
        "Use the contact form to submit an inquiry for services. You may also call for additional information regarding availability, consultation requests, and scheduling options. Responses are typically returned within 24\u201348 business hours.",
    },
    {
      question: "Do you offer telehealth services?",
      answer:
        "Yes. Telehealth services are available for eligible clients throughout New York State. In-person availability may be limited and discussed during consultation.",
    },
    {
      question: "What insurance do you accept?",
      answer:
        "Please contact us directly for current insurance and payment information.",
    },
    {
      question: "What areas do you serve?",
      answer:
        "We are based in Yonkers, New York, and serve clients throughout the greater New York area via telehealth.",
    },
  ],

  testimonialHeading: "What Our Clients Say",
  testimonials: [
    { quote: "I can\u2019t say enough about the outstanding care I received. Truly life-changing." },
    { quote: "RTH has been an incredible help. The support I\u2019ve received has been phenomenal." },
    { quote: "RTH is helping me deal with things I\u2019ve never been able to address before." },
    { quote: "Very thoughtful therapist who truly listens and helps you grow." },
    { quote: "Kay challenges my thinking, which has helped me make real progress." },
    { quote: "Kay is helping me so much. She genuinely cares about her clients." },
  ],

  contactHeading: "Contact Us",
  businessName: "Revealing Leads to Healing Wellness Services, LLC",
  officeAddress: "119 DeHaven Dr, Yonkers, NY 10703",
  phone: "(914) 635-2687",
  fax: "(914) 371-3845",
  email: "Info@revealing-leads-to-healing-wellness-services.org",
  availability: "In-Person Sessions in Yonkers & Secure Telehealth Services across New York State.",

  footerText:
    "\u00a9 2024\u20132025 Revealing Leads to Healing Wellness Services, LLC. All rights reserved.",
};
