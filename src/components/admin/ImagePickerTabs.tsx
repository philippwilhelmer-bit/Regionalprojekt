'use client'

import { useState } from 'react'
import { UnsplashPicker } from '@/components/admin/UnsplashPicker'
import { MapPicker } from '@/components/admin/MapPicker'

interface ImagePickerTabsProps {
  articleId: number
  headline: string
  currentImageUrl: string | null
  currentImageCredit: string | null
}

export function ImagePickerTabs({
  articleId,
  headline,
  currentImageUrl,
  currentImageCredit,
}: ImagePickerTabsProps) {
  const [activeTab, setActiveTab] = useState<0 | 1>(
    currentImageCredit === '© basemap.at' ? 1 : 0
  )

  const tabBase = 'px-4 py-2 text-sm border-b-2 transition-colors'
  const activeClass = 'border-ink text-ink font-medium'
  const inactiveClass = 'border-transparent text-ink-muted hover:text-ink'

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-ink-muted">Artikelbild</label>

      {/* Tab bar */}
      <div className="flex border-b border-surface">
        <button
          type="button"
          onClick={() => setActiveTab(0)}
          className={`${tabBase} ${activeTab === 0 ? activeClass : inactiveClass}`}
        >
          Unsplash
        </button>
        <button
          type="button"
          onClick={() => setActiveTab(1)}
          className={`${tabBase} ${activeTab === 1 ? activeClass : inactiveClass}`}
        >
          Karte
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 0 ? (
        <UnsplashPicker
          articleId={articleId}
          headline={headline}
          currentImageUrl={currentImageUrl}
          currentImageCredit={currentImageCredit}
        />
      ) : (
        <MapPicker
          articleId={articleId}
          currentImageUrl={currentImageUrl}
          currentImageCredit={currentImageCredit}
        />
      )}
    </div>
  )
}
