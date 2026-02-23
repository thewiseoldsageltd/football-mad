import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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

interface NavTeam { id: string; name: string; slug: string; shortName: string | null }
interface NavCompetition { id: string; name: string; slug: string; sortOrder: number; teams: NavTeam[] }
interface NewsNavResponse { competitions: NavCompetition[] }

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
  const [location] = useLocation();
  const queryClient = useQueryClient();
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
  
  // DEV: mount/unmount logging
  useEffect(() => {
    if (import.meta.env.DEV) console.log("[news] mount");
    return () => { if (import.meta.env.DEV) console.log("[news] unmount"); };
  }, []);
  
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
  
  // Extra articles loaded via "Load More" - appended to baseArticles from query
  const [extraArticles, setExtraArticles] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  
  const queryKey = ["/api/news", apiQueryString] as const;
  
  const { data: newsResponse, isLoading, isFetching, isError, error, status } = useQuery<NewsFiltersResponse>({
    queryKey,
    queryFn: async () => {
      const separator = apiQueryString ? "&" : "?";
      const url = `/api/news${apiQueryString}${separator}limit=15`;
      if (import.meta.env.DEV) console.log("[news] queryFn fetching:", url);
      const res = await fetch(url);
      if (import.meta.env.DEV) console.log("[news] queryFn response:", res.status);
      if (!res.ok) throw new Error("Failed to fetch news");
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (prev) => prev,
  });
  
  // Derive articles directly from query response - React Query is single source of truth
  const baseArticles = newsResponse?.articles ?? [];
  
  // Combine base articles with extra loaded articles (from "Load More")
  const articles = useMemo(() => {
    if (extraArticles.length === 0) return baseArticles;
    const baseIds = new Set(baseArticles.map(a => a.id));
    const uniqueExtra = extraArticles.filter(a => !baseIds.has(a.id));
    return [...baseArticles, ...uniqueExtra];
  }, [baseArticles, extraArticles]);
  
  // DEV diagnostics on render
  if (import.meta.env.DEV) {
    console.log("[news] render", { location, isLoading, isFetching, status, count: articles.length });
  }
  
  // Force refetch when /news route becomes active (client-side navigation)
  useEffect(() => {
    if (!location.startsWith("/news")) return;
    if (import.meta.env.DEV) console.log("[news] activated route -> invalidate /api/news", location);
    queryClient.invalidateQueries({ queryKey: ["/api/news"] });
  }, [location, queryClient]);
  
  // Sync pagination state from query response (only when we get fresh data, not on filter change)
  const prevQueryKeyRef = useRef(apiQueryString);
  useEffect(() => {
    if (newsResponse) {
      // If filters changed, reset pagination state for the new query
      if (prevQueryKeyRef.current !== apiQueryString) {
        setExtraArticles([]);
        prevQueryKeyRef.current = apiQueryString;
      }
      setNextCursor(newsResponse.nextCursor);
      setHasMore(newsResponse.hasMore);
    }
  }, [newsResponse, apiQueryString]);
  
  // Load more handler (single-flight to prevent duplicate requests)
  const [loadMoreSlowMessage, setLoadMoreSlowMessage] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  
  const handleLoadMore = async () => {
    if (!hasMore) return;
    
    // Prevent duplicate requests
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    
    // Show skeleton placeholders immediately
    setIsLoadingMore(true);
    setLoadMoreSlowMessage(false);
    setLoadMoreError(null);
    
    // Show "Still working..." after 3s
    const slowTimer = setTimeout(() => setLoadMoreSlowMessage(true), 3000);
    
    // Create AbortController with 20s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    try {
      // Build URL using URL + URLSearchParams (never string concat)
      const url = new URL("/api/news", window.location.origin);
      url.searchParams.set("limit", "15");
      if (nextCursor) url.searchParams.set("cursor", nextCursor);
      
      // Add existing filter params
      if (apiQueryString) {
        const existingParams = new URLSearchParams(apiQueryString.replace("?", ""));
        existingParams.forEach((value, key) => {
          if (key !== "limit" && key !== "cursor") {
            url.searchParams.set(key, value);
          }
        });
      }
      
      console.debug("[news] loadMore start", { nextCursor, url: url.toString() });
      
      const res = await fetch(url.toString(), { signal: controller.signal });
      
      console.debug("[news] loadMore resp", { ok: res.ok, status: res.status });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Load more failed: ${res.status} ${text.slice(0, 200)}`);
      }
      
      const data = await res.json();
      
      console.debug("[news] loadMore data", { 
        count: data.articles?.length, 
        hasMore: data.hasMore, 
        nextCursor: data.nextCursor 
      });
      
      // Validate JSON shape
      if (!Array.isArray(data.articles)) {
        throw new Error("Invalid response: articles is not an array");
      }
      
      // Guard against "no progress" responses
      if (data.nextCursor && data.nextCursor === nextCursor) {
        throw new Error("Pagination returned the same cursor (no progress). Please retry.");
      }
      
      // Append new articles to extraArticles, de-duping by id against all articles
      const allExistingIds = new Set([...baseArticles.map(a => a.id), ...extraArticles.map(a => a.id)]);
      const uniqueNew = data.articles.filter((a: any) => !allExistingIds.has(a.id));
      setExtraArticles(prev => [...prev, ...uniqueNew]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(!!data.hasMore);
      setLoadMoreError(null);
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.error("[news] Load more timed out after 20s");
        setLoadMoreError("Still working… the request timed out. Please try again.");
      } else {
        console.error("[news] Load more failed:", e);
        setLoadMoreError(e.message?.slice(0, 140) || "Failed to load more posts. Please try again.");
      }
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(timeoutId);
      setIsLoadingMore(false);
      setLoadMoreSlowMessage(false);
      loadingMoreRef.current = false;
    }
  };

  // Note: Polling removed - React Query's refetchOnMount handles refresh on navigation

  const { data: newsNav } = useQuery<NewsNavResponse>({
    queryKey: ["/api/news/nav"],
  });

  const teams: Team[] | undefined = useMemo(() => {
    if (!newsNav) return undefined;
    const seen = new Set<string>();
    const flat: Team[] = [];
    for (const comp of newsNav.competitions) {
      for (const t of comp.teams) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          flat.push({ id: t.id, name: t.name, slug: t.slug, shortName: t.shortName } as Team);
        }
      }
    }
    return flat;
  }, [newsNav]);

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

  const groupedTeams = useMemo(() => {
    if (!newsNav) return [];
    const lc = teamSearch.toLowerCase();
    return newsNav.competitions
      .map((comp) => {
        let compTeams = comp.teams;
        if (drawerComp !== "all") {
          const compData = NEWS_COMPETITIONS[drawerComp as keyof typeof NEWS_COMPETITIONS];
          const compLabel = compData && "dbValue" in compData ? compData.dbValue : compData?.label;
          if (compLabel && comp.name !== compLabel) return null;
        }
        if (teamSearch) {
          compTeams = compTeams.filter(
            (t) => t.name.toLowerCase().includes(lc) || t.shortName?.toLowerCase().includes(lc),
          );
        }
        if (compTeams.length === 0) return null;
        return { ...comp, teams: compTeams };
      })
      .filter(Boolean) as NavCompetition[];
  }, [newsNav, teamSearch, drawerComp]);

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
                    <div className="space-y-4">
                      {groupedTeams.length > 0 ? (
                        groupedTeams.map((comp) => (
                          <div key={comp.id}>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{comp.name}</p>
                            <div className="space-y-2">
                              {comp.teams.map((team) => (
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
                              ))}
                            </div>
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
                  <ArticleCard article={featuredArticle} featured teams={teams} showPills={false} />
                </section>
              )}

              {/* Loading state: show skeleton */}
              {isLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <ArticleCardSkeleton key={i} />
                  ))}
                </div>
              ) : isFetching && articles.length === 0 ? (
                /* Fetching with no cached data: show skeleton */
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <ArticleCardSkeleton key={i} />
                  ))}
                </div>
              ) : isError ? (
                /* Error state: show error banner */
                <div className="text-center py-16">
                  <div className="mx-auto max-w-md p-4 rounded-md bg-destructive/10 border border-destructive/20">
                    <p className="text-destructive text-lg mb-2" data-testid="text-news-error">
                      Failed to load news
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {error?.message || "An unexpected error occurred"}
                    </p>
                  </div>
                </div>
              ) : regularArticles.length > 0 ? (
                /* Articles: show cards */
                <>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regularArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} teams={teams} showPills={false} />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="mt-8">
                      {isLoadingMore && (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                          {Array.from({ length: 15 }).map((_, i) => (
                            <ArticleCardSkeleton key={`skeleton-${i}`} />
                          ))}
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-3">
                        {loadMoreError && !isLoadingMore && (
                          <div className="text-center p-3 rounded-md bg-destructive/10 border border-destructive/20 max-w-md">
                            <p className="text-destructive text-sm mb-2" data-testid="text-load-more-error">
                              {loadMoreError}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleLoadMore}
                              data-testid="button-retry"
                            >
                              Retry
                            </Button>
                          </div>
                        )}
                        {isLoadingMore && loadMoreSlowMessage && (
                          <p className="text-center text-muted-foreground text-sm">
                            Still working...
                          </p>
                        )}
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          disabled={isLoadingMore}
                          data-testid="button-load-more"
                        >
                          {isLoadingMore ? "Loading…" : "Load more posts"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* No articles: only show when not loading/fetching */
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
