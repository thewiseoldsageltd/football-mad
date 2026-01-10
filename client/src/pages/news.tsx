import { useState, useMemo } from "react";
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
import { SlidersHorizontal, Search, X, Zap, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Article, Team } from "@shared/schema";

const competitions = [
  { value: "all", label: "All" },
  { value: "Premier League", label: "Premier League" },
  { value: "Championship", label: "Championship" },
  { value: "League One", label: "League One" },
  { value: "League Two", label: "League Two" },
];

const contentTypes = [
  { value: "team-news", label: "Team News" },
  { value: "match-preview", label: "Match Preview" },
  { value: "match-report", label: "Match Report" },
  { value: "analysis", label: "Analysis" },
  { value: "opinion", label: "Opinion" },
  { value: "explainer", label: "Explainers" },
  { value: "fpl", label: "FPL" },
];

const timeRanges = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "month", label: "This month" },
  { value: "any", label: "Any time" },
];

const sortOptions = [
  { value: "latest", label: "Latest" },
  { value: "trending", label: "Trending" },
  { value: "discussed", label: "Most Discussed" },
];

export default function NewsPage() {
  const { user, isAuthenticated } = useAuth();
  const [selectedCompetition, setSelectedCompetition] = useState("all");
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [timeRange, setTimeRange] = useState("any");
  const [sortBy, setSortBy] = useState("latest");
  const [showBreaking, setShowBreaking] = useState(false);
  const [showMyTeams, setShowMyTeams] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: followedTeamIds } = useQuery<string[]>({
    queryKey: ["/api/follows"],
    enabled: isAuthenticated,
  });

  const followedTeams = useMemo(() => {
    if (!teams || !followedTeamIds) return [];
    return teams.filter(t => followedTeamIds.includes(t.id));
  }, [teams, followedTeamIds]);

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    if (!teamSearch) return teams;
    return teams.filter(t => 
      t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      t.shortName?.toLowerCase().includes(teamSearch.toLowerCase())
    );
  }, [teams, teamSearch]);

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    
    let result = [...articles];

    if (selectedCompetition !== "all") {
      result = result.filter(a => a.competition === selectedCompetition);
    }

    if (selectedContentTypes.length > 0) {
      result = result.filter(a => selectedContentTypes.includes(a.contentType || "team-news"));
    }

    if (selectedTeams.length > 0) {
      result = result.filter(a => 
        a.tags?.some(tag => {
          const team = teams?.find(t => t.slug === tag);
          return team && selectedTeams.includes(team.id);
        })
      );
    }

    if (showBreaking) {
      result = result.filter(a => a.isBreaking);
    }

    if (showMyTeams && followedTeamIds?.length) {
      result = result.filter(a => 
        a.tags?.some(tag => {
          const team = teams?.find(t => t.slug === tag);
          return team && followedTeamIds.includes(team.id);
        })
      );
    }

    if (timeRange !== "any") {
      const now = new Date();
      let cutoff: Date;
      switch (timeRange) {
        case "24h":
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          cutoff = new Date(0);
      }
      result = result.filter(a => new Date(a.publishedAt!) >= cutoff);
    }

    switch (sortBy) {
      case "trending":
        result.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        break;
      case "discussed":
        result.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
        break;
      case "for-you":
        if (followedTeamIds?.length) {
          result.sort((a, b) => {
            const aFollowed = a.tags?.some(tag => {
              const team = teams?.find(t => t.slug === tag);
              return team && followedTeamIds.includes(team.id);
            }) ? 1 : 0;
            const bFollowed = b.tags?.some(tag => {
              const team = teams?.find(t => t.slug === tag);
              return team && followedTeamIds.includes(team.id);
            }) ? 1 : 0;
            return bFollowed - aFollowed;
          });
        }
        break;
      default:
        result.sort((a, b) => 
          new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime()
        );
    }

    return result;
  }, [articles, selectedCompetition, selectedContentTypes, selectedTeams, timeRange, sortBy, showBreaking, showMyTeams, followedTeamIds, teams]);

  const featuredArticle = filteredArticles.find(a => a.isFeatured);
  const regularArticles = filteredArticles.filter(a => a.id !== featuredArticle?.id);

  const activeFilterCount = [
    selectedContentTypes.length > 0,
    selectedTeams.length > 0,
    timeRange !== "any",
    sortBy !== "latest",
    showBreaking,
    showMyTeams,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedContentTypes([]);
    setSelectedTeams([]);
    setTimeRange("any");
    setSortBy("latest");
    setShowBreaking(false);
    setShowMyTeams(false);
  };

  const toggleContentType = (value: string) => {
    setSelectedContentTypes(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const selectMyTeams = () => {
    if (followedTeamIds) {
      setSelectedTeams(followedTeamIds);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">News</h1>
          <p className="text-muted-foreground text-lg">
            The latest football news, analysis, and insights
          </p>
        </div>

        <Tabs value={selectedCompetition} onValueChange={setSelectedCompetition} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <TabsList className="flex-wrap h-auto gap-1">
              {competitions.map((comp) => (
                <TabsTrigger 
                  key={comp.value} 
                  value={comp.value} 
                  data-testid={`tab-competition-${comp.value}`}
                >
                  {comp.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-filters">
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
                  <div className="flex items-center justify-between">
                    <SheetTitle>Filters</SheetTitle>
                    {activeFilterCount > 0 && (
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
                      <Label className="text-sm font-semibold mb-3 block">Content Type</Label>
                      <div className="space-y-2">
                        {contentTypes.map((type) => (
                          <div key={type.value} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`content-${type.value}`}
                              checked={selectedContentTypes.includes(type.value)}
                              onCheckedChange={() => toggleContentType(type.value)}
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
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold">Teams</Label>
                        {isAuthenticated && followedTeamIds && followedTeamIds.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={selectMyTeams}
                            className="h-7 text-xs"
                            data-testid="button-select-my-teams"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            My Teams
                          </Button>
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
                                checked={selectedTeams.includes(team.id)}
                                onCheckedChange={() => toggleTeam(team.id)}
                                data-testid={`checkbox-team-${team.slug}`}
                              />
                              <label 
                                htmlFor={`team-${team.id}`}
                                className="text-sm cursor-pointer flex items-center gap-2"
                              >
                                {team.name}
                                {followedTeamIds?.includes(team.id) && (
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
                      <Label className="text-sm font-semibold mb-3 block">Time Range</Label>
                      <RadioGroup value={timeRange} onValueChange={setTimeRange}>
                        {timeRanges.map((range) => (
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
                      <RadioGroup value={sortBy} onValueChange={setSortBy}>
                        {sortOptions.map((option) => (
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
                        ))}
                        {isAuthenticated && followedTeamIds && followedTeamIds.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value="for-you" 
                              id="sort-for-you"
                              data-testid="radio-sort-for-you"
                            />
                            <label 
                              htmlFor="sort-for-you"
                              className="text-sm cursor-pointer"
                            >
                              For You
                            </label>
                          </div>
                        )}
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
                    Show {filteredArticles.length} articles
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {isAuthenticated && followedTeamIds && followedTeamIds.length > 0 && (
              <Badge 
                variant={showMyTeams ? "default" : "outline"}
                className="cursor-pointer gap-1"
                onClick={() => setShowMyTeams(!showMyTeams)}
                data-testid="chip-my-teams"
              >
                <Users className="h-3 w-3" />
                My Teams
                {showMyTeams && <X className="h-3 w-3 ml-1" />}
              </Badge>
            )}
            <Badge 
              variant={showBreaking ? "destructive" : "outline"}
              className="cursor-pointer gap-1"
              onClick={() => setShowBreaking(!showBreaking)}
              data-testid="chip-breaking"
            >
              <Zap className="h-3 w-3" />
              Breaking
              {showBreaking && <X className="h-3 w-3 ml-1" />}
            </Badge>
            {sortBy !== "latest" && (
              <Badge 
                variant="secondary"
                className="cursor-pointer gap-1"
                onClick={() => setSortBy("latest")}
                data-testid={`chip-sort-${sortBy}`}
              >
                {sortBy === "for-you" ? "For You" : sortOptions.find(o => o.value === sortBy)?.label}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {timeRange !== "any" && (
              <Badge 
                variant="secondary"
                className="cursor-pointer gap-1"
                onClick={() => setTimeRange("any")}
                data-testid={`chip-time-${timeRange}`}
              >
                {timeRanges.find(r => r.value === timeRange)?.label}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {selectedContentTypes.map(type => (
              <Badge 
                key={type}
                variant="secondary"
                className="cursor-pointer gap-1"
                onClick={() => toggleContentType(type)}
                data-testid={`chip-content-${type}`}
              >
                {contentTypes.find(t => t.value === type)?.label}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
            {selectedTeams.map(teamId => {
              const team = teams?.find(t => t.id === teamId);
              return team ? (
                <Badge 
                  key={teamId}
                  variant="secondary"
                  className="cursor-pointer gap-1"
                  onClick={() => toggleTeam(teamId)}
                  data-testid={`chip-team-${team.slug}`}
                >
                  {team.shortName || team.name}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ) : null;
            })}
          </div>

          {competitions.map((comp) => (
            <TabsContent key={comp.value} value={comp.value}>
              {featuredArticle && !isLoading && comp.value === selectedCompetition && (
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
