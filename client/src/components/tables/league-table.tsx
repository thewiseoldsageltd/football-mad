import { useState, useCallback, memo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamCrest } from "@/components/team-crest";
import { FormPills } from "./form-pills";
import { ChevronDown } from "lucide-react";
import type { TableRow as LeagueTableRow } from "@/data/tables-mock";
import type { StandingsZone, ZoneColor } from "@/lib/league-config";

interface LeagueTableProps {
  data: LeagueTableRow[];
  showZones?: boolean;
  zones?: StandingsZone[];
}

const zoneColorMap: Record<ZoneColor, string> = {
  emerald: "bg-emerald-500/70",
  cyan: "bg-cyan-500/70",
  amber: "bg-amber-500/70",
  orange: "bg-orange-500/70",
  red: "bg-red-500/70",
};

function getZoneForPos(pos: number, zones?: StandingsZone[]): StandingsZone | null {
  if (!zones) return null;
  return zones.find((z) => pos >= z.from && pos <= z.to) ?? null;
}

function getZoneStripeColor(pos: number, showZones: boolean, zones?: StandingsZone[]): string | null {
  if (!showZones) return null;
  const zone = getZoneForPos(pos, zones);
  return zone ? zoneColorMap[zone.color] : null;
}

function formatGD(gd: number): string {
  if (gd > 0) return `+${gd}`;
  return String(gd);
}

