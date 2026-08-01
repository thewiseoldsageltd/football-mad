import { useEffect, useState } from "react";
import {
  placeLineupOnDualPitch,
  type GoalserveTeamLineup,
} from "@shared/goalserve-lineup";
import type {
  MatchCentreLineups,
  MatchCentreTeamLineup,
  MatchCentreTeamRef,
} from "@shared/match-centre";

const XI_VIEW_STORAGE_KEY = "fm.match-centre.xi-view";

/** Pitch XI stays behind a feature flag until ready for product rollout. */
const PITCH_XI_ENABLED = import.meta.env.VITE_MATCH_CENTRE_PITCH_XI === "1";

export type StartingXiViewMode = "list" | "pitch";

function readStoredView(): StartingXiViewMode {
  if (typeof window === "undefined") return "list";
  try {
    const v = window.localStorage.getItem(XI_VIEW_STORAGE_KEY);
    if (v === "list" || v === "pitch") return v;
  } catch {
    /* ignore */
  }
  return "list";
}

function toGoalserveTeamLineup(lineup: MatchCentreTeamLineup): GoalserveTeamLineup {
  return {
    formation: lineup.formation,
    starters: lineup.starters.map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      position: p.position,
      formationPos: p.formationPos,
      isSubstitute: false,
    })),
    substitutes: lineup.substitutes.map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      position: p.position,
      formationPos: p.formationPos,
      isSubstitute: true,
    })),
  };
}

function hasAnyStarters(lineups: MatchCentreLineups | null | undefined): boolean {
  return Boolean(lineups?.home?.starters.length || lineups?.away?.starters.length);
}

function ViewToggle({
  value,
  onChange,
}: {
  value: StartingXiViewMode;
  onChange: (v: StartingXiViewMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-border/70 p-0.5 bg-muted/40"
      role="group"
      aria-label="Starting XI presentation"
    >
      {(["list", "pitch"] as const).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize ${
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={active}
            onClick={() => onChange(mode)}
          >
            {mode}
          </button>
        );
      })}
    </div>
  );
}

