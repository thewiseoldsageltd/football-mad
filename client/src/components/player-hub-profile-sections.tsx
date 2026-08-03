import type {
  PlayerHubCareer,
  PlayerHubCareerSeason,
  PlayerHubHonour,
  PlayerHubIdentity,
  PlayerHubSidelined,
  PlayerHubTransfer,
} from "@shared/player-profile-feed";
import { CAREER_CATEGORY_LABELS } from "@shared/player-profile-feed";

function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}

function formatDisplayDate(iso?: string, raw?: string): string | null {
  if (iso) {
    const d = new Date(`${iso}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    }
  }
  return raw?.trim() || null;
}

export function formatIdentityDetailBits(
  identity: PlayerHubIdentity | null | undefined,
  fallbacks: { nationality?: string | null; age?: number | null; positionLabel?: string | null },
): string | null {
  const parts: string[] = [];
  if (fallbacks.positionLabel) parts.push(fallbacks.positionLabel);
  const nationality = identity?.nationality || fallbacks.nationality;
  if (nationality) parts.push(nationality);
  if (typeof fallbacks.age === "number" && fallbacks.age > 0) parts.push(String(fallbacks.age));
  if (identity?.preferredFoot) parts.push(`${identity.preferredFoot} foot`);
  if (identity?.heightCm) parts.push(`${identity.heightCm} cm`);
  if (identity?.birthPlace || identity?.birthCountry) {
    parts.push([identity.birthPlace, identity.birthCountry].filter(Boolean).join(", "));
  }
  return parts.length ? parts.join(" · ") : null;
}

function CareerSeasonTable({
  title,
  rows,
}: {
  title: string;
  rows: PlayerHubCareerSeason[];
}) {
  if (!rows.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
              <th className="py-2 pr-3 font-medium">Season</th>
              <th className="py-2 pr-3 font-medium">Club</th>
              <th className="py-2 pr-3 font-medium">Comp</th>
              <th className="py-2 pr-3 font-medium text-right">Apps</th>
              <th className="py-2 pr-3 font-medium text-right">G</th>
              <th className="py-2 font-medium text-right">A</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${row.season}-${row.clubName}-${row.competitionName}-${idx}`} className="border-b border-border/40">
                <td className="py-2 pr-3 whitespace-nowrap">{row.season}</td>
                <td className="py-2 pr-3">{row.clubName || "—"}</td>
                <td className="py-2 pr-3 text-muted-foreground">{row.competitionName || "—"}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {row.appearances != null ? formatInt(row.appearances) : "—"}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {row.goals != null ? formatInt(row.goals) : "—"}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {row.assists != null ? formatInt(row.assists) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlayerCareerSection({ career }: { career: PlayerHubCareer }) {
  const hasTables =
    (career.domesticLeague?.length ?? 0) +
      (career.domesticCups?.length ?? 0) +
      (career.european?.length ?? 0) +
      (career.international?.length ?? 0) >
    0;
  if (!career.totals && !hasTables) return null;

  const totalBits: string[] = [];
  if (career.totals?.appearances != null) totalBits.push(`${formatInt(career.totals.appearances)} apps`);
  if (career.totals?.goals != null) totalBits.push(`${formatInt(career.totals.goals)} goals`);
  if (career.totals?.assists != null) totalBits.push(`${formatInt(career.totals.assists)} assists`);
  if (career.totals?.minutes != null) totalBits.push(`${formatInt(career.totals.minutes)} mins`);

  return (
    <section data-testid="player-hub-career" className="space-y-4">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">CAREER</h2>
      {totalBits.length > 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="player-hub-career-totals">
          Club career · {totalBits.join(" · ")}
        </p>
      ) : null}
      <div className="space-y-6">
        {career.domesticLeague?.length ? (
          <CareerSeasonTable title={CAREER_CATEGORY_LABELS.domestic_league} rows={career.domesticLeague} />
        ) : null}
        {career.domesticCups?.length ? (
          <CareerSeasonTable title={CAREER_CATEGORY_LABELS.domestic_cup} rows={career.domesticCups} />
        ) : null}
        {career.european?.length ? (
          <CareerSeasonTable title={CAREER_CATEGORY_LABELS.european} rows={career.european} />
        ) : null}
        {career.international?.length ? (
          <CareerSeasonTable title={CAREER_CATEGORY_LABELS.international} rows={career.international} />
        ) : null}
      </div>
    </section>
  );
}

export function PlayerTransfersSection({ transfers }: { transfers: PlayerHubTransfer[] }) {
  if (!transfers.length) return null;
  return (
    <section data-testid="player-hub-transfers" className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">TRANSFERS</h2>
      <ul className="space-y-3">
        {transfers.map((t, idx) => {
          const date = formatDisplayDate(t.date, t.dateRaw);
          return (
            <li
              key={`${t.dateRaw}-${t.fromClub}-${t.toClub}-${idx}`}
              className="text-sm"
              data-testid={`transfer-${idx}`}
            >
              <div className="font-medium">
                {[t.fromClub, t.toClub].filter(Boolean).join(" → ") || "Transfer"}
              </div>
              <div className="text-muted-foreground">
                {[date, t.fee, t.type].filter(Boolean).join(" · ")}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PlayerSidelinedSection({ items }: { items: PlayerHubSidelined[] }) {
  if (!items.length) return null;
  return (
    <section data-testid="player-hub-sidelined" className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        INJURIES & SUSPENSIONS
      </h2>
      <ul className="space-y-3">
        {items.map((item, idx) => {
          const start = formatDisplayDate(item.start, item.startRaw);
          const end = formatDisplayDate(item.end, item.endRaw);
          const range = start && end ? `${start} – ${end}` : start || end;
          return (
            <li key={`${item.type}-${item.startRaw}-${idx}`} className="text-sm" data-testid={`sidelined-${idx}`}>
              <div className="font-medium">{item.type}</div>
              <div className="text-muted-foreground">
                {[range, item.gamesMissed != null ? `${item.gamesMissed} games missed` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PlayerHonoursSection({ honours }: { honours: PlayerHubHonour[] }) {
  if (!honours.length) return null;
  const grouped = new Map<string, PlayerHubHonour[]>();
  for (const h of honours) {
    const key = h.competition;
    const list = grouped.get(key) || [];
    list.push(h);
    grouped.set(key, list);
  }

  return (
    <section data-testid="player-hub-honours" className="space-y-4">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">HONOURS</h2>
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([competition, items]) => (
          <div key={competition} className="space-y-1">
            <h3 className="text-sm font-medium">{competition}</h3>
            <ul className="space-y-1">
              {items.map((item: PlayerHubHonour, idx: number) => (
                <li key={`${competition}-${idx}`} className="text-sm text-muted-foreground">
                  {[
                    item.status,
                    item.seasons.length ? item.seasons.join(", ") : null,
                    item.country,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
