import type { MatchCentrePresentationState, MatchCentreState } from "./match-centre-state";
import type { GoalserveMatchTimeline } from "./goalserve-match-detail";

export type MatchCentreFormResult = "W" | "D" | "L";

export type MatchCentreTeamRef = {
  id: string | null;
  name: string;
  shortName: string;
  slug: string;
  primaryColor?: string | null;
  logoUrl?: string | null;
  /** Goalserve provider team id when known for the fixture side. */
  goalserveTeamId?: string | null;
};

export type MatchCentreStandingContext = {
  position: number;
  played: number;
  points: number;
  competitionName: string;
  competitionSlug: string | null;
  season: string;
  /** Honest label — Phase 1 uses the current snapshot, not match-date table. */
  tableLabel: "Current table";
};

export type MatchCentreFormMatch = {
  opponentName: string;
  opponentSlug: string | null;
  /** Canonical opponent team id when known — powers crest lookup. */
  opponentTeamId?: string | null;
  homeAway: "home" | "away";
  homeScore: number;
  awayScore: number;
  result: MatchCentreFormResult;
  kickoffTime: string;
  competitionName: string;
  href: string | null;
};

export type MatchCentreH2HMatch = {
  kickoffTime: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamSlug: string | null;
  awayTeamSlug: string | null;
  homeScore: number;
  awayScore: number;
  competitionName: string;
  href: string | null;
  isCurrentMatch: boolean;
};

export type MatchCentreH2H = {
  matches: MatchCentreH2HMatch[];
  summary: {
    /** Wins by the current fixture's home club across the returned meetings. */
    homeTeamWins: number;
    draws: number;
    /** Wins by the current fixture's away club across the returned meetings. */
    awayTeamWins: number;
  };
  emptyMessage: string | null;
};

export type MatchCentreFixtureLink = {
  kickoffTime: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamSlug: string | null;
  awayTeamSlug: string | null;
  homeScore: number | null;
  awayScore: number | null;
  competitionName: string;
  status: string;
  href: string | null;
  homeAway: "home" | "away";
  opponentName: string;
  /** Canonical opponent team id when known — powers crest lookup. */
  opponentTeamId?: string | null;
};

export type MatchCentreRelatedArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: string | null;
};

export type MatchCentreTeamContext = {
  team: MatchCentreTeamRef;
  standing: MatchCentreStandingContext | null;
  form: MatchCentreFormMatch[];
  previousFixture: MatchCentreFixtureLink | null;
  nextFixtures: MatchCentreFixtureLink[];
};

/** Confirmed (or later predicted) XI for Match Centre Starting XI module. */
export type MatchCentreLineupPlayer = {
  id: string | null;
  name: string;
  number: string | null;
  position: string | null;
  formationPos: number | null;
};

export type MatchCentreTeamLineup = {
  formation: string | null;
  starters: MatchCentreLineupPlayer[];
  substitutes: MatchCentreLineupPlayer[];
};

export type MatchCentreLineups = {
  /** Phase 2: confirmed only. Architecture accepts predicted later. */
  kind: "confirmed" | "predicted";
  home: MatchCentreTeamLineup | null;
  away: MatchCentreTeamLineup | null;
};

export type MatchCentrePayload = {
  match: {
    id: string;
    slug: string;
    kickoffTime: string | null;
    homeScore: number | null;
    awayScore: number | null;
    venue: string | null;
    referee: string | null;
    competitionName: string;
    competitionSlug: string | null;
    season: string | null;
    round: string | null;
    status: string;
    timeline: GoalserveMatchTimeline | null;
    homeTeam: MatchCentreTeamRef;
    awayTeam: MatchCentreTeamRef;
  };
  state: MatchCentreState;
  presentationState: MatchCentrePresentationState;
  home: MatchCentreTeamContext;
  away: MatchCentreTeamContext;
  h2h: MatchCentreH2H;
  relatedNews: MatchCentreRelatedArticle[];
  /** Null when no confirmed lineup is stored yet. */
  lineups: MatchCentreLineups | null;
};
