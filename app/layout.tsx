import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FulbitoYa! — Reservá tu cancha y jugá",
  description: "La mejor plataforma de fútbol amateur de Buenos Aires. Encontrá canchas, reservá turnos y pagá tu parte.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
