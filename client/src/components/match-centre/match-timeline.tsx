import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CircleDot,
  Flag,
  OctagonAlert,
  RectangleVertical,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { MatchTeamBadge } from "@/components/matches/match-team-badge";
import type { GoalserveMatchEvent } from "@shared/goalserve-match-detail";
import type { MatchCentreTeamRef } from "@shared/match-centre";
import {
  formatTimelineMinute,
  resolveTimelineEventSide,
  timelineEventKind,
  timelineEventTitle,
  type TimelineSide,
} from "@shared/match-centre-timeline";

const COLLAPSE_AFTER = 24;

type TimelineTeam = MatchCentreTeamRef & {
  goalserveTeamId?: string | null;
};

function EventGlyph({
  event,
  className = "",
}: {
  event: GoalserveMatchEvent;
  className?: string;
}) {
  const kind = timelineEventKind(event);
  const common = `h-4 w-4 shrink-0 ${className}`;
  switch (kind) {
    case "goal":
    case "penalty":
      return <CircleDot className={common} aria-hidden="true" />;
    case "own_goal":
      return <CircleDot className={`${common} opacity-70`} aria-hidden="true" />;
    case "missed_penalty":
      return <AlertTriangle className={common} aria-hidden="true" />;
    case "yellow":
      return <RectangleVertical className={`${common} text-amber-500 fill-amber-400/80`} aria-hidden="true" />;
    case "red":
      return <RectangleVertical className={`${common} text-red-600 fill-red-600/80`} aria-hidden="true" />;
    case "substitution":
      return <ArrowLeftRight className={common} aria-hidden="true" />;
    case "var":
    case "disallowed":
      return <ShieldAlert className={common} aria-hidden="true" />;
    case "period":
      return <Flag className={common} aria-hidden="true" />;
    default:
      return <Activity className={common} aria-hidden="true" />;
  }
}

function EventBody({
  event,
  side,
  teamName,
  align,
}: {
  event: GoalserveMatchEvent;
  side: TimelineSide;
  teamName: string;
  align: "left" | "right" | "center";
}) {
  const kind = timelineEventKind(event);
  const title = timelineEventTitle(event);
  const textAlign =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const rowDir = align === "right" ? "flex-row-reverse" : "flex-row";

  return (
    <div className={`min-w-0 space-y-1 ${textAlign}`}>
      <div className={`flex items-start gap-1.5 ${rowDir}`}>
        <EventGlyph event={event} className="mt-0.5" />
        <p className="text-sm font-semibold leading-snug">
          {title}
          {side !== "NEUTRAL" ? (
            <span className="font-normal text-muted-foreground"> · {teamName}</span>
          ) : null}
        </p>
      </div>

      {kind === "substitution" ? (
        <div className="text-sm text-muted-foreground space-y-0.5">
          {event.player ? <p>{event.player} off</p> : null}
          {event.assist ? <p>{event.assist} on</p> : null}
        </div>
      ) : (
        <>
          {event.player ? <p className="text-sm text-muted-foreground">{event.player}</p> : null}
          {event.assist && kind !== "yellow" && kind !== "red" ? (
            <p className="text-xs text-muted-foreground">
              {kind === "var" || kind === "disallowed" ? event.assist : `Assist: ${event.assist}`}
            </p>
          ) : null}
          {event.assist && (kind === "yellow" || kind === "red") ? (
            <p className="text-xs text-muted-foreground">{event.assist}</p>
          ) : null}
        </>
      )}

      {event.result ? (
        <p className="text-xs font-medium tabular-nums text-foreground/80">
          {String(event.result).replace(/[\[\]]/g, "")}
        </p>
      ) : null}
    </div>
  );
}

function TimelineHeader({
  homeTeam,
  awayTeam,
}: {
  homeTeam: TimelineTeam;
  awayTeam: TimelineTeam;
}) {
  return (
    <div
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-1"
      data-testid="match-timeline-header"
    >
      <div className="flex items-center gap-2 min-w-0">
        <MatchTeamBadge
          team={{ id: homeTeam.id || undefined, name: homeTeam.name, logoUrl: homeTeam.logoUrl }}
          size="xs"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{homeTeam.name}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Home</p>
        </div>
      </div>
      <div className="w-px h-8 bg-border" aria-hidden="true" />
      <div className="flex items-center gap-2 min-w-0 justify-end text-right">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{awayTeam.name}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Away</p>
        </div>
        <MatchTeamBadge
          team={{ id: awayTeam.id || undefined, name: awayTeam.name, logoUrl: awayTeam.logoUrl }}
          size="xs"
        />
      </div>
    </div>
  );
}

