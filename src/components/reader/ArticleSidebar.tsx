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

export function ArticleSidebar({
  publisherName,
  sourceLabel,
  readingTime,
  publishedAt,
  shareTitle,
  shareUrl,
}: ArticleSidebarProps) {
  return (
    <aside className="sticky top-[4rem]">
      <div className="p-4 bg-surface rounded-sm space-y-3">
        {/* Attribution */}
        <div>
          {sourceLabel && (
            <p className="text-sm text-slate">{sourceLabel}</p>
          )}
          <p className="font-headline text-sm text-ink-muted">Von {publisherName}</p>
        </div>

        {/* Reading time */}
        <p className="text-sm text-slate">{readingTime} Min. Lesezeit</p>

        {/* Published date */}
        {publishedAt && (
          <p className="text-sm text-slate">{publishedAt} Uhr</p>
        )}

        {/* Divider */}
        <hr className="border-parchment-dim my-4" />

        {/* Share button */}
        <ShareButton title={shareTitle} url={shareUrl} />
      </div>
    </aside>
  );
}
