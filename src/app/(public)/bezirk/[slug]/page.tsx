import { notFound } from "next/navigation";
import Link from "next/link";
import { getBezirkBySlug } from "@/lib/content/bezirke";
import { listArticlesReader } from "@/lib/content/articles";
import { ArticleFeed } from "@/components/reader/ArticleFeed";

type Props = { params: Promise<{ slug: string }> };

export default async function BezirkPage({ params }: Props) {
  const { slug } = await params;
  const bezirk = await getBezirkBySlug(slug);
  if (!bezirk) notFound();

  const articles = await listArticlesReader({ bezirkIds: [bezirk.id], limit: 20 });

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="px-4 pt-4 pb-2 text-xs text-zinc-500 flex items-center gap-1">
        <Link href="/" className="hover:text-zinc-700 transition-colors">
          Home
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-zinc-800 font-medium">{bezirk.name}</span>
      </nav>

      <div className="px-4 pb-4">
        <h1 className="text-xl font-bold text-zinc-900">{bezirk.name}</h1>
        <p className="text-xs text-zinc-500">Nachrichten aus {bezirk.name}</p>
      </div>

      <ArticleFeed initialArticles={articles} />
    </div>
  );
}
