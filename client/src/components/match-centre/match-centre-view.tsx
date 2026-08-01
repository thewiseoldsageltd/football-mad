import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchTeamBadge } from "@/components/matches/match-team-badge";
import { newsArticle, teamHub } from "@/lib/urls";
import {
  eventTypeLabel,
  hasMeaningfulMatchStats,
  readGoalserveMatchTimeline,
  type GoalserveMatchEvent,
  type GoalserveMatchStat,
} from "@shared/goalserve-match-detail";
import {
  matchCentreResultLabel,
  resolveMatchCentreState,
} from "@shared/match-centre-state";
import type {
  MatchCentreFixtureLink,
  MatchCentreFormMatch,
  MatchCentreFormResult,
  MatchCentrePayload,
  MatchCentreTeamContext,
} from "@shared/match-centre";
import { TaleOfTheTape } from "@/components/match-centre/tale-of-the-tape";
import { StartingXiSection } from "@/components/match-centre/starting-xi";

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
    <div className="flex items-start gap-3 py-2.5">
      <ResultBadge result={match.result} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium truncate">{match.opponentName}</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {match.homeAway === "home" ? "Home" : "Away"}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">{score}</span>
          <span>{match.competitionName}</span>
          {kickoff ? <span>{format(kickoff, "d MMM yyyy")}</span> : null}
        </div>
      </div>
    </div>
  );

  return (
    <li className="border-b border-border/50 last:border-0">
      {match.href ? (
        <Link href={match.href} className="block hover:bg-muted/40 -mx-1 px-1 rounded-md">
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
      <div className="space-y-2">
        <p className="text-sm font-semibold">{ctx.team.name}</p>
        <p className="text-sm text-muted-foreground">No recent competitive form before this kickoff.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 min-w-0">
      <p className="text-sm font-semibold">{ctx.team.name}</p>
      <ul className="divide-y-0">
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
  const [open, setOpen] = useState(true);
  if (!home.form.length && !away.form.length) return null;

  return (
    <Section testId="match-recent-form">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? (
            <>
              Hide details <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show details <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
      {open ? (
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <TeamFormColumn ctx={home} />
          <TeamFormColumn ctx={away} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Form summary is shown in Tale of the tape. Expand for fixture details.
        </p>
      )}
    </Section>
  );
}

function TimelineSection({
  events,
  homeName,
  awayName,
}: {
  events: GoalserveMatchEvent[];
  homeName: string;
  awayName: string;
}) {
  if (!events.length) return null;
  return (
    <Section title="Timeline" testId="match-timeline">
      <div className="rounded-xl border border-border/70 divide-y divide-border/60">
        {events.map((event, idx) => {
          const minute =
            event.minute +
            (event.extraMin ? `+${event.extraMin}` : "") +
            (event.minute && !String(event.minute).includes("'") ? "'" : "");
          const teamLabel =
            event.team === "home" ? homeName : event.team === "away" ? awayName : "";
          return (
            <div
              key={`${event.eventId ?? event.type}-${event.minute}-${event.player ?? ""}-${idx}`}
              className="flex gap-3 px-4 py-3 text-sm"
            >
              <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{minute || "—"}</span>
              <div className="min-w-0">
                <p className="font-medium">
                  {eventTypeLabel(event.type)}
                  {teamLabel ? ` · ${teamLabel}` : ""}
                </p>
                {event.player && (
                  <p className="text-muted-foreground">
                    {event.player}
                    {event.assist ? ` (assist: ${event.assist})` : ""}
                  </p>
                )}
                {event.result && <p className="text-xs text-muted-foreground">{event.result}</p>}
              </div>
            </div>
          );
        })}
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
    <Section title="Statistics" testId="match-statistics">
      <div className="rounded-xl border border-border/70 px-4 py-4 space-y-4">
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
  if (h2h.emptyMessage || h2h.matches.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground px-0.5"
        data-testid="match-h2h-empty"
      >
        {h2h.emptyMessage || "No previous meetings are available in Football Mad yet."}
      </p>
    );
  }

  return (
    <Section title="Head-to-head" testId="match-h2h">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mb-1">
        <span>
          <span className="font-semibold">{homeName}</span>{" "}
          <span className="tabular-nums">{h2h.summary.homeTeamWins}</span>
        </span>
        <span className="text-muted-foreground">
          Draws <span className="tabular-nums text-foreground">{h2h.summary.draws}</span>
        </span>
        <span>
          <span className="font-semibold">{awayName}</span>{" "}
          <span className="tabular-nums">{h2h.summary.awayTeamWins}</span>
        </span>
      </div>
      <ul className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden">
        {h2h.matches.map((m) => {
          const body = (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-4 py-3 text-sm">
              <div className="min-w-0 space-y-0.5">
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
            </div>
          );
          return (
            <li key={`${m.kickoffTime}-${m.homeTeamName}-${m.awayTeamName}`}>
              {m.href ? (
                <Link href={m.href} className="block hover:bg-muted/40">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
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
    <div className="flex items-center gap-3 px-3 py-2.5">
      <MatchTeamBadge
        team={{ name: fixture.opponentName }}
        size="xs"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium text-sm truncate">{fixture.opponentName}</span>
          {result ? <ResultBadge result={result} size="sm" /> : null}
          {score ? <span className="text-sm font-semibold tabular-nums">{score}</span> : null}
        </div>
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
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
    <li className="border-b border-border/50 last:border-0">
      {fixture.href ? (
        <Link href={fixture.href} className="block hover:bg-muted/40">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

function TeamFixturesColumn({
  label,
  ctx,
}: {
  label: string;
  ctx: MatchCentreTeamContext;
}) {
  const hasPrev = !!ctx.previousFixture;
  const hasNext = ctx.nextFixtures.length > 0;
  if (!hasPrev && !hasNext) {
    return (
      <div className="space-y-2 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground">No nearby fixtures available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      <p className="text-sm font-semibold">{label}</p>
      {hasPrev ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Previous
          </p>
          <ul className="rounded-lg border border-border/60 overflow-hidden bg-muted/20">
            <FixtureRow fixture={ctx.previousFixture!} kind="previous" />
          </ul>
        </div>
      ) : null}
      {hasNext ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming
          </p>
          <ul className="rounded-lg border border-border/60 overflow-hidden">
            {ctx.nextFixtures.map((f) => (
              <FixtureRow
                key={`${f.kickoffTime}-${f.opponentName}`}
                fixture={f}
                kind="upcoming"
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function FixturesSection({
  home,
  away,
  title,
}: {
  home: MatchCentreTeamContext;
  away: MatchCentreTeamContext;
  title: string;
}) {
  const hasPrev = home.previousFixture || away.previousFixture;
  const hasNext = home.nextFixtures.length || away.nextFixtures.length;
  if (!hasPrev && !hasNext) return null;

  return (
    <Section title={title} testId="match-fixtures-context">
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <TeamFixturesColumn label={home.team.name} ctx={home} />
        <TeamFixturesColumn label={away.team.name} ctx={away} />
      </div>
    </Section>
  );
}

function RelatedNews({ articles }: { articles: MatchCentrePayload["relatedNews"] }) {
  if (!articles.length) return null;
  const limited = articles.slice(0, 4);
  const [featured, ...rest] = limited;

  return (
    <Section title="Related news" testId="match-related-news">
      <div className="space-y-3">
        {featured ? (
          <Link
            href={newsArticle(featured.slug)}
            className="group grid gap-3 sm:grid-cols-[180px_1fr] rounded-xl border border-border/70 overflow-hidden hover:bg-muted/30"
          >
            <div className="aspect-[16/10] sm:aspect-auto sm:h-full sm:min-h-[112px] bg-muted overflow-hidden">
              {featured.coverImage ? (
                <img
                  src={featured.coverImage}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
            <div className="px-4 py-3 sm:py-4 min-w-0">
              <h3 className="text-base font-semibold leading-snug group-hover:underline line-clamp-3">
                {featured.title}
              </h3>
              {featured.publishedAt ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(featured.publishedAt), { addSuffix: true })}
                </p>
              ) : null}
            </div>
          </Link>
        ) : null}

        {rest.length > 0 ? (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden">
            {rest.map((a) => (
              <li key={a.id}>
                <Link
                  href={newsArticle(a.slug)}
                  className="flex gap-3 px-3 py-2.5 hover:bg-muted/40"
                >
                  <div className="w-16 h-12 shrink-0 rounded-md overflow-hidden bg-muted">
                    {a.coverImage ? (
                      <img
                        src={a.coverImage}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug line-clamp-2">{a.title}</p>
                    {a.publishedAt ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(a.publishedAt), { addSuffix: true })}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Section>
  );
}

function statusBadge(centre: Pick<MatchCentrePayload, "presentationState" | "state">) {
  const { presentationState, state } = centre;
  if (presentationState === "LIVE") {
    if (state.interruptionKind === "suspended") return <Badge variant="destructive">Suspended</Badge>;
    if (state.interruptionKind === "interrupted") return <Badge variant="destructive">Interrupted</Badge>;
    if (state.interruptionKind === "delayed") return <Badge variant="secondary">Delayed</Badge>;
    return <Badge className="bg-red-600 hover:bg-red-600 text-white">LIVE</Badge>;
  }
  if (presentationState === "COMPLETED") {
    return <Badge variant="secondary">{matchCentreResultLabel(state.rawStatus)}</Badge>;
  }
  if (presentationState === "POSTPONED") return <Badge variant="secondary">Postponed</Badge>;
  if (presentationState === "CANCELLED") return <Badge variant="secondary">Cancelled</Badge>;
  if (presentationState === "ABANDONED") return <Badge variant="destructive">Abandoned</Badge>;
  return <Badge variant="outline">Scheduled</Badge>;
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
  const rawTimer = centre.presentationState === "LIVE" ? m.timeline?.timer || null : null;
  const minuteTimer =
    rawTimer && /^\d+$/.test(String(rawTimer).trim()) ? String(rawTimer).trim() : null;
  const scoreReady =
    typeof m.homeScore === "number" &&
    Number.isFinite(m.homeScore) &&
    typeof m.awayScore === "number" &&
    Number.isFinite(m.awayScore);
  const crestSize = isPreEvent || showScore ? "xl" : "lg";

  return (
    <header
      data-testid="match-centre-header"
      className={`rounded-2xl border border-border/80 bg-card ${
        isPreEvent ? "shadow-sm" : ""
      }`}
    >
      <div className={`px-4 sm:px-6 ${isPreEvent ? "pt-5 pb-6 sm:pt-6 sm:pb-8" : "py-5 sm:py-6"}`}>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground mb-5 sm:mb-7">
          <span className="font-medium text-foreground/80">{m.competitionName}</span>
          {m.round ? <span aria-hidden="true">·</span> : null}
          {m.round ? <span>{m.round}</span> : null}
          <span aria-hidden="true">·</span>
          {statusBadge(centre)}
          {minuteTimer ? (
            <span className="tabular-nums font-semibold text-foreground">{minuteTimer}&apos;</span>
          ) : null}
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
    <div className="space-y-8" data-testid="match-centre-supporting-skeleton" aria-hidden="true">
      {(isLive || isCompleted) && (
        <>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </>
      )}
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
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

export function PreEventMatchCentre({ centre }: { centre: MatchCentrePayload }) {
  return (
    <div className="space-y-8 md:space-y-10" data-testid="pre-event-match-centre">
      <MatchCentreHeader centre={centre} />
      <TaleOfTheTape home={centre.home} away={centre.away} h2h={centre.h2h} />
      <StartingXiSection
        lineups={centre.lineups}
        homeTeam={centre.match.homeTeam}
        awayTeam={centre.match.awayTeam}
        title="Starting XI"
      />
      <div className="space-y-8 border-t border-border/60 pt-8">
        <RecentFormSection home={centre.home} away={centre.away} />
        <H2HSection
          h2h={centre.h2h}
          homeName={centre.match.homeTeam.name}
          awayName={centre.match.awayTeam.name}
        />
        <FixturesSection home={centre.home} away={centre.away} title="Previous and upcoming" />
        <RelatedNews articles={centre.relatedNews} />
      </div>
    </div>
  );
}

export function LiveMatchCentre({ centre }: { centre: MatchCentrePayload }) {
  const events = centre.match.timeline?.events ?? [];
  const stats = centre.match.timeline?.stats ?? [];
  return (
    <div className="space-y-8 md:space-y-10" data-testid="live-match-centre">
      <MatchCentreHeader centre={centre} />
      <TimelineSection
        events={events}
        homeName={centre.match.homeTeam.name}
        awayName={centre.match.awayTeam.name}
      />
      <StatsSection
        stats={stats}
        homeName={centre.match.homeTeam.name}
        awayName={centre.match.awayTeam.name}
      />
      <StartingXiSection
        lineups={centre.lineups}
        homeTeam={centre.match.homeTeam}
        awayTeam={centre.match.awayTeam}
        title="Starting XI"
      />
      <div className="space-y-8 border-t border-border/60 pt-8">
        <TaleOfTheTape home={centre.home} away={centre.away} h2h={centre.h2h} />
        <H2HSection
          h2h={centre.h2h}
          homeName={centre.match.homeTeam.name}
          awayName={centre.match.awayTeam.name}
        />
        <RelatedNews articles={centre.relatedNews} />
      </div>
    </div>
  );
}

export function CompletedMatchCentre({ centre }: { centre: MatchCentrePayload }) {
  const events = centre.match.timeline?.events ?? [];
  const stats = centre.match.timeline?.stats ?? [];
  return (
    <div className="space-y-8 md:space-y-10" data-testid="completed-match-centre">
      <MatchCentreHeader centre={centre} />
      <TimelineSection
        events={events}
        homeName={centre.match.homeTeam.name}
        awayName={centre.match.awayTeam.name}
      />
      <StatsSection
        stats={stats}
        homeName={centre.match.homeTeam.name}
        awayName={centre.match.awayTeam.name}
      />
      <StartingXiSection
        lineups={centre.lineups}
        homeTeam={centre.match.homeTeam}
        awayTeam={centre.match.awayTeam}
        title="Final XI"
      />
      <div className="space-y-8 border-t border-border/60 pt-8">
        <FixturesSection home={centre.home} away={centre.away} title="What’s next" />
        {(centre.home.form.length > 0 || centre.away.form.length > 0) && (
          <RecentFormSection
            home={centre.home}
            away={centre.away}
            title="Form before the match"
          />
        )}
        <TaleOfTheTape home={centre.home} away={centre.away} h2h={centre.h2h} />
        <H2HSection
          h2h={centre.h2h}
          homeName={centre.match.homeTeam.name}
          awayName={centre.match.awayTeam.name}
        />
        <RelatedNews articles={centre.relatedNews} />
      </div>
    </div>
  );
}

export function ExceptionalMatchCentre({ centre }: { centre: MatchCentrePayload }) {
  const events = centre.match.timeline?.events ?? [];
  const showEvents = centre.presentationState === "ABANDONED" && events.length > 0;
  return (
    <div className="space-y-8 md:space-y-10" data-testid="exceptional-match-centre">
      <MatchCentreHeader centre={centre} />
      <ExceptionalBanner centre={centre} />
      {showEvents && (
        <TimelineSection
          events={events}
          homeName={centre.match.homeTeam.name}
          awayName={centre.match.awayTeam.name}
        />
      )}
      <RelatedNews articles={centre.relatedNews} />
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
