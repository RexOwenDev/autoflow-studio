import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DemoBanner } from "@/components/marketing/demo-banner";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "AutoFlow Studio", template: "%s | AutoFlow Studio" },
  description:
    "Multi-tenant automation management platform — enterprise-grade workflow operations without touching the automation engine.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://autoflow-studio.example.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[60] focus:rounded focus:bg-zinc-900 focus:px-3 focus:py-1.5 focus:text-sm focus:text-zinc-50"
        >
          Skip to content
        </a>
        <PostHogProvider>
          <DemoBanner />
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
