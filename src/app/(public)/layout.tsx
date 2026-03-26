export const dynamic = 'force-dynamic'

import { listBezirke } from "@/lib/content/bezirke";
import { hasEilmeldung } from "@/lib/content/articles";
import { Header } from "@/components/reader/Header";
import { BottomNav } from "@/components/reader/BottomNav";
import { Footer } from "@/components/reader/Footer";
import { CookieBanner } from "@/components/reader/CookieBanner";
import { BezirkModal } from "@/components/reader/BezirkModal";
import { EilmeldungBanner } from "@/components/reader/EilmeldungBanner";

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
      <Header bezirke={bezirke} />
      {eilmeldungActive && <EilmeldungBanner />}
      <main className="flex-1 pb-20">{children}</main>
      <Footer />
      <BottomNav />
      <CookieBanner />
      <BezirkModal bezirke={bezirke} />
    </>
  );
}
