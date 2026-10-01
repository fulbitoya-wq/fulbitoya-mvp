import type { Metadata } from "next";
import { Manrope, Teko } from "next/font/google";
import "./globals.css";

const teko = Teko({
  subsets: ["latin"],
  variable: "--font-teko",
  weight: ["500", "600", "700"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "PorLaCancha",
    template: "%s · PorLaCancha",
  },
  description: "PorLaCancha. Y algo más. Desafíos de fútbol amateur con premio. Armá tu equipo y jugate.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://porlacancha.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className={`${teko.variable} ${manrope.variable} antialiased`}>{children}</body>
    </html>
  );
}
