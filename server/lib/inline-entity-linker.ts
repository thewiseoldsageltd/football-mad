import * as cheerio from "cheerio";

export type InlineEntityType = "team" | "competition" | "player" | "manager";

export interface InlineLinkEntity {
  id: string;
  type: InlineEntityType;
  name: string;
  href: string;
  candidates?: string[];
}

const EXCLUDED_TAGS = new Set([
  "a",
  "code",
  "pre",
  "script",
  "style",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildFirstMentionRegex(entityName: string): RegExp {
  // Match case-insensitively while preserving original casing in output.
  // Surrounding boundaries avoid linking inside longer alphanumeric tokens.
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])(${escapeRegExp(entityName)})(?=$|[^\\p{L}\\p{N}])`,
    "iu",
  );
}

function normalizeCandidate(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/^tag:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function collectEligibleTextNodes($: cheerio.CheerioAPI, root: any): any[] {
  const nodes: any[] = [];

  const visit = (node: any) => {
    if (node.type === "text") {
      const text = (node.data ?? "").trim();
      if (text.length > 0) nodes.push(node);
      return;
    }

    if (node.type !== "tag") return;
    const tagName = (node.tagName || "").toLowerCase();
    if (EXCLUDED_TAGS.has(tagName)) return;

    const children = node.children ?? [];
    for (const child of children) visit(child as any);
  };

  const children = root.children ?? [];
  for (const child of children) visit(child as any);
  return nodes;
}

function isExcludedParagraph($p: cheerio.Cheerio<any>): boolean {
  // Avoid image captions/description text blocks.
  if ($p.closest("figcaption,figure").length > 0) return true;
  const cls = ($p.attr("class") || "").toLowerCase();
  if (cls.includes("caption") || cls.includes("image-description")) return true;
  return false;
}

export function linkArticleHtmlFirstMentions(
  html: string | null | undefined,
  entities: InlineLinkEntity[],
): string {
  if (!html || html.trim().length === 0) return html ?? "";
  if (!entities || entities.length === 0) return html;

  const unique = new Map<string, InlineLinkEntity>();
  for (const entity of entities) {
    const name = entity.name?.trim();
    const href = entity.href?.trim();
    if (!name || !href) continue;
    const candidateSet = new Set<string>();
    candidateSet.add(normalizeCandidate(name));
    for (const candidate of entity.candidates ?? []) {
      const normalized = normalizeCandidate(candidate);
      if (normalized.length > 1) candidateSet.add(normalized);
    }

    const key = `${entity.type}:${entity.id}`;
    if (!unique.has(key)) {
      unique.set(key, {
        ...entity,
        name,
        href,
        candidates: Array.from(candidateSet).sort((a, b) => b.length - a.length),
      });
    }
  }
  const queue = Array.from(unique.values()).sort((a, b) => b.name.length - a.name.length);
  if (queue.length === 0) return html;

  const $ = cheerio.load(html);
  const linked = new Set<string>();
  const docText = $.text();

  const paragraphs = $("p").toArray();
  for (const entity of queue) {
    const key = `${entity.type}:${entity.id}`;
    if (linked.has(key)) continue;
    const candidates = (entity.candidates && entity.candidates.length > 0)
      ? entity.candidates
      : [entity.name];

    let chosenCandidate: string | null = null;
    for (const candidate of candidates) {
      if (!candidate) continue;
      const candidateRegex = buildFirstMentionRegex(candidate);
      if (candidateRegex.test(docText)) {
        chosenCandidate = candidate;
        break;
      }
    }
    if (!chosenCandidate) continue;

    const regex = buildFirstMentionRegex(chosenCandidate);
    let didLink = false;

    for (const paragraph of paragraphs) {
      if (didLink) break;
      const $p = $(paragraph);
      if (isExcludedParagraph($p)) continue;

      const textNodes = collectEligibleTextNodes($, paragraph);
      for (const node of textNodes) {
        const rawText = node.data ?? "";
        regex.lastIndex = 0;
        const match = regex.exec(rawText);
        if (!match) continue;

        const prefix = match[1] ?? "";
        const matchedText = match[2] ?? "";
        const start = (match.index ?? 0) + prefix.length;
        const before = rawText.slice(0, start);
        const after = rawText.slice(start + matchedText.length);
        const replacement =
          `${escapeHtml(before)}` +
          `<a href="${escapeHtml(entity.href)}">${escapeHtml(matchedText)}</a>` +
          `${escapeHtml(after)}`;

        $(node).replaceWith(replacement);
        linked.add(key);
        didLink = true;
        break;
      }
    }
  }

  return $.root().html() ?? html;
}
