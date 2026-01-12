import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { 
  Calendar, MapPin, ArrowLeft, Users, Trophy, 
  Target, Activity, AlertCircle, TrendingUp, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/layout/main-layout";
import type { Match, Team } from "@shared/schema";

interface MatchTeam {
  name: string;
  shortName: string;
  slug: string;
  primaryColor: string;
}

interface MatchData {
  id: string;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  kickoffTime: Date;
  competition: string;
  competitionShort: string;
  matchweek?: number;
  round?: string;
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "finished" | "postponed" | "live";
  venue: string;
}

interface KeyMoment {
  minute: number;
  type: "goal" | "red_card" | "yellow_card" | "penalty" | "var" | "substitution";
  team: "home" | "away";
  player: string;
  detail?: string;
}

interface HeadToHead {
  date: Date;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  competition: string;
}

interface MatchStats {
  label: string;
  home: number;
  away: number;
  format?: "percent" | "number" | "decimal";
}

const PL_TEAMS: MatchTeam[] = [
  { name: "Arsenal", shortName: "ARS", slug: "arsenal", primaryColor: "#EF0107" },
  { name: "Aston Villa", shortName: "AVL", slug: "aston-villa", primaryColor: "#670E36" },
  { name: "Bournemouth", shortName: "BOU", slug: "bournemouth", primaryColor: "#DA291C" },
  { name: "Brentford", shortName: "BRE", slug: "brentford", primaryColor: "#E30613" },
  { name: "Brighton", shortName: "BHA", slug: "brighton", primaryColor: "#0057B8" },
  { name: "Chelsea", shortName: "CHE", slug: "chelsea", primaryColor: "#034694" },
  { name: "Crystal Palace", shortName: "CRY", slug: "crystal-palace", primaryColor: "#1B458F" },
  { name: "Everton", shortName: "EVE", slug: "everton", primaryColor: "#003399" },
  { name: "Fulham", shortName: "FUL", slug: "fulham", primaryColor: "#000000" },
  { name: "Ipswich Town", shortName: "IPS", slug: "ipswich-town", primaryColor: "#0044AA" },
  { name: "Leicester City", shortName: "LEI", slug: "leicester-city", primaryColor: "#003090" },
  { name: "Liverpool", shortName: "LIV", slug: "liverpool", primaryColor: "#C8102E" },
  { name: "Manchester City", shortName: "MCI", slug: "manchester-city", primaryColor: "#6CABDD" },
  { name: "Manchester United", shortName: "MUN", slug: "manchester-united", primaryColor: "#DA291C" },
  { name: "Newcastle United", shortName: "NEW", slug: "newcastle", primaryColor: "#241F20" },
  { name: "Nottingham Forest", shortName: "NFO", slug: "nottingham-forest", primaryColor: "#E53233" },
  { name: "Southampton", shortName: "SOU", slug: "southampton", primaryColor: "#D71920" },
  { name: "Tottenham", shortName: "TOT", slug: "tottenham", primaryColor: "#132257" },
  { name: "West Ham", shortName: "WHU", slug: "west-ham", primaryColor: "#7A263A" },
  { name: "Wolves", shortName: "WOL", slug: "wolves", primaryColor: "#FDB913" },
];

function isDummyMatchId(matchId: string): boolean {
  return /^(pl|ucl|fac|efl)-mw\d+-/.test(matchId);
}

function parseDummyMatchId(matchId: string): MatchData | null {
  const parts = matchId.split("-");
  if (parts.length < 3) return null;
  
  const competition = parts[0];
  const matchweekPart = parts[1];
  const teamSlug = parts.slice(2).join("-");
  
  const team = PL_TEAMS.find(t => t.slug === teamSlug);
  if (!team) return null;
  
  const matchweek = parseInt(matchweekPart.replace("mw", ""), 10);
  if (isNaN(matchweek)) return null;
  
  const opponents = PL_TEAMS.filter(t => t.slug !== teamSlug);
  const oppIndex = (matchweek - 1) % opponents.length;
  const opponent = opponents[oppIndex];
  
  const seasonStart = new Date("2025-08-16");
  const matchDate = new Date(seasonStart);
  matchDate.setDate(matchDate.getDate() + (matchweek - 1) * 7);
  
  const hours = [12, 15, 17, 20][matchweek % 4];
  matchDate.setHours(hours, matchweek % 2 === 0 ? 30 : 0, 0, 0);
  
  const now = new Date();
  const isPast = matchDate < now;
  const isHome = matchweek % 2 === 0;
  
  const homeTeam = isHome ? team : opponent;
  const awayTeam = isHome ? opponent : team;
  
  let compName = "Premier League";
  let compShort = "PL";
  let round: string | undefined;
  
  if (competition === "ucl") {
    compName = "Champions League";
    compShort = "UCL";
    round = `Group Stage - Matchday ${matchweek}`;
  } else if (competition === "fac") {
    compName = "FA Cup";
    compShort = "FAC";
    round = ["Third Round", "Fourth Round", "Fifth Round", "Quarter-Final", "Semi-Final", "Final"][Math.min(matchweek - 1, 5)];
  } else if (competition === "efl") {
    compName = "EFL Cup";
    compShort = "EFL";
    round = ["Second Round", "Third Round", "Fourth Round", "Quarter-Final", "Semi-Final", "Final"][Math.min(matchweek - 1, 5)];
  }
  
  const seed = matchweek * 17 + teamSlug.length;
  const homeScore = isPast ? (seed % 4) : undefined;
  const awayScore = isPast ? ((seed * 3) % 3) : undefined;
  
  return {
    id: matchId,
    homeTeam,
    awayTeam,
    kickoffTime: matchDate,
    competition: compName,
    competitionShort: compShort,
    matchweek: competition === "pl" ? matchweek : undefined,
    round,
    homeScore,
    awayScore,
    status: isPast ? "finished" : "scheduled",
    venue: `${homeTeam.name} Stadium`,
  };
}

function apiMatchToMatchData(match: Match & { homeTeam?: Team; awayTeam?: Team }): MatchData {
  const homeTeam: MatchTeam = {
    name: match.homeTeam?.name || "Home Team",
    shortName: match.homeTeam?.shortName || "HOM",
    slug: match.homeTeam?.slug || "home",
    primaryColor: match.homeTeam?.primaryColor || "#1a1a2e",
  };
  
  const awayTeam: MatchTeam = {
    name: match.awayTeam?.name || "Away Team",
    shortName: match.awayTeam?.shortName || "AWY",
    slug: match.awayTeam?.slug || "away",
    primaryColor: match.awayTeam?.primaryColor || "#1a1a2e",
  };
  
  const competition = match.competition || "Premier League";
  
  return {
    id: match.slug,
    homeTeam,
    awayTeam,
    kickoffTime: new Date(match.kickoffTime),
    competition,
    competitionShort: competition === "Premier League" ? "PL" : competition,
    homeScore: match.homeScore ?? undefined,
    awayScore: match.awayScore ?? undefined,
    status: match.status as MatchData["status"],
    venue: match.venue || `${homeTeam.name} Stadium`,
  };
}

function generateKeyMoments(match: MatchData): KeyMoment[] {
  if (match.status !== "finished") return [];
  
  const moments: KeyMoment[] = [];
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  
  const homeScorers = ["Saka", "Havertz", "Martinelli", "Rice", "Saliba"];
  const awayScorers = ["Palmer", "Haaland", "Salah", "Son", "Watkins"];
  
  for (let i = 0; i < homeScore; i++) {
    const seed = match.id.length + i * 7;
    moments.push({
      minute: 15 + (i * 25) + (seed % 10),
      type: "goal",
      team: "home",
      player: homeScorers[i % homeScorers.length],
      detail: i === 0 && seed % 5 === 0 ? "Penalty" : undefined,
    });
  }
  
  for (let i = 0; i < awayScore; i++) {
    const seed = match.id.length + i * 11;
    moments.push({
      minute: 30 + (i * 20) + (seed % 8),
      type: "goal",
      team: "away",
      player: awayScorers[i % awayScorers.length],
    });
  }
  
  const seed = match.id.length;
  if (seed % 5 === 0) {
    moments.push({
      minute: 67,
      type: "red_card",
      team: seed % 2 === 0 ? "home" : "away",
      player: "Smith",
      detail: "Second yellow card",
    });
  }
  
  return moments.sort((a, b) => a.minute - b.minute);
}

function generateMatchStats(match: MatchData): MatchStats[] {
  if (match.status !== "finished") return [];
  
  const seed = match.id.length * 7;
  return [
    { label: "Possession", home: 52 + (seed % 10), away: 48 - (seed % 10), format: "percent" },
    { label: "Shots", home: 12 + (seed % 6), away: 8 + (seed % 4), format: "number" },
    { label: "Shots on Target", home: 5 + (seed % 3), away: 3 + (seed % 2), format: "number" },
    { label: "xG", home: 1.2 + (seed % 10) / 10, away: 0.8 + (seed % 8) / 10, format: "decimal" },
    { label: "Corners", home: 6 + (seed % 4), away: 4 + (seed % 3), format: "number" },
  ];
}

function generateHeadToHead(match: MatchData): HeadToHead[] {
  const results: HeadToHead[] = [];
  const baseDate = new Date(match.kickoffTime);
  
  for (let i = 0; i < 5; i++) {
    const pastDate = new Date(baseDate);
    pastDate.setMonth(pastDate.getMonth() - (i + 1) * 4);
    
    const isHomeFirst = i % 2 === 0;
    const seed = match.id.length + i;
    results.push({
      date: pastDate,
      homeTeam: isHomeFirst ? match.homeTeam.shortName : match.awayTeam.shortName,
      awayTeam: isHomeFirst ? match.awayTeam.shortName : match.homeTeam.shortName,
      homeScore: (seed + 2) % 4,
      awayScore: (seed + 1) % 3,
      competition: i < 3 ? "Premier League" : "FA Cup",
    });
  }
  
  return results;
}

function generatePredictedXI(team: MatchTeam): { formation: string; players: string[] } {
  const formations = ["4-3-3", "4-2-3-1", "3-4-3", "3-5-2"];
  const formation = formations[team.name.length % formations.length];
  
  const playersByTeam: Record<string, string[]> = {
    "arsenal": ["Raya", "White", "Saliba", "Gabriel", "Zinchenko", "Rice", "Odegaard", "Havertz", "Saka", "Martinelli", "Jesus"],
    "liverpool": ["Alisson", "Alexander-Arnold", "Konate", "Van Dijk", "Robertson", "Mac Allister", "Gravenberch", "Szoboszlai", "Salah", "Gakpo", "Diaz"],
    "manchester-city": ["Ederson", "Walker", "Dias", "Akanji", "Gvardiol", "Rodri", "De Bruyne", "Bernardo", "Foden", "Grealish", "Haaland"],
    "chelsea": ["Sanchez", "James", "Fofana", "Colwill", "Cucurella", "Caicedo", "Fernandez", "Palmer", "Madueke", "Jackson", "Mudryk"],
    "tottenham": ["Vicario", "Porro", "Romero", "Van de Ven", "Udogie", "Bentancur", "Bissouma", "Maddison", "Kulusevski", "Son", "Richarlison"],
  };
  
  const players = playersByTeam[team.slug] || [
    "GK", "RB", "CB", "CB", "LB", "CDM", "CM", "CM", "RW", "LW", "ST"
  ];
  
  return { formation, players };
}

function generateKeyAbsences(team: MatchTeam): { player: string; reason: string; status: "out" | "doubt" }[] {
  const absencePool = [
    { player: "Timber", reason: "ACL injury", status: "out" as const },
    { player: "Tomiyasu", reason: "Knee injury", status: "out" as const },
    { player: "Partey", reason: "Hamstring", status: "doubt" as const },
    { player: "Jota", reason: "Muscle injury", status: "out" as const },
    { player: "Elliott", reason: "Ankle", status: "doubt" as const },
    { player: "Stones", reason: "Hamstring", status: "out" as const },
    { player: "Phillips", reason: "Muscle injury", status: "doubt" as const },
  ];
  
  const seed = team.name.length * 3;
  return absencePool.slice(seed % 3, (seed % 3) + 2);
}

function TeamCrest({ team, size = "lg" }: { team: MatchTeam; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-20 h-20 text-xl",
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-xl flex items-center justify-center font-bold shrink-0`}
      style={{ backgroundColor: team.primaryColor, color: "#fff" }}
      title={team.name}
    >
      {team.shortName.slice(0, 3)}
    </div>
  );
}

function StatusBadge({ match }: { match: MatchData }) {
  const now = new Date();
  const kickoff = new Date(match.kickoffTime);
  const isToday = kickoff.toDateString() === now.toDateString();
  
  if (match.status === "finished") {
    return <Badge variant="secondary" data-testid="badge-status-ft">FT</Badge>;
  }
  if (match.status === "live") {
    return <Badge className="bg-red-500 text-white border-0 animate-pulse" data-testid="badge-status-live">LIVE</Badge>;
  }
  if (match.status === "postponed") {
    return <Badge variant="outline" className="border-amber-500 text-amber-600" data-testid="badge-status-ppd">Postponed</Badge>;
  }
  if (isToday) {
    return <Badge className="bg-green-600 text-white border-0" data-testid="badge-status-today">Today</Badge>;
  }
  return null;
}

function MatchHeader({ match }: { match: MatchData }) {
  const isFinished = match.status === "finished";
  const kickoff = new Date(match.kickoffTime);
  
  return (
    <div className="bg-card border-b" data-testid="match-header">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap justify-center">
          <Badge variant="outline" data-testid="badge-competition">{match.competition}</Badge>
          {match.matchweek && <Badge variant="secondary" data-testid="badge-matchweek">Matchweek {match.matchweek}</Badge>}
          {match.round && <Badge variant="secondary" data-testid="badge-round">{match.round}</Badge>}
          <StatusBadge match={match} />
        </div>
        
        <div className="flex items-center justify-center gap-4 sm:gap-8">
          <Link href={`/teams/${match.homeTeam.slug}`}>
            <div className="text-center group cursor-pointer" data-testid="home-team-link">
              <TeamCrest team={match.homeTeam} size="lg" />
              <p className="font-semibold mt-2 text-sm sm:text-base group-hover:text-primary transition-colors">
                {match.homeTeam.name}
              </p>
            </div>
          </Link>
          
          <div className="text-center min-w-[80px]">
            {isFinished ? (
              <div className="text-3xl sm:text-4xl font-bold" data-testid="match-score">
                {match.homeScore} - {match.awayScore}
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">vs</div>
                <p className="text-lg font-semibold text-muted-foreground mt-1" data-testid="kickoff-time">
                  {format(kickoff, "HH:mm")}
                </p>
              </>
            )}
          </div>
          
          <Link href={`/teams/${match.awayTeam.slug}`}>
            <div className="text-center group cursor-pointer" data-testid="away-team-link">
              <TeamCrest team={match.awayTeam} size="lg" />
              <p className="font-semibold mt-2 text-sm sm:text-base group-hover:text-primary transition-colors">
                {match.awayTeam.name}
              </p>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {format(kickoff, "EEE d MMM yyyy")}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {match.venue}
          </span>
        </div>
      </div>
    </div>
  );
}

function PreMatchNarrative({ match }: { match: MatchData }) {
  const narratives: Record<string, string> = {
    "arsenal": `${match.homeTeam.name} will be looking to continue their title charge as they welcome ${match.awayTeam.name} to ${match.venue}. With the race for the Premier League tighter than ever, three points here could prove crucial in the hunt for silverware.`,
    "default": `A crucial ${match.competition} clash awaits as ${match.homeTeam.name} host ${match.awayTeam.name}. Both sides will be eager to secure all three points with plenty at stake at this stage of the season.`,
  };
  
  const narrative = narratives[match.homeTeam.slug] || narratives["default"];
  
  return (
    <Card data-testid="pre-match-narrative">
      <CardContent className="pt-4">
        <p className="text-muted-foreground leading-relaxed">{narrative}</p>
      </CardContent>
    </Card>
  );
}

function PostMatchSummary({ match }: { match: MatchData }) {
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  
  let outcome = "shared the spoils in";
  if (homeScore > awayScore) outcome = `secured a ${homeScore}-${awayScore} victory in`;
  if (awayScore > homeScore) outcome = `suffered a ${homeScore}-${awayScore} defeat in`;
  
  const summary = `${match.homeTeam.name} ${outcome} an entertaining ${match.competition} encounter at ${match.venue}. The result leaves both sides with plenty to reflect on as the season progresses.`;
  
  return (
    <Card data-testid="post-match-summary">
      <CardContent className="pt-4">
        <p className="text-muted-foreground leading-relaxed">{summary}</p>
      </CardContent>
    </Card>
  );
}

function PredictedXI({ match }: { match: MatchData }) {
  const homeXI = generatePredictedXI(match.homeTeam);
  const awayXI = generatePredictedXI(match.awayTeam);
  
  return (
    <Card data-testid="predicted-xi">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Predicted Lineups
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TeamCrest team={match.homeTeam} size="sm" />
              <div>
                <p className="font-semibold text-sm">{match.homeTeam.name}</p>
                <p className="text-xs text-muted-foreground">{homeXI.formation}</p>
              </div>
            </div>
            <div className="space-y-1">
              {homeXI.players.map((player, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm py-0.5">
                  <span className="w-5 text-xs text-muted-foreground">{idx + 1}</span>
                  <span>{player}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TeamCrest team={match.awayTeam} size="sm" />
              <div>
                <p className="font-semibold text-sm">{match.awayTeam.name}</p>
                <p className="text-xs text-muted-foreground">{awayXI.formation}</p>
              </div>
            </div>
            <div className="space-y-1">
              {awayXI.players.map((player, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm py-0.5">
                  <span className="w-5 text-xs text-muted-foreground">{idx + 1}</span>
                  <span>{player}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KeyAbsences({ match }: { match: MatchData }) {
  const homeAbsences = generateKeyAbsences(match.homeTeam);
  const awayAbsences = generateKeyAbsences(match.awayTeam);
  
  if (homeAbsences.length === 0 && awayAbsences.length === 0) return null;
  
  return (
    <Card data-testid="key-absences">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4" />
          Key Absences
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-4">
          {homeAbsences.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: match.homeTeam.primaryColor }}>
                {match.homeTeam.name}
              </p>
              <div className="space-y-1.5">
                {homeAbsences.map((absence, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span>{absence.player}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{absence.reason}</span>
                      <Badge 
                        variant="outline" 
                        className={absence.status === "out" 
                          ? "border-red-500 text-red-600 text-[10px] px-1.5" 
                          : "border-amber-500 text-amber-600 text-[10px] px-1.5"
                        }
                      >
                        {absence.status === "out" ? "OUT" : "DOUBT"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {awayAbsences.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: match.awayTeam.primaryColor }}>
                {match.awayTeam.name}
              </p>
              <div className="space-y-1.5">
                {awayAbsences.map((absence, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span>{absence.player}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{absence.reason}</span>
                      <Badge 
                        variant="outline" 
                        className={absence.status === "out" 
                          ? "border-red-500 text-red-600 text-[10px] px-1.5" 
                          : "border-amber-500 text-amber-600 text-[10px] px-1.5"
                        }
                      >
                        {absence.status === "out" ? "OUT" : "DOUBT"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HeadToHeadSection({ match }: { match: MatchData }) {
  const h2h = generateHeadToHead(match);
  
  return (
    <Card data-testid="head-to-head">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Head to Head
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {h2h.slice(0, 5).map((result, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
              <span className="text-xs text-muted-foreground w-20">
                {format(result.date, "MMM yyyy")}
              </span>
              <div className="flex items-center gap-2 flex-1 justify-center">
                <span className={`font-medium ${result.homeScore > result.awayScore ? "" : "text-muted-foreground"}`}>
                  {result.homeTeam}
                </span>
                <span className="font-bold tabular-nums">
                  {result.homeScore} - {result.awayScore}
                </span>
                <span className={`font-medium ${result.awayScore > result.homeScore ? "" : "text-muted-foreground"}`}>
                  {result.awayTeam}
                </span>
              </div>
              <span className="text-xs text-muted-foreground w-20 text-right">{result.competition}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function KeyMomentsTimeline({ match }: { match: MatchData }) {
  const moments = generateKeyMoments(match);
  
  if (moments.length === 0) {
    return (
      <Card data-testid="key-moments">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Key Moments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No key moments recorded</p>
        </CardContent>
      </Card>
    );
  }
  
  const getIcon = (type: KeyMoment["type"]) => {
    switch (type) {
      case "goal": return <Target className="h-4 w-4 text-green-600" />;
      case "red_card": return <div className="w-3 h-4 bg-red-600 rounded-sm" />;
      case "yellow_card": return <div className="w-3 h-4 bg-yellow-500 rounded-sm" />;
      case "penalty": return <Target className="h-4 w-4 text-green-600" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };
  
  return (
    <Card data-testid="key-moments">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4" />
          Key Moments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {moments.map((moment, idx) => (
            <div 
              key={idx} 
              className={`flex items-center gap-3 ${moment.team === "away" ? "flex-row-reverse text-right" : ""}`}
            >
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-muted-foreground w-8">{moment.minute}'</span>
                {getIcon(moment.type)}
              </div>
              <div className="flex-1">
                <span className="font-medium text-sm">{moment.player}</span>
                {moment.detail && (
                  <span className="text-xs text-muted-foreground ml-2">({moment.detail})</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MatchStatsSection({ match }: { match: MatchData }) {
  const stats = generateMatchStats(match);
  
  if (stats.length === 0) return null;
  
  const formatValue = (value: number, formatType?: string) => {
    if (formatType === "percent") return `${value}%`;
    if (formatType === "decimal") return value.toFixed(1);
    return value.toString();
  };
  
  return (
    <Card data-testid="match-stats">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Match Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat, idx) => {
            const total = stat.home + stat.away;
            const homePercent = total > 0 ? (stat.home / total) * 100 : 50;
            
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium tabular-nums">{formatValue(stat.home, stat.format)}</span>
                  <span className="text-muted-foreground">{stat.label}</span>
                  <span className="font-medium tabular-nums">{formatValue(stat.away, stat.format)}</span>
                </div>
                <div className="flex gap-1 h-2">
                  <div 
                    className="rounded-l-full transition-all"
                    style={{ 
                      width: `${homePercent}%`, 
                      backgroundColor: match.homeTeam.primaryColor 
                    }}
                  />
                  <div 
                    className="rounded-r-full transition-all"
                    style={{ 
                      width: `${100 - homePercent}%`, 
                      backgroundColor: match.awayTeam.primaryColor 
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function WhatThisMeans({ match }: { match: MatchData }) {
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  
  let implication = "";
  if (match.competition === "Premier League") {
    if (homeScore > awayScore) {
      implication = `A vital three points for ${match.homeTeam.name} keeps them firmly in the hunt for European places. ${match.awayTeam.name} will need to respond quickly to stay in touch with the top half.`;
    } else if (awayScore > homeScore) {
      implication = `${match.awayTeam.name} take all three points on the road, a massive result in their push for a top-four finish. Questions remain for ${match.homeTeam.name} after this home setback.`;
    } else {
      implication = `A point apiece means neither side can be truly satisfied. Both teams will feel this was an opportunity missed in a congested table.`;
    }
  } else {
    implication = `${homeScore > awayScore ? match.homeTeam.name : match.awayTeam.name} progress to the next round of the ${match.competition}, keeping their cup dreams alive.`;
  }
  
  return (
    <Card data-testid="what-this-means">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4" />
          What This Means
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{implication}</p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-48 w-full rounded-lg mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </MainLayout>
  );
}

export default function MatchPage() {
  const { slug } = useParams<{ slug: string }>();
  
  const isDummy = useMemo(() => slug ? isDummyMatchId(slug) : false, [slug]);
  
  const { data: apiMatch, isLoading, isError } = useQuery<Match & { homeTeam?: Team; awayTeam?: Team }>({
    queryKey: ["/api/matches", slug],
    enabled: !!slug && !isDummy,
    retry: false,
    throwOnError: false,
  });
  
  const match = useMemo(() => {
    if (!slug) return null;
    
    if (isDummy) {
      return parseDummyMatchId(slug);
    }
    
    if (apiMatch) {
      return apiMatchToMatchData(apiMatch);
    }
    
    return null;
  }, [slug, isDummy, apiMatch]);
  
  if (!isDummy && isLoading) {
    return <LoadingSkeleton />;
  }
  
  if (!isDummy && isError) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Match not found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find the match you're looking for.</p>
          <Link href="/matches">
            <Button data-testid="button-back-to-matches">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Matches
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }
  
  if (!match) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Match not found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find the match you're looking for.</p>
          <Link href="/matches">
            <Button data-testid="button-back-to-matches">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Matches
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }
  
  const isPreMatch = match.status === "scheduled" || match.status === "postponed";
  const isPostMatch = match.status === "finished";
  
  const backLink = match.homeTeam.slug ? `/teams/${match.homeTeam.slug}/matches` : "/matches";
  
  return (
    <MainLayout>
      <div className="mb-4 px-4 pt-4 max-w-4xl mx-auto">
        <Link href={backLink}>
          <Button variant="ghost" size="sm" className="-ml-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Matches
          </Button>
        </Link>
      </div>
      
      <MatchHeader match={match} />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {isPreMatch && (
            <>
              <PreMatchNarrative match={match} />
              <PredictedXI match={match} />
              <KeyAbsences match={match} />
              <HeadToHeadSection match={match} />
            </>
          )}
          
          {isPostMatch && (
            <>
              <PostMatchSummary match={match} />
              <KeyMomentsTimeline match={match} />
              <MatchStatsSection match={match} />
              <WhatThisMeans match={match} />
              <HeadToHeadSection match={match} />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
