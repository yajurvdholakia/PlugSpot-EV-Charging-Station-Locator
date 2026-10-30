/* eslint-disable @next/next/no-css-tags */
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { DM_Serif_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "PlugSpot — EV Charging Station Finder | Gandhinagar & Ahmedabad",
  description:
    "Find nearby EV charging stations across Gandhinagar, Ahmedabad & nearby areas. Live availability, filters, reviews, cost calculator, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <link rel="stylesheet" href="/css/styles.css" />
        {/* Prevent dark-mode FOUC: set theme before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
        {/* Hide all Next.js dev overlays (error badges, build indicators, etc.) */}
        <style dangerouslySetInnerHTML={{ __html: `
          [data-nextjs-dialog-overlay],
          [data-nextjs-toast],
          nextjs-portal,
          #nextjs__container_errors_,
          #nextjs__container_build_,
          .nextjs__container_errors_,
          .nextjs__container_build_ {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }
        `}} />
      </head>
      <body className={`${geistSans.variable} ${dmSerif.variable}`}>{children}</body>
    </html>
  );
}
