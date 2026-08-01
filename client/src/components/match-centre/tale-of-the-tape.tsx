import { Link } from "wouter";
import { MatchTeamBadge } from "@/components/matches/match-team-badge";
import { teamHub } from "@/lib/urls";
import type {
  MatchCentreFormMatch,
  MatchCentreFormResult,
  MatchCentreH2H,
  MatchCentreTeamContext,
} from "@shared/match-centre";

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

/** Compact form dots — colour + letter for accessibility. */
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

function VsDivider({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-1 min-w-[3.5rem] sm:min-w-[4.5rem]">
      <div className="flex w-full items-center gap-1.5" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          VS
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/**
 * Signature comparison band — answers who is stronger / in form / historically ahead.
 * Only renders rows with honest available data.
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
  const hasLeague = Boolean(home.standing || away.standing);
  const hasForm = home.form.length > 0 || away.form.length > 0;
  const hasH2h = h2h.matches.length > 0;

  if (!hasLeague && !hasForm && !hasH2h) return null;

  return (
    <section data-testid="match-tale-of-the-tape" className="space-y-2.5">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase px-0.5">
        Tale of the tape
      </h2>

      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
        {/* Club anchors */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center px-3 sm:px-5 pt-4 pb-3">
          <Link
            href={teamHub(home.team.slug)}
            className="flex items-center gap-2 min-w-0 hover:underline"
          >
            <MatchTeamBadge
              team={{
                id: home.team.id || undefined,
                name: home.team.name,
                logoUrl: home.team.logoUrl,
              }}
              size="xs"
            />
            <span className="text-sm sm:text-base font-semibold truncate">{home.team.name}</span>
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">vs</span>
          <Link
            href={teamHub(away.team.slug)}
            className="flex items-center gap-2 min-w-0 justify-end text-right hover:underline"
          >
            <span className="text-sm sm:text-base font-semibold truncate">{away.team.name}</span>
            <MatchTeamBadge
              team={{
                id: away.team.id || undefined,
                name: away.team.name,
                logoUrl: away.team.logoUrl,
              }}
              size="xs"
            />
          </Link>
        </div>

        <ul className="divide-y divide-border/50">
          {hasLeague ? (
            <li className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center px-3 sm:px-5 py-3.5">
              <div className="min-w-0 text-left">
                {home.standing ? (
                  <>
                    <p className="text-xl sm:text-2xl font-semibold tabular-nums leading-none">
                      {ordinal(home.standing.position)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground truncate">
                      {home.standing.competitionName}
                    </p>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
              <VsDivider label="League" />
              <div className="min-w-0 text-right">
                {away.standing ? (
                  <>
                    <p className="text-xl sm:text-2xl font-semibold tabular-nums leading-none">
                      {ordinal(away.standing.position)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground truncate">
                      {away.standing.competitionName}
                    </p>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </li>
          ) : null}

          {hasForm ? (
            <li className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center px-3 sm:px-5 py-3.5">
              <div className="min-w-0 flex justify-start">
                {home.form.length ? <FormDots form={home.form} align="left" /> : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
              <VsDivider label="Form" />
              <div className="min-w-0 flex justify-end">
                {away.form.length ? <FormDots form={away.form} align="right" /> : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </li>
          ) : null}

          {hasH2h ? (
            <li className="px-3 sm:px-5 py-3.5" data-testid="tape-h2h-summary">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground text-center mb-2">
                Head-to-head
              </p>
              <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-sm">
                <span>
                  <span className="font-semibold">{home.team.name}</span>{" "}
                  <span className="tabular-nums font-semibold">{h2h.summary.homeTeamWins}</span>
                </span>
                <span className="text-muted-foreground">
                  Draws <span className="tabular-nums text-foreground font-semibold">{h2h.summary.draws}</span>
                </span>
                <span>
                  <span className="font-semibold">{away.team.name}</span>{" "}
                  <span className="tabular-nums font-semibold">{h2h.summary.awayTeamWins}</span>
                </span>
              </div>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
