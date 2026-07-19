import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "Eco Maceta CNC | Plastimad Ecuador",
  description:
    "Compra la Eco Maceta CNC de Plastimad. Producto sostenible fabricado con plástico reciclado, entrega gratuita en Quito y envíos a provincias.",
  applicationName: "Plastimad",
  keywords: [
    "Plastimad",
    "Eco Maceta CNC",
    "macetas Ecuador",
    "plástico reciclado",
    "productos sostenibles",
    "macetas Quito",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}