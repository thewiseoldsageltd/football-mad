/**
 * Player Hub Phase A SEO helpers — indexability and copy from known values only.
 */

import { formatPlayerPositionLabel, parseShirtNumber } from "./player-current-club";

export type PlayerProfileIndexabilityInput = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  goalservePlayerId?: string | null;
  currentClubReliable: boolean;
  hasImage?: boolean;
  nationality?: string | null;
  age?: number | null;
  hasRelatedArticles?: boolean;
  hasTeammateContext?: boolean;
};

/**
 * Deterministic indexability for Player Hub Phase A.
 * Ambiguous/missing club or hollow identity → not indexable.
 */
export function isPlayerProfileIndexable(input: PlayerProfileIndexabilityInput): boolean {
  const name = String(input.name ?? "").trim();
  const slug = String(input.slug ?? "").trim();
  if (!name || !slug) return false;
  if (!input.currentClubReliable) return false;

  const hasCanonicalSource = Boolean(
    (input.goalservePlayerId && String(input.goalservePlayerId).trim()) ||
      (input.id && String(input.id).trim()),
  );
  if (!hasCanonicalSource) return false;

  const hasSignal =
    Boolean(input.hasImage) ||
    Boolean(input.nationality && String(input.nationality).trim()) ||
    (typeof input.age === "number" && Number.isFinite(input.age) && input.age > 0) ||
    Boolean(input.hasRelatedArticles) ||
    Boolean(input.hasTeammateContext);

  return hasSignal;
}

export function buildPlayerProfileTitle(input: {
  name: string;
  clubName?: string | null;
  position?: string | null;
}): string {
  const name = input.name.trim();
  const club = input.clubName?.trim() || null;
  const pos = formatPlayerPositionLabel(input.position)?.toLowerCase() || null;
  if (club && pos) return `${name} — ${club} ${pos} | Football Mad`;
  if (club) return `${name} — ${club} | Football Mad`;
  if (pos) return `${name} — ${pos} | Football Mad`;
  return `${name} | Football Mad`;
}

export function buildPlayerProfileDescription(input: {
  name: string;
  clubName?: string | null;
  position?: string | null;
  nationality?: string | null;
  age?: number | null;
  shirtNumber?: string | number | null;
}): string {
  const name = input.name.trim();
  const bits: string[] = [];
  const club = input.clubName?.trim();
  const pos = formatPlayerPositionLabel(input.position);
  const shirt = parseShirtNumber(input.shirtNumber);
  if (club) {
    bits.push(shirt != null ? `${club} No. ${shirt}` : club);
  }
  if (pos) bits.push(pos);
  if (input.nationality?.trim()) bits.push(input.nationality.trim());
  if (typeof input.age === "number" && input.age > 0) bits.push(`age ${input.age}`);
  if (bits.length === 0) return `Player profile for ${name} on Football Mad.`;
  return `${name}: ${bits.join(" · ")}. News and profile on Football Mad.`;
}

export function buildPlayerPersonJsonLd(input: {
  name: string;
  canonicalUrl: string;
  imageUrl?: string | null;
  position?: string | null;
  nationality?: string | null;
  birthDate?: string | null;
  clubName?: string | null;
  clubUrl?: string | null;
}): Record<string, unknown> {
  const jobTitle = formatPlayerPositionLabel(input.position) ?? "Footballer";
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    url: input.canonicalUrl,
    jobTitle,
    description: `${input.name}, ${jobTitle.toLowerCase()}`,
  };
  if (input.imageUrl?.trim()) data.image = input.imageUrl.trim();
  if (input.nationality?.trim()) {
    data.nationality = {
      "@type": "Country",
      name: input.nationality.trim(),
    };
  }
  if (input.birthDate?.trim()) data.birthDate = input.birthDate.trim();
  if (input.clubName?.trim()) {
    const org: Record<string, unknown> = {
      "@type": "SportsOrganization",
      name: input.clubName.trim(),
    };
    if (input.clubUrl?.trim()) org.url = input.clubUrl.trim();
    data.affiliation = org;
    data.memberOf = org;
  }
  return data;
}
