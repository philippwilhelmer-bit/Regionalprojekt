"use client";

import { ShareButton } from "@/components/reader/ShareButton";

interface ArticleSidebarProps {
  publisherName: string;
  sourceLabel: string | null;
  readingTime: number;
  publishedAt: string | null;
  shareTitle: string;
  shareUrl: string;
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest font-bold text-ink-muted mb-2">
        {label}
      </p>
      <p className="font-headline italic text-lg text-ink">{value}</p>
    </div>
  );
}

export function ArticleSidebar({
  publisherName,
  sourceLabel,
  readingTime,
  publishedAt,
  shareTitle,
  shareUrl,
}: ArticleSidebarProps) {
  return (
    <aside className="sticky top-24 space-y-8">
      <MetaItem label="Herausgeber" value={publisherName} />
      <MetaItem label="Lesezeit" value={`${readingTime} Minuten`} />
      {publishedAt && <MetaItem label="Erschienen" value={`${publishedAt} Uhr`} />}
      {sourceLabel && <MetaItem label="Quelle" value={sourceLabel.replace(/^Quelle: /, "")} />}

      <div className="pt-4 border-t border-outline-variant/20">
        <ShareButton title={shareTitle} url={shareUrl} />
      </div>
    </aside>
  );
}
