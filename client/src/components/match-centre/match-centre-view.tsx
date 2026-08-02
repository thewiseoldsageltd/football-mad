import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchTeamBadge } from "@/components/matches/match-team-badge";
import { teamHub } from "@/lib/urls";
import {
  hasMeaningfulMatchStats,
  readGoalserveMatchTimeline,
  type GoalserveMatchStat,
} from "@shared/goalserve-match-detail";
import {
  matchCentreResultLabel,
  matchCentreStateLabel,
  resolveMatchCentreState,
} from "@shared/match-centre-state";
import {
  resolveCompletedModuleOrder,
  resolveLiveModuleOrder,
  resolvePreEventModuleOrder,
  type MatchCentreModuleId,
} from "@shared/match-centre-modules";
import { formatCompetitionHeroLabel } from "@shared/competition-display";
import type {
  MatchCentreFixtureLink,
  MatchCentreFormMatch,
  MatchCentreFormResult,
  MatchCentrePayload,
  MatchCentreTeamContext,
} from "@shared/match-centre";
import { HowTheyCompare } from "@/components/match-centre/tale-of-the-tape";
import { StartingXiSection } from "@/components/match-centre/starting-xi";
import { MatchTimeline } from "@/components/match-centre/match-timeline";
import { newsArticle } from "@/lib/urls";

function resultLabel(result: MatchCentreFormResult): string {
  if (result === "W") return "Win";
  if (result === "D") return "Draw";
  return "Loss";
}

function ResultBadge({
  result,
  size = "md",
}: {
  result: MatchCentreFormResult;
  size?: "sm" | "md";
}) {
  const base =
    size === "sm"
      ? "inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-[11px] font-semibold tabular-nums"
      : "inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-semibold tabular-nums";
  const tone =
    result === "W"
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
      : result === "D"
        ? "bg-muted text-foreground"
        : "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100";
  return (
    <span className={`${base} ${tone}`} title={resultLabel(result)} aria-label={resultLabel(result)}>
      {result}
    </span>
  );
}

function fixtureResultForTeam(fixture: MatchCentreFixtureLink): MatchCentreFormResult | null {
  if (typeof fixture.homeScore !== "number" || typeof fixture.awayScore !== "number") return null;
  const teamScore = fixture.homeAway === "home" ? fixture.homeScore : fixture.awayScore;
  const oppScore = fixture.homeAway === "home" ? fixture.awayScore : fixture.homeScore;
  if (teamScore > oppScore) return "W";
  if (teamScore < oppScore) return "L";
  return "D";
}

