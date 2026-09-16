import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { SeasonProvider } from "@/components/providers/SeasonProvider";

export const viewport: Viewport = {
  themeColor: "#0284c7",
};

export const metadata: Metadata = {
  title: "Club Sporting Saladar - Gestión Integral",
  description: "Plataforma Oficial de Gestión del Club Sporting Saladar",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sporting Saladar",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased font-sans">
        <SeasonProvider>
          {children}
          <Toaster />
        </SeasonProvider>
      </body>
    </html>
  );
}
