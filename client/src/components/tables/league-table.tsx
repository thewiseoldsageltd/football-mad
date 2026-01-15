import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamCrest } from "@/components/team-crest";
import type { TableRow as LeagueTableRow } from "@/data/tables-mock";

interface LeagueTableProps {
  data: LeagueTableRow[];
  showZones?: boolean;
}

export function LeagueTable({ data, showZones = true }: LeagueTableProps) {
  const totalTeams = data.length;
  const clSpots = Math.min(4, totalTeams);
  const relegationSpots = Math.min(3, totalTeams);
  const relegationStart = totalTeams - relegationSpots + 1;

  const getZoneClass = (pos: number) => {
    if (!showZones) return "";
    if (pos <= clSpots) return "border-l-2 border-l-blue-500/60";
    if (pos >= relegationStart) return "border-l-2 border-l-red-500/60";
    return "";
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">Pos</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="w-10 text-center hidden md:table-cell">P</TableHead>
            <TableHead className="w-10 text-center hidden md:table-cell">W</TableHead>
            <TableHead className="w-10 text-center hidden md:table-cell">D</TableHead>
            <TableHead className="w-10 text-center hidden md:table-cell">L</TableHead>
            <TableHead className="w-10 text-center hidden md:table-cell">GF</TableHead>
            <TableHead className="w-10 text-center hidden md:table-cell">GA</TableHead>
            <TableHead className="w-10 text-center hidden md:table-cell">GD</TableHead>
            <TableHead className="w-12 text-center font-semibold">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow 
              key={row.pos} 
              className={getZoneClass(row.pos)}
              data-testid={`row-table-${row.pos}`}
            >
              <TableCell className="text-center font-medium">
                <span className="text-sm">{row.pos}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <TeamCrest teamName={row.teamName} size="sm" />
                  <span className="font-medium text-sm truncate">{row.teamName}</span>
                </div>
              </TableCell>
              <TableCell className="text-center hidden md:table-cell">
                <span className="text-sm text-muted-foreground">{row.played}</span>
              </TableCell>
              <TableCell className="text-center hidden md:table-cell">
                <span className="text-sm text-muted-foreground">{row.won}</span>
              </TableCell>
              <TableCell className="text-center hidden md:table-cell">
                <span className="text-sm text-muted-foreground">{row.drawn}</span>
              </TableCell>
              <TableCell className="text-center hidden md:table-cell">
                <span className="text-sm text-muted-foreground">{row.lost}</span>
              </TableCell>
              <TableCell className="text-center hidden md:table-cell">
                <span className="text-sm text-muted-foreground">{row.goalsFor}</span>
              </TableCell>
              <TableCell className="text-center hidden md:table-cell">
                <span className="text-sm text-muted-foreground">{row.goalsAgainst}</span>
              </TableCell>
              <TableCell className="text-center hidden md:table-cell">
                <span className={`text-sm ${row.gd > 0 ? "text-emerald-600 dark:text-emerald-400" : row.gd < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="font-bold text-sm">{row.pts}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Mobile secondary info - show P and GD for all teams */}
      <div className="md:hidden mt-4 space-y-2">
        {data.map((row) => (
          <div 
            key={row.pos} 
            className="flex items-center justify-between text-xs text-muted-foreground px-2 py-1 bg-muted/30 rounded"
            data-testid={`row-mobile-detail-${row.pos}`}
          >
            <span className="font-medium">{row.pos}. {row.teamName}</span>
            <div className="flex items-center gap-3">
              <span>P: {row.played}</span>
              <span className={row.gd > 0 ? "text-emerald-600 dark:text-emerald-400" : row.gd < 0 ? "text-red-600 dark:text-red-400" : ""}>
                GD: {row.gd > 0 ? `+${row.gd}` : row.gd}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showZones && (
        <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500/60" />
            <span>Champions League</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-500/60" />
            <span>Relegation</span>
          </div>
        </div>
      )}
    </div>
  );
}
