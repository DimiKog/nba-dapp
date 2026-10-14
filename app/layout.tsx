import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { loadCurrentFantasyContext } from "@/lib/fantasySessionServer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My NBA",
  description: "NBA fantasy decisions, player performance and payroll",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<NavbarFallback />}>
          <NavbarWithSession />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

async function NavbarWithSession() {
  const context = await loadCurrentFantasyContext().catch(() => ({
    identity: null,
    identityHeaders: null,
    session: null,
  }));
  return (
    <Navbar
      session={context.session}
      hasAccessIdentity={Boolean(context.identity)}
    />
  );
}

function NavbarFallback() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-950/90">
      <div className="mx-auto h-14 max-w-5xl px-4" />
    </header>
  );
}
