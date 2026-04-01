export function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function isBlockquote(paragraph: string): boolean {
  return paragraph.startsWith(">") || paragraph.startsWith("\u201E");
}

export function stripBlockquotePrefix(paragraph: string): string {
  return paragraph.replace(/^[>"\u00BB\u201E]\s*/, "");
}
