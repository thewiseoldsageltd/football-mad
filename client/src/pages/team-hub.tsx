import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Heart, HeartOff, Calendar, Newspaper, Activity, TrendingUp, Users, ArrowLeft, ArrowRight, Mail, Inbox, Bell, MessageSquarePlus, LogIn, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { ArticleCardSkeleton } from "@/components/skeletons";
import { MatchCard } from "@/components/cards/match-card";
import { InjuryCard } from "@/components/cards/injury-card";
import { PostCard } from "@/components/cards/post-card";
import { TransferCard } from "@/components/cards/transfer-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Team, Article, Match, Transfer, Injury, Post, FplPlayerAvailability } from "@shared/schema";

interface FplAvailabilityWithRag extends FplPlayerAvailability {
  ragColor: "green" | "amber" | "red";
  displayPercent: string;
  effectiveChance: number | null;
}

interface NewsFiltersResponse {
  articles: Article[];
  appliedFilters: Record<string, unknown>;
}

const VALID_TABS = ["latest", "injuries", "transfers", "matches", "fans"] as const;
type TabValue = typeof VALID_TABS[number];

const TAB_META: Record<TabValue, { icon: typeof Newspaper; label: string; title: string }> = {
  latest: { icon: Newspaper, label: "Latest", title: "News" },
  injuries: { icon: Activity, label: "Injuries", title: "Injuries" },
  transfers: { icon: TrendingUp, label: "Transfers", title: "Transfers" },
  matches: { icon: Calendar, label: "Matches", title: "Matches" },
  fans: { icon: Users, label: "Fans", title: "Fan Zone" },
};

function EmptyState({ icon: Icon, title, description }: { icon: typeof Inbox; title: string; description: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      </CardContent>
    </Card>
  );
}

function getBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return import.meta.env.VITE_SITE_URL || "https://football-mad.replit.app";
}

function useDocumentMeta(title: string, description: string, canonicalPath: string) {
  useEffect(() => {
    const canonicalUrl = `${getBaseUrl()}${canonicalPath}`;
    
    document.title = title;
    
    const setMetaTag = (selector: string, attr: string, value: string, attrType: "name" | "property" = "name") => {
      let tag = document.querySelector(selector);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attrType, attr);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", value);
    };

    setMetaTag('meta[name="description"]', "description", description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    setMetaTag('meta[property="og:title"]', "og:title", title, "property");
    setMetaTag('meta[property="og:description"]', "og:description", description, "property");
    setMetaTag('meta[property="og:url"]', "og:url", canonicalUrl, "property");
    setMetaTag('meta[property="og:type"]', "og:type", "website", "property");
    setMetaTag('meta[property="og:site_name"]', "og:site_name", "Football Mad", "property");
    
    setMetaTag('meta[name="twitter:card"]', "twitter:card", "summary_large_image");
    setMetaTag('meta[name="twitter:title"]', "twitter:title", title);
    setMetaTag('meta[name="twitter:description"]', "twitter:description", description);
  }, [title, description, canonicalPath]);
}

function trackTabClick(teamSlug: string, tabName: string) {
  if (typeof window !== "undefined" && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", "team_tab_click", {
      team_slug: teamSlug,
      tab_name: tabName,
    });
  }
  console.debug("[Analytics] Tab click:", { team: teamSlug, tab: tabName });
}

