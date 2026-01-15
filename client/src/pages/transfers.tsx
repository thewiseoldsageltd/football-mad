import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ConfirmedTransferCard } from "@/components/cards/confirmed-transfer-card";
import { RumourTransferCard } from "@/components/cards/rumour-transfer-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { Team } from "@shared/schema";
import {
  dummyRumours,
  dummyConfirmedTransfers,
  type TransferRumour,
  type ConfirmedTransfer,
  type BlendedTransferItem,
} from "@/data/transfers-dummy";

function TransferCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-5 w-20 mb-2" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

export default function TransfersPage() {
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const isScrollable = scrollWidth > clientWidth;
    setShowLeftFade(isScrollable && scrollLeft > 0);
    setShowRightFade(isScrollable && scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    
    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    
    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(el);
    
    return () => {
      el.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [handleScroll]);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const filteredRumours = useMemo(() => {
    let filtered = [...dummyRumours];
    if (teamFilter !== "all") {
      const teamName = teams?.find(t => t.id === teamFilter)?.name;
      if (teamName) {
        filtered = filtered.filter(
          r => r.fromClub === teamName || r.toClub === teamName
        );
      }
    }
    return filtered.sort((a, b) => {
      const confA = a.confidence ?? 0;
      const confB = b.confidence ?? 0;
      if (confB !== confA) return confB - confA;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [teamFilter, teams]);

  const filteredConfirmed = useMemo(() => {
    let filtered = [...dummyConfirmedTransfers];
    if (teamFilter !== "all") {
      const teamName = teams?.find(t => t.id === teamFilter)?.name;
      if (teamName) {
        filtered = filtered.filter(
          c => c.fromClub === teamName || c.toClub === teamName
        );
      }
    }
    return filtered.sort(
      (a, b) => new Date(b.confirmedAt).getTime() - new Date(a.confirmedAt).getTime()
    );
  }, [teamFilter, teams]);

  const blendedFeed = useMemo((): BlendedTransferItem[] => {
    const confirmedItems: BlendedTransferItem[] = filteredConfirmed.map(c => ({
      ...c,
      kind: "confirmed" as const,
    }));
    const rumourItems: BlendedTransferItem[] = filteredRumours.map(r => ({
      ...r,
      kind: "rumour" as const,
    }));
    return [...confirmedItems, ...rumourItems];
  }, [filteredConfirmed, filteredRumours]);

  const counts = {
    all: filteredRumours.length + filteredConfirmed.length,
    rumours: filteredRumours.length,
    confirmed: filteredConfirmed.length,
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold" data-testid="text-page-title">Transfers</h1>
            <p className="text-muted-foreground text-lg" data-testid="text-page-subtitle">
              Latest transfer news and rumours
            </p>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          {/* Desktop: Tabs + Filters on same row */}
          <div className="hidden md:flex md:items-center md:justify-between gap-4 mb-6">
            <TabsList className="flex-wrap h-auto gap-1" data-testid="tabs-transfers">
              <TabsTrigger value="all" data-testid="tab-all">
                All ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="rumours" data-testid="tab-rumours">
                Rumours ({counts.rumours})
              </TabsTrigger>
              <TabsTrigger value="confirmed" data-testid="tab-confirmed">
                Confirmed ({counts.confirmed})
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3 shrink-0">
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-team-filter">
                  <SelectValue placeholder="Filter by team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile: Tabs first (horizontally scrollable with dynamic fades), then centered filter */}
          <div className="md:hidden space-y-4 mb-6">
            <div className="relative">
              <div 
                ref={scrollContainerRef}
                className="overflow-x-auto scrollbar-hide"
                style={{ 
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <TabsList className="inline-flex h-auto gap-1 w-max" data-testid="tabs-transfers-mobile">
                  <TabsTrigger value="all" className="whitespace-nowrap" data-testid="tab-all-mobile">
                    All ({counts.all})
                  </TabsTrigger>
                  <TabsTrigger value="rumours" className="whitespace-nowrap" data-testid="tab-rumours-mobile">
                    Rumours ({counts.rumours})
                  </TabsTrigger>
                  <TabsTrigger value="confirmed" className="whitespace-nowrap" data-testid="tab-confirmed-mobile">
                    Confirmed ({counts.confirmed})
                  </TabsTrigger>
                </TabsList>
              </div>
              {showLeftFade && (
                <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" />
              )}
              {showRightFade && (
                <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background to-transparent" />
              )}
            </div>

            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-full" data-testid="select-team-filter-mobile">
                <span className="flex-1 text-center">
                  <SelectValue placeholder="Filter by team" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="all">
            {isInitialLoad ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <TransferCardSkeleton key={i} />
                ))}
              </div>
            ) : blendedFeed.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {blendedFeed.map((item) =>
                  item.kind === "confirmed" ? (
                    <ConfirmedTransferCard key={item.id} transfer={item} />
                  ) : (
                    <RumourTransferCard key={item.id} rumour={item} />
                  )
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transfers to display.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rumours">
            {isInitialLoad ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <TransferCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredRumours.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredRumours.map((rumour) => (
                  <RumourTransferCard key={rumour.id} rumour={rumour} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No rumours at the moment.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="confirmed">
            {isInitialLoad ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <TransferCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredConfirmed.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredConfirmed.map((transfer) => (
                  <ConfirmedTransferCard key={transfer.id} transfer={transfer} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No confirmed transfers yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
