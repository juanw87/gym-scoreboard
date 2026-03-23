import type { Metadata } from "next";
import { Montserrat, Roboto_Condensed } from "next/font/google";
import "./globals.css";

const titleFont = Montserrat({
  subsets: ["latin"],
  variable: "--font-title",
  weight: ["600", "700", "800"]
});

const bodyFont = Roboto_Condensed({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "700", "800"]
});

export const metadata: Metadata = {
  title: "Gym Scoreboard",
  description:
    "Digitaliza la pizarra del box, sigue el progreso de cada atleta y crea competencia diaria entre amigos."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${titleFont.variable} ${bodyFont.variable}`}>{children}</body>
    </html>
  );
}
