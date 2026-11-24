import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ContactButton } from "@/components/contact-button";
import { SiteFooter, SiteHeader, TabBar } from "@/components/site-chrome";
import { site } from "@/content/site";
import { csp } from "./csp";
import { baseOpenGraph } from "./shared-metadata";
import "./globals.css";

// Self-hosted at build time by next/font, so no request goes to Google (and the CSP holds).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400" });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  // Absolute URLs for Open Graph images and links.
  metadataBase: site.url ? new URL(site.url) : undefined,
  title: { default: `${site.name} · ${site.role}`, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: baseOpenGraph,
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0e",
  colorScheme: "dark",
};

// Structured data for search engines. Only fields from `site`; nothing added.
const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  jobTitle: site.role,
  ...(site.url && { url: `${site.url}/` }),
  ...(site.email && { email: site.email }),
  sameAs: [site.linkedin, site.github].filter(Boolean),
};
// "<" escaped so content can never close the script tag.
const personJson = JSON.stringify(person).replace(/</g, "\\u003c");

// Runs before paint so a visitor who switched decorative motion off doesn't see it start.
const motionScript = `(function(){try{if(localStorage.getItem("motion")==="off")document.documentElement.dataset.motion="off"}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      suppressHydrationWarning
      className={`${inter.variable} ${instrument.variable} ${jetbrains.variable} h-full`}
    >
      <head>
        {process.env.NODE_ENV === "production" && <meta httpEquiv="Content-Security-Policy" content={csp} />}
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJson }} />
      </head>
      <body className="relative flex min-h-full flex-col overflow-x-clip">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-chip focus:bg-accent focus:px-4 focus:py-3 focus:font-medium focus:text-accent-fg"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="relative flex-1">
          {children}
        </main>
        <SiteFooter />
        <TabBar />
        <ContactButton />
        <Analytics />
      </body>
    </html>
  );
}
