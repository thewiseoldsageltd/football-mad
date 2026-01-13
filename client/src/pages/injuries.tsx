import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, AlertTriangle, CheckCircle, Clock, Activity, ArrowUpDown } from "lucide-react";
import type { Team, FplPlayerAvailability } from "@shared/schema";

type MedicalBucket = "RETURNING_SOON" | "COIN_FLIP" | "DOUBTFUL" | "OUT";

interface EnrichedAvailability extends FplPlayerAvailability {
  teamName: string;
  teamShortName: string;
  classification: string;
  bucket: string;
  ringColor: string;
  displayPercent: string;
  effectiveChance: number | null;
}

type StatusTab = "all" | "returning_soon" | "coin_flip" | "doubtful" | "out";
type SortOption = "relevant" | "updated" | "highest" | "lowest";

const BUCKET_ORDER_OVERVIEW: MedicalBucket[] = ["RETURNING_SOON", "COIN_FLIP", "DOUBTFUL", "OUT"];

function parseExpectedReturnDate(news: string | null): Date | null {
  if (!news) return null;
  const match = news.match(/Expected back\s+(.*?)(?:\.|$)/i);
  if (!match) return null;
  
  const dateStr = match[1].trim().toLowerCase();
  const now = new Date();
  
  if (dateStr.includes("unknown") || dateStr.includes("tbd")) return null;
  
  const monthMatch = dateStr.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{1,2})?/i);
  if (monthMatch) {
    const months: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };
    const month = months[monthMatch[1].toLowerCase()];
    const day = monthMatch[2] ? parseInt(monthMatch[2]) : 15;
    let year = now.getFullYear();
    const targetDate = new Date(year, month, day);
    if (targetDate < now) {
      year++;
    }
    return new Date(year, month, day);
  }
  
  if (dateStr.includes("gameweek") || dateStr.includes("gw")) {
    const gwMatch = dateStr.match(/(\d+)/);
    if (gwMatch) {
      const gw = parseInt(gwMatch[1]);
      const seasonStart = new Date(now.getFullYear(), 7, 15);
      return new Date(seasonStart.getTime() + gw * 7 * 24 * 60 * 60 * 1000);
    }
  }
  
  return null;
}

const statusConfig: Record<MedicalBucket, { 
  color: string; 
  icon: React.ElementType; 
  badgeBg: string;
  label: string;
}> = {
  OUT: { 
    color: "text-red-600 dark:text-red-400", 
    icon: AlertCircle, 
    badgeBg: "bg-red-600 hover:bg-red-700 text-white",
    label: "Out (0%)"
  },
  DOUBTFUL: { 
    color: "text-red-600 dark:text-red-400", 
    icon: AlertTriangle, 
    badgeBg: "bg-red-600 hover:bg-red-700 text-white",
    label: "Doubtful (25%)"
  },
  COIN_FLIP: { 
    color: "text-orange-600 dark:text-orange-400", 
    icon: Clock, 
    badgeBg: "bg-orange-500 hover:bg-orange-600 text-white",
    label: "Coin flip (50%)"
  },
  RETURNING_SOON: { 
    color: "text-amber-600 dark:text-amber-400", 
    icon: CheckCircle, 
    badgeBg: "bg-amber-500 hover:bg-amber-600 text-white",
    label: "Returning (75%)"
  },
};