function Section({
  title,
  children,
  testId,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <section data-testid={testId} className={`space-y-3 ${className}`}>
      {title ? (
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

function FormMatchRow({ match }: { match: MatchCentreFormMatch }) {
  const kickoff = match.kickoffTime ? new Date(match.kickoffTime) : null;
  const score =
    match.homeAway === "home"
      ? `${match.homeScore}–${match.awayScore}`
      : `${match.awayScore}–${match.homeScore}`;
  const body = (
    <div className="flex items-center gap-2.5 py-2">
      <MatchTeamBadge
        team={{ id: match.opponentTeamId || undefined, name: match.opponentName }}
        size="xs"
      />
      <ResultBadge result={match.result} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium text-sm truncate">{match.opponentName}</span>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {match.homeAway === "home" ? "H" : "A"}
          </span>
          <span className="tabular-nums text-sm font-semibold">{score}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
          <span className="truncate">{match.competitionName}</span>
          {kickoff ? <span>{format(kickoff, "d MMM yyyy")}</span> : null}
        </div>
      </div>
    </div>
  );

  return (
    <li className="border-b border-border/40 last:border-0">
      {match.href ? (
        <Link href={match.href} className="block hover:bg-muted/30 -mx-1 px-1 rounded-md">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

function TeamFormColumn({ ctx }: { ctx: MatchCentreTeamContext }) {
  if (!ctx.form.length) {
    return (
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <MatchTeamBadge
            team={{ id: ctx.team.id || undefined, name: ctx.team.name, logoUrl: ctx.team.logoUrl }}
            size="xs"
          />
          <p className="text-sm font-semibold truncate">{ctx.team.name}</p>
        </div>
        <p className="text-sm text-muted-foreground">No recent competitive form before this kickoff.</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5 min-w-0">
      <div className="flex items-center gap-2">
        <MatchTeamBadge
          team={{ id: ctx.team.id || undefined, name: ctx.team.name, logoUrl: ctx.team.logoUrl }}
          size="xs"
        />
        <p className="text-sm font-semibold truncate">{ctx.team.name}</p>
      </div>
      <ul>
        {ctx.form.map((m, i) => (
          <FormMatchRow key={`${m.kickoffTime}-${i}`} match={m} />
        ))}
      </ul>
    </div>
  );
}

function RecentFormSection({
  home,
  away,
  title = "Recent form",
}: {
  home: MatchCentreTeamContext;
  away: MatchCentreTeamContext;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!home.form.length && !away.form.length) return null;

  return (
    <Section testId="match-recent-form" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? (
            <>
              Hide matches <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show matches <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
      <div className={`${open ? "block" : "hidden"} md:block`}>
        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          {home.form.length ? <TeamFormColumn ctx={home} /> : null}
          {away.form.length ? <TeamFormColumn ctx={away} /> : null}
        </div>
      </div>
    </Section>
  );
}

function StatsSection({
  stats,
  homeName,
  awayName,
}: {
  stats: GoalserveMatchStat[];
  homeName: string;
  awayName: string;
}) {
  if (!hasMeaningfulMatchStats(stats)) return null;
  return (
    <Section title="Statistics" testId="match-statistics" className="space-y-3">
      <div className="space-y-3.5">
        <div className="grid grid-cols-3 text-xs text-muted-foreground">
          <span className="truncate">{homeName}</span>
          <span className="text-center">Stat</span>
          <span className="text-right truncate">{awayName}</span>
        </div>
        {stats.map((stat) => {
          const total = Math.abs(stat.home) + Math.abs(stat.away);
          const homePct = total > 0 ? (Math.abs(stat.home) / total) * 100 : 50;
          return (
            <div key={stat.key} className="space-y-1.5">
              <div className="grid grid-cols-3 text-sm items-center">
                <span className="tabular-nums font-medium">{stat.home}</span>
                <span className="text-center text-muted-foreground text-xs">{stat.label}</span>
                <span className="tabular-nums font-medium text-right">{stat.away}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                <div className="h-full bg-foreground/80" style={{ width: `${homePct}%` }} />
                <div className="h-full bg-muted-foreground/40" style={{ width: `${100 - homePct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function highlightClubName(name: string, homeName: string, awayName: string) {
  if (name === homeName || name === awayName) {
    return <span className="font-semibold text-foreground">{name}</span>;
  }
  return <span className="text-muted-foreground">{name}</span>;
}

function H2HSection({
  h2h,
  homeName,
  awayName,
}: {
  h2h: MatchCentrePayload["h2h"];
  homeName: string;
  awayName: string;
}) {
  if (h2h.matches.length === 0) return null;

  const historical = h2h.matches.filter((m) => !m.isCurrentMatch);
  const list = historical.length > 0 ? historical : h2h.matches;
  const lastMeeting = list[0] ?? null;

  return (
    <Section title="Head-to-head" testId="match-h2h" className="space-y-3">
      {lastMeeting ? (
        <div className="px-0.5" data-testid="match-h2h-last-meeting">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Last meeting
          </p>
          {lastMeeting.href ? (
            <Link href={lastMeeting.href} className="block text-sm hover:underline">
              <span className="font-medium">
                {highlightClubName(lastMeeting.homeTeamName, homeName, awayName)}{" "}
                <span className="tabular-nums font-semibold">
                  {lastMeeting.homeScore}–{lastMeeting.awayScore}
                </span>{" "}
                {highlightClubName(lastMeeting.awayTeamName, homeName, awayName)}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {lastMeeting.kickoffTime
                  ? format(new Date(lastMeeting.kickoffTime), "d MMM yyyy")
                  : ""}
                {lastMeeting.competitionName ? ` · ${lastMeeting.competitionName}` : ""}
              </span>
            </Link>
          ) : (
            <div className="text-sm">
              <span className="font-medium">
                {highlightClubName(lastMeeting.homeTeamName, homeName, awayName)}{" "}
                <span className="tabular-nums font-semibold">
                  {lastMeeting.homeScore}–{lastMeeting.awayScore}
                </span>{" "}
                {highlightClubName(lastMeeting.awayTeamName, homeName, awayName)}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {lastMeeting.kickoffTime
                  ? format(new Date(lastMeeting.kickoffTime), "d MMM yyyy")
                  : ""}
                {lastMeeting.competitionName ? ` · ${lastMeeting.competitionName}` : ""}
              </span>
            </div>
          )}
        </div>
      ) : null}

      {list.length > 1 ? (
        <ul className="divide-y divide-border/40">
          {list.slice(1, 6).map((m) => {
            const body = (
              <div className="flex flex-col gap-0.5 py-2.5 text-sm">
                <p className="tabular-nums">
                  {highlightClubName(m.homeTeamName, homeName, awayName)}{" "}
                  <span className="font-semibold tabular-nums">
                    {m.homeScore}–{m.awayScore}
                  </span>{" "}
                  {highlightClubName(m.awayTeamName, homeName, awayName)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.kickoffTime ? format(new Date(m.kickoffTime), "d MMM yyyy") : ""}
                  {m.isCurrentMatch ? " · This match" : ""}
                  {m.competitionName ? ` · ${m.competitionName}` : ""}
                </p>
              </div>
            );
            return (
              <li key={`${m.kickoffTime}-${m.homeTeamName}-${m.awayTeamName}`}>
                {m.href ? (
                  <Link href={m.href} className="block hover:bg-muted/30 -mx-1 px-1 rounded-md">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </Section>
  );
}

function FixtureRow({
  fixture,
  kind,
}: {
  fixture: MatchCentreFixtureLink;
  kind: "previous" | "upcoming";
}) {
  const kickoff = fixture.kickoffTime ? new Date(fixture.kickoffTime) : null;
  const result = kind === "previous" ? fixtureResultForTeam(fixture) : null;
  const score =
    kind === "previous" &&
    typeof fixture.homeScore === "number" &&
    typeof fixture.awayScore === "number"
      ? `${fixture.homeScore}–${fixture.awayScore}`
      : null;

  const body = (
    <div className="flex items-center gap-2.5 py-2">
      <MatchTeamBadge
        team={{ id: fixture.opponentTeamId || undefined, name: fixture.opponentName }}
        size="xs"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium text-sm truncate">{fixture.opponentName}</span>
          {result ? <ResultBadge result={result} size="sm" /> : null}
          {score ? <span className="text-sm font-semibold tabular-nums">{score}</span> : null}
        </div>
        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2">
          {kickoff ? (
            <span>
              {kind === "upcoming"
                ? format(kickoff, "d MMM · HH:mm")
                : format(kickoff, "d MMM yyyy")}
            </span>
          ) : null}
          <span className="truncate">{fixture.competitionName}</span>
          <span className="uppercase tracking-wide">
            {fixture.homeAway === "home" ? "H" : "A"}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <li className="border-b border-border/40 last:border-0">
      {fixture.href ? (
        <Link href={fixture.href} className="block hover:bg-muted/30 -mx-1 px-1 rounded-md">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

function TeamUpcomingColumn({
  label,
  ctx,
}: {
  label: string;
  ctx: MatchCentreTeamContext;
}) {
  if (!ctx.nextFixtures.length) return null;

  return (
    <div className="space-y-1.5 min-w-0">
      <div className="flex items-center gap-2">
        <MatchTeamBadge
          team={{ id: ctx.team.id || undefined, name: ctx.team.name, logoUrl: ctx.team.logoUrl }}
          size="xs"
        />
        <p className="text-sm font-semibold truncate">{label}</p>
      </div>
      <ul>
        {ctx.nextFixtures.slice(0, 5).map((f) => (
          <FixtureRow
            key={`${f.kickoffTime}-${f.opponentName}`}
            fixture={f}
            kind="upcoming"
          />
        ))}
      </ul>
    </div>
  );
}

function UpcomingFixturesSection({
  home,
  away,
  title = "Upcoming fixtures",
}: {
  home: MatchCentreTeamContext;
  away: MatchCentreTeamContext;
  title?: string;
}) {
  const homeNext = home.nextFixtures.length > 0;
  const awayNext = away.nextFixtures.length > 0;
  if (!homeNext && !awayNext) return null;

  return (
    <Section title={title} testId="match-upcoming-fixtures" className="space-y-3">
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        {homeNext ? <TeamUpcomingColumn label={home.team.name} ctx={home} /> : null}
        {awayNext ? <TeamUpcomingColumn label={away.team.name} ctx={away} /> : null}
      </div>
    </Section>
  );
}

function RelatedArticles({ articles }: { articles: MatchCentrePayload["relatedNews"] }) {
  if (!articles.length) return null;
  const limited = articles.slice(0, 4);
  const [featured, ...rest] = limited;

  return (
    <Section title="Related articles" testId="match-related-articles" className="space-y-4">
      {featured ? (
        <Link
          href={newsArticle(featured.slug)}
          className="group block overflow-hidden rounded-xl border border-border/70 hover-elevate"
          data-testid={`link-related-featured-${featured.id}`}
        >
          <div className="relative aspect-video bg-muted overflow-hidden">
            {featured.coverImage ? (
              <img
                src={featured.coverImage}
                alt=""
                className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                loading="lazy"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
              <h3 className="text-white text-lg sm:text-xl font-bold line-clamp-2">{featured.title}</h3>
              {featured.publishedAt ? (
                <p className="mt-2 text-xs text-white/70">
                  {formatDistanceToNow(new Date(featured.publishedAt), { addSuffix: true })}
                </p>
              ) : null}
            </div>
          </div>
        </Link>
      ) : null}

      {rest.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((a) => (
            <Link
              key={a.id}
              href={newsArticle(a.slug)}
              className="group flex flex-col overflow-hidden rounded-xl border border-border/70 hover-elevate"
              data-testid={`link-related-${a.id}`}
            >
              <div className="relative aspect-video bg-muted overflow-hidden">
                {a.coverImage ? (
                  <img
                    src={a.coverImage}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="p-3.5 flex-1">
                <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                  {a.title}
                </h3>
                {a.publishedAt ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(a.publishedAt), { addSuffix: true })}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </Section>
  );
}

function statusBadge(centre: Pick<MatchCentrePayload, "presentationState" | "state" | "match">) {
  const rawTimer = centre.presentationState === "LIVE" ? centre.match.timeline?.timer || null : null;
  const minute =
    rawTimer && /^\d+$/.test(String(rawTimer).trim()) ? String(rawTimer).trim() : null;
  const label = matchCentreStateLabel({
    presentationState: centre.presentationState,
    rawStatus: centre.state.rawStatus,
    interruptionKind: centre.state.interruptionKind,
    minute,
  });

  if (centre.presentationState === "LIVE") {
    if (centre.state.interruptionKind === "suspended") {
      return <Badge variant="destructive">{label}</Badge>;
    }
    if (centre.state.interruptionKind === "interrupted") {
      return <Badge variant="destructive">{label}</Badge>;
    }
    if (centre.state.interruptionKind === "delayed") {
      return <Badge variant="secondary">{label}</Badge>;
    }
    if (label === "Half-time") {
      return <Badge variant="secondary">{label}</Badge>;
    }
    return <Badge className="bg-red-600 hover:bg-red-600 text-white">{label}</Badge>;
  }
  if (centre.presentationState === "ABANDONED") {
    return <Badge variant="destructive">{label}</Badge>;
  }
  if (centre.presentationState === "PRE_EVENT") {
    return <Badge variant="outline">{label}</Badge>;
  }
  return <Badge variant="secondary">{label}</Badge>;
}

export type MatchCentreHeroProps = Pick<
  MatchCentrePayload,
  "match" | "presentationState" | "state"
>;

export function MatchCentreHeader({ centre }: { centre: MatchCentreHeroProps }) {
  const m = centre.match;
  const kickoff = m.kickoffTime ? new Date(m.kickoffTime) : null;
  const isPreEvent = centre.presentationState === "PRE_EVENT";
  const showScore =
    centre.presentationState === "LIVE" ||
    centre.presentationState === "COMPLETED" ||
    centre.presentationState === "ABANDONED";
  const scoreReady =
    typeof m.homeScore === "number" &&
    Number.isFinite(m.homeScore) &&
    typeof m.awayScore === "number" &&
    Number.isFinite(m.awayScore);
  const crestSize = isPreEvent || showScore ? "xl" : "lg";
  const competitionLabel = formatCompetitionHeroLabel(
    m.competitionName,
    m.goalserveCompetitionId,
  );
  const resultMarker =
    centre.presentationState === "COMPLETED"
      ? matchCentreResultLabel(centre.state.rawStatus)
      : null;

  return (
    <header
      data-testid="match-centre-header"
      className={`rounded-2xl border border-border/80 bg-card ${
        isPreEvent ? "shadow-sm" : ""
      }`}
    >
      <div className={`px-4 sm:px-6 ${isPreEvent ? "pt-5 pb-6 sm:pt-6 sm:pb-8" : "py-5 sm:py-6"}`}>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground mb-5 sm:mb-7">
          <span className="font-medium text-foreground/80">{competitionLabel}</span>
          {m.round ? <span aria-hidden="true">·</span> : null}
          {m.round ? <span>{m.round}</span> : null}
          <span aria-hidden="true">·</span>
          {statusBadge(centre)}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <Link
            href={teamHub(m.homeTeam.slug)}
            className="flex flex-col items-center gap-2.5 sm:gap-3 min-w-0 group"
          >
            <MatchTeamBadge
              team={{
                id: m.homeTeam.id || undefined,
                name: m.homeTeam.name,
                logoUrl: m.homeTeam.logoUrl,
              }}
              size={crestSize}
            />
            <span
              className={`text-center w-full group-hover:underline ${
                isPreEvent
                  ? "text-base sm:text-lg font-semibold leading-tight"
                  : "text-sm sm:text-base font-semibold"
              }`}
            >
              <span className="line-clamp-2">{m.homeTeam.name}</span>
            </span>
          </Link>

          <div className="text-center px-1 sm:px-3 min-w-[5.5rem] sm:min-w-[7rem]">
            {showScore && scoreReady ? (
              <div
                className={`font-bold tabular-nums tracking-tight ${
                  centre.presentationState === "LIVE" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"
                }`}
              >
                {m.homeScore}–{m.awayScore}
              </div>
            ) : showScore ? (
              <div className="text-3xl sm:text-4xl font-bold tabular-nums text-muted-foreground">–</div>
            ) : kickoff ? (
              <div className="space-y-1.5">
                <div className="text-3xl sm:text-4xl font-bold tabular-nums tracking-tight">
                  {format(kickoff, "HH:mm")}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {format(kickoff, "EEE d MMM yyyy")}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">TBC</div>
            )}
            {resultMarker ? (
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-1.5">
                {resultMarker}
              </div>
            ) : null}
            {m.timeline?.htScore &&
              (centre.presentationState === "LIVE" ||
                centre.presentationState === "COMPLETED" ||
                centre.presentationState === "ABANDONED") && (
                <div className="text-xs text-muted-foreground mt-1.5">
                  HT {String(m.timeline.htScore).replace(/[\[\]]/g, "")}
                </div>
              )}
          </div>

          <Link
            href={teamHub(m.awayTeam.slug)}
            className="flex flex-col items-center gap-2.5 sm:gap-3 min-w-0 group"
          >
            <MatchTeamBadge
              team={{
                id: m.awayTeam.id || undefined,
                name: m.awayTeam.name,
                logoUrl: m.awayTeam.logoUrl,
              }}
              size={crestSize}
            />
            <span
              className={`text-center w-full group-hover:underline ${
                isPreEvent
                  ? "text-base sm:text-lg font-semibold leading-tight"
                  : "text-sm sm:text-base font-semibold"
              }`}
            >
              <span className="line-clamp-2">{m.awayTeam.name}</span>
            </span>
          </Link>
        </div>

        <div className="mt-5 sm:mt-7 flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm text-muted-foreground justify-center">
          {m.venue ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {m.venue}
            </span>
          ) : null}
          {m.referee ? <span>Ref: {m.referee}</span> : null}
          {kickoff && showScore ? (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {format(kickoff, "d MMM yyyy")}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function MatchCentreSupportingSkeleton({
  presentationState,
}: {
  presentationState?: MatchCentrePayload["presentationState"];
}) {
  const isLive = presentationState === "LIVE";
  const isCompleted = presentationState === "COMPLETED";
  return (
    <div className="space-y-7" data-testid="match-centre-supporting-skeleton" aria-hidden="true">
      {/* Tale of the tape */}
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
      {/* Form + H2H (compact) */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
      {(isLive || isCompleted) && (
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      )}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

function ExceptionalBanner({ centre }: { centre: MatchCentrePayload }) {
  return (
    <div
      className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
      data-testid="match-exceptional-banner"
    >
      {centre.presentationState === "POSTPONED" && (
        <p>This fixture has been postponed. Kickoff times shown are the original schedule.</p>
      )}
      {centre.presentationState === "CANCELLED" && <p>This fixture has been cancelled.</p>}
      {centre.presentationState === "ABANDONED" && (
        <p>
          This match was abandoned
          {centre.state.rawStatus ? ` (${centre.state.rawStatus})` : ""}. The score above reflects
          the state when play stopped and is not a final result unless later awarded.
        </p>
      )}
    </div>
  );
}

function hasLineupStarters(centre: MatchCentrePayload): boolean {
  return Boolean(centre.lineups?.home?.starters.length || centre.lineups?.away?.starters.length);
}

function renderModule(id: MatchCentreModuleId, centre: MatchCentrePayload) {
  const events = centre.match.timeline?.events ?? [];
  const stats = centre.match.timeline?.stats ?? [];
  const confirmed = centre.lineups?.kind === "confirmed" && hasLineupStarters(centre);
  const predicted = centre.lineups?.kind === "predicted" && hasLineupStarters(centre);

  switch (id) {
    case "howTheyCompare":
      return (
        <HowTheyCompare
          key={id}
          home={centre.home}
          away={centre.away}
          h2h={centre.h2h}
          compared={centre.presentationState === "COMPLETED"}
        />
      );
    case "recentForm":
      return <RecentFormSection key={id} home={centre.home} away={centre.away} />;
    case "predictedXi":
      return predicted ? (
        <StartingXiSection
          key={id}
          lineups={centre.lineups}
          homeTeam={centre.match.homeTeam}
          awayTeam={centre.match.awayTeam}
          title="Predicted XI"
        />
      ) : null;
    case "startingXi":
      return confirmed || (hasLineupStarters(centre) && centre.lineups?.kind !== "predicted") ? (
        <StartingXiSection
          key={id}
          lineups={centre.lineups}
          homeTeam={centre.match.homeTeam}
          awayTeam={centre.match.awayTeam}
          title="Starting XI"
        />
      ) : null;
    case "finalXi":
      return hasLineupStarters(centre) ? (
        <StartingXiSection
          key={id}
          lineups={centre.lineups}
          homeTeam={centre.match.homeTeam}
          awayTeam={centre.match.awayTeam}
          title="Final XI"
        />
      ) : null;
    case "upcomingFixtures":
      return (
        <UpcomingFixturesSection
          key={id}
          home={centre.home}
          away={centre.away}
          title={centre.presentationState === "COMPLETED" ? "What’s next" : "Upcoming fixtures"}
        />
      );
    case "timeline":
      return (
        <MatchTimeline
          key={id}
          events={events}
          homeTeam={centre.match.homeTeam}
          awayTeam={centre.match.awayTeam}
        />
      );
    case "statistics":
      return (
        <StatsSection
          key={id}
          stats={stats}
          homeName={centre.match.homeTeam.name}
          awayName={centre.match.awayTeam.name}
        />
      );
    case "h2hDetail":
      return (
        <H2HSection
          key={id}
          h2h={centre.h2h}
          homeName={centre.match.homeTeam.name}
          awayName={centre.match.awayTeam.name}
        />
      );
    case "relatedArticles":
      return <RelatedArticles key={id} articles={centre.relatedNews} />;
    default:
      return null;
  }
}

export function PreEventMatchCentre({ centre }: { centre: MatchCentrePayload }) {
  const hasConfirmed = centre.lineups?.kind === "confirmed" && hasLineupStarters(centre);
  const hasPredicted = centre.lineups?.kind === "predicted" && hasLineupStarters(centre);
  const order = resolvePreEventModuleOrder({
    hasPredictedLineup: hasPredicted,
    hasConfirmedLineup: hasConfirmed,
    kickoff: centre.match.kickoffTime,
    now: Date.now(),
  });

  return (
    <div className="space-y-7 md:space-y-9" data-testid="pre-event-match-centre">
      <MatchCentreHeader centre={centre} />
      {order.map((id) => renderModule(id, centre))}
    </div>
  );
}

export function LiveMatchCentre({ centre }: { centre: MatchCentrePayload }) {
  const order = resolveLiveModuleOrder({
    hasConfirmedLineup: hasLineupStarters(centre),
  });

  return (
    <div className="space-y-7 md:space-y-9" data-testid="live-match-centre">
      <MatchCentreHeader centre={centre} />
      {order.map((id) => renderModule(id, centre))}
    </div>
  );
}

export function CompletedMatchCentre({ centre }: { centre: MatchCentrePayload }) {
  const order = resolveCompletedModuleOrder({
    hasConfirmedLineup: hasLineupStarters(centre),
  });

  return (
    <div className="space-y-7 md:space-y-9" data-testid="completed-match-centre">
      <MatchCentreHeader centre={centre} />
      {order.map((id) => renderModule(id, centre))}
    </div>
  );
}

export function ExceptionalMatchCentre({ centre }: { centre: MatchCentrePayload }) {
  const events = centre.match.timeline?.events ?? [];
  const showEvents = centre.presentationState === "ABANDONED" && events.length > 0;
  return (
    <div className="space-y-7 md:space-y-9" data-testid="exceptional-match-centre">
      <MatchCentreHeader centre={centre} />
      <ExceptionalBanner centre={centre} />
      {showEvents && (
        <MatchTimeline
          events={events}
          homeTeam={centre.match.homeTeam}
          awayTeam={centre.match.awayTeam}
          abandoned
        />
      )}
      <RelatedArticles articles={centre.relatedNews} />
    </div>
  );
}

export function MatchCentreView({ centre }: { centre: MatchCentrePayload }) {
  switch (centre.presentationState) {
    case "LIVE":
      return <LiveMatchCentre centre={centre} />;
    case "COMPLETED":
      return <CompletedMatchCentre centre={centre} />;
    case "POSTPONED":
    case "CANCELLED":
    case "ABANDONED":
      return <ExceptionalMatchCentre centre={centre} />;
    case "PRE_EVENT":
    default:
      return <PreEventMatchCentre centre={centre} />;
  }
}

/** Build hero props from the fast core match response while `/centre` loads. */
export function matchCentreHeroFromCoreMatch(core: {
  id: string;
  slug: string;
  kickoffTime?: string | Date | null;
  homeScore?: number | null;
  awayScore?: number | null;
  venue?: string | null;
  status?: string | null;
  timeline?: unknown;
  competition?: string | null;
  competitionName?: string | null;
  goalserveCompetitionId?: string | null;
  round?: string | null;
  season?: string | null;
  homeTeam?: {
    id?: string;
    name?: string;
    shortName?: string | null;
    slug?: string | null;
    primaryColor?: string | null;
    logoUrl?: string | null;
  } | null;
  awayTeam?: {
    id?: string;
    name?: string;
    shortName?: string | null;
    slug?: string | null;
    primaryColor?: string | null;
    logoUrl?: string | null;
  } | null;
  state?: MatchCentrePayload["state"];
  presentationState?: MatchCentrePayload["presentationState"];
}): MatchCentreHeroProps {
  const timelineParsed = readGoalserveMatchTimeline(core.timeline);
  const state =
    core.state ??
    resolveMatchCentreState({
      rawStatus: timelineParsed?.status ?? null,
      storedStatus: core.status,
    });
  const home = core.homeTeam;
  const away = core.awayTeam;
  return {
    match: {
      id: core.id,
      slug: core.slug,
      kickoffTime: core.kickoffTime ? new Date(core.kickoffTime).toISOString() : null,
      homeScore: core.homeScore ?? null,
      awayScore: core.awayScore ?? null,
      venue: core.venue ?? timelineParsed?.venue ?? null,
      referee: timelineParsed?.referee ?? null,
      competitionName: String(core.competitionName || core.competition || "Match"),
      goalserveCompetitionId: core.goalserveCompetitionId ?? null,
      competitionSlug: null,
      season: core.season ?? null,
      round: core.round ?? null,
      status: core.status || "scheduled",
      timeline: timelineParsed,
      homeTeam: {
        id: home?.id ?? null,
        name: home?.name || "Home",
        shortName: home?.shortName || home?.name?.slice(0, 3).toUpperCase() || "HOM",
        slug: home?.slug || "",
        primaryColor: home?.primaryColor,
        logoUrl: home?.logoUrl,
      },
      awayTeam: {
        id: away?.id ?? null,
        name: away?.name || "Away",
        shortName: away?.shortName || away?.name?.slice(0, 3).toUpperCase() || "AWA",
        slug: away?.slug || "",
        primaryColor: away?.primaryColor,
        logoUrl: away?.logoUrl,
      },
    },
    presentationState: core.presentationState ?? state.presentationState,
    state,
  };
}
