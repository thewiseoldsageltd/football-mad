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
            <TableHead className="w-12 text-center hidden sm:table-cell">P</TableHead>
            <TableHead className="w-14 text-center hidden sm:table-cell">GD</TableHead>
            <TableHead className="w-14 text-center font-semibold">Pts</TableHead>
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
              <TableCell className="text-center hidden sm:table-cell">
                <span className="text-sm text-muted-foreground">{row.played}</span>
              </TableCell>
              <TableCell className="text-center hidden sm:table-cell">
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