function ListView({
  homeTeam,
  awayTeam,
  home,
  away,
}: {
  homeTeam: MatchCentreTeamRef;
  awayTeam: MatchCentreTeamRef;
  home: MatchCentreTeamLineup | null;
  away: MatchCentreTeamLineup | null;
}) {
  const homeStarters = home?.starters ?? [];
  const awayStarters = away?.starters ?? [];
  const rows = Math.max(homeStarters.length, awayStarters.length, 0);

  return (
    <div className="overflow-hidden" data-testid="starting-xi-list">
      <div className="grid grid-cols-2 gap-0 border-b border-border/60 pb-2 mb-1">
        <div className="pr-2">
          <p className="text-sm font-semibold truncate">{homeTeam.name}</p>
          {home?.formation ? (
            <p className="text-xs text-muted-foreground tabular-nums">{home.formation}</p>
          ) : null}
        </div>
        <div className="pl-2 text-right">
          <p className="text-sm font-semibold truncate">{awayTeam.name}</p>
          {away?.formation ? (
            <p className="text-xs text-muted-foreground tabular-nums">{away.formation}</p>
          ) : null}
        </div>
      </div>
      <ul>
        {Array.from({ length: rows }).map((_, i) => {
          const h = homeStarters[i];
          const a = awayStarters[i];
          return (
            <li
              key={i}
              className="grid grid-cols-2 gap-2 border-b border-border/40 last:border-0 py-2 text-sm"
            >
              <div className="min-w-0 flex items-baseline gap-2">
                {h ? (
                  <>
                    <span className="w-6 shrink-0 tabular-nums text-muted-foreground text-xs">
                      {h.number ?? "·"}
                    </span>
                    <span className="truncate font-medium">{h.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </div>
              <div className="min-w-0 flex items-baseline gap-2 justify-end text-right">
                {a ? (
                  <>
                    <span className="truncate font-medium">{a.name}</span>
                    <span className="w-6 shrink-0 tabular-nums text-muted-foreground text-xs text-right">
                      {a.number ?? "·"}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PitchView({
  homeTeam,
  awayTeam,
  home,
  away,
}: {
  homeTeam: MatchCentreTeamRef;
  awayTeam: MatchCentreTeamRef;
  home: MatchCentreTeamLineup | null;
  away: MatchCentreTeamLineup | null;
}) {
  const homePlaces = home ? placeLineupOnDualPitch(toGoalserveTeamLineup(home), "home") : [];
  const awayPlaces = away ? placeLineupOnDualPitch(toGoalserveTeamLineup(away), "away") : [];

  return (
    <div className="space-y-2" data-testid="starting-xi-pitch">
      <div className="flex justify-between gap-3 text-xs text-muted-foreground px-0.5">
        <span className="font-medium text-foreground truncate">
          {homeTeam.name}
          {home?.formation ? ` · ${home.formation}` : ""}
        </span>
        <span className="font-medium text-foreground truncate text-right">
          {awayTeam.name}
          {away?.formation ? ` · ${away.formation}` : ""}
        </span>
      </div>
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-border/80 bg-muted/30"
        style={{ aspectRatio: "16 / 10" }}
        role="img"
        aria-label={`Formation pitch. ${homeTeam.name} attack left to right. ${awayTeam.name} attack right to left.`}
      >
        <div className="absolute inset-2 rounded-xl border border-border/50 bg-background/80" />
        <div className="absolute top-2 bottom-2 left-1/2 w-px -translate-x-1/2 bg-border" />
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/40" />

        {[...homePlaces, ...awayPlaces].map((p) => (
          <div
            key={`${p.player.id ?? p.player.name}-${p.x}-${p.y}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 max-w-[28%]"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-border bg-card px-1.5 text-[11px] font-semibold tabular-nums shadow-sm">
              {p.player.number ?? "·"}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center truncate max-w-full">
              {p.player.name.split(" ").slice(-1)[0]}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        Home attack left → right · Away attack right → left
      </p>
    </div>
  );
}

/**
 * Starting XI — list by default. Pitch toggle only when feature-flagged.
 */
export function StartingXiSection({
  lineups,
  homeTeam,
  awayTeam,
  title = "Starting XI",
}: {
  lineups: MatchCentreLineups | null;
  homeTeam: MatchCentreTeamRef;
  awayTeam: MatchCentreTeamRef;
  title?: string;
}) {
  const [view, setView] = useState<StartingXiViewMode>("list");

  useEffect(() => {
    if (PITCH_XI_ENABLED) setView(readStoredView());
  }, []);

  const setAndStore = (mode: StartingXiViewMode) => {
    setView(mode);
    try {
      window.localStorage.setItem(XI_VIEW_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const available = hasAnyStarters(lineups);
  const showPitch = PITCH_XI_ENABLED && view === "pitch";

  return (
    <section data-testid="match-starting-xi" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {title}
          </h2>
          {lineups?.kind === "confirmed" && available ? (
            <p className="text-xs text-muted-foreground mt-0.5">Confirmed line-ups</p>
          ) : null}
        </div>
        {available && PITCH_XI_ENABLED ? (
          <ViewToggle value={view} onChange={setAndStore} />
        ) : null}
      </div>

      {!available ? (
        <div
          className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-5 py-8 text-center"
          data-testid="starting-xi-empty"
        >
          <p className="text-sm font-medium text-foreground/80">Line-ups not confirmed yet</p>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">
            Confirmed starting elevens will appear here when they become available.
          </p>
        </div>
      ) : showPitch ? (
        <PitchView
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          home={lineups?.home ?? null}
          away={lineups?.away ?? null}
        />
      ) : (
        <ListView
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          home={lineups?.home ?? null}
          away={lineups?.away ?? null}
        />
      )}
    </section>
  );
}
