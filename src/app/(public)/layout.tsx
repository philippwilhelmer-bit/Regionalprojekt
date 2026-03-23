import { Header } from "@/components/reader/Header";
import { BottomNav } from "@/components/reader/BottomNav";
import { Footer } from "@/components/reader/Footer";
import { CookieBanner } from "@/components/reader/CookieBanner";
import { BezirkModal } from "@/components/reader/BezirkModal";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 pb-20">{children}</main>
      <Footer />
      <BottomNav />
      <CookieBanner />
      <BezirkModal />
    </>
  );
}