function SplitEventRow({
  event,
  side,
  homeTeam,
  awayTeam,
  index,
}: {
  event: GoalserveMatchEvent;
  side: TimelineSide;
  homeTeam: TimelineTeam;
  awayTeam: TimelineTeam;
  index: number;
}) {
  const minute = formatTimelineMinute(event) || "—";
  const teamName =
    side === "HOME" ? homeTeam.name : side === "AWAY" ? awayTeam.name : "Match";

  if (side === "NEUTRAL") {
    return (
      <li
        className="relative py-3"
        data-testid={`timeline-event-${index}`}
        data-side="NEUTRAL"
      >
        <div className="flex justify-center mb-2">
          <span className="relative z-[1] inline-flex min-w-10 items-center justify-center rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold tabular-nums">
            {minute}
          </span>
        </div>
        <div className="mx-auto max-w-md rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
          <EventBody event={event} side={side} teamName={teamName} align="center" />
        </div>
      </li>
    );
  }

  return (
    <li
      className="relative grid grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] gap-x-2 sm:gap-x-3 py-3 items-start"
      data-testid={`timeline-event-${index}`}
      data-side={side}
    >
      <div className={side === "HOME" ? "min-w-0" : "min-w-0"} aria-hidden={side !== "HOME"}>
        {side === "HOME" ? (
          <EventBody event={event} side={side} teamName={teamName} align="right" />
        ) : null}
      </div>

      <div className="flex justify-center pt-0.5">
        <span className="relative z-[1] inline-flex min-w-10 items-center justify-center rounded-full border border-border bg-background px-1.5 py-0.5 text-xs font-semibold tabular-nums">
          {minute}
        </span>
      </div>

      <div className={side === "AWAY" ? "min-w-0" : "min-w-0"} aria-hidden={side !== "AWAY"}>
        {side === "AWAY" ? (
          <EventBody event={event} side={side} teamName={teamName} align="left" />
        ) : null}
      </div>
    </li>
  );
}

export function MatchTimeline({
  events,
  homeTeam,
  awayTeam,
  abandoned = false,
}: {
  events: GoalserveMatchEvent[];
  homeTeam: TimelineTeam;
  awayTeam: TimelineTeam;
  abandoned?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const prepared = useMemo(() => {
    return events.map((event, index) => ({
      event,
      index,
      side: resolveTimelineEventSide({
        event,
        homeTeam: {
          id: homeTeam.id,
          goalserveTeamId: homeTeam.goalserveTeamId,
          name: homeTeam.name,
          shortName: homeTeam.shortName,
          slug: homeTeam.slug,
        },
        awayTeam: {
          id: awayTeam.id,
          goalserveTeamId: awayTeam.goalserveTeamId,
          name: awayTeam.name,
          shortName: awayTeam.shortName,
          slug: awayTeam.slug,
        },
      }),
    }));
  }, [events, homeTeam, awayTeam]);

  if (!prepared.length && !abandoned) return null;

  const needsCollapse = prepared.length > COLLAPSE_AFTER;
  const visible =
    !needsCollapse || expanded ? prepared : prepared.slice(0, COLLAPSE_AFTER);

  return (
    <section data-testid="match-timeline" className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Timeline
      </h2>
      <TimelineHeader homeTeam={homeTeam} awayTeam={awayTeam} />

      <div className="relative rounded-2xl border border-border/80 px-2 sm:px-3 py-1">
        <div
          className="pointer-events-none absolute top-3 bottom-3 left-1/2 w-px -translate-x-1/2 bg-border"
          aria-hidden="true"
        />

        <ol className="relative list-none m-0 p-0">
          {visible.map(({ event, side, index }) => (
            <SplitEventRow
              key={`${event.eventId ?? event.type}-${event.minute}-${event.extraMin ?? ""}-${event.player ?? ""}-${index}`}
              event={event}
              side={side}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              index={index}
            />
          ))}
          {abandoned ? (
            <li className="relative py-3" data-testid="timeline-abandoned-marker">
              <div className="flex justify-center mb-2">
                <span className="relative z-[1] inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
                  <OctagonAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  Abandoned
                </span>
              </div>
              <p className="text-center text-sm text-muted-foreground px-4">
                Play stopped. Events above reflect the match until abandonment — not a full-time result.
              </p>
            </li>
          ) : null}
        </ol>
      </div>

      {needsCollapse ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show fewer events" : `Show all ${prepared.length} events`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
