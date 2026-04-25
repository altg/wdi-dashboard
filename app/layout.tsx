import type { Metadata } from "next";
import "./globals.css";
import { DATA_SOURCE } from "@/lib/data-source";
import { NavBar } from "@/components/nav-bar";

export const metadata: Metadata = {
  title: "WDI Dashboard",
  description: "World Development Indicators — policy analyst deep-dive",
};

// Runs before hydration to apply the saved theme with no flash
const themeScript = `(function(){try{var t=localStorage.getItem('wdi_theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isLocal = DATA_SOURCE === "local";
  return (
    <html lang="en" className="h-full">
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <NavBar isLocal={isLocal} />
        {children}
      </body>
    </html>
  );
}