function getGDColorClass(gd: number): string {
  if (gd > 0) return "text-emerald-600 dark:text-emerald-400";
  if (gd < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

interface ExpandedRowContentProps {
  row: LeagueTableRow;
}

const ExpandedRowContent = memo(function ExpandedRowContent({ row }: ExpandedRowContentProps) {
  return (
    <div className="px-3 py-3 bg-muted/30 border-t border-border/50">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">P:</span>
          <span className="font-medium">{row.played}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">W/D/L:</span>
          <span className="font-medium">{row.won}/{row.drawn}/{row.lost}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">GF/GA:</span>
          <span className="font-medium">{row.goalsFor}/{row.goalsAgainst}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">GD:</span>
          <span className={`font-medium ${getGDColorClass(row.gd)}`}>
            {formatGD(row.gd)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Form:</span>
          <FormPills form={row.recentForm} showPlaceholder />
        </div>
      </div>
    </div>
  );
});

interface StandingsRowProps {
  row: LeagueTableRow;
  showZones: boolean;
  zones?: StandingsZone[];
  isExpanded: boolean;
  onToggle: () => void;
}

const StandingsRow = memo(function StandingsRow({ 
  row, 
  showZones,
  zones,
  isExpanded, 
  onToggle 
}: StandingsRowProps) {
  const zoneStripeColor = getZoneStripeColor(row.pos, showZones, zones);
  
  return (
    <>
      <TableRow
        className="md:cursor-default cursor-pointer"
        data-testid={`row-table-${row.pos}`}
        onClick={() => {
          if (window.innerWidth < 768) {
            onToggle();
          }
        }}
        role="row"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && window.innerWidth < 768) {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {/* Position - always visible, with zone stripe */}
        <TableCell className="text-center font-medium w-10 relative pl-3">
          {zoneStripeColor && (
            <span 
              aria-hidden="true" 
              className={`absolute left-0 top-0 h-full w-1 ${zoneStripeColor}`} 
            />
          )}
          <span className="text-sm">{row.pos}</span>
        </TableCell>

        {/* Team - always visible */}
        <TableCell>
          <div className="flex items-center gap-2 min-w-0">
            <TeamCrest teamName={row.teamName} size="sm" />
            <span className="font-medium text-sm truncate">{row.teamName}</span>
          </div>
        </TableCell>

        {/* P (Played) - desktop only */}
        <TableCell className="text-center w-10 hidden md:table-cell">
          <span className="text-sm">{row.played}</span>
        </TableCell>

        {/* W (Won) - desktop only */}
        <TableCell className="text-center w-10 hidden md:table-cell">
          <span className="text-sm">{row.won}</span>
        </TableCell>

        {/* D (Drawn) - desktop only */}
        <TableCell className="text-center w-10 hidden md:table-cell">
          <span className="text-sm">{row.drawn}</span>
        </TableCell>

        {/* L (Lost) - desktop only */}
        <TableCell className="text-center w-10 hidden md:table-cell">
          <span className="text-sm">{row.lost}</span>
        </TableCell>

        {/* GF (Goals For) - desktop only */}
        <TableCell className="text-center w-10 hidden md:table-cell">
          <span className="text-sm">{row.goalsFor}</span>
        </TableCell>

        {/* GA (Goals Against) - desktop only */}
        <TableCell className="text-center w-10 hidden md:table-cell">
          <span className="text-sm">{row.goalsAgainst}</span>
        </TableCell>

        {/* GD (Goal Difference) - desktop only */}
        <TableCell className="text-center w-10 hidden md:table-cell">
          <span className={`text-sm ${getGDColorClass(row.gd)}`}>
            {formatGD(row.gd)}
          </span>
        </TableCell>

        {/* Pts (Points) - always visible */}
        <TableCell className="text-right w-12 min-w-[3rem] pr-3 md:text-center md:pr-0">
          <span className="font-bold text-sm tabular-nums whitespace-nowrap">{row.pts}</span>
        </TableCell>

        {/* Form - desktop only */}
        <TableCell className="hidden md:table-cell w-24">
          <FormPills form={row.recentForm} maxPills={5} showPlaceholder />
        </TableCell>

        {/* Expand chevron - mobile only */}
        <TableCell className="md:hidden w-8 text-center">
          <ChevronDown 
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </TableCell>
      </TableRow>

      {/* Expanded row content - mobile only */}
      {isExpanded && (
        <tr className="md:hidden" data-testid={`row-expanded-${row.pos}`}>
          <td colSpan={4} className="p-0">
            <ExpandedRowContent row={row} />
          </td>
        </tr>
      )}
    </>
  );
});

export function LeagueTable({ data, showZones = true, zones }: LeagueTableProps) {
  // Use string keys to avoid duplicate position collisions (e.g. tied teams)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = useCallback((key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Build unique legend entries from zones
  const legendEntries = zones?.map((z) => ({
    label: z.label,
    color: zoneColorMap[z.color],
  })) ?? [];

  return (
    <div className="space-y-4">
      <div className="overflow-x-visible md:overflow-x-auto">
        <Table className="w-full table-fixed md:table-auto">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">Pos</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="w-10 text-center hidden md:table-cell">P</TableHead>
              <TableHead className="w-10 text-center hidden md:table-cell">W</TableHead>
              <TableHead className="w-10 text-center hidden md:table-cell">D</TableHead>
              <TableHead className="w-10 text-center hidden md:table-cell">L</TableHead>
              <TableHead className="w-10 text-center hidden md:table-cell">GF</TableHead>
              <TableHead className="w-10 text-center hidden md:table-cell">GA</TableHead>
              <TableHead className="w-10 text-center hidden md:table-cell">GD</TableHead>
              <TableHead className="w-12 min-w-[3rem] text-right pr-3 md:text-center md:pr-0 font-semibold">Pts</TableHead>
              <TableHead className="w-24 hidden md:table-cell">Form</TableHead>
              <TableHead className="md:hidden w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const rowKey = `${row.pos}-${row.teamName}`;
              return (
                <StandingsRow
                  key={rowKey}
                  row={row}
                  showZones={showZones}
                  zones={zones}
                  isExpanded={expandedRows.has(rowKey)}
                  onToggle={() => toggleRow(rowKey)}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>

      {showZones && legendEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {legendEntries.map((entry) => (
            <div key={entry.label} className="flex items-center gap-2">
              <div className={`w-1 h-4 rounded-sm ${entry.color}`} />
              <span>{entry.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
