import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, AlertTriangle, CheckCircle, Ban, Activity, Clock, ArrowUpDown } from "lucide-react";
import type { Team, FplPlayerAvailability } from "@shared/schema";

type AvailabilityBucket = "AVAILABLE" | "RETURNING_SOON" | "DOUBTFUL" | "OUT" | "SUSPENDED" | "LEFT_CLUB";

interface EnrichedAvailability extends FplPlayerAvailability {
  teamName: string;
  teamShortName: string;
  classification: string;
  bucket: AvailabilityBucket;
  ringColor: string;
  displayPercent: string;
  effectiveChance: number | null;
}

type StatusTab = "all" | "out" | "doubtful" | "suspended" | "fit";
type SortOption = "relevant" | "updated" | "highest" | "lowest";

const BUCKET_ORDER: AvailabilityBucket[] = ["OUT", "DOUBTFUL", "RETURNING_SOON", "AVAILABLE", "SUSPENDED", "LEFT_CLUB"];

const statusConfig: Record<AvailabilityBucket, { 
  color: string; 
  icon: React.ElementType; 
  badgeBg: string;
  label: string;
}> = {
  OUT: { 
    color: "text-red-600 dark:text-red-400", 
    icon: AlertCircle, 
    badgeBg: "bg-red-600 hover:bg-red-700 text-white",
    label: "Out"
  },
  SUSPENDED: { 
    color: "text-orange-600 dark:text-orange-400", 
    icon: Ban, 
    badgeBg: "bg-orange-600 hover:bg-orange-700 text-white",
    label: "Suspended"
  },
  DOUBTFUL: { 
    color: "text-amber-600 dark:text-amber-400", 
    icon: AlertTriangle, 
    badgeBg: "bg-amber-500 hover:bg-amber-600 text-white",
    label: "Doubtful"
  },
  RETURNING_SOON: { 
    color: "text-blue-600 dark:text-blue-400", 
    icon: Clock, 
    badgeBg: "bg-blue-500 hover:bg-blue-600 text-white",
    label: "Returning"
  },
  AVAILABLE: { 
    color: "text-green-600 dark:text-green-400", 
    icon: CheckCircle, 
    badgeBg: "bg-green-600 hover:bg-green-700 text-white",
    label: "Fit"
  },
  LEFT_CLUB: { 
    color: "text-gray-600 dark:text-gray-400", 
    icon: AlertCircle, 
    badgeBg: "bg-gray-600 hover:bg-gray-700 text-white",
    label: "Left Club"
  },
};

function AvailabilityCard({ player }: { player: EnrichedAvailability }) {
  const config = statusConfig[player.bucket] || statusConfig.OUT;
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
      if (!injuryType && player.bucket === "SUSPENDED") {
        injuryType = "Suspension";
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

  const filteredAndSorted = useMemo(() => {
    if (!availability) return [];

    let filtered = availability;

    if (teamFilter !== "all") {
      filtered = filtered.filter(p => p.teamSlug === teamFilter);
    }

    if (statusTab !== "all") {
      switch (statusTab) {
        case "out":
          filtered = filtered.filter(p => p.bucket === "OUT");
          break;
        case "doubtful":
          filtered = filtered.filter(p => p.bucket === "DOUBTFUL" || p.bucket === "RETURNING_SOON");
          break;
        case "suspended":
          filtered = filtered.filter(p => p.bucket === "SUSPENDED");
          break;
        case "fit":
          filtered = filtered.filter(p => p.bucket === "AVAILABLE");
          break;
      }
    }

    const sorted = [...filtered];

    switch (sortOption) {
      case "relevant":
        sorted.sort((a, b) => {
          const aOrder = BUCKET_ORDER.indexOf(a.bucket);
          const bOrder = BUCKET_ORDER.indexOf(b.bucket);
          if (aOrder !== bOrder) return aOrder - bOrder;
          const aDate = a.newsAdded ? new Date(a.newsAdded).getTime() : 0;
          const bDate = b.newsAdded ? new Date(b.newsAdded).getTime() : 0;
          return bDate - aDate;
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
  }, [availability, teamFilter, statusTab, sortOption]);

  const counts = useMemo(() => {
    if (!availability) return { all: 0, out: 0, doubtful: 0, suspended: 0, fit: 0 };
    
    let filtered = availability;
    if (teamFilter !== "all") {
      filtered = filtered.filter(p => p.teamSlug === teamFilter);
    }

    return {
      all: filtered.length,
      out: filtered.filter(p => p.bucket === "OUT").length,
      doubtful: filtered.filter(p => p.bucket === "DOUBTFUL" || p.bucket === "RETURNING_SOON").length,
      suspended: filtered.filter(p => p.bucket === "SUSPENDED").length,
      fit: filtered.filter(p => p.bucket === "AVAILABLE").length,
    };
  }, [availability, teamFilter]);

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
          <TabsList className="mb-6" data-testid="tabs-status">
            <TabsTrigger value="all" data-testid="tab-all">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="out" className="text-red-600 dark:text-red-400" data-testid="tab-out">
              Out ({counts.out})
            </TabsTrigger>
            <TabsTrigger value="doubtful" className="text-amber-600 dark:text-amber-400" data-testid="tab-doubtful">
              Doubtful ({counts.doubtful})
            </TabsTrigger>
            {counts.suspended > 0 && (
              <TabsTrigger value="suspended" className="text-orange-600 dark:text-orange-400" data-testid="tab-suspended">
                Suspended ({counts.suspended})
              </TabsTrigger>
            )}
            <TabsTrigger value="fit" className="text-green-600 dark:text-green-400" data-testid="tab-fit">
              Fit ({counts.fit})
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
                    ? "No availability issues to display." 
                    : `No players currently ${statusTab === "out" ? "ruled out" : statusTab === "suspended" ? "suspended" : statusTab === "fit" ? "returning from injury" : "listed as doubtful"}.`}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
