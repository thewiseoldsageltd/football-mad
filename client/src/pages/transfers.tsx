import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { TransferCard } from "@/components/cards/transfer-card";
import { TransferCardSkeleton } from "@/components/skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp } from "lucide-react";
import type { Transfer, Team } from "@shared/schema";

export default function TransfersPage() {
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const { data: transfers, isLoading } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers"],
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const filteredTransfers = transfers?.filter((t) => {
    if (teamFilter === "all") return true;
    return t.fromTeamId === teamFilter || t.toTeamId === teamFilter;
  });

  const rumours = filteredTransfers?.filter((t) => t.status === "rumour") || [];
  const confirmed = filteredTransfers?.filter((t) => t.status === "confirmed") || [];

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
                All ({filteredTransfers?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="rumours" data-testid="tab-rumours">
                Rumours ({rumours.length})
              </TabsTrigger>
              <TabsTrigger value="confirmed" data-testid="tab-confirmed">
                Confirmed ({confirmed.length})
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

          {/* Mobile: Tabs first (horizontally scrollable), then filters stacked below */}
          <div className="md:hidden space-y-4 mb-6">
            <div className="relative">
              <div 
                className="overflow-x-auto scrollbar-hide"
                style={{ 
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <TabsList className="inline-flex h-auto gap-1 w-max" data-testid="tabs-transfers-mobile">
                  <TabsTrigger value="all" className="whitespace-nowrap" data-testid="tab-all-mobile">
                    All ({filteredTransfers?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="rumours" className="whitespace-nowrap" data-testid="tab-rumours-mobile">
                    Rumours ({rumours.length})
                  </TabsTrigger>
                  <TabsTrigger value="confirmed" className="whitespace-nowrap" data-testid="tab-confirmed-mobile">
                    Confirmed ({confirmed.length})
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background to-transparent" />
            </div>

            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-full" data-testid="select-team-filter-mobile">
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

          <TabsContent value="all">
            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <TransferCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredTransfers && filteredTransfers.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredTransfers.map((transfer) => (
                  <TransferCard key={transfer.id} transfer={transfer} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transfers to display.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rumours">
            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <TransferCardSkeleton key={i} />
                ))}
              </div>
            ) : rumours.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {rumours.map((transfer) => (
                  <TransferCard key={transfer.id} transfer={transfer} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No rumours at the moment.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="confirmed">
            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <TransferCardSkeleton key={i} />
                ))}
              </div>
            ) : confirmed.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {confirmed.map((transfer) => (
                  <TransferCard key={transfer.id} transfer={transfer} />
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
