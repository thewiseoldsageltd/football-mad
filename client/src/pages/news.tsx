import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { ArticleCardSkeleton } from "@/components/skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { SlidersHorizontal, Search, X, Users, Newspaper } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNewsFilters, type CompetitionSlug } from "@/hooks/use-news-filters";
import { NEWS_COMPETITIONS, type Team, type NewsFiltersResponse } from "@shared/schema";

const competitionsList = Object.values(NEWS_COMPETITIONS).map(comp => ({
  ...comp,
  subheading: comp.value === "all" 
    ? "The latest football news, analysis, and insights"
    : `The latest ${comp.label} news and analysis`
}));

const MOCK_PLAYERS = [
  { id: "1", name: "Mohamed Salah", teamSlug: "liverpool" },
  { id: "2", name: "Erling Haaland", teamSlug: "manchester-city" },
  { id: "3", name: "Bukayo Saka", teamSlug: "arsenal" },
  { id: "4", name: "Cole Palmer", teamSlug: "chelsea" },
  { id: "5", name: "Bruno Fernandes", teamSlug: "manchester-united" },
  { id: "6", name: "Son Heung-min", teamSlug: "tottenham" },
  { id: "7", name: "Alexander Isak", teamSlug: "newcastle" },
  { id: "8", name: "Ollie Watkins", teamSlug: "aston-villa" },
  { id: "9", name: "Jean-Philippe Mateta", teamSlug: "crystal-palace" },
  { id: "10", name: "Dominic Solanke", teamSlug: "tottenham" },
];

