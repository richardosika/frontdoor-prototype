import type { Metadata } from "next";
import { Inter, Libre_Baskerville } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: BRAND.name,
  description: `${BRAND.name} is an invite-only network for real estate deal teams.`,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
