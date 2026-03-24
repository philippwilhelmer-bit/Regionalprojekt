import type { Metadata } from "next";
import Script from "next/script";
import config from '@/../bundesland.config';
import "./globals.css";

export const metadata: Metadata = {
  title: config.siteName,
  description: "Aktuelle Nachrichten aus der Steiermark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 antialiased font-sans">
        {children}
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