export default function NewsPage() {
  const { user, isAuthenticated } = useAuth();
  const { 
    filters, 
    setFilter, 
    setFilters,
    toggleTeam, 
    removeFilter, 
    clearFilters,
    hasActiveFilters,
    shouldNoIndex,
    canonicalUrl,
    buildApiQueryString
  } = useNewsFilters();
  
  const [teamSearch, setTeamSearch] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [drawerComp, setDrawerComp] = useState<CompetitionSlug>(filters.comp);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeftFade(scrollLeft > 0);
    setShowRightFade(scrollLeft + clientWidth < scrollWidth - 1);
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
    setDrawerComp(filters.comp);
  }, [filters.comp]);

  const apiQueryString = buildApiQueryString();
  
  // Pagination state
  const [paginatedArticles, setPaginatedArticles] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  
  const { data: newsResponse, isLoading } = useQuery<NewsFiltersResponse>({
    queryKey: ["/api/news", apiQueryString],
    queryFn: async () => {
      const separator = apiQueryString ? "&" : "?";
      const res = await fetch(`/api/news${apiQueryString}${separator}limit=15`);
      if (!res.ok) throw new Error("Failed to fetch news");
      return res.json();
    },
  });
  
  // Reset pagination when filters change and sync from initial response
  useEffect(() => {
    if (newsResponse) {
      setPaginatedArticles(newsResponse.articles);
      setNextCursor(newsResponse.nextCursor);
      setHasMore(newsResponse.hasMore);
    }
  }, [newsResponse]);
  
  // Reset pagination state when filters change
  useEffect(() => {
    setPaginatedArticles([]);
    setNextCursor(null);
    setHasMore(false);
  }, [apiQueryString]);
  
  // Load more handler (single-flight to prevent duplicate requests)
  const handleLoadMore = async () => {
    if (!hasMore) return;
    
    // Prevent duplicate requests
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    
    try {
      setIsLoadingMore(true);
      
      const params = new URLSearchParams();
      params.set("limit", "15");
      if (nextCursor) params.set("cursor", nextCursor);
      
      // Add existing filter params
      if (apiQueryString) {
        const existingParams = new URLSearchParams(apiQueryString.replace("?", ""));
        existingParams.forEach((value, key) => {
          if (key !== "limit" && key !== "cursor") {
            params.set(key, value);
          }
        });
      }
      
      const res = await fetch(`/api/news?${params.toString()}`);
      const j = await res.json();
      
      if (!res.ok) throw new Error(j?.error || "Failed to load more");
      
      setPaginatedArticles(prev => [...prev, ...(j.articles || [])]);
      setNextCursor(j.nextCursor ?? null);
      setHasMore(!!j.hasMore);
    } catch (e) {
      console.error("Load more failed:", e);
    } finally {
      setIsLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  // Polling state for incremental updates
  const [polledArticles, setPolledArticles] = useState<any[]>([]);
  const lastCursorRef = useRef<{ since: string; sinceId: string } | null>(null);

  // Merge base articles with polled updates (webhook-safe)
  const mergedArticles = useMemo(() => {
    const base = paginatedArticles.length > 0 ? paginatedArticles : (newsResponse?.articles ?? []);
    if (polledArticles.length === 0) return base;

    const map = new Map<string, any>();

    // Start with base articles (these may already include webhook updates)
    for (const article of base) {
      map.set(article.id, article);
    }

    // Only overwrite if the polled version is actually newer
    for (const polled of polledArticles) {
      const existing = map.get(polled.id);

      if (!existing) {
        map.set(polled.id, polled);
        continue;
      }

      const existingTs = new Date(existing.sourceUpdatedAt || existing.publishedAt || existing.createdAt).getTime();
      const polledTs = new Date(polled.sourceUpdatedAt || polled.publishedAt || polled.createdAt).getTime();

      if (polledTs > existingTs) {
        map.set(polled.id, polled);
      }
    }

    // Always return newest-first (sort by publishedAt for display order, not updatedAt)
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.publishedAt || b.createdAt).getTime() -
        new Date(a.publishedAt || a.createdAt).getTime()
    );
  }, [newsResponse?.articles, polledArticles]);

  // Reset polled articles when filters change
  useEffect(() => {
    setPolledArticles([]);
    lastCursorRef.current = null;
  }, [apiQueryString]);

  // 60-second polling loop for updates (intentional for MVP responsiveness)
  useEffect(() => {
    const POLL_INTERVAL = 60_000; // 60 seconds
    const MAX_LOOPS = 5; // Cap loops per poll cycle
    
    const fetchUpdates = async () => {
      // Get cursor from newest article in current state
      const allArticles = mergedArticles;
      if (allArticles.length === 0) return;
      
      const newestArticle = allArticles[0];
      const since = newestArticle.publishedAt || newestArticle.createdAt;
      if (!since) return;
      
      let cursor = { since: new Date(since).toISOString(), sinceId: newestArticle.id };
      let newArticles: any[] = [];
      let loops = 0;
      
      while (loops < MAX_LOOPS) {
        try {
          const url = `/api/news/updates?since=${encodeURIComponent(cursor.since)}&sinceId=${encodeURIComponent(cursor.sinceId)}&limit=200`;
          const res = await fetch(url);
          if (!res.ok) break;
          
          const data = await res.json();
          if (data.articles && data.articles.length > 0) {
            newArticles = [...newArticles, ...data.articles];
          }
          
          if (!data.nextCursor) break;
          cursor = data.nextCursor;
          loops++;
        } catch (err) {
          console.error("Polling error:", err);
          break;
        }
      }
      
      if (newArticles.length > 0) {
        setPolledArticles(prev => {
          // Dedupe with existing polled
          const seen = new Set(prev.map(a => a.id));
          const unique = newArticles.filter(a => !seen.has(a.id));
          return [...unique, ...prev];
        });
      }
    };
    
    const intervalId = setInterval(fetchUpdates, POLL_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [mergedArticles]);

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: followedTeamIds = [] } = useQuery<string[]>({
    queryKey: ["/api/follows"],
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    const fullCanonicalUrl = `${window.location.origin}${canonicalUrl}`;
    
    let canonicalLink = document.getElementById("news-page-canonical") as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.id = "news-page-canonical";
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = fullCanonicalUrl;
    
    let robotsMeta = document.getElementById("news-page-robots") as HTMLMetaElement | null;
    
    if (shouldNoIndex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement("meta");
        robotsMeta.id = "news-page-robots";
        robotsMeta.name = "robots";
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = "noindex,follow";
    } else if (robotsMeta) {
      robotsMeta.remove();
    }
    
    return () => {
      document.getElementById("news-page-canonical")?.remove();
      document.getElementById("news-page-robots")?.remove();
    };
  }, [canonicalUrl, shouldNoIndex]);

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    let filtered = teams;
    
    if (drawerComp !== "all") {
      const compData = NEWS_COMPETITIONS[drawerComp as keyof typeof NEWS_COMPETITIONS];
      const compLabel = compData && "dbValue" in compData ? compData.dbValue : compData?.label;
      if (compLabel) {
        filtered = filtered.filter(t => t.league === compLabel);
      }
    }
    
    if (teamSearch) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
        t.shortName?.toLowerCase().includes(teamSearch.toLowerCase())
      );
    }
    
    return filtered;
  }, [teams, teamSearch, drawerComp]);

  const filteredPlayers = useMemo(() => {
    if (!playerSearch) return [];
    return MOCK_PLAYERS.filter(p => 
      p.name.toLowerCase().includes(playerSearch.toLowerCase())
    );
  }, [playerSearch]);

  const followedTeams = useMemo(() => {
    if (!teams) return [];
    return teams.filter(t => followedTeamIds.includes(t.id));
  }, [teams, followedTeamIds]);

  const articles = mergedArticles;
  const featuredArticle = articles.find(a => a.isFeatured);
  const regularArticles = articles.filter(a => a.id !== featuredArticle?.id);

  const activeFilterCount = [
    filters.teams.length > 0 || filters.myTeams,
  ].filter(Boolean).length;

  const currentCompetition = competitionsList.find(c => c.value === filters.comp);

  const handleCompetitionChange = (value: string) => {
    setFilter("comp", value as CompetitionSlug);
  };

  const handleMyTeamsToggle = () => {
    if (filters.myTeams) {
      setFilters({ myTeams: false, teams: [] });
    } else {
      setFilter("myTeams", true);
    }
  };

  const handleTeamCheckboxChange = (teamSlug: string) => {
    if (filters.myTeams) {
      const followedSlugs = followedTeams.map(t => t.slug);
      const newTeams = followedSlugs.includes(teamSlug)
        ? followedSlugs.filter(s => s !== teamSlug)
        : [...followedSlugs, teamSlug];
      setFilters({ myTeams: false, teams: newTeams });
    } else {
      toggleTeam(teamSlug);
    }
  };

  const handleDrawerCompChange = (value: string) => {
    const newComp = value as CompetitionSlug;
    setDrawerComp(newComp);
    setTeamSearch("");
    setFilter("comp", newComp);
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Newspaper className="h-8 w-8 text-primary shrink-0" aria-hidden="true" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold" data-testid="text-page-title">News</h1>
            <p className="text-muted-foreground text-lg" data-testid="text-page-subtitle">
              {currentCompetition?.subheading}
            </p>
          </div>
        </div>

        <Tabs value={filters.comp} onValueChange={handleCompetitionChange} className="w-full">
          {/* Desktop: Tabs + Filters on same row */}
          <div className="hidden md:flex md:items-center md:justify-between gap-4 mb-6">
            <TabsList className="flex-wrap h-auto gap-1" data-testid="tabs-news">
              {competitionsList.map((comp) => (
                <TabsTrigger 
                  key={comp.value}
                  value={comp.value} 
                  data-testid={`tab-competition-${comp.value}`}
                >
                  {comp.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <Button 
              variant="outline" 
              className="gap-2 shrink-0" 
              onClick={() => setIsFiltersOpen(true)}
              data-testid="button-filters"
              aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : "Filters"}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Mobile: Full-width scrollable tabs with full labels */}
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
                <TabsList className="inline-flex h-auto gap-1 w-max" data-testid="tabs-news-mobile">
                  {competitionsList.map((comp) => (
                    <TabsTrigger 
                      key={comp.value}
                      value={comp.value} 
                      className="whitespace-nowrap"
                      data-testid={`tab-competition-${comp.value}-mobile`}
                    >
                      {comp.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {showLeftFade && (
                <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" />
              )}
              {showRightFade && (
                <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background to-transparent" />
              )}
            </div>

            <Button 
              variant="outline" 
              className="w-full gap-2" 
              onClick={() => setIsFiltersOpen(true)}
              data-testid="button-filters-mobile"
              aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : "Filters"}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Simplified Filter Drawer - Single scroll, Team + Player only */}
          <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <SheetContent 
              className="w-full sm:max-w-md flex flex-col"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <SheetHeader className="shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <SheetTitle>Filters</SheetTitle>
                  {hasActiveFilters && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearFilters}
                      data-testid="button-clear-filters"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto mt-6 pr-1 -mr-1">
                <div className="space-y-6 pb-4">
                  {/* Team Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold">Teams</Label>
                      {isAuthenticated && followedTeamIds.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Label htmlFor="my-teams-toggle" className="text-xs text-muted-foreground cursor-pointer">
                            My Teams
                          </Label>
                          <Switch 
                            id="my-teams-toggle"
                            checked={filters.myTeams}
                            onCheckedChange={handleMyTeamsToggle}
                            data-testid="switch-my-teams"
                          />
                        </div>
                      )}
                    </div>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search teams..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        className="pl-9"
                        data-testid="input-team-search"
                      />
                    </div>
                    <div className="space-y-2">
                      {filteredTeams.length > 0 ? (
                        filteredTeams.map((team) => (
                          <div key={team.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`team-${team.id}`}
                              checked={filters.myTeams 
                                ? followedTeamIds.includes(team.id)
                                : filters.teams.includes(team.slug)
                              }
                              onCheckedChange={() => handleTeamCheckboxChange(team.slug)}
                              data-testid={`checkbox-team-${team.slug}`}
                            />
                            <label 
                              htmlFor={`team-${team.id}`}
                              className="text-sm cursor-pointer flex items-center gap-2"
                            >
                              {team.name}
                              {followedTeamIds.includes(team.id) && (
                                <Badge variant="outline" className="text-xs py-0">Following</Badge>
                              )}
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground py-2">
                          No teams found for this competition
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Player Filter */}
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Player</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search players..."
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        className="pl-9"
                        data-testid="input-player-search"
                      />
                    </div>
                    {filteredPlayers.length > 0 && (
                      <div className="mt-2 space-y-1 border rounded-md p-2">
                        {filteredPlayers.map((player) => (
                          <div 
                            key={player.id} 
                            className="text-sm py-1 px-2 hover:bg-muted rounded cursor-pointer"
                            onClick={() => setPlayerSearch(player.name)}
                            data-testid={`player-option-${player.id}`}
                          >
                            {player.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <SheetFooter className="shrink-0 border-t pt-4 mt-4 flex-col gap-3 sm:flex-col">
                <div className="w-full">
                  <Label className="text-xs text-muted-foreground mb-1 block">Competition</Label>
                  <Select value={drawerComp} onValueChange={handleDrawerCompChange}>
                    <SelectTrigger className="w-full" data-testid="select-drawer-competition">
                      <SelectValue placeholder="Select competition" />
                    </SelectTrigger>
                    <SelectContent>
                      {competitionsList.map((comp) => (
                        <SelectItem key={comp.value} value={comp.value}>
                          {comp.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {(filters.myTeams || filters.teams.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {isAuthenticated && followedTeamIds.length > 0 && filters.myTeams && (
                <Badge 
                  variant="default"
                  className="cursor-pointer gap-1"
                  onClick={handleMyTeamsToggle}
                  data-testid="chip-my-teams"
                >
                  <Users className="h-3 w-3" />
                  My Teams
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {!filters.myTeams && filters.teams.map(teamSlug => {
                const team = teams?.find(t => t.slug === teamSlug);
                return team ? (
                  <Badge 
                    key={teamSlug}
                    variant="outline"
                    className="cursor-pointer gap-1 text-muted-foreground"
                    onClick={() => removeFilter("teams", teamSlug)}
                    data-testid={`chip-team-${team.slug}`}
                  >
                    Team: {team.name}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          {competitionsList.map((comp) => (
            <TabsContent key={comp.value} value={comp.value}>
              {featuredArticle && !isLoading && comp.value === filters.comp && (
                <section className="mb-8">
                  <ArticleCard article={featuredArticle} featured teams={teams} />
                </section>
              )}

              {isLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <ArticleCardSkeleton key={i} />
                  ))}
                </div>
              ) : regularArticles.length > 0 ? (
                <>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regularArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} teams={teams} />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="flex justify-center mt-8">
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        disabled={!hasMore || isLoadingMore}
                        data-testid="button-load-more"
                      >
                        {isLoadingMore ? "Loading..." : "Load more posts"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">
                    No articles found matching your filters.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={clearFilters}
                    data-testid="button-clear-filters-empty"
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </MainLayout>
  );
}
