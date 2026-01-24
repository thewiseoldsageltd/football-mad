import { useState, useCallback, memo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamCrest } from "@/components/team-crest";
import { FormPills } from "./form-pills";
import { ChevronDown } from "lucide-react";
import type { TableRow as LeagueTableRow } from "@/data/tables-mock";

interface LeagueTableProps {
  data: LeagueTableRow[];
  showZones?: boolean;
}

function getZoneBorderClass(pos: number, totalTeams: number, showZones: boolean): string {
  if (!showZones) return "";
  
  const clSpots = 4;
  const europaSpot = 5;
  const relegationStart = totalTeams - 2;
  
  if (pos <= clSpots) return "border-l-2 border-l-emerald-500/70";
  if (pos === europaSpot) return "border-l-2 border-l-amber-500/70";
  if (pos >= relegationStart) return "border-l-2 border-l-red-500/70";
  return "border-l-2 border-l-transparent";
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
  totalTeams: number;
  showZones: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

const StandingsRow = memo(function StandingsRow({ 
  row, 
  totalTeams, 
  showZones, 
  isExpanded, 
  onToggle 
}: StandingsRowProps) {
  const zoneClass = getZoneBorderClass(row.pos, totalTeams, showZones);
  
  return (
    <>
      <TableRow
        className={`${zoneClass} md:cursor-default cursor-pointer`}
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
        {/* Position - always visible */}
        <TableCell className="text-center font-medium w-10">
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
        <TableCell className="text-center w-12">
          <span className="font-bold text-sm">{row.pts}</span>
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

export function LeagueTable({ data, showZones = true }: LeagueTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const totalTeams = data.length;

  const toggleRow = useCallback((pos: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) {
        next.delete(pos);
      } else {
        next.add(pos);
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
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
              <TableHead className="w-12 text-center font-semibold">Pts</TableHead>
              <TableHead className="w-24 hidden md:table-cell">Form</TableHead>
              <TableHead className="md:hidden w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <StandingsRow
                key={row.pos}
                row={row}
                totalTeams={totalTeams}
                showZones={showZones}
                isExpanded={expandedRows.has(row.pos)}
                onToggle={() => toggleRow(row.pos)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {showZones && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-sm bg-emerald-500/70" />
            <span>Champions League</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-sm bg-amber-500/70" />
            <span>Europa League</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-sm bg-red-500/70" />
            <span>Relegation</span>
          </div>
        </div>
      )}
    </div>
  );
}
