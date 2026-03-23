import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
