/** Estimated read time in minutes from HTML article body. */
export function calculateArticleReadTimeMinutes(content: string | null | undefined): number {
  const text = (content ?? "").replace(/<[^>]*>/g, "");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}
