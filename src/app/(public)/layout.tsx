import { listBezirke } from "@/lib/content/bezirke";
import { Header } from "@/components/reader/Header";
import { BottomNav } from "@/components/reader/BottomNav";
import { Footer } from "@/components/reader/Footer";
import { CookieBanner } from "@/components/reader/CookieBanner";
import { BezirkModal } from "@/components/reader/BezirkModal";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bezirke = await listBezirke();
  return (
    <>
      <Header bezirke={bezirke} />
      <main className="flex-1 pb-20">{children}</main>
      <Footer />
      <BottomNav />
      <CookieBanner />
      <BezirkModal bezirke={bezirke} />
    </>
  );
}
