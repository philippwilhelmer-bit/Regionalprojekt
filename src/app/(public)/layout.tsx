export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { listBezirke } from "@/lib/content/bezirke";
import { hasEilmeldung } from "@/lib/content/articles";
import { LodenAppBar } from "@/components/reader/LodenAppBar";
import { LodenNavBar } from "@/components/reader/LodenNavBar";
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
      <LodenAppBar bezirke={bezirke} />
      {eilmeldungActive && <EilmeldungBanner />}
      <main className="flex-1 pb-20">{children}</main>
      <Footer />
      <LodenNavBar />
      <CookieBanner />
      <BezirkModal bezirke={bezirke} />
    </>
  );
}
