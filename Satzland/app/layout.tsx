import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./components/satzland.css";
import "./components/uebung.css";
import "./components/world.css";

export const metadata: Metadata = {
  title: "Kommatrainer",
  description: "Kommasetzung für Klasse 5 und 6 im Königreich Satzland: Könige finden, Königreiche erkennen, Grenzposten setzen – mit Schreibi, der Prinzessin und Kleckser.",
  manifest: '/manifest.webmanifest',
  icons: { icon: "/favicon.svg", shortcut: "/icon-192.png" },
};
export const viewport: Viewport = { themeColor: "#2f5fb3" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <head>
        {/* Home-screen install on phones and tablets: iOS ignores SVG icons and needs its own tags. */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Kommatrainer" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Andika is designed for readers who struggle (clear letter shapes, single-storey a and g); Fredoka keeps headings friendly. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Andika:wght@400;700&family=Fredoka:wght@500;600;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
