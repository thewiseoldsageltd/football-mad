export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

export function countOccurrences(text: string, searchTerm: string): number {
  const normalizedText = normalizeText(text);
  const normalizedTerm = normalizeText(searchTerm);
  
  if (!normalizedTerm) return 0;
  
  const words = normalizedText.split(/\s+/);
  const termWords = normalizedTerm.split(/\s+/);
  
  if (termWords.length === 1) {
    return words.filter(w => w === normalizedTerm).length;
  }
  
  let count = 0;
  for (let i = 0; i <= words.length - termWords.length; i++) {
    const slice = words.slice(i, i + termWords.length);
    if (slice.join(" ") === normalizedTerm) {
      count++;
    }
  }
  return count;
}

export function computeSalienceScore(
  entityName: string,
  title: string,
  excerpt: string | null,
  body: string | null
): number {
  const normalizedName = normalizeText(entityName);
  if (!normalizedName) return 0;
  
  let score = 0;
  
  if (title && normalizeText(title).includes(normalizedName)) {
    score += 50;
  }
  
  if (excerpt && normalizeText(excerpt).includes(normalizedName)) {
    score += 25;
  }
  
  if (body) {
    const first300Words = body.split(/\s+/).slice(0, 300).join(" ");
    if (normalizeText(first300Words).includes(normalizedName)) {
      score += 10;
    }
    
    const bodyCount = countOccurrences(body, entityName);
    score += Math.min(30, bodyCount * 3);
  }
  
  return score;
}
