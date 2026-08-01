import { Link } from "wouter";
import { format } from "date-fns";
import { Activity, BarChart3, Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchTeamBadge } from "@/components/matches/match-team-badge";
import { ArticleCard } from "@/components/cards/article-card";
import { teamHub } from "@/lib/urls";
import {
  eventTypeLabel,
  hasMeaningfulMatchStats,
  type GoalserveMatchEvent,
  type GoalserveMatchStat,
} from "@shared/goalserve-match-detail";
import { matchCentreResultLabel } from "@shared/match-centre-state";
import type { MatchCentrePayload, MatchCentreTeamContext } from "@shared/match-centre";
import type { Article } from "@shared/schema";

function FormPills({ form }: { form: MatchCentreTeamContext["form"] }) {
  if (!form.length) return null;
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Form ${form.map((f) => f.result).join(" ")}`}>
      {form.map((f, i) => (
        <span
          key={`${f.kickoffTime}-${i}`}
          className="text-[10px] font-semibold tabular-nums text-muted-foreground"
        >
          {f.result}
        </span>
      ))}
    </span>
  );
}

function ContextStrip({ home, away }: { home: MatchCentreTeamContext; away: MatchCentreTeamContext }) {
  const row = (ctx: MatchCentreTeamContext) => {
    const pos = ctx.standing ? `${ctx.standing.position}${ordinal(ctx.standing.position)}` : null;
    const formBits = ctx.form.map((f) => f.result).join(" ");
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
        <span className="font-medium">{ctx.team.name}</span>
        {pos && (
          <span className="text-muted-foreground">
            {pos}
            {ctx.standing?.competitionName ? ` · ${ctx.standing.competitionName}` : ""}
            {ctx.standing?.tableLabel ? ` · ${ctx.standing.tableLabel}` : ""}
          </span>
        )}
        {formBits && (
          <span className="text-muted-foreground" aria-label={`Recent form ${formBits}`}>
            · <FormPills form={ctx.form} />
          </span>
        )}
      </div>
    );
  };

  if (!home.standing && !home.form.length && !away.standing && !away.form.length) return null;

  return (
    <Card data-testid="match-context-strip">
      <CardContent className="py-4 space-y-2">
        {row(home)}
        {row(away)}
      </CardContent>
    </Card>
  );
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
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
    <Card data-testid="match-timeline">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
              className="flex gap-3 text-sm"
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
                {event.result && (
                  <p className="text-xs text-muted-foreground">{event.result}</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
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
    <Card data-testid="match-statistics">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 text-xs text-muted-foreground mb-1">
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
      </CardContent>
    </Card>
  );
}

function H2HSection({ h2h, homeName, awayName }: { h2h: MatchCentrePayload["h2h"]; homeName: string; awayName: string }) {
  return (
    <Card data-testid="match-h2h">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Head-to-head</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {h2h.emptyMessage ? (
          <p className="text-sm text-muted-foreground">{h2h.emptyMessage}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {homeName} {h2h.summary.homeTeamWins} · Draws {h2h.summary.draws} · {awayName}{" "}
              {h2h.summary.awayTeamWins}
            </p>
            <ul className="space-y-2">
              {h2h.matches.map((m) => {
                const body = (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {m.kickoffTime ? format(new Date(m.kickoffTime), "d MMM yyyy") : ""}
                      {m.isCurrentMatch ? " · This match" : ""}
                    </span>
                    <span className="font-medium tabular-nums">
                      {m.homeTeamName} {m.homeScore}–{m.awayScore} {m.awayTeamName}
                    </span>
                    <span className="text-xs text-muted-foreground w-full sm:w-auto">{m.competitionName}</span>
                  </div>
                );
                return (
                  <li key={`${m.kickoffTime}-${m.homeTeamName}-${m.awayTeamName}`} className="border-b border-border/60 pb-2 last:border-0">
                    {m.href ? (
                      <Link href={m.href} className="hover:underline">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
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

  const side = (label: string, ctx: MatchCentreTeamContext) => (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {ctx.previousFixture && (
        <div className="text-xs text-muted-foreground">
          Previous:{" "}
          {ctx.previousFixture.href ? (
            <Link href={ctx.previousFixture.href} className="hover:underline text-foreground">
              {ctx.previousFixture.opponentName} ({ctx.previousFixture.homeScore}–{ctx.previousFixture.awayScore})
            </Link>
          ) : (
            <span>
              {ctx.previousFixture.opponentName} ({ctx.previousFixture.homeScore}–{ctx.previousFixture.awayScore})
            </span>
          )}
        </div>
      )}
      {ctx.nextFixtures.length > 0 && (
        <ul className="space-y-1 text-xs">
          {ctx.nextFixtures.map((f) => (
            <li key={`${f.kickoffTime}-${f.opponentName}`}>
              {f.href ? (
                <Link href={f.href} className="hover:underline">
                  {format(new Date(f.kickoffTime), "d MMM")} · {f.opponentName}
                </Link>
              ) : (
                <span>
                  {format(new Date(f.kickoffTime), "d MMM")} · {f.opponentName}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Card data-testid="match-fixtures-context">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {side(home.team.name, home)}
        {side(away.team.name, away)}
      </CardContent>
    </Card>
  );
}

function RelatedNews({ articles }: { articles: MatchCentrePayload["relatedNews"] }) {
  if (!articles.length) return null;
  const asArticles = articles.map(
    (a) =>
      ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        coverImage: a.coverImage,
        publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
      }) as Article,
  );
  return (
    <Card data-testid="match-related-news">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Related news</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {asArticles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </CardContent>
    </Card>
  );
}

function statusBadge(centre: MatchCentrePayload) {
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

export function MatchCentreHeader({ centre }: { centre: MatchCentrePayload }) {
  const m = centre.match;
  const kickoff = m.kickoffTime ? new Date(m.kickoffTime) : null;
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

  return (
    <Card data-testid="match-centre-header">
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{m.competitionName}</span>
          {m.round && <span>· {m.round}</span>}
          {statusBadge(centre)}
          {minuteTimer && (
            <span className="tabular-nums font-medium text-foreground">{minuteTimer}&apos;</span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Link href={teamHub(m.homeTeam.slug)} className="flex flex-col items-center gap-2 min-w-0">
            <MatchTeamBadge
              team={{
                id: m.homeTeam.id || undefined,
                name: m.homeTeam.name,
                logoUrl: m.homeTeam.logoUrl,
              }}
              size="lg"
            />
            <span className="text-sm font-medium text-center truncate w-full">{m.homeTeam.name}</span>
          </Link>

          <div className="text-center px-2">
            {showScore && scoreReady ? (
              <div className="text-3xl font-bold tabular-nums">
                {m.homeScore}–{m.awayScore}
              </div>
            ) : showScore ? (
              <div className="text-3xl font-bold tabular-nums text-muted-foreground">–</div>
            ) : kickoff ? (
              <div className="space-y-1">
                <div className="text-2xl font-semibold tabular-nums">{format(kickoff, "HH:mm")}</div>
                <div className="text-xs text-muted-foreground">{format(kickoff, "EEE d MMM yyyy")}</div>
              </div>
            ) : (
              <div className="text-muted-foreground">TBC</div>
            )}
            {m.timeline?.htScore &&
              (centre.presentationState === "LIVE" ||
                centre.presentationState === "COMPLETED" ||
                centre.presentationState === "ABANDONED") && (
                <div className="text-xs text-muted-foreground mt-1">
                  HT {String(m.timeline.htScore).replace(/[\[\]]/g, "")}
                </div>
              )}
          </div>

          <Link href={teamHub(m.awayTeam.slug)} className="flex flex-col items-center gap-2 min-w-0">
            <MatchTeamBadge
              team={{
                id: m.awayTeam.id || undefined,
                name: m.awayTeam.name,
                logoUrl: m.awayTeam.logoUrl,
              }}
              size="lg"
            />
            <span className="text-sm font-medium text-center truncate w-full">{m.awayTeam.name}</span>
          </Link>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground justify-center">
          {m.venue && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {m.venue}
            </span>
          )}
          {m.referee && <span>Ref: {m.referee}</span>}
          {kickoff && centre.presentationState !== "PRE_EVENT" && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(kickoff, "d MMM yyyy")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PreEventMatchCentre({ centre }: { centre: MatchCentrePayload }) {
  return (
    <div className="space-y-4" data-testid="pre-event-match-centre">
      <MatchCentreHeader centre={centre} />
      <ContextStrip home={centre.home} away={centre.away} />
      <H2HSection h2h={centre.h2h} homeName={centre.match.homeTeam.name} awayName={centre.match.awayTeam.name} />
      <FixturesSection home={centre.home} away={centre.away} title="Previous and upcoming" />
      <RelatedNews articles={centre.relatedNews} />
    </div>
  );
}

export function LiveMatchCentre({ centre }: { centre: MatchCentrePayload }) {
  const events = centre.match.timeline?.events ?? [];
  const stats = centre.match.timeline?.stats ?? [];
  return (
    <div className="space-y-4" data-testid="live-match-centre">
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
      <ContextStrip home={centre.home} away={centre.away} />
      <H2HSection h2h={centre.h2h} homeName={centre.match.homeTeam.name} awayName={centre.match.awayTeam.name} />
      <RelatedNews articles={centre.relatedNews} />
    </div>
  );
}

export function CompletedMatchCentre({ centre }: { centre: MatchCentrePayload }) {
  const events = centre.match.timeline?.events ?? [];
  const stats = centre.match.timeline?.stats ?? [];
  return (
    <div className="space-y-4" data-testid="completed-match-centre">
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
      <FixturesSection home={centre.home} away={centre.away} title="What’s next" />
      {(centre.home.form.length > 0 || centre.away.form.length > 0) && (
        <div className="space-y-2">
          <p className="text-sm font-medium px-1">Form before the match</p>
          <ContextStrip home={centre.home} away={centre.away} />
        </div>
      )}
      <H2HSection h2h={centre.h2h} homeName={centre.match.homeTeam.name} awayName={centre.match.awayTeam.name} />
      <RelatedNews articles={centre.relatedNews} />
    </div>
  );
}

export function ExceptionalMatchCentre({ centre }: { centre: MatchCentrePayload }) {
  const events = centre.match.timeline?.events ?? [];
  const showEvents = centre.presentationState === "ABANDONED" && events.length > 0;
  return (
    <div className="space-y-4" data-testid="exceptional-match-centre">
      <MatchCentreHeader centre={centre} />
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          {centre.presentationState === "POSTPONED" && (
            <p>This fixture has been postponed. Kickoff times shown are the original schedule.</p>
          )}
          {centre.presentationState === "CANCELLED" && (
            <p>This fixture has been cancelled.</p>
          )}
          {centre.presentationState === "ABANDONED" && (
            <p>
              This match was abandoned
              {centre.state.rawStatus ? ` (${centre.state.rawStatus})` : ""}. The score above
              reflects the state when play stopped and is not a final result unless later awarded.
            </p>
          )}
        </CardContent>
      </Card>
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
