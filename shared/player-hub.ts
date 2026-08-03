/**
 * Shared Player Hub Phase A API payload types.
 * Extends the existing GET /api/players/:slug response without a duplicate endpoint.
 */

export type PlayerHubCurrentClub = {
  id: string;
  slug: string;
  name: string;
  crestUrl?: string | null;
  shirtNumber?: string | number | null;
  position?: string | null;
};

export type PlayerHubTeammate = {
  id: string;
  slug: string;
  name: string;
  position?: string | null;
  shirtNumber?: string | number | null;
  imageUrl?: string | null;
};

export type PlayerHubSeo = {
  indexable: boolean;
  canonicalUrl: string;
  title: string;
  description: string;
};

export type PlayerHubPhaseAExtras = {
  currentClub: PlayerHubCurrentClub | null;
  teammates: PlayerHubTeammate[];
  seo: PlayerHubSeo;
  /** Internal resolver diagnostics — not for public UI. */
  currentClubMeta?: {
    source: "active_membership" | "player_team_id" | "none";
    ambiguous: boolean;
  };
};
