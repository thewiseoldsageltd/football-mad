import { Link } from "wouter";
import type { ReactNode } from "react";
import { teamHub } from "@/lib/urls";
import type {
  MatchCentreFormMatch,
  MatchCentreFormResult,
  MatchCentreH2H,
  MatchCentreTeamContext,
} from "@shared/match-centre";

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

function resultLabel(result: MatchCentreFormResult): string {
  if (result === "W") return "Win";
  if (result === "D") return "Draw";
  return "Loss";
}

function FormBadges({ form }: { form: MatchCentreFormMatch[] }) {
  return (
    <div
      className="inline-flex flex-wrap items-center justify-center gap-1"
      aria-label={`Recent form ${form.map((f) => resultLabel(f.result)).join(", ")}`}
    >
      {form.map((f, i) => {
        const tone =
          f.result === "W"
            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
            : f.result === "D"
              ? "bg-muted text-foreground"
              : "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100";
        return (
          <span
            key={`${f.kickoffTime}-${i}`}
            className={`inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-[11px] font-semibold tabular-nums ${tone}`}
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

type TapeRow = {
  key: string;
  label: string;
  home: ReactNode;
  away: ReactNode;
};

/**
 * Executive comparison band beneath the hero.
 * Only renders rows with honest available data — no placeholders.
 */
export function TaleOfTheTape({
  home,
  away,
  h2h,
}: {
  home: MatchCentreTeamContext;
  away: MatchCentreTeamContext;
  h2h: MatchCentreH2H;
}) {
  const rows: TapeRow[] = [];

  if (home.standing || away.standing) {
    rows.push({
      key: "league",
      label: "League",
      home: home.standing ? (
        <span>
          {`${home.standing.position}${ordinal(home.standing.position)}`}
          <span className="block text-xs font-normal text-muted-foreground mt-0.5">
            {home.standing.competitionName}
          </span>
        </span>
      ) : null,
      away: away.standing ? (
        <span>
          {`${away.standing.position}${ordinal(away.standing.position)}`}
          <span className="block text-xs font-normal text-muted-foreground mt-0.5">
            {away.standing.competitionName}
          </span>
        </span>
      ) : null,
    });
  }

  if (home.form.length || away.form.length) {
    rows.push({
      key: "form",
      label: "Form",
      home: home.form.length ? <FormBadges form={home.form} /> : null,
      away: away.form.length ? <FormBadges form={away.form} /> : null,
    });
  }

  if (h2h.matches.length > 0) {
    rows.push({
      key: "h2h",
      label: "Head-to-head",
      home: (
        <span className="tabular-nums">
          {h2h.summary.homeTeamWins}{" "}
          <span className="text-xs font-normal text-muted-foreground">wins</span>
        </span>
      ),
      away: (
        <span className="tabular-nums">
          {h2h.summary.awayTeamWins}{" "}
          <span className="text-xs font-normal text-muted-foreground">wins</span>
        </span>
      ),
    });
  }

  if (!rows.length) return null;

  return (
    <section data-testid="match-tale-of-the-tape" className="space-y-3">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Tale of the tape
        </h2>
        {h2h.matches.length > 0 ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            Draws {h2h.summary.draws}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-4 pt-4 pb-2 sm:px-5">
          <Link
            href={teamHub(home.team.slug)}
            className="text-sm sm:text-base font-semibold truncate hover:underline"
          >
            {home.team.name}
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground self-center">
            vs
          </span>
          <Link
            href={teamHub(away.team.slug)}
            className="text-sm sm:text-base font-semibold truncate text-right hover:underline"
          >
            {away.team.name}
          </Link>
        </div>

        <ul className="divide-y divide-border/60">
          {rows.map((row) => (
            <li
              key={row.key}
              className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center px-4 py-3 sm:px-5"
            >
              <div className="min-w-0 text-sm font-semibold text-left">{row.home}</div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground text-center px-1">
                {row.label}
              </div>
              <div className="min-w-0 text-sm font-semibold text-right">{row.away}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
