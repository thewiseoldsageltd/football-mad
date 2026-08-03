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
  /** Current-season league stats from squad feed; null when unavailable. */
  currentSeasonStats?: import("./player-season-stats").PlayerHubCurrentSeasonStats | null;
  identity?: import("./player-profile-feed").PlayerHubIdentity | null;
  career?: import("./player-profile-feed").PlayerHubCareer | null;
  transfers?: import("./player-profile-feed").PlayerHubTransfer[] | null;
  sidelined?: import("./player-profile-feed").PlayerHubSidelined[] | null;
  honours?: import("./player-profile-feed").PlayerHubHonour[] | null;
  /** Internal resolver diagnostics — not for public UI. */
  currentClubMeta?: {
    source: "active_membership" | "player_team_id" | "none";
    ambiguous: boolean;
  };
};
