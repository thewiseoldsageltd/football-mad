import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { InjuryCard } from "@/components/cards/injury-card";
import { InjuryCardSkeleton } from "@/components/skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Filter } from "lucide-react";
import type { Injury, Team } from "@shared/schema";

export default function InjuriesPage() {
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const { data: injuries, isLoading } = useQuery<Injury[]>({
    queryKey: ["/api/injuries"],
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const filteredInjuries = injuries?.filter((i) => {
    if (teamFilter === "all") return true;
    return i.teamId === teamFilter;
  });

  const outInjuries = filteredInjuries?.filter((i) => i.status === "OUT") || [];
  const doubtfulInjuries = filteredInjuries?.filter((i) => i.status === "DOUBTFUL") || [];
  const fitInjuries = filteredInjuries?.filter((i) => i.status === "FIT") || [];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">Injury Room</h1>
              <p className="text-muted-foreground text-lg">
                Player injuries and expected returns
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
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

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              All ({filteredInjuries?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="out" className="text-red-600 dark:text-red-400">
              Out ({outInjuries.length})
            </TabsTrigger>
            <TabsTrigger value="doubtful" className="text-amber-600 dark:text-amber-400">
              Doubtful ({doubtfulInjuries.length})
            </TabsTrigger>
            <TabsTrigger value="fit" className="text-green-600 dark:text-green-400">
              Fit ({fitInjuries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <InjuryCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredInjuries && filteredInjuries.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInjuries.map((injury) => (
                  <InjuryCard key={injury.id} injury={injury} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No injury reports to display.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="out">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <InjuryCardSkeleton key={i} />
                ))}
              </div>
            ) : outInjuries.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {outInjuries.map((injury) => (
                  <InjuryCard key={injury.id} injury={injury} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No players currently ruled out.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="doubtful">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <InjuryCardSkeleton key={i} />
                ))}
              </div>
            ) : doubtfulInjuries.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {doubtfulInjuries.map((injury) => (
                  <InjuryCard key={injury.id} injury={injury} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No players currently listed as doubtful.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="fit">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <InjuryCardSkeleton key={i} />
                ))}
              </div>
            ) : fitInjuries.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fitInjuries.map((injury) => (
                  <InjuryCard key={injury.id} injury={injury} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No players recently returned from injury.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
