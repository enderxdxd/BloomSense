import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Karla } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { CartDrawer } from "@/components/shop/CartDrawer";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Landing v2 body face (design handoff); the rest of the app stays on Inter.
const karla = Karla({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-karla",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BloomSense — AI-Powered Floral Experience",
  description:
    "Take a guided quiz and discover your personal floral profile, curated by AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${karla.variable}`}>
      <body className="min-h-screen">
        <SiteHeader />
        {children}
        <CartDrawer />
      </body>
    </html>
  );
}
