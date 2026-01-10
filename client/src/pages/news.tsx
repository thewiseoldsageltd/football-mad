import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { ArticleCardSkeleton } from "@/components/skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SlidersHorizontal, Search, X, Zap, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNewsFilters, type ContentTypeSlug, type CompetitionSlug } from "@/hooks/use-news-filters";
import { NEWS_COMPETITIONS, NEWS_CONTENT_TYPES, NEWS_SORT_OPTIONS, NEWS_TIME_RANGES, type Team, type NewsFiltersResponse } from "@shared/schema";
import { useState } from "react";

const competitionsList = Object.values(NEWS_COMPETITIONS).map(comp => ({
  ...comp,
  shortLabel: comp.value === "all" ? "All" : 
              comp.value === "premier-league" ? "PL" :
              comp.value === "championship" ? "Champ" :
              comp.value === "league-one" ? "L1" : "L2",
  subheading: comp.value === "all" 
    ? "The latest football news, analysis, and insights"
    : `The latest ${comp.label} news and analysis`
}));

const contentTypesList = Object.values(NEWS_CONTENT_TYPES);
const sortOptionsList = Object.values(NEWS_SORT_OPTIONS);
const timeRangesList = Object.values(NEWS_TIME_RANGES);

export default function NewsPage() {
  const { user, isAuthenticated } = useAuth();
  const { 
    filters, 
    setFilter, 
    setFilters,
    toggleType, 
    toggleTeam, 
    removeFilter, 
    clearFilters,
    hasActiveFilters,
    shouldNoIndex,
    canonicalUrl,
    buildApiQueryString
  } = useNewsFilters();
  
  const [teamSearch, setTeamSearch] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const apiQueryString = buildApiQueryString();
  
  const { data: newsResponse, isLoading } = useQuery<NewsFiltersResponse>({
    queryKey: ["/api/news", apiQueryString],
    queryFn: async () => {
      const res = await fetch(`/api/news${apiQueryString}`);
      if (!res.ok) throw new Error("Failed to fetch news");
      return res.json();
    },
  });

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
    if (!teamSearch) return teams;
    return teams.filter(t => 
      t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      t.shortName?.toLowerCase().includes(teamSearch.toLowerCase())
    );
  }, [teams, teamSearch]);

  const followedTeams = useMemo(() => {
    if (!teams) return [];
    return teams.filter(t => followedTeamIds.includes(t.id));
  }, [teams, followedTeamIds]);

  const articles = newsResponse?.articles || [];
  const featuredArticle = articles.find(a => a.isFeatured);
  const regularArticles = articles.filter(a => a.id !== featuredArticle?.id);

  const activeFilterCount = [
    filters.type.length > 0,
    filters.teams.length > 0 || filters.myTeams,
    filters.sort !== "latest",
    filters.range !== "all",
    filters.breaking,
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

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">News</h1>
          <p className="text-muted-foreground text-lg">
            {currentCompetition?.subheading}
          </p>
        </div>

        <Tabs value={filters.comp} onValueChange={handleCompetitionChange} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <TabsList className="flex-wrap h-auto gap-1">
              {competitionsList.map((comp) => (
                <Tooltip key={comp.value}>
                  <TooltipTrigger asChild>
                    <TabsTrigger 
                      value={comp.value} 
                      data-testid={`tab-competition-${comp.value}`}
                      aria-label={comp.label}
                    >
                      <span className="sm:hidden">{comp.shortLabel}</span>
                      <span className="hidden sm:inline">{comp.label}</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="sm:hidden">
                    {comp.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TabsList>

            <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  className="gap-2" 
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
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
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

                <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
                  <div className="space-y-6">
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
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {filteredTeams.map((team) => (
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
                      </ScrollArea>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-sm font-semibold mb-3 block">Content Type</Label>
                      <div className="space-y-2">
                        {contentTypesList.map((type) => (
                          <div key={type.value} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`content-${type.value}`}
                              checked={filters.type.includes(type.value as ContentTypeSlug)}
                              onCheckedChange={() => toggleType(type.value as ContentTypeSlug)}
                              data-testid={`checkbox-content-${type.value}`}
                            />
                            <label 
                              htmlFor={`content-${type.value}`}
                              className="text-sm cursor-pointer"
                            >
                              {type.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-sm font-semibold mb-3 block">Time Range</Label>
                      <RadioGroup value={filters.range} onValueChange={(val) => setFilter("range", val as any)}>
                        {timeRangesList.map((range) => (
                          <div key={range.value} className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value={range.value} 
                              id={`time-${range.value}`}
                              data-testid={`radio-time-${range.value}`}
                            />
                            <label 
                              htmlFor={`time-${range.value}`}
                              className="text-sm cursor-pointer"
                            >
                              {range.label}
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-sm font-semibold mb-3 block">Sort By</Label>
                      <RadioGroup value={filters.sort} onValueChange={(val) => setFilter("sort", val as any)}>
                        {sortOptionsList.map((option) => {
                          if ("requiresAuth" in option && option.requiresAuth && !isAuthenticated) {
                            return null;
                          }
                          return (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={option.value} 
                                id={`sort-${option.value}`}
                                data-testid={`radio-sort-${option.value}`}
                              />
                              <label 
                                htmlFor={`sort-${option.value}`}
                                className="text-sm cursor-pointer"
                              >
                                {option.label}
                              </label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  </div>
                </ScrollArea>

                <div className="mt-4 pt-4 border-t">
                  <Button 
                    className="w-full" 
                    onClick={() => setIsFiltersOpen(false)}
                    data-testid="button-apply-filters"
                  >
                    Show {articles.length} articles
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {isAuthenticated && followedTeamIds.length > 0 && (
              <Badge 
                variant={filters.myTeams ? "default" : "outline"}
                className="cursor-pointer gap-1"
                onClick={handleMyTeamsToggle}
                data-testid="chip-my-teams"
              >
                <Users className="h-3 w-3" />
                My Teams
                {filters.myTeams && <X className="h-3 w-3 ml-1" />}
              </Badge>
            )}
            <Badge 
              variant={filters.breaking ? "destructive" : "outline"}
              className="cursor-pointer gap-1"
              onClick={() => setFilter("breaking", !filters.breaking)}
              data-testid="chip-breaking"
            >
              <Zap className="h-3 w-3" />
              Breaking
              {filters.breaking && <X className="h-3 w-3 ml-1" />}
            </Badge>
            {filters.sort !== "latest" && (
              <Badge 
                variant="outline"
                className="cursor-pointer gap-1 text-muted-foreground"
                onClick={() => removeFilter("sort")}
                data-testid={`chip-sort-${filters.sort}`}
              >
                Sort: {NEWS_SORT_OPTIONS[filters.sort]?.label || filters.sort}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {filters.range !== "all" && (
              <Badge 
                variant="outline"
                className="cursor-pointer gap-1 text-muted-foreground"
                onClick={() => removeFilter("range")}
                data-testid={`chip-time-${filters.range}`}
              >
                Time: {NEWS_TIME_RANGES[filters.range]?.label || filters.range}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {filters.type.map(type => (
              <Badge 
                key={type}
                variant="outline"
                className="cursor-pointer gap-1 text-muted-foreground"
                onClick={() => removeFilter("type", type)}
                data-testid={`chip-content-${type}`}
              >
                Type: {NEWS_CONTENT_TYPES[type]?.label || type}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
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

          {competitionsList.map((comp) => (
            <TabsContent key={comp.value} value={comp.value}>
              {featuredArticle && !isLoading && comp.value === filters.comp && (
                <section className="mb-8">
                  <ArticleCard article={featuredArticle} featured />
                </section>
              )}

              {isLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <ArticleCardSkeleton key={i} />
                  ))}
                </div>
              ) : regularArticles.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
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
