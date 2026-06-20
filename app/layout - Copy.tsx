import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revealing Leads to Healing Wellness Services, LLC",
  description: "Professional mental health and wellness services in Yonkers, New York.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
