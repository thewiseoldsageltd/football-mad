/**
 * PA Media Content API client. Endpoint-agnostic: uses env for base URL and optional items path.
 * PAMEDIA_API_BASE_URL (default https://content.api.pressassociation.io/v1)
 * PAMEDIA_ITEMS_PATH (default /item) - path appended to base for items listing
 */

const DEFAULT_BASE = "https://content.api.pressassociation.io/v1";
const DEFAULT_ITEMS_PATH = "/item";

export interface PamediaItemNormalized {
  uri: string;
  issued: string; // ISO date string
  versionCreated?: string;
  headline?: string;
  bodyHtml?: string;
  bodyText?: string;
  associations?: unknown;
  [key: string]: unknown;
}

/** Adapter: response may have items or data array; normalize raw item to common shape. */
function normalizeItem(raw: Record<string, unknown>): PamediaItemNormalized | null {
  const uri =
    (raw.uri as string) ??
    (raw.id as string) ??
    (raw["@uri"] as string) ??
    (raw["@id"] as string);
  if (!uri || typeof uri !== "string") return null;

  const issued =
    (raw.issued as string) ??
    (raw["versioncreated"] as string) ??
    (raw.versionCreated as string) ??
    (raw["firstpublished"] as string);
  const versionCreated =
    (raw.versioncreated as string) ??
    (raw.versionCreated as string) ??
    (raw.updated as string) ??
    issued;
  const headline =
    (raw.headline as string) ??
    (raw.title as string) ??
    (raw.name as string) ??
    "";
  const bodyHtml =
    (raw.body_html as string) ??
    (raw.bodyHtml as string) ??
    (raw["body_html"] as string);
  const bodyText =
    (raw.body_text as string) ??
    (raw.bodyText as string) ??
    (raw["body_text"] as string);
  const associations = raw.associations ?? raw.related ?? raw.media;

  return {
    uri,
    issued: issued && typeof issued === "string" ? issued : "",
    versionCreated: versionCreated && typeof versionCreated === "string" ? versionCreated : undefined,
    headline: headline && typeof headline === "string" ? headline : "",
    bodyHtml: bodyHtml && typeof bodyHtml === "string" ? bodyHtml : undefined,
    bodyText: bodyText && typeof bodyText === "string" ? bodyText : undefined,
    associations,
    ...raw,
  };
}

/** Extract items array from response: support items or data. */
function getItemsArray(response: Record<string, unknown>): unknown[] {
  const arr = response.items ?? response.data ?? response.results ?? response._items;
  return Array.isArray(arr) ? arr : [];
}

function getItemsUrl(): string {
  const base = (process.env.PAMEDIA_API_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  const path = (process.env.PAMEDIA_ITEMS_PATH ?? DEFAULT_ITEMS_PATH).replace(/^\//, "");
  return path ? `${base}/${path}` : base;
}

export interface FetchItemsOptions {
  /** Max items to return across all pages (soft limit; we stop after this many). */
  limit?: number;
  /** Stop when we've seen an item with (issued, uri) <= (cursorIssued, cursorUri). */
  cursorIssued?: string;
  cursorUri?: string;
  /** Query params to append (e.g. sort=issued:desc&sort=uri:asc). API-specific. */
  extraParams?: Record<string, string>;
}

/**
 * Fetch items from PA Media API. Paginates until limit reached or items are older than cursor.
 * Response shape is adapter-agnostic (items or data array); each item is normalized.
 */
export async function fetchPaMediaItems(
  options: FetchItemsOptions = {}
): Promise<{ items: PamediaItemNormalized[]; nextCursor?: { issued: string; uri: string } }> {
  const { limit = 500, cursorIssued, cursorUri, extraParams = {} } = options;
  const apiKey = process.env.PAMEDIA_API_KEY;
  if (!apiKey) {
    throw new Error("PAMEDIA_API_KEY is not set");
  }

  const baseUrl = getItemsUrl();
  const collected: PamediaItemNormalized[] = [];
  let pageCursor: string | undefined;
  let nextCursor: { issued: string; uri: string } | undefined;

  const compareCursor = (issued: string, uri: string): boolean => {
    if (!cursorIssued) return false;
    const issuedDate = new Date(issued).getTime();
    const cursorDate = new Date(cursorIssued).getTime();
    if (issuedDate < cursorDate) return true;
    if (issuedDate > cursorDate) return false;
    if (cursorUri != null && uri !== undefined) return uri <= cursorUri;
    return false;
  };

  for (;;) {
    const url = new URL(baseUrl);
    url.searchParams.append("sort", "issued:desc");
    url.searchParams.append("sort", "uri:asc");
    Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
    if (pageCursor) url.searchParams.set("cursor", pageCursor);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PA Media API error ${res.status}: ${text.slice(0, 500)}`);
    }

    const body = (await res.json()) as Record<string, unknown>;
    const rawItems = getItemsArray(body);

    for (const raw of rawItems) {
      if (typeof raw !== "object" || raw === null) continue;
      const item = normalizeItem(raw as Record<string, unknown>);
      if (!item) continue;
      if (cursorIssued && compareCursor(item.issued, item.uri)) {
        return { items: collected, nextCursor };
      }
      collected.push(item);
      nextCursor = { issued: item.issued, uri: item.uri };
      if (collected.length >= limit) {
        return { items: collected, nextCursor };
      }
    }

    const links = body._links as Record<string, unknown> | undefined;
    const nextLink = links?.next as Record<string, unknown> | undefined;
    const next = (body.next_cursor ?? body.nextCursor ?? body.cursor ?? nextLink?.href) as
      | string
      | undefined;
    if (!next || rawItems.length === 0) {
      return { items: collected, nextCursor: nextCursor ?? undefined };
    }
    pageCursor = typeof next === "string" && next.startsWith("http") ? new URL(next).searchParams.get("cursor") ?? next : next;
  }
}