function AvailabilityCard({ player }: { player: EnrichedAvailability }) {
  const bucket = player.bucket as MedicalBucket;
  const config = statusConfig[bucket] || statusConfig.OUT;
  const StatusIcon = config.icon;
  const newsDate = player.newsAdded ? new Date(player.newsAdded) : null;

  const parseInjuryDetails = () => {
    if (!player.news) {
      return { injuryType: null, expectedReturn: null };
    }
    
    const expectedMatch = player.news.match(/Expected back\s+(.*?)(?:\.|$)/i);
    const expectedReturn = expectedMatch ? expectedMatch[1].trim() : null;
    
    let injuryType: string | null = null;
    const cleanNews = player.news.replace(/Expected back.*$/i, "").trim();
    
    if (cleanNews) {
      const knownInjuries = [
        "knee", "ankle", "hamstring", "thigh", "calf", "groin", "back", 
        "shoulder", "foot", "hip", "muscle", "ligament", "achilles",
        "illness", "sick", "virus", "covid", "flu"
      ];
      const lowerNews = cleanNews.toLowerCase();
      for (const injury of knownInjuries) {
        if (lowerNews.includes(injury)) {
          injuryType = injury.charAt(0).toUpperCase() + injury.slice(1);
          if (lowerNews.includes("injury") || lowerNews.includes("problem")) {
            injuryType += " injury";
          }
          break;
        }
      }
      if (!injuryType && cleanNews.length > 0) {
        injuryType = cleanNews.split(/[,.!?]/)[0].trim().slice(0, 40);
        if (injuryType.length === 40) injuryType += "...";
      }
    }
    
    return { injuryType, expectedReturn };
  };

  const { injuryType, expectedReturn } = parseInjuryDetails();

  return (
    <Card className="hover-elevate" data-testid={`card-availability-${player.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight">{player.playerName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {player.teamName} · {player.position}
            </p>
          </div>
          <Badge className={`${config.badgeBg} shrink-0`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>

        {injuryType && (
          <p className="text-sm font-medium mb-2">{injuryType}</p>
        )}

        {expectedReturn && (
          <p className="text-sm text-muted-foreground mb-3">
            Expected return: <span className="font-medium text-foreground">{expectedReturn}</span>
          </p>
        )}

        {player.effectiveChance !== null && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Chance of playing</span>
              <span className="font-medium">{player.effectiveChance}%</span>
            </div>
            <Progress value={player.effectiveChance} className="h-2" />
          </div>
        )}

        {newsDate && (
          <p className="text-xs text-muted-foreground">
            Updated {formatTimeAgo(newsDate)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function AvailabilityCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-3" />
        <Skeleton className="h-2 w-full" />
      </CardContent>
    </Card>
  );
}

export default function InjuriesPage() {
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [sortOption, setSortOption] = useState<SortOption>("relevant");

  const { data: availability, isLoading } = useQuery<EnrichedAvailability[]>({
    queryKey: ["/api/availability"],
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const medicalPlayers = useMemo(() => {
    if (!availability) return [];
    return availability.filter(p => 
      p.classification === "MEDICAL" && 
      (p.bucket === "RETURNING_SOON" || p.bucket === "COIN_FLIP" || p.bucket === "DOUBTFUL" || p.bucket === "OUT")
    );
  }, [availability]);

  const filteredAndSorted = useMemo(() => {
    let filtered = medicalPlayers;

    if (teamFilter !== "all") {
      filtered = filtered.filter(p => p.teamSlug === teamFilter);
    }

    if (statusTab !== "all") {
      switch (statusTab) {
        case "out":
          filtered = filtered.filter(p => p.bucket === "OUT");
          break;
        case "doubtful":
          filtered = filtered.filter(p => p.bucket === "DOUBTFUL");
          break;
        case "coin_flip":
          filtered = filtered.filter(p => p.bucket === "COIN_FLIP");
          break;
        case "returning_soon":
          filtered = filtered.filter(p => p.bucket === "RETURNING_SOON");
          break;
      }
    }

    const sorted = [...filtered];

    switch (sortOption) {
      case "relevant":
        sorted.sort((a, b) => {
          const aOrder = BUCKET_ORDER_OVERVIEW.indexOf(a.bucket as MedicalBucket);
          const bOrder = BUCKET_ORDER_OVERVIEW.indexOf(b.bucket as MedicalBucket);
          if (aOrder !== bOrder) return aOrder - bOrder;
          
          const aReturn = parseExpectedReturnDate(a.news);
          const bReturn = parseExpectedReturnDate(b.news);
          if (aReturn && bReturn) {
            const returnDiff = aReturn.getTime() - bReturn.getTime();
            if (returnDiff !== 0) return returnDiff;
          } else if (aReturn && !bReturn) {
            return -1;
          } else if (!aReturn && bReturn) {
            return 1;
          }
          
          const aUpdated = a.newsAdded ? new Date(a.newsAdded).getTime() : 0;
          const bUpdated = b.newsAdded ? new Date(b.newsAdded).getTime() : 0;
          if (aUpdated !== bUpdated) return bUpdated - aUpdated;
          
          return a.playerName.localeCompare(b.playerName);
        });
        break;
      case "updated":
        sorted.sort((a, b) => {
          const aDate = a.newsAdded ? new Date(a.newsAdded).getTime() : 0;
          const bDate = b.newsAdded ? new Date(b.newsAdded).getTime() : 0;
          return bDate - aDate;
        });
        break;
      case "highest":
        sorted.sort((a, b) => {
          const aChance = a.effectiveChance ?? 0;
          const bChance = b.effectiveChance ?? 0;
          return bChance - aChance;
        });
        break;
      case "lowest":
        sorted.sort((a, b) => {
          const aChance = a.effectiveChance ?? 100;
          const bChance = b.effectiveChance ?? 100;
          return aChance - bChance;
        });
        break;
    }

    return sorted;
  }, [medicalPlayers, teamFilter, statusTab, sortOption]);

  const counts = useMemo(() => {
    let filtered = medicalPlayers;
    if (teamFilter !== "all") {
      filtered = filtered.filter(p => p.teamSlug === teamFilter);
    }

    return {
      all: filtered.length,
      out: filtered.filter(p => p.bucket === "OUT").length,
      doubtful: filtered.filter(p => p.bucket === "DOUBTFUL").length,
      coin_flip: filtered.filter(p => p.bucket === "COIN_FLIP").length,
      returning_soon: filtered.filter(p => p.bucket === "RETURNING_SOON").length,
    };
  }, [medicalPlayers, teamFilter]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-4xl md:text-5xl font-bold" data-testid="text-page-title">Treatment Room</h1>
              <p className="text-muted-foreground text-lg" data-testid="text-page-subtitle">
                Player injuries and expected returns (FPL-powered)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-team-filter">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.slug}>
                    {team.shortName} — {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="w-[180px]" data-testid="select-sort">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevant">Most relevant</SelectItem>
                <SelectItem value="updated">Last updated</SelectItem>
                <SelectItem value="highest">Highest confidence</SelectItem>
                <SelectItem value="lowest">Lowest confidence</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)} className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-1" data-testid="tabs-status">
            <TabsTrigger value="all" data-testid="tab-all">
              Overview ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="returning_soon" className="text-amber-600 dark:text-amber-400" data-testid="tab-returning">
              Returning ({counts.returning_soon})
            </TabsTrigger>
            <TabsTrigger value="coin_flip" className="text-orange-600 dark:text-orange-400" data-testid="tab-coinflip">
              Coin flip ({counts.coin_flip})
            </TabsTrigger>
            <TabsTrigger value="doubtful" className="text-red-600 dark:text-red-400" data-testid="tab-doubtful">
              Doubtful ({counts.doubtful})
            </TabsTrigger>
            <TabsTrigger value="out" className="text-slate-600 dark:text-slate-400" data-testid="tab-out">
              Out ({counts.out})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={statusTab} forceMount className={statusTab === statusTab ? "" : "hidden"}>
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <AvailabilityCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredAndSorted.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSorted.map((player) => (
                  <AvailabilityCard key={player.id} player={player} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {statusTab === "all" 
                    ? "No medical issues to display." 
                    : `No players currently in this category.`}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
