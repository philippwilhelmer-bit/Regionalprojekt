import type { Metadata } from "next";
import { Newsreader, Inter, Work_Sans } from "next/font/google";
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

const inter = Inter({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const workSans = Work_Sans({
  weight: ['500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-work-sans',
});

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
    <html lang="de" className={`h-full antialiased ${newsreader.variable} ${inter.variable} ${workSans.variable}`}>
      <body className="min-h-full flex flex-col bg-cream text-zinc-900 antialiased">
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
