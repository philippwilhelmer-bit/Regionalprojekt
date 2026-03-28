export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { listBezirke } from "@/lib/content/bezirke";
import { hasEilmeldung } from "@/lib/content/articles";
import { RegionalAppBar } from "@/components/reader/RegionalAppBar";
import { RegionalNavBar } from "@/components/reader/RegionalNavBar";
import { Footer } from "@/components/reader/Footer";
import { CookieBanner } from "@/components/reader/CookieBanner";
import { BezirkModal } from "@/components/reader/BezirkModal";
import { EilmeldungBanner } from "@/components/reader/EilmeldungBanner";
import { TestSiteBanner } from "@/components/TestSiteBanner";

export function generateMetadata(): Metadata {
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE !== 'true') return {}
  return {
    robots: { index: false, follow: false },
  }
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [bezirke, eilmeldungActive] = await Promise.all([
    listBezirke(),
    hasEilmeldung(),
  ]);
  return (
    <>
      <TestSiteBanner />
      <RegionalAppBar bezirke={bezirke} />
      {eilmeldungActive && <EilmeldungBanner />}
      <main className="flex-1 pb-20">{children}</main>
      <Footer />
      <RegionalNavBar />
      <CookieBanner />
      <BezirkModal bezirke={bezirke} />
    </>
  );
}
