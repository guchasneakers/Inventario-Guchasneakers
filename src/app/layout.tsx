import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GUCHA SNEAKERS — Inventario",
  description: "Gestión de inventario de sneakers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}<Analytics /></body>
    </html>
  );
}
