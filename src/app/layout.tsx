import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displaySerif = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});

const DESCRIPTION =
  "Get real estate leads without paying upfront. Activate for $1, get matched with qualified buyer and seller opportunities, and pay a 20% referral fee only when a referred transaction closes.";

/**
 * Site-wide search and social metadata.
 *
 * `metadataBase` is what turns every relative URL below into an absolute one —
 * without it Next cannot emit a canonical tag at all, so preview deployments
 * and the live domain compete as duplicates of each other and a search engine
 * picks whichever it likes. The title template keeps the brand name in every
 * tab and every result, which is what a search for the brand matches on.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Dewilio Homes — Free-to-Start Realtor Lead Program",
    template: "%s | Dewilio Homes",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  // No `alternates.canonical` here on purpose: metadata set on the root layout
  // is inherited by every page that doesn't override it, so a canonical of "/"
  // would tell a crawler that each page IS the homepage and collapse the whole
  // site into one result. Each page declares its own, next to its own title.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Dewilio Homes — Free-to-Start Realtor Lead Program",
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dewilio Homes — Free-to-Start Realtor Lead Program",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${displaySerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
