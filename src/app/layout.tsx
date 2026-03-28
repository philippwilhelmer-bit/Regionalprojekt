import React from "react";
import type { Metadata } from "next";
import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import config from '@/../bundesland.config';
import "./globals.css";

const newsreader = Newsreader({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-newsreader',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: config.siteName,
  description: "Wurzelwelt — Nachrichten aus der Steiermark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isTestSite = process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true'
  return (
    <html lang="de" className={`h-full antialiased ${newsreader.variable} ${plusJakartaSans.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-zinc-900 antialiased">
        {children}
        {!isTestSite && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  );
}
