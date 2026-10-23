import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unthaw — Every freeze melts one micro-step at a time",
  description:
    "Accessible executive-dysfunction and task-paralysis breaker. Hides overwhelming backlogs behind Blindfold Mode and surfaces one 90-second physical action at a time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased selection:bg-emerald-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
