import type { ReactNode } from "react";
import type {
  MatchCentreFormMatch,
  MatchCentreFormResult,
  MatchCentreH2H,
  MatchCentreTeamContext,
} from "@shared/match-centre";
import {
  compareFormLabel,
  compareH2HSupport,
  compareLeagueLabel,
  howTheyCompareHeading,
} from "@shared/match-centre-compare";

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function resultLabel(result: MatchCentreFormResult): string {
  if (result === "W") return "Win";
  if (result === "D") return "Draw";
  return "Loss";
}

/** Compact form dots — colour + letter (never colour alone). */
function FormDots({ form, align }: { form: MatchCentreFormMatch[]; align: "left" | "right" }) {
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}
      aria-label={`Recent form ${form.map((f) => resultLabel(f.result)).join(", ")}`}
    >
      {form.map((f, i) => {
        const tone =
          f.result === "W"
            ? "bg-emerald-500 text-white"
            : f.result === "D"
              ? "bg-muted-foreground/40 text-foreground"
              : "bg-rose-500 text-white";
        return (
          <span
            key={`${f.kickoffTime}-${i}`}
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold leading-none ${tone}`}
            title={resultLabel(f.result)}
            aria-label={resultLabel(f.result)}
          >
            {f.result}
          </span>
        );
      })}
    </div>
  );
}

function CompareRow({
  label,
  home,
  away,
  testId,
}: {
  label: ReactNode;
  home: ReactNode;
  away: ReactNode;
  testId?: string;
}) {
  return (
    <li
      className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center px-3 sm:px-5 py-3.5"
      data-testid={testId}
    >
      <div className="min-w-0 text-left">{home}</div>
      <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-center px-1 max-w-[8.5rem] leading-tight">
        {label}
      </div>
      <div className="min-w-0 text-right">{away}</div>
    </li>
  );
}

/**
 * Comparison-first band — dimensions only (no repeated crests / team names / VS).
 * Heading adapts for completed matches via `compared`.
 */
export function HowTheyCompare({
  home,
  away,
  h2h,
  compared = false,
}: {
  home: MatchCentreTeamContext;
  away: MatchCentreTeamContext;
  h2h: MatchCentreH2H;
  compared?: boolean;
}) {
  const hasForm = home.form.length > 0 || away.form.length > 0;
  const hasLeague = Boolean(home.standing || away.standing);
  const hasH2h = h2h.matches.length > 0;
  const h2hSupport = compareH2HSupport(compared);

  if (!hasForm && !hasLeague && !hasH2h) return null;

  return (
    <section data-testid="match-how-they-compare" className="space-y-2.5">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase px-0.5">
        {howTheyCompareHeading(compared)}
      </h2>

      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
        <ul className="divide-y divide-border/50">
          {hasForm ? (
            <CompareRow
              label={compareFormLabel(compared)}
              testId="compare-form"
              home={
                home.form.length ? (
                  <FormDots form={home.form} align="left" />
                ) : (
                  <span className="text-sm text-muted-foreground" aria-label={`${home.team.name}: no form`}>
                    —
                  </span>
                )
              }
              away={
                away.form.length ? (
                  <FormDots form={away.form} align="right" />
                ) : (
                  <span className="text-sm text-muted-foreground" aria-label={`${away.team.name}: no form`}>
                    —
                  </span>
                )
              }
            />
          ) : null}

          {hasLeague ? (
            <CompareRow
              label={compareLeagueLabel(compared)}
              testId="compare-league"
              home={
                home.standing ? (
                  <span
                    className="text-xl sm:text-2xl font-semibold tabular-nums leading-none"
                    aria-label={`${home.team.name}: ${ordinal(home.standing.position)}`}
                  >
                    {ordinal(home.standing.position)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground" aria-label={`${home.team.name}: league position unavailable`}>
                    —
                  </span>
                )
              }
              away={
                away.standing ? (
                  <span
                    className="text-xl sm:text-2xl font-semibold tabular-nums leading-none"
                    aria-label={`${away.team.name}: ${ordinal(away.standing.position)}`}
                  >
                    {ordinal(away.standing.position)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground" aria-label={`${away.team.name}: league position unavailable`}>
                    —
                  </span>
                )
              }
            />
          ) : null}

          {hasH2h ? (
            <li className="px-3 sm:px-5 py-3.5" data-testid="compare-h2h">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-center">
                Head-to-head
              </p>
              {h2hSupport ? (
                <p className="mt-0.5 text-[10px] sm:text-[11px] text-muted-foreground/80 text-center tracking-wide uppercase">
                  {h2hSupport}
                </p>
              ) : null}
              <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <p className="text-xl font-semibold tabular-nums leading-none">
                    {h2h.summary.homeTeamWins}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {h2h.summary.homeTeamWins === 1 ? "win" : "wins"}
                  </p>
                  <span className="sr-only">{home.team.name}</span>
                </div>
                <div>
                  <p className="text-xl font-semibold tabular-nums leading-none">{h2h.summary.draws}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {h2h.summary.draws === 1 ? "draw" : "draws"}
                  </p>
                </div>
                <div>
                  <p className="text-xl font-semibold tabular-nums leading-none">
                    {h2h.summary.awayTeamWins}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {h2h.summary.awayTeamWins === 1 ? "win" : "wins"}
                  </p>
                  <span className="sr-only">{away.team.name}</span>
                </div>
              </div>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}

/** @deprecated Use HowTheyCompare — kept as alias during transition. */
export const TaleOfTheTape = HowTheyCompare;
