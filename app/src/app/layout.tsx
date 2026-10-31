import type { Metadata, Viewport } from "next";
import { EB_Garamond, Libre_Franklin } from "next/font/google";
import { HelpWidget } from "@/components/help-widget";
import { LocaleProvider } from "@/components/locale-context";
import { currentLocale } from "@/lib/i18n/server";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const sans = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const serif = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.tagline,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1F3A2E",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await currentLocale().catch(() => "en" as const);
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} bg-cream font-sans text-forest antialiased`}>
        {children}
        <LocaleProvider locale={locale}>
          <HelpWidget />
        </LocaleProvider>
      </body>
    </html>
  );
}