function LatestTabContent({ 
  articles, 
  isLoading, 
  teamName,
  teamColor
}: { 
  articles: Article[]; 
  isLoading: boolean;
  teamName: string;
  teamColor?: string;
}) {
  const sortedArticles = useMemo(() => {
    return [...articles].sort((a, b) => {
      if (a.isBreaking && !b.isBreaking) return -1;
      if (!a.isBreaking && b.isBreaking) return 1;
      if (a.isEditorPick && !b.isEditorPick) return -1;
      if (!a.isEditorPick && b.isEditorPick) return 1;
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [articles]);

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (sortedArticles.length === 0) {
    return (
      <EmptyState
        icon={Newspaper}
        title="No news yet"
        description={`Check back soon for the latest ${teamName} news and updates.`}
      />
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {sortedArticles.map((article) => (
        <ArticleCard key={article.id} article={article} teamColor={teamColor} />
      ))}
    </div>
  );
}

const RAG_COLORS: Record<string, { bg: string; border: string }> = {
  green: { bg: "bg-green-500/10", border: "border-green-500" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500" },
  red: { bg: "bg-red-500/10", border: "border-red-500" },
};

function PlayerAvatar({ 
  playerName, 
  photoUrl,
  ragColor 
}: { 
  playerName: string; 
  photoUrl?: string | null;
  ragColor: string;
}) {
  const ragStyle = RAG_COLORS[ragColor] || RAG_COLORS.unknown;
  const initials = playerName
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (photoUrl) {
    return (
      <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${ragStyle.border} flex-shrink-0`}>
        <img 
          src={photoUrl} 
          alt={playerName} 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement?.classList.add('fallback-initials');
          }}
        />
      </div>
    );
  }

  return (
    <div 
      className={`w-12 h-12 rounded-full ${ragStyle.bg} border-2 ${ragStyle.border} flex items-center justify-center flex-shrink-0`}
    >
      <span className="text-sm font-medium text-muted-foreground">{initials}</span>
    </div>
  );
}

function formatAvailabilityText(news: string | null, chanceThisRound: number | null): string {
  const cleanNews = news?.replace(/\s*-\s*\d+%\s*chance\s*(of\s*playing)?/gi, "").trim() || "";
  
  if (chanceThisRound === null || chanceThisRound === undefined) {
    return cleanNews ? `${cleanNews} — Chance unknown` : "Chance unknown";
  }
  
  if (chanceThisRound === 0) {
    if (cleanNews.toLowerCase().includes("unknown return")) {
      return cleanNews;
    }
    return cleanNews ? `${cleanNews} — 0% chance` : "0% chance of playing";
  }
  
  return cleanNews ? `${cleanNews} — ${chanceThisRound}% chance` : `${chanceThisRound}% chance of playing`;
}

function FplAvailabilityCard({ player }: { player: FplAvailabilityWithRag }) {
  const newsAdded = player.newsAdded ? new Date(player.newsAdded) : null;
  const availabilityText = formatAvailabilityText(player.news, player.effectiveChance);
  
  return (
    <Card className="hover-elevate" data-testid={`card-availability-${player.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <PlayerAvatar 
            playerName={player.playerName} 
            photoUrl={null}
            ragColor={player.ragColor}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{player.playerName}</h3>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {player.position}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {availabilityText}
            </p>
          </div>
        </div>
        
        {newsAdded && (
          <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border/50">
            Updated: {newsAdded.toLocaleDateString("en-GB", { 
              day: "numeric", 
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InjuriesTabContent({ 
  teamSlug,
  teamName,
  relatedArticles,
}: { 
  teamSlug: string;
  teamName: string;
  relatedArticles?: Article[];
}) {
  const [sortBy, setSortBy] = useState<"recent" | "lowest">("recent");
  
  const { data: availability, isLoading } = useQuery<FplAvailabilityWithRag[]>({
    queryKey: ["/api/teams", teamSlug, "availability", sortBy],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamSlug}/availability?sort=${sortBy}`);
      if (!res.ok) throw new Error("Failed to fetch availability");
      return res.json();
    },
  });

  const { outCount, doubtfulCount, lastUpdated } = useMemo(() => {
    if (!availability || availability.length === 0) {
      return { outCount: 0, doubtfulCount: 0, lastUpdated: null };
    }
    
    const out = availability.filter(p => p.ragColor === "red").length;
    const doubtful = availability.filter(p => p.ragColor === "amber").length;
    
    const mostRecent = availability.reduce((latest, p) => {
      if (p.newsAdded) {
        const date = new Date(p.newsAdded);
        return date > latest ? date : latest;
      }
      return latest;
    }, new Date(0));
    
    return {
      outCount: out,
      doubtfulCount: doubtful,
      lastUpdated: mostRecent.getTime() > 0 ? mostRecent : null,
    };
  }, [availability]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-64" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h2 className="text-xl font-semibold">Injuries & Availability</h2>
          <div className="flex gap-1">
            <Button 
              variant={sortBy === "recent" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setSortBy("recent")}
              data-testid="button-sort-recent"
            >
              Most Recent
            </Button>
            <Button 
              variant={sortBy === "lowest" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setSortBy("lowest")}
              data-testid="button-sort-lowest"
            >
              Lowest %
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          FPL-powered availability for {teamName}
        </p>
        
        {(availability && availability.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {outCount > 0 && (
              <Badge variant="destructive" className="text-xs" data-testid="badge-out-count">
                OUT: {outCount}
              </Badge>
            )}
            {doubtfulCount > 0 && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs" data-testid="badge-doubtful-count">
                DOUBTFUL: {doubtfulCount}
              </Badge>
            )}
          </div>
        )}

        {lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleDateString("en-GB", { 
              day: "numeric", 
              month: "short", 
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        )}
      </div>

      {(!availability || availability.length === 0) ? (
        <EmptyState
          icon={Activity}
          title="No injury updates right now"
          description="All players appear fit. Sync FPL data to populate availability."
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {availability.map((player) => (
            <FplAvailabilityCard key={player.id} player={player} />
          ))}
        </div>
      )}

      {relatedArticles && relatedArticles.length > 0 && (
        <section className="pt-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            Injury-related News
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {relatedArticles.slice(0, 4).map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface TransferSummary {
  inCount: number;
  outCount: number;
  netSpendText: string;
  lastUpdated: string | null;
  windowLabel: string;
}

interface MockTransferRumour {
  id: string;
  playerName: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  linkedClub: string;
  linkedClubSlug: string;
  direction: "in" | "out";
  confidencePercent: number;
  descriptor?: string;
  sourceName: string;
}

const MOCK_TRANSFER_DATA: Record<string, { 
  confirmedIn: Transfer[]; 
  confirmedOut: Transfer[]; 
  rumours: MockTransferRumour[];
  summary: TransferSummary;
}> = {
  arsenal: {
    confirmedIn: [],
    confirmedOut: [],
    rumours: [
      {
        id: "rumour-1",
        playerName: "Viktor Gyokeres",
        position: "FWD",
        linkedClub: "Sporting CP",
        linkedClubSlug: "sporting-cp",
        direction: "in",
        confidencePercent: 65,
        descriptor: "Strong interest",
        sourceName: "The Athletic",
      },
      {
        id: "rumour-2",
        playerName: "Nico Williams",
        position: "MID",
        linkedClub: "Athletic Bilbao",
        linkedClubSlug: "athletic-bilbao",
        direction: "in",
        confidencePercent: 40,
        descriptor: "Early link",
        sourceName: "AS",
      },
    ],
    summary: {
      inCount: 0,
      outCount: 0,
      netSpendText: "—",
      lastUpdated: new Date().toISOString(),
      windowLabel: "January Window",
    },
  },
};

function getPlayerInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function ClubCrest({ clubName, size = 24 }: { clubName: string; size?: number }) {
  return (
    <div 
      className="rounded-full bg-muted flex items-center justify-center flex-shrink-0 border border-border/50"
      style={{ width: size, height: size }}
      title={clubName}
    >
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="text-muted-foreground"
        style={{ width: size * 0.6, height: size * 0.6 }}
      >
        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
      </svg>
    </div>
  );
}

function RumourCard({ rumour, teamName }: { rumour: MockTransferRumour; teamName: string }) {
  const initials = getPlayerInitials(rumour.playerName);
  
  const sourceClub = rumour.direction === "in" ? rumour.linkedClub : teamName;
  const destClub = rumour.direction === "in" ? teamName : rumour.linkedClub;

  return (
    <Card className="hover-elevate" data-testid={`card-rumour-${rumour.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold truncate">{rumour.playerName}</h3>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {rumour.position}
              </Badge>
            </div>
            
            <div className="flex items-center gap-1.5 mb-2">
              <ClubCrest clubName={sourceClub} size={20} />
              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <ClubCrest clubName={destClub} size={20} />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium">{rumour.confidencePercent}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${rumour.confidencePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          {rumour.descriptor && (
            <span className="text-xs text-muted-foreground italic">{rumour.descriptor}</span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{rumour.sourceName}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function TransfersSummaryBar({ summary }: { summary: TransferSummary }) {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.inCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">In</div>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.outCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Out</div>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.netSpendText}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Net</div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {summary.windowLabel}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function TransfersTabContent({ 
  transfers, 
  teamName,
  teamId,
  teamSlug
}: { 
  transfers?: Transfer[];
  teamName: string;
  teamId: string;
  teamSlug: string;
}) {
  const mockData = MOCK_TRANSFER_DATA[teamSlug];
  
  const { rumours, apiRumours, confirmedIn, confirmedOut, summary } = useMemo(() => {
    const confirmed = (transfers || []).filter(t => t.status === "confirmed");
    const apiRumoursData = (transfers || []).filter(t => t.status === "rumour");
    
    const combinedIn = [
      ...confirmed.filter(t => t.toTeamId === teamId),
      ...(mockData?.confirmedIn || []),
    ];
    const combinedOut = [
      ...confirmed.filter(t => t.fromTeamId === teamId),
      ...(mockData?.confirmedOut || []),
    ];
    
    const mockRumours = mockData?.rumours || [];
    
    const calculatedSummary: TransferSummary = {
      inCount: combinedIn.length,
      outCount: combinedOut.length,
      netSpendText: mockData?.summary?.netSpendText || "—",
      lastUpdated: transfers?.[0]?.updatedAt?.toString() || mockData?.summary?.lastUpdated || new Date().toISOString(),
      windowLabel: mockData?.summary?.windowLabel || "January Window",
    };
    
    return {
      rumours: mockRumours,
      apiRumours: apiRumoursData,
      confirmedIn: combinedIn,
      confirmedOut: combinedOut,
      summary: calculatedSummary,
    };
  }, [transfers, teamId, mockData]);

  const hasActivity = confirmedIn.length > 0 || confirmedOut.length > 0 || rumours.length > 0 || apiRumours.length > 0;
  const lastUpdatedFormatted = summary.lastUpdated 
    ? new Date(summary.lastUpdated).toLocaleDateString("en-GB", { 
        day: "numeric", 
        month: "short", 
        year: "numeric" 
      })
    : null;

  return (
    <div className="space-y-6">
      <header className="mb-2">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h2 className="text-2xl font-bold">Transfers</h2>
          <Badge variant="outline" className="text-xs">
            {summary.windowLabel}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Latest rumours and deals for {teamName}
        </p>
        {lastUpdatedFormatted && (
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {lastUpdatedFormatted}
          </p>
        )}
      </header>

      {(confirmedIn.length > 0 || confirmedOut.length > 0) && (
        <TransfersSummaryBar summary={summary} />
      )}

      {!hasActivity ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No transfer activity</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              No confirmed deals or strong rumours for {teamName} right now. Check back during the transfer window for updates.
            </p>
            <Button variant="outline" asChild data-testid="button-see-all-transfers">
              <Link href="/transfers">
                See all transfer news
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {(rumours.length > 0 || apiRumours.length > 0) && (
            <section>
              <h3 className="text-lg font-bold mb-4">Rumours & Links</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {apiRumours.map((transfer) => (
                  <TransferCard key={transfer.id} transfer={transfer} />
                ))}
                {rumours.map((rumour) => (
                  <RumourCard key={rumour.id} rumour={rumour} teamName={teamName} />
                ))}
              </div>
            </section>
          )}

          {(confirmedIn.length > 0 || confirmedOut.length > 0) && (
            <section>
              <h3 className="text-lg font-bold mb-4">Confirmed Deals</h3>
              
              {confirmedIn.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-green-600">In</Badge>
                    <span className="text-sm text-muted-foreground">({confirmedIn.length})</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {confirmedIn.map((transfer) => (
                      <TransferCard key={transfer.id} transfer={transfer} />
                    ))}
                  </div>
                </div>
              )}
              
              {confirmedOut.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-red-600">Out</Badge>
                    <span className="text-sm text-muted-foreground">({confirmedOut.length})</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {confirmedOut.map((transfer) => (
                      <TransferCard key={transfer.id} transfer={transfer} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function MatchesTabContent({ 
  nextMatch, 
  recentResults,
  teamName
}: { 
  nextMatch?: Match & { homeTeam?: Team; awayTeam?: Team };
  recentResults?: (Match & { homeTeam?: Team; awayTeam?: Team })[];
  teamName: string;
}) {
  if (!nextMatch && (!recentResults || recentResults.length === 0)) {
    return (
      <EmptyState
        icon={Calendar}
        title="No fixtures available"
        description={`Match fixtures for ${teamName} will appear here when scheduled.`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {nextMatch && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Next Match</h2>
          <MatchCard match={nextMatch} />
        </section>
      )}
      
      {recentResults && recentResults.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent Results</h2>
          <div className="space-y-3">
            {recentResults.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const NEWSLETTER_NAMES: Record<string, string> = {
  "arsenal": "Gunners Mad",
  "tottenham": "Spurs Mad",
  "chelsea": "Blues Mad",
  "liverpool": "Reds Mad",
  "manchester-city": "City Mad",
  "manchester-united": "Red Devils Mad",
  "newcastle": "Magpies Mad",
  "aston-villa": "Villa Mad",
  "brighton": "Seagulls Mad",
  "brentford": "Bees Mad",
  "crystal-palace": "Eagles Mad",
  "everton": "Toffees Mad",
  "fulham": "Fulham Mad",
  "nottingham-forest": "Forest Mad",
  "wolves": "Wolves Mad",
  "west-ham": "Hammers Mad",
  "bournemouth": "Cherries Mad",
  "leicester-city": "Foxes Mad",
  "ipswich-town": "Ipswich Mad",
  "southampton": "Saints Mad",
};

function getNewsletterName(teamSlug: string, teamName: string): string {
  return NEWSLETTER_NAMES[teamSlug] || `${teamName} Mad`;
}

function FansTabContent({ 
  posts, 
  teamName,
  isAuthenticated
}: { 
  posts?: (Post & { team?: Team })[];
  teamName: string;
  isAuthenticated: boolean;
}) {
  if (!posts || posts.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No fan posts yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Be the first to share your thoughts about {teamName}!
            </p>
            {isAuthenticated ? (
              <Button data-testid="button-create-post">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            ) : (
              <Button variant="outline" asChild data-testid="button-login-to-post">
                <a href="/api/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign in to post
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAuthenticated && (
        <div className="flex justify-end mb-4">
          <Button data-testid="button-create-post">
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </div>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function TeamRightRail({ 
  team, 
  articles,
  isAuthenticated,
  isFollowing,
  onFollowToggle,
  isPending
}: { 
  team: Team;
  articles: Article[];
  isAuthenticated: boolean;
  isFollowing: boolean;
  onFollowToggle: () => void;
  isPending: boolean;
}) {
  const relatedArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => {
        if (a.isBreaking && !b.isBreaking) return -1;
        if (!a.isBreaking && b.isBreaking) return 1;
        if (a.isTrending && !b.isTrending) return -1;
        if (!a.isTrending && b.isTrending) return 1;
        return (b.viewCount ?? 0) - (a.viewCount ?? 0);
      })
      .slice(0, 4);
  }, [articles]);

  const newsletterName = getNewsletterName(team.slug, team.name);

  return (
    <div className="lg:sticky lg:top-32 space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            Follow {team.name}
          </CardTitle>
          <CardDescription className="text-sm">
            {isAuthenticated 
              ? (isFollowing 
                  ? "You're following this team. We'll personalise your feed." 
                  : "Follow to get personalised news in your feed.")
              : "Sign in to follow teams and personalise your experience."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAuthenticated ? (
            <Button
              className="w-full"
              variant={isFollowing ? "outline" : "default"}
              onClick={onFollowToggle}
              disabled={isPending}
              data-testid="rail-button-follow"
            >
              {isFollowing ? (
                <>
                  <HeartOff className="h-4 w-4 mr-2" />
                  Following
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-2" />
                  Follow
                </>
              )}
            </Button>
          ) : (
            <Button className="w-full" variant="outline" asChild data-testid="rail-button-login">
              <a href="/api/login">
                <LogIn className="h-4 w-4 mr-2" />
                Sign in to follow
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            {newsletterName}
          </CardTitle>
          <CardDescription className="text-sm">
            Get {team.name} news straight to your inbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewsletterForm edition={team.slug} compact />
        </CardContent>
      </Card>

      {relatedArticles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">More from {team.name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3">
              {relatedArticles.map((article, idx) => (
                <li key={article.id}>
                  <Link href={`/article/${article.slug}`}>
                    <div className="group flex items-start gap-2 hover-elevate rounded-md p-2 -mx-2 cursor-pointer">
                      <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {article.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {article.isBreaking && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Breaking</Badge>
                          )}
                          {article.isTrending && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Trending</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                  {idx < relatedArticles.length - 1 && <Separator className="mt-3" />}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function parseTabFromPath(pathname: string): { slug: string; tab: TabValue } {
  const parts = pathname.split("/").filter(Boolean);
  const slug = parts[1] || "";
  const tabSegment = parts[2];
  
  if (!tabSegment || tabSegment === "latest") {
    return { slug, tab: "latest" };
  }
  
  if (VALID_TABS.includes(tabSegment as TabValue)) {
    return { slug, tab: tabSegment as TabValue };
  }
  
  return { slug, tab: "latest" };
}

export default function TeamHubPage() {
  const [pathname, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { slug, tab: activeTab } = parseTabFromPath(pathname);

  useEffect(() => {
    if (pathname.endsWith("/latest")) {
      navigate(`/teams/${slug}`, { replace: true });
    }
  }, [pathname, slug, navigate]);

  const { data: team, isLoading: teamLoading } = useQuery<Team>({
    queryKey: ["/api/teams", slug],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch team");
      return res.json();
    },
  });

  const { data: newsData, isLoading: newsLoading } = useQuery<NewsFiltersResponse>({
    queryKey: ["/api/news", "team", slug],
    queryFn: async () => {
      const res = await fetch(`/api/news?teams=${slug}`);
      if (!res.ok) throw new Error("Failed to fetch team news");
      return res.json();
    },
    enabled: !!team,
  });

  const { data: matches } = useQuery<(Match & { homeTeam?: Team; awayTeam?: Team })[]>({
    queryKey: ["/api/matches", "team", slug],
    queryFn: async () => {
      const res = await fetch(`/api/matches/team/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    },
    enabled: !!team,
  });

  const { data: transfers } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers", "team", slug],
    queryFn: async () => {
      const res = await fetch(`/api/transfers/team/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch transfers");
      return res.json();
    },
    enabled: !!team,
  });

  const { data: injuries, isLoading: injuriesLoading } = useQuery<Injury[]>({
    queryKey: ["/api/injuries", "team", slug],
    queryFn: async () => {
      const res = await fetch(`/api/injuries/team/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch injuries");
      return res.json();
    },
    enabled: !!team,
  });

  const { data: posts } = useQuery<(Post & { team?: Team })[]>({
    queryKey: ["/api/posts", "team", slug],
    queryFn: async () => {
      const res = await fetch(`/api/posts/team/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
    enabled: !!team,
  });

  const { data: followedTeamIds } = useQuery<string[]>({
    queryKey: ["/api/follows"],
    queryFn: async () => {
      const res = await fetch("/api/follows");
      if (!res.ok) throw new Error("Failed to fetch follows");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const isFollowing = team && followedTeamIds?.includes(team.id);

  const followMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/follows", { teamId: team?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follows"] });
      toast({ title: `Now following ${team?.name}!` });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/follows/${team?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follows"] });
      toast({ title: `Unfollowed ${team?.name}` });
    },
  });

  const handleFollowToggle = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow teams. Redirecting...",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1500);
      return;
    }
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const handleTabChange = (tab: TabValue) => {
    if (tab === activeTab) return;
    trackTabClick(slug, tab);
    const newPath = tab === "latest" ? `/teams/${slug}` : `/teams/${slug}/${tab}`;
    navigate(newPath, { replace: false });
  };

  const now = new Date();
  const sortedMatches = matches?.sort((a, b) => 
    new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
  );
  const nextMatch = sortedMatches?.find((m) => new Date(m.kickoffTime) > now);
  const recentResults = sortedMatches?.filter((m) => 
    new Date(m.kickoffTime) <= now && m.status === "finished"
  ).slice(-5).reverse();

  const articles = newsData?.articles || [];

  const injuryRelatedArticles = useMemo(() => {
    const injuryKeywords = ["injury", "injured", "injur", "fitness", "recovery", "return", "sidelined", "setback", "hamstring", "acl", "knee", "ankle", "muscle", "surgery"];
    return articles.filter(article => {
      const title = article.title.toLowerCase();
      const excerpt = (article.excerpt || "").toLowerCase();
      const tags = (article.tags || []).map(t => t.toLowerCase());
      return injuryKeywords.some(keyword => 
        title.includes(keyword) || 
        excerpt.includes(keyword) || 
        tags.some(tag => tag.includes(keyword))
      );
    }).slice(0, 6);
  }, [articles]);

  const tabTitle = TAB_META[activeTab].title;
  const pageTitle = useMemo(() => {
    if (!team) return "Team | Football Mad";
    if (activeTab === "injuries") {
      return `${team.name} Injuries | Football Mad`;
    }
    return `${team.name} ${tabTitle} | Football Mad`;
  }, [team, activeTab, tabTitle]);
  
  const pageDescription = useMemo(() => {
    if (!team) return "Team hub page on Football Mad";
    if (activeTab === "injuries") {
      return `Latest ${team.name} injury news and squad availability updates — return dates, status and confidence.`;
    }
    return `${tabTitle} for ${team.name}. Stay updated with the latest ${tabTitle.toLowerCase()} from your favourite Premier League club.`;
  }, [team, activeTab, tabTitle]);
  const canonicalPath = `/teams/${slug}${activeTab !== "latest" ? `/${activeTab}` : ""}`;

  useDocumentMeta(pageTitle, pageDescription, canonicalPath);

  if (teamLoading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-48 w-full rounded-lg mb-8" />
          <Skeleton className="h-10 w-full max-w-md mb-6" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!team) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Team not found</h1>
          <p className="text-muted-foreground mb-6">
            The team you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/teams">
            <Button data-testid="link-back-to-teams">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teams
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div
        className="relative py-12 md:py-16"
        style={{
          background: `linear-gradient(135deg, ${team.primaryColor ?? "#1a1a2e"}ee, ${team.primaryColor ?? "#1a1a2e"}99)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div
              className="w-20 h-20 md:w-28 md:h-28 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ backgroundColor: team.secondaryColor ?? "#ffffff" }}
            >
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} className="w-16 h-16 md:w-20 md:h-20 object-contain" />
              ) : (
                <span className="text-3xl md:text-4xl font-bold" style={{ color: team.primaryColor ?? "#1a1a2e" }}>
                  {team.shortName?.[0] || team.name[0]}
                </span>
              )}
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
                {team.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-white/80 text-sm">
                {team.stadiumName && <span>{team.stadiumName}</span>}
                {team.manager && <span>Manager: {team.manager}</span>}
                {team.founded && <span>Est. {team.founded}</span>}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                variant={isFollowing ? "secondary" : "default"}
                onClick={handleFollowToggle}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                className="bg-white text-black shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200"
                data-testid="button-follow-team"
              >
                {isFollowing ? (
                  <>
                    <HeartOff className="h-5 w-5 mr-2" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <Heart className="h-5 w-5 mr-2" />
                    Follow
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 border-white/30 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:bg-white/20 active:translate-y-0 active:shadow-md transition-all duration-200"
                data-testid="button-subscribe-newsletter"
              >
                <Mail className="h-5 w-5 mr-2" />
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-4 bg-gradient-to-b from-muted/50 to-background" aria-hidden="true" />

      <div 
        className="sticky top-16 z-40 bg-background border-b shadow-sm"
        style={{ "--team-color": team.primaryColor ?? "#1a1a2e" } as React.CSSProperties}
      >
        <div className="max-w-7xl mx-auto px-4">
          <nav className="overflow-x-auto scrollbar-hide">
            <div className="inline-flex w-max gap-2 py-3">
              {VALID_TABS.map((tab) => {
                const { icon: TabIcon, label } = TAB_META[tab];
                const isActive = tab === activeTab;
                return (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`team-tab flex items-center rounded-full px-4 py-2 border transition-all duration-200 ${
                      isActive 
                        ? "text-white shadow-md" 
                        : "border-transparent hover:bg-muted"
                    }`}
                    style={isActive ? { 
                      backgroundColor: team.primaryColor ?? "#1a1a2e",
                      borderColor: team.primaryColor ?? "#1a1a2e"
                    } : undefined}
                    data-testid={`tab-${tab}`}
                    data-state={isActive ? "active" : "inactive"}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <TabIcon className="h-4 w-4 mr-2" />
                    {label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      <div 
        className="max-w-7xl mx-auto px-4 py-6"
        style={{ "--team-color": team.primaryColor ?? "#1a1a2e" } as React.CSSProperties}
      >
        <div className="flex flex-col lg:flex-row gap-8">
          <main className="flex-1 min-w-0">
            {activeTab === "latest" && (
              <LatestTabContent 
                articles={articles} 
                isLoading={newsLoading} 
                teamName={team.name}
                teamColor={team.primaryColor ?? undefined}
              />
            )}

            {activeTab === "injuries" && (
              <InjuriesTabContent 
                teamSlug={slug}
                teamName={team.name}
                relatedArticles={injuryRelatedArticles}
              />
            )}

            {activeTab === "transfers" && (
              <TransfersTabContent 
                transfers={transfers} 
                teamName={team.name}
                teamId={team.id}
                teamSlug={team.slug}
              />
            )}

            {activeTab === "matches" && (
              <MatchesTabContent 
                nextMatch={nextMatch}
                recentResults={recentResults}
                teamName={team.name}
              />
            )}

            {activeTab === "fans" && (
              <FansTabContent 
                posts={posts}
                teamName={team.name}
                isAuthenticated={isAuthenticated}
              />
            )}
          </main>

          <aside className="w-full lg:w-80 shrink-0 space-y-6">
            <TeamRightRail 
              team={team}
              articles={articles}
              isAuthenticated={isAuthenticated}
              isFollowing={isFollowing ?? false}
              onFollowToggle={handleFollowToggle}
              isPending={followMutation.isPending || unfollowMutation.isPending}
            />
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
