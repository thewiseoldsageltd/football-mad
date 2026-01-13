import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Heart, HeartOff, Calendar, Newspaper, Activity, TrendingUp, Users, ArrowLeft, ArrowRight, Mail, Inbox, Bell, MessageSquarePlus, LogIn, ChevronRight, ChevronLeft, Ban } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type Classification = "MEDICAL" | "SUSPENSION" | "LOAN_OR_TRANSFER";
type AvailabilityBucket = "RETURNING_SOON" | "COIN_FLIP" | "DOUBTFUL" | "OUT" | "SUSPENDED" | "LEFT_CLUB";
type RingColor = "green" | "amber" | "orange" | "red" | "gray";

function getTeamInitial(team?: { shortName?: string | null; name?: string | null }): string {
  const s = (team?.shortName || team?.name || "").trim();
  return s.length > 0 ? s[0].toUpperCase() : "?";
}

interface FplAvailabilityWithRag extends FplPlayerAvailability {
  classification: Classification;
  bucket: AvailabilityBucket;
  ringColor: RingColor;
  displayPercent: string;
  effectiveChance: number | null;
}

interface NewsFiltersResponse {
  articles: Article[];
  appliedFilters: Record<string, unknown>;
}

const VALID_TABS = ["latest", "injuries", "discipline", "transfers", "matches", "fans"] as const;
type TabValue = typeof VALID_TABS[number];

const TAB_META: Record<TabValue, { icon: typeof Newspaper; label: string; title: string }> = {
  latest: { icon: Newspaper, label: "Latest", title: "News" },
  injuries: { icon: Activity, label: "Injuries", title: "Treatment Room" },
  discipline: { icon: Ban, label: "Discipline", title: "Discipline" },
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

const RING_COLORS: Record<RingColor, { bg: string; border: string }> = {
  amber: { bg: "bg-amber-500/10", border: "border-amber-500" },
  orange: { bg: "bg-orange-500/10", border: "border-orange-500" },
  red: { bg: "bg-red-500/10", border: "border-red-500" },
  gray: { bg: "bg-gray-500/10", border: "border-gray-500" },
  green: { bg: "bg-green-500/10", border: "border-green-500" },
};

const BUCKET_TO_RING_COLOR: Record<MedicalBucket, RingColor> = {
  RETURNING_SOON: "amber",
  COIN_FLIP: "orange",
  DOUBTFUL: "red",
  OUT: "red",
};

const BUCKET_BADGE_STYLES: Record<MedicalBucket, string> = {
  RETURNING_SOON: "bg-amber-500 hover:bg-amber-600 text-white",
  COIN_FLIP: "bg-orange-500 hover:bg-orange-600 text-white",
  DOUBTFUL: "bg-red-600 hover:bg-red-700 text-white",
  OUT: "bg-red-600 hover:bg-red-700 text-white",
};

const BUCKET_LABELS: Record<MedicalBucket, string> = {
  RETURNING_SOON: "75%",
  COIN_FLIP: "50%",
  DOUBTFUL: "25%",
  OUT: "0%",
};

type MedicalBucket = "RETURNING_SOON" | "COIN_FLIP" | "DOUBTFUL" | "OUT";
type MedicalTabKey = "OVERVIEW" | MedicalBucket;

const MEDICAL_TAB_OPTIONS: { key: MedicalTabKey; label: string }[] = [
  { key: "OVERVIEW", label: "Overview" },
  { key: "RETURNING_SOON", label: "Returning soon" },
  { key: "COIN_FLIP", label: "Coin flip" },
  { key: "DOUBTFUL", label: "Doubtful" },
  { key: "OUT", label: "Out" },
];

const MEDICAL_SECTION_ORDER: MedicalBucket[] = [
  "RETURNING_SOON",
  "COIN_FLIP", 
  "DOUBTFUL",
  "OUT",
];

const MEDICAL_SECTION_LABELS: Record<MedicalBucket, string> = {
  RETURNING_SOON: "Returning soon (75%)",
  COIN_FLIP: "Coin flip (50%)",
  DOUBTFUL: "Doubtful (25%)",
  OUT: "Out (0%)",
};

function PlayerAvatar({ 
  playerName, 
  photoUrl,
  ringColor 
}: { 
  playerName: string; 
  photoUrl?: string | null;
  ringColor: RingColor;
}) {
  const style = RING_COLORS[ringColor] || RING_COLORS.gray;
  const initials = playerName
    .split(" ")
    .filter(n => n.length > 0)
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  if (photoUrl) {
    return (
      <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${style.border} flex-shrink-0`}>
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
      className={`w-12 h-12 rounded-full ${style.bg} border-2 ${style.border} flex items-center justify-center flex-shrink-0`}
    >
      <span className="text-sm font-medium text-muted-foreground">{initials}</span>
    </div>
  );
}

function getStatusLabel(player: FplAvailabilityWithRag): string | null {
  if (player.classification === "SUSPENSION") return "Suspended";
  if (player.classification === "LOAN_OR_TRANSFER") return "Loan/Transfer";
  return null;
}

function formatAvailabilityTextV2(player: FplAvailabilityWithRag): string {
  const cleanNews = player.news?.replace(/\s*-\s*\d+%\s*chance\s*(of\s*playing)?/gi, "").trim() || "";
  
  if (player.classification === "SUSPENSION") {
    return cleanNews || "Suspended";
  }
  
  if (player.classification === "LOAN_OR_TRANSFER") {
    return cleanNews || "Left club";
  }
  
  if (player.effectiveChance === null) {
    return cleanNews ? `${cleanNews} — Chance unknown` : "Chance unknown";
  }
  
  if (player.effectiveChance === 0) {
    return cleanNews || "0% chance of playing";
  }
  
  return cleanNews ? `${cleanNews} — ${player.effectiveChance}% chance` : `${player.effectiveChance}% chance of playing`;
}

function FplAvailabilityCard({ player }: { player: FplAvailabilityWithRag }) {
  const newsAdded = player.newsAdded ? new Date(player.newsAdded) : null;
  const availabilityText = formatAvailabilityTextV2(player);
  const statusLabel = getStatusLabel(player);
  const bucket = player.bucket as MedicalBucket | undefined;
  const isMedical = player.classification === "MEDICAL";
  const isValidMedicalBucket = isMedical && bucket && (bucket === "RETURNING_SOON" || bucket === "COIN_FLIP" || bucket === "DOUBTFUL" || bucket === "OUT");
  const badgeStyle = isValidMedicalBucket ? BUCKET_BADGE_STYLES[bucket] : null;
  const chanceLabel = isValidMedicalBucket ? BUCKET_LABELS[bucket] : null;
  
  return (
    <Card className="hover-elevate" data-testid={`card-availability-${player.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <PlayerAvatar 
            playerName={player.playerName} 
            photoUrl={null}
            ringColor={player.ringColor}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold truncate">{player.playerName}</h3>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {player.position}
              </Badge>
              {isValidMedicalBucket && badgeStyle && chanceLabel && (
                <Badge 
                  className={`text-xs flex-shrink-0 ${badgeStyle}`}
                >
                  {chanceLabel}
                </Badge>
              )}
              {statusLabel && (
                <Badge 
                  variant="outline" 
                  className={`text-xs flex-shrink-0 ${
                    player.classification === "SUSPENSION" 
                      ? "border-red-500 text-red-600" 
                      : "border-gray-400 text-gray-500"
                  }`}
                >
                  {statusLabel}
                </Badge>
              )}
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
  const [activeTab, setActiveTab] = useState<MedicalTabKey>("OVERVIEW");
  
  const { data: availability, isLoading } = useQuery<FplAvailabilityWithRag[]>({
    queryKey: ["/api/teams", teamSlug, "availability"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamSlug}/availability?sort=recent`);
      if (!res.ok) throw new Error("Failed to fetch availability");
      return res.json();
    },
  });

  const sortByRecent = (players: FplAvailabilityWithRag[]) => {
    return [...players].sort((a, b) => {
      const aDate = a.newsAdded ? new Date(a.newsAdded).getTime() : 0;
      const bDate = b.newsAdded ? new Date(b.newsAdded).getTime() : 0;
      return bDate - aDate;
    });
  };

  const { bucketCounts, groupedPlayers, medicalTotal, lastUpdated } = useMemo(() => {
    const counts: Record<MedicalBucket, number> = {
      RETURNING_SOON: 0,
      COIN_FLIP: 0,
      DOUBTFUL: 0,
      OUT: 0,
    };
    const grouped: Record<MedicalBucket, FplAvailabilityWithRag[]> = {
      RETURNING_SOON: [],
      COIN_FLIP: [],
      DOUBTFUL: [],
      OUT: [],
    };
    
    if (!availability) {
      return { bucketCounts: counts, groupedPlayers: grouped, medicalTotal: 0, lastUpdated: null };
    }
    
    const medicalPlayers = availability.filter(p => 
      p.classification === "MEDICAL" && 
      (p.bucket === "RETURNING_SOON" || p.bucket === "COIN_FLIP" || p.bucket === "DOUBTFUL" || p.bucket === "OUT")
    );
    
    medicalPlayers.forEach(p => {
      const bucket = p.bucket as MedicalBucket;
      counts[bucket]++;
      grouped[bucket].push(p);
    });
    
    Object.keys(grouped).forEach(key => {
      grouped[key as MedicalBucket] = sortByRecent(grouped[key as MedicalBucket]);
    });
    
    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
    
    const mostRecent = medicalPlayers.reduce((latest, p) => {
      if (p.newsAdded) {
        const date = new Date(p.newsAdded);
        return date > latest ? date : latest;
      }
      return latest;
    }, new Date(0));
    
    return {
      bucketCounts: counts,
      groupedPlayers: grouped,
      medicalTotal: total,
      lastUpdated: mostRecent.getTime() > 0 ? mostRecent : null,
    };
  }, [availability]);

  const getTabCount = (tabKey: MedicalTabKey): number => {
    if (tabKey === "OVERVIEW") return medicalTotal;
    return bucketCounts[tabKey as MedicalBucket] || 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-64" />
          <div className="flex gap-2 mt-3 flex-wrap">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
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

  const renderOverviewSection = (bucket: MedicalBucket) => {
    const players = groupedPlayers[bucket];
    if (players.length === 0) return null;
    
    return (
      <section key={bucket} className="space-y-3">
        <h3 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
          {MEDICAL_SECTION_LABELS[bucket]}
          <Badge variant="secondary" className="text-xs">{players.length}</Badge>
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {players.map((player) => (
            <FplAvailabilityCard key={player.id} player={player} />
          ))}
        </div>
      </section>
    );
  };

  const renderSingleTabContent = (bucket: MedicalBucket) => {
    const players = groupedPlayers[bucket];
    if (players.length === 0) {
      return (
        <EmptyState
          icon={Activity}
          title={`No players in "${MEDICAL_TAB_OPTIONS.find(o => o.key === bucket)?.label}"`}
          description="No players currently match this status."
        />
      );
    }
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {players.map((player) => (
          <FplAvailabilityCard key={player.id} player={player} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Treatment Room</h2>
        <p className="text-sm text-muted-foreground mb-3">
          FPL-powered medical availability for {teamName}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {MEDICAL_TAB_OPTIONS.map((option) => {
            const count = getTabCount(option.key);
            return (
              <Button
                key={option.key}
                variant={activeTab === option.key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(option.key)}
                data-testid={`tab-${option.key.toLowerCase()}`}
                className="text-xs"
              >
                {option.label} ({count})
              </Button>
            );
          })}
        </div>

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

      {activeTab === "OVERVIEW" ? (
        medicalTotal === 0 ? (
          <EmptyState
            icon={Activity}
            title="No medical issues"
            description="All players appear fit and available."
          />
        ) : (
          <div className="space-y-6">
            {MEDICAL_SECTION_ORDER.map(bucket => renderOverviewSection(bucket))}
          </div>
        )
      ) : (
        renderSingleTabContent(activeTab as MedicalBucket)
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

function DisciplineTabContent({ 
  teamSlug,
  teamName,
}: { 
  teamSlug: string;
  teamName: string;
}) {
  const { data: availability, isLoading } = useQuery<FplAvailabilityWithRag[]>({
    queryKey: ["/api/teams", teamSlug, "availability"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamSlug}/availability?sort=recent`);
      if (!res.ok) throw new Error("Failed to fetch availability");
      return res.json();
    },
  });

  const suspendedPlayers = useMemo(() => {
    if (!availability) return [];
    return availability
      .filter(p => p.classification === "SUSPENSION" || p.bucket === "SUSPENDED")
      .sort((a, b) => {
        const aDate = a.newsAdded ? new Date(a.newsAdded).getTime() : 0;
        const bDate = b.newsAdded ? new Date(b.newsAdded).getTime() : 0;
        return bDate - aDate;
      });
  }, [availability]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
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
        <h2 className="text-xl font-semibold mb-1">Discipline</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Suspended players for {teamName}
        </p>
      </div>

      {suspendedPlayers.length === 0 ? (
        <EmptyState
          icon={Ban}
          title="No suspensions"
          description="No players are currently suspended."
        />
      ) : (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
            Suspended
            <Badge variant="secondary" className="text-xs">{suspendedPlayers.length}</Badge>
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {suspendedPlayers.map((player) => (
              <Card key={player.id} className="hover-elevate" data-testid={`card-suspended-${player.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <PlayerAvatar 
                      playerName={player.playerName} 
                      photoUrl={null}
                      ringColor="red"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{player.playerName}</h3>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {player.position}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="text-xs flex-shrink-0 border-red-500 text-red-600"
                        >
                          Suspended
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {player.news || "Serving suspension"}
                      </p>
                    </div>
                  </div>
                  {player.newsAdded && (
                    <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border/50">
                      Updated: {new Date(player.newsAdded).toLocaleDateString("en-GB", { 
                        day: "numeric", 
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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
  const parts = name.split(" ").filter(p => p.length > 0);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (name.slice(0, 2) || "??").toUpperCase();
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
  
  const { data: availability } = useQuery<FplAvailabilityWithRag[]>({
    queryKey: ["/api/teams", teamSlug, "availability"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamSlug}/availability?sort=recent`);
      if (!res.ok) throw new Error("Failed to fetch availability");
      return res.json();
    },
  });

  const loanedTransferredPlayers = useMemo(() => {
    if (!availability) return [];
    return availability
      .filter(p => p.classification === "LOAN_OR_TRANSFER" || p.bucket === "LEFT_CLUB")
      .sort((a, b) => {
        const aDate = a.newsAdded ? new Date(a.newsAdded).getTime() : 0;
        const bDate = b.newsAdded ? new Date(b.newsAdded).getTime() : 0;
        return bDate - aDate;
      });
  }, [availability]);
  
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

  const hasActivity = confirmedIn.length > 0 || confirmedOut.length > 0 || rumours.length > 0 || apiRumours.length > 0 || loanedTransferredPlayers.length > 0;
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

          {loanedTransferredPlayers.length > 0 && (
            <section>
              <h3 className="text-lg font-bold mb-4">Loaned / Transferred Out (FPL)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Players who have left on loan or transfer according to FPL data
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {loanedTransferredPlayers.map((player) => (
                  <Card key={player.id} className="hover-elevate" data-testid={`card-loaned-${player.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <PlayerAvatar 
                          playerName={player.playerName} 
                          photoUrl={null}
                          ringColor="gray"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold truncate">{player.playerName}</h3>
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              {player.position}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="text-xs flex-shrink-0 border-gray-400 text-gray-500"
                            >
                              Loaned/Transferred
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {player.news || "Left club"}
                          </p>
                        </div>
                      </div>
                      {player.newsAdded && (
                        <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border/50">
                          Updated: {new Date(player.newsAdded).toLocaleDateString("en-GB", { 
                            day: "numeric", 
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}


function formatMatchDate(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const options: Intl.DateTimeFormatOptions = { 
    weekday: "short", 
    day: "numeric", 
    month: "short" 
  };
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  
  return date.toLocaleDateString("en-GB", options);
}

function formatKickoffTime(dateStr: string | Date): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function getMatchResult(match: Match & { homeTeam?: Team; awayTeam?: Team }, teamId: string): "W" | "D" | "L" | null {
  if (match.homeScore === null || match.awayScore === null) return null;
  const isHome = match.homeTeamId === teamId;
  const teamScore = isHome ? match.homeScore : match.awayScore;
  const opponentScore = isHome ? match.awayScore : match.homeScore;
  if (teamScore > opponentScore) return "W";
  if (teamScore < opponentScore) return "L";
  return "D";
}

function ResultBadge({ result }: { result: "W" | "D" | "L" | null }) {
  if (!result) return null;
  const styles = {
    W: "bg-green-600 text-white",
    D: "bg-amber-500 text-white",
    L: "bg-red-600 text-white",
  };
  const labels = { W: "Win", D: "Draw", L: "Loss" };
  return (
    <Badge className={`${styles[result]} font-bold text-xs`}>
      {labels[result]}
    </Badge>
  );
}

function AvailabilitySummaryBadge({ teamSlug }: { teamSlug: string }) {
  const { data: fplData } = useQuery<FplPlayerAvailability[]>({
    queryKey: ["/api/fpl/availability", teamSlug],
  });
  
  if (!fplData || fplData.length === 0) return null;
  
  const outCount = fplData.filter(p => 
    p.fplStatus === "i" || p.fplStatus === "u" || (p.chanceNextRound !== null && p.chanceNextRound === 0)
  ).length;
  
  const doubtCount = fplData.filter(p => 
    p.fplStatus === "d" || (p.chanceNextRound !== null && p.chanceNextRound > 0 && p.chanceNextRound < 75)
  ).length;
  
  if (outCount === 0 && doubtCount === 0) {
    return (
      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
        <Activity className="h-3 w-3" />
        Full squad available
      </span>
    );
  }
  
  return (
    <span className="text-xs text-muted-foreground flex items-center gap-1">
      <Activity className="h-3 w-3" />
      {outCount > 0 && <span className="text-red-600 dark:text-red-400">{outCount} out</span>}
      {outCount > 0 && doubtCount > 0 && <span>•</span>}
      {doubtCount > 0 && <span className="text-amber-600 dark:text-amber-400">{doubtCount} doubt</span>}
    </span>
  );
}

// Dummy match data for full season simulation
interface DummyMatch {
  id: string;
  homeTeam: { name: string; shortName: string; slug: string; primaryColor: string };
  awayTeam: { name: string; shortName: string; slug: string; primaryColor: string };
  kickoffTime: Date;
  competition: string;
  competitionShort: string;
  matchweek?: number;
  round?: string;
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "finished" | "postponed" | "live";
  venue: string;
}

const PL_TEAMS = [
  { name: "Arsenal", shortName: "ARS", slug: "arsenal", primaryColor: "#EF0107" },
  { name: "Aston Villa", shortName: "AVL", slug: "aston-villa", primaryColor: "#670E36" },
  { name: "Bournemouth", shortName: "BOU", slug: "bournemouth", primaryColor: "#DA291C" },
  { name: "Brentford", shortName: "BRE", slug: "brentford", primaryColor: "#E30613" },
  { name: "Brighton", shortName: "BHA", slug: "brighton", primaryColor: "#0057B8" },
  { name: "Chelsea", shortName: "CHE", slug: "chelsea", primaryColor: "#034694" },
  { name: "Crystal Palace", shortName: "CRY", slug: "crystal-palace", primaryColor: "#1B458F" },
  { name: "Everton", shortName: "EVE", slug: "everton", primaryColor: "#003399" },
  { name: "Fulham", shortName: "FUL", slug: "fulham", primaryColor: "#000000" },
  { name: "Ipswich Town", shortName: "IPS", slug: "ipswich-town", primaryColor: "#0044AA" },
  { name: "Leicester City", shortName: "LEI", slug: "leicester-city", primaryColor: "#003090" },
  { name: "Liverpool", shortName: "LIV", slug: "liverpool", primaryColor: "#C8102E" },
  { name: "Manchester City", shortName: "MCI", slug: "manchester-city", primaryColor: "#6CABDD" },
  { name: "Manchester United", shortName: "MUN", slug: "manchester-united", primaryColor: "#DA291C" },
  { name: "Newcastle United", shortName: "NEW", slug: "newcastle", primaryColor: "#241F20" },
  { name: "Nottingham Forest", shortName: "NFO", slug: "nottingham-forest", primaryColor: "#E53233" },
  { name: "Southampton", shortName: "SOU", slug: "southampton", primaryColor: "#D71920" },
  { name: "Tottenham", shortName: "TOT", slug: "tottenham", primaryColor: "#132257" },
  { name: "West Ham", shortName: "WHU", slug: "west-ham", primaryColor: "#7A263A" },
  { name: "Wolves", shortName: "WOL", slug: "wolves", primaryColor: "#FDB913" },
];

const EURO_TEAMS = [
  { name: "Real Madrid", shortName: "RMA", slug: "real-madrid", primaryColor: "#FEBE10" },
  { name: "Barcelona", shortName: "BAR", slug: "barcelona", primaryColor: "#A50044" },
  { name: "Bayern Munich", shortName: "BAY", slug: "bayern-munich", primaryColor: "#DC052D" },
  { name: "Paris Saint-Germain", shortName: "PSG", slug: "psg", primaryColor: "#004170" },
  { name: "Inter Milan", shortName: "INT", slug: "inter-milan", primaryColor: "#010E80" },
  { name: "AC Milan", shortName: "ACM", slug: "ac-milan", primaryColor: "#FB090B" },
  { name: "Juventus", shortName: "JUV", slug: "juventus", primaryColor: "#000000" },
  { name: "Borussia Dortmund", shortName: "BVB", slug: "dortmund", primaryColor: "#FDE100" },
];

function generateDummyMatches(teamSlug: string): DummyMatch[] {
  const team = PL_TEAMS.find(t => t.slug === teamSlug) || PL_TEAMS[0];
  const opponents = PL_TEAMS.filter(t => t.slug !== teamSlug);
  const matches: DummyMatch[] = [];
  
  const seasonStart = new Date("2025-08-16");
  const now = new Date();
  
  // Generate 38 Premier League matchweeks
  opponents.forEach((opp, idx) => {
    const isHome = idx % 2 === 0;
    const matchweek = idx + 1;
    const matchDate = new Date(seasonStart);
    matchDate.setDate(matchDate.getDate() + (matchweek - 1) * 7);
    
    // Saturday 3pm or varied times
    const hours = [12, 15, 17, 20][idx % 4];
    matchDate.setHours(hours, idx % 2 === 0 ? 30 : 0, 0, 0);
    
    const isPast = matchDate < now;
    const homeTeam = isHome ? team : opp;
    const awayTeam = isHome ? opp : team;
    
    matches.push({
      id: `pl-mw${matchweek}-${team.slug}`,
      homeTeam,
      awayTeam,
      kickoffTime: matchDate,
      competition: "Premier League",
      competitionShort: "PL",
      matchweek,
      homeScore: isPast ? Math.floor(Math.random() * 4) : undefined,
      awayScore: isPast ? Math.floor(Math.random() * 3) : undefined,
      status: isPast ? "finished" : "scheduled",
      venue: isHome ? `${team.name} Stadium` : `${opp.name} Stadium`,
    });
  });
  
  // Return fixtures (add second half of season)
  const reverseFixtures = opponents.map((opp, idx) => {
    const isHome = idx % 2 !== 0; // Flip home/away
    const matchweek = 20 + idx;
    const matchDate = new Date(seasonStart);
    matchDate.setDate(matchDate.getDate() + (matchweek - 1) * 7);
    
    const hours = [12, 15, 17, 20][idx % 4];
    matchDate.setHours(hours, idx % 2 === 0 ? 30 : 0, 0, 0);
    
    const isPast = matchDate < now;
    const homeTeam = isHome ? team : opp;
    const awayTeam = isHome ? opp : team;
    
    return {
      id: `pl-mw${matchweek}-${team.slug}`,
      homeTeam,
      awayTeam,
      kickoffTime: matchDate,
      competition: "Premier League",
      competitionShort: "PL",
      matchweek,
      homeScore: isPast ? Math.floor(Math.random() * 4) : undefined,
      awayScore: isPast ? Math.floor(Math.random() * 3) : undefined,
      status: isPast ? "finished" as const : "scheduled" as const,
      venue: isHome ? `${team.name} Stadium` : `${opp.name} Stadium`,
    };
  });
  
  matches.push(...reverseFixtures);
  
  // Add FA Cup matches
  const faCupRounds = [
    { round: "Third Round", date: new Date("2026-01-10"), opponent: opponents[5] },
    { round: "Fourth Round", date: new Date("2026-01-31"), opponent: opponents[8] },
    { round: "Fifth Round", date: new Date("2026-02-14"), opponent: opponents[12] },
    { round: "Quarter-Final", date: new Date("2026-03-07"), opponent: opponents[3] },
    { round: "Semi-Final", date: new Date("2026-04-18"), opponent: opponents[1] },
    { round: "Final", date: new Date("2026-05-23"), opponent: opponents[11] },
  ];
  
  faCupRounds.forEach((cup, idx) => {
    const isHome = idx % 2 === 0;
    const isPast = cup.date < now;
    
    matches.push({
      id: `fa-${cup.round.toLowerCase().replace(/\s+/g, "-")}-${team.slug}`,
      homeTeam: isHome ? team : cup.opponent,
      awayTeam: isHome ? cup.opponent : team,
      kickoffTime: cup.date,
      competition: "FA Cup",
      competitionShort: "FAC",
      round: cup.round,
      homeScore: isPast ? Math.floor(Math.random() * 3) + 1 : undefined,
      awayScore: isPast ? Math.floor(Math.random() * 2) : undefined,
      status: isPast ? "finished" : "scheduled",
      venue: cup.round === "Final" ? "Wembley Stadium" : (isHome ? `${team.name} Stadium` : `${cup.opponent.name} Stadium`),
    });
  });
  
  // Add EFL Cup matches
  const eflCupRounds = [
    { round: "Third Round", date: new Date("2025-09-24"), opponent: opponents[14] },
    { round: "Fourth Round", date: new Date("2025-10-29"), opponent: opponents[9] },
    { round: "Quarter-Final", date: new Date("2025-12-17"), opponent: opponents[6] },
    { round: "Semi-Final 1st Leg", date: new Date("2026-01-07"), opponent: opponents[2] },
    { round: "Semi-Final 2nd Leg", date: new Date("2026-01-28"), opponent: opponents[2] },
    { round: "Final", date: new Date("2026-02-22"), opponent: opponents[0] },
  ];
  
  eflCupRounds.forEach((cup, idx) => {
    const isHome = idx % 2 === 0 || cup.round.includes("2nd Leg");
    const isPast = cup.date < now;
    
    matches.push({
      id: `efl-${cup.round.toLowerCase().replace(/\s+/g, "-")}-${team.slug}`,
      homeTeam: isHome ? team : cup.opponent,
      awayTeam: isHome ? cup.opponent : team,
      kickoffTime: cup.date,
      competition: "EFL Cup",
      competitionShort: "EFL",
      round: cup.round,
      homeScore: isPast ? Math.floor(Math.random() * 3) + 1 : undefined,
      awayScore: isPast ? Math.floor(Math.random() * 2) : undefined,
      status: isPast ? "finished" : "scheduled",
      venue: cup.round === "Final" ? "Wembley Stadium" : (isHome ? `${team.name} Stadium` : `${cup.opponent.name} Stadium`),
    });
  });
  
  // Add Champions League matches (for top teams)
  const topTeamSlugs = ["arsenal", "chelsea", "liverpool", "manchester-city", "manchester-united", "tottenham", "aston-villa", "newcastle"];
  if (topTeamSlugs.includes(teamSlug)) {
    const clGroupMatches = [
      { matchday: 1, date: new Date("2025-09-17"), opponent: EURO_TEAMS[0], isHome: true },
      { matchday: 2, date: new Date("2025-10-01"), opponent: EURO_TEAMS[1], isHome: false },
      { matchday: 3, date: new Date("2025-10-22"), opponent: EURO_TEAMS[2], isHome: true },
      { matchday: 4, date: new Date("2025-11-05"), opponent: EURO_TEAMS[3], isHome: false },
      { matchday: 5, date: new Date("2025-11-26"), opponent: EURO_TEAMS[4], isHome: true },
      { matchday: 6, date: new Date("2025-12-10"), opponent: EURO_TEAMS[5], isHome: false },
      { matchday: 7, date: new Date("2026-01-21"), opponent: EURO_TEAMS[6], isHome: true },
      { matchday: 8, date: new Date("2026-01-29"), opponent: EURO_TEAMS[7], isHome: false },
    ];
    
    clGroupMatches.forEach((cl) => {
      const isPast = cl.date < now;
      
      matches.push({
        id: `ucl-md${cl.matchday}-${team.slug}`,
        homeTeam: cl.isHome ? team : cl.opponent,
        awayTeam: cl.isHome ? cl.opponent : team,
        kickoffTime: cl.date,
        competition: "Champions League",
        competitionShort: "UCL",
        round: `Matchday ${cl.matchday}`,
        homeScore: isPast ? Math.floor(Math.random() * 4) : undefined,
        awayScore: isPast ? Math.floor(Math.random() * 3) : undefined,
        status: isPast ? "finished" : "scheduled",
        venue: cl.isHome ? `${team.name} Stadium` : `${cl.opponent.name} Stadium`,
      });
    });
    
    // Add knockout rounds
    const clKnockouts = [
      { round: "Round of 16 - 1st Leg", date: new Date("2026-02-18"), opponent: EURO_TEAMS[2], isHome: false },
      { round: "Round of 16 - 2nd Leg", date: new Date("2026-03-11"), opponent: EURO_TEAMS[2], isHome: true },
      { round: "Quarter-Final - 1st Leg", date: new Date("2026-04-08"), opponent: EURO_TEAMS[0], isHome: true },
      { round: "Quarter-Final - 2nd Leg", date: new Date("2026-04-15"), opponent: EURO_TEAMS[0], isHome: false },
    ];
    
    clKnockouts.forEach((ko) => {
      const isPast = ko.date < now;
      
      matches.push({
        id: `ucl-${ko.round.toLowerCase().replace(/\s+/g, "-")}-${team.slug}`,
        homeTeam: ko.isHome ? team : ko.opponent,
        awayTeam: ko.isHome ? ko.opponent : team,
        kickoffTime: ko.date,
        competition: "Champions League",
        competitionShort: "UCL",
        round: ko.round,
        homeScore: isPast ? Math.floor(Math.random() * 3) + 1 : undefined,
        awayScore: isPast ? Math.floor(Math.random() * 2) : undefined,
        status: isPast ? "finished" : "scheduled",
        venue: ko.isHome ? `${team.name} Stadium` : `${ko.opponent.name} Stadium`,
      });
    });
  }
  
  return matches.sort((a, b) => a.kickoffTime.getTime() - b.kickoffTime.getTime());
}

// Competition badge colors
const COMPETITION_COLORS: Record<string, { bg: string; text: string }> = {
  "Premier League": { bg: "bg-purple-600", text: "text-white" },
  "FA Cup": { bg: "bg-red-600", text: "text-white" },
  "EFL Cup": { bg: "bg-green-600", text: "text-white" },
  "Champions League": { bg: "bg-blue-700", text: "text-white" },
};

function CompetitionBadge({ competition }: { competition: string }) {
  const colors = COMPETITION_COLORS[competition] || { bg: "bg-gray-600", text: "text-white" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${colors.bg} ${colors.text}`}>
      {competition}
    </span>
  );
}

function TeamCrest({ team, size = "sm" }: { team: { name: string; shortName: string; primaryColor: string }; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold shrink-0`}
      style={{ backgroundColor: team.primaryColor, color: "#fff" }}
      title={team.name}
    >
      {team.shortName.slice(0, 2)}
    </div>
  );
}

function formatDateInline(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function formatDayAbbrev(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short" });
}

function formatDayMonth(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatKickoffTimeShort(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function CompetitionLogo({ competition, size = 16 }: { competition: string; size?: number }) {
  const logos: Record<string, JSX.Element> = {
    "Premier League": (
      <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0">
        <circle cx="12" cy="12" r="11" fill="#3D195B" />
        <path d="M12 4c-1.5 0-2.8.8-3.5 2l3.5 6 3.5-6c-.7-1.2-2-2-3.5-2z" fill="#00FF85" />
        <path d="M8.5 6L5 12l3.5 6c.7 1.2 2 2 3.5 2s2.8-.8 3.5-2l3.5-6-3.5-6" fill="none" stroke="#fff" strokeWidth="1" />
      </svg>
    ),
    "Champions League": (
      <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0">
        <circle cx="12" cy="12" r="11" fill="#1A237E" />
        <path d="M12 3l2.5 5.5L20 9.5l-4 4.5 1.5 5.5-5.5-3.5-5.5 3.5 1.5-5.5-4-4.5 5.5-1L12 3z" fill="#fff" />
      </svg>
    ),
    "FA Cup": (
      <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0">
        <circle cx="12" cy="12" r="11" fill="#E30613" />
        <path d="M7 8h10v2c0 3-2 5-5 6-3-1-5-3-5-6V8z" fill="#fff" />
        <rect x="10" y="14" width="4" height="4" fill="#fff" />
        <rect x="8" y="18" width="8" height="2" fill="#FFD700" />
      </svg>
    ),
    "EFL Cup": (
      <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0">
        <circle cx="12" cy="12" r="11" fill="#00A651" />
        <path d="M8 7h8v3c0 2.5-1.5 4.5-4 5.5-2.5-1-4-3-4-5.5V7z" fill="#fff" />
        <rect x="10" y="13" width="4" height="3" fill="#fff" />
        <rect x="9" y="16" width="6" height="2" fill="#C0C0C0" />
      </svg>
    ),
  };
  
  return logos[competition] || (
    <div 
      className="rounded-full bg-muted flex items-center justify-center shrink-0" 
      style={{ width: size, height: size }}
    >
      <span className="text-[8px] font-bold text-muted-foreground">
        {competition.charAt(0)}
      </span>
    </div>
  );
}

function MatchRow({ 
  match, 
  teamSlug
}: { 
  match: DummyMatch; 
  teamSlug: string;
}) {
  const isFinished = match.status === "finished";
  const isPostponed = match.status === "postponed";
  
  return (
    <Link 
      href={`/matches/${match.id}`}
      className="block"
      data-testid={`match-row-${match.id}`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-3 hover-elevate rounded-md border border-border/50 bg-card/50">
        {/* Date - stacked on mobile, inline on desktop */}
        <div className="w-10 sm:w-[76px] shrink-0">
          {/* Mobile: stacked */}
          <div className="flex flex-col items-center sm:hidden">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase leading-tight">
              {formatDayAbbrev(match.kickoffTime)}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              {formatDayMonth(match.kickoffTime)}
            </span>
          </div>
          {/* Desktop: inline */}
          <span className="hidden sm:block text-xs text-muted-foreground font-medium">
            {formatDateInline(match.kickoffTime)}
          </span>
        </div>
        
        {/* Home team - name + crest, right-aligned */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0 justify-end">
          <span className={`text-[12px] sm:text-sm leading-tight text-right truncate ${
            match.homeTeam.slug === teamSlug ? "font-bold" : "font-medium"
          }`}>
            {match.homeTeam.name}
          </span>
          <TeamCrest team={match.homeTeam} size="sm" />
        </div>
        
        {/* Center: Time or Score - fixed width for perfect centering */}
        <div className="w-11 sm:w-[52px] flex items-center justify-center shrink-0">
          {isFinished ? (
            <div className="flex items-center justify-center">
              <span className={`text-[13px] sm:text-sm font-bold tabular-nums ${
                match.homeTeam.slug === teamSlug && (match.homeScore ?? 0) > (match.awayScore ?? 0) 
                  ? "text-green-600 dark:text-green-400" 
                  : ""
              }`}>
                {match.homeScore}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground mx-0.5">-</span>
              <span className={`text-[13px] sm:text-sm font-bold tabular-nums ${
                match.awayTeam.slug === teamSlug && (match.awayScore ?? 0) > (match.homeScore ?? 0) 
                  ? "text-green-600 dark:text-green-400" 
                  : ""
              }`}>
                {match.awayScore}
              </span>
            </div>
          ) : isPostponed ? (
            <span className="text-[10px] sm:text-[11px] font-semibold text-amber-600 dark:text-amber-400">TBC</span>
          ) : (
            <span className="text-[11px] sm:text-[12px] font-semibold text-muted-foreground tabular-nums">
              {formatKickoffTimeShort(match.kickoffTime)}
            </span>
          )}
        </div>
        
        {/* Away team - crest + name, left-aligned */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
          <TeamCrest team={match.awayTeam} size="sm" />
          <span className={`text-[12px] sm:text-sm leading-tight truncate ${
            match.awayTeam.slug === teamSlug ? "font-bold" : "font-medium"
          }`}>
            {match.awayTeam.name}
          </span>
        </div>
        
        {/* Competition logo */}
        <div className="shrink-0">
          <CompetitionLogo competition={match.competition} size={18} />
        </div>
        
        {/* Arrow - desktop only */}
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
      </div>
    </Link>
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function MonthSelector({ 
  currentMonth, 
  currentYear,
  availableMonths,
  onMonthChange
}: { 
  currentMonth: number; 
  currentYear: number;
  availableMonths: { month: number; year: number }[];
  onMonthChange: (month: number, year: number) => void;
}) {
  const currentIndex = availableMonths.findIndex(m => m.month === currentMonth && m.year === currentYear);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < availableMonths.length - 1;
  
  const goToPrev = () => {
    if (canGoPrev) {
      const prev = availableMonths[currentIndex - 1];
      onMonthChange(prev.month, prev.year);
    }
  };
  
  const goToNext = () => {
    if (canGoNext) {
      const next = availableMonths[currentIndex + 1];
      onMonthChange(next.month, next.year);
    }
  };
  
  return (
    <div className="flex items-center justify-between gap-2 py-3 px-3 bg-muted/30 rounded-lg">
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPrev}
        disabled={!canGoPrev}
        data-testid="btn-prev-month"
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-2">
        <Select 
          value={`${currentMonth}-${currentYear}`}
          onValueChange={(v: string) => {
            const [m, y] = v.split("-").map(Number);
            onMonthChange(m, y);
          }}
        >
          <SelectTrigger className="w-36 h-8" data-testid="select-month">
            <SelectValue>{MONTH_NAMES[currentMonth]} {currentYear}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map(({ month, year }) => (
              <SelectItem key={`${month}-${year}`} value={`${month}-${year}`}>
                {MONTH_NAMES[month]} {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={goToNext}
        disabled={!canGoNext}
        data-testid="btn-next-month"
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function MatchesTabContent({ 
  teamName,
  teamSlug
}: { 
  nextMatch?: Match & { homeTeam?: Team; awayTeam?: Team };
  recentResults?: (Match & { homeTeam?: Team; awayTeam?: Team })[];
  upcomingFixtures?: (Match & { homeTeam?: Team; awayTeam?: Team })[];
  teamName: string;
  teamId: string;
  teamSlug: string;
}) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [competitionFilter, setCompetitionFilter] = useState<string>("all");
  
  const allMatches = useMemo(() => generateDummyMatches(teamSlug), [teamSlug]);
  
  // Get available months from all matches
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    allMatches.forEach(m => {
      const key = `${m.kickoffTime.getMonth()}-${m.kickoffTime.getFullYear()}`;
      monthSet.add(key);
    });
    return Array.from(monthSet)
      .map(key => {
        const [month, year] = key.split("-").map(Number);
        return { month, year };
      })
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  }, [allMatches]);
  
  // Filter matches by selected month and competition
  const filteredMatches = useMemo(() => {
    let matches = allMatches.filter(m => 
      m.kickoffTime.getMonth() === selectedMonth && 
      m.kickoffTime.getFullYear() === selectedYear
    );
    
    if (competitionFilter !== "all") {
      if (competitionFilter === "cups") {
        matches = matches.filter(m => m.competition !== "Premier League");
      } else {
        matches = matches.filter(m => m.competition === competitionFilter);
      }
    }
    
    return matches.sort((a, b) => a.kickoffTime.getTime() - b.kickoffTime.getTime());
  }, [allMatches, selectedMonth, selectedYear, competitionFilter]);
  
  
  // Default to current month on mount
  useEffect(() => {
    const hasCurrentMonth = availableMonths.some(
      m => m.month === now.getMonth() && m.year === now.getFullYear()
    );
    if (!hasCurrentMonth && availableMonths.length > 0) {
      // Find closest month to current date
      const closest = availableMonths.reduce((prev, curr) => {
        const prevDiff = Math.abs(new Date(prev.year, prev.month).getTime() - now.getTime());
        const currDiff = Math.abs(new Date(curr.year, curr.month).getTime() - now.getTime());
        return currDiff < prevDiff ? curr : prev;
      });
      setSelectedMonth(closest.month);
      setSelectedYear(closest.year);
    }
  }, [availableMonths, now]);
  
  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };
  
  const competitions = ["all", "Premier League", "Champions League", "FA Cup", "EFL Cup", "cups"];
  
  // Stats for current month
  const monthStats = useMemo(() => {
    const completed = filteredMatches.filter(m => m.status === "finished").length;
    const upcoming = filteredMatches.filter(m => m.status === "scheduled" || m.status === "postponed").length;
    return { completed, upcoming, total: filteredMatches.length };
  }, [filteredMatches]);
  
  return (
    <div className="space-y-4">
      {/* Month selector */}
      <MonthSelector
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        availableMonths={availableMonths}
        onMonthChange={handleMonthChange}
      />
      
      {/* Competition filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {competitions.map((comp) => (
          <Button
            key={comp}
            variant={competitionFilter === comp ? "default" : "outline"}
            size="sm"
            onClick={() => setCompetitionFilter(comp)}
            className="shrink-0"
            data-testid={`filter-${comp.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {comp === "all" ? "All" : comp === "cups" ? "Cups" : comp}
          </Button>
        ))}
      </div>
      
      {/* Month summary */}
      <div className="flex gap-4 text-xs text-muted-foreground px-1">
        <span>{monthStats.total} match{monthStats.total !== 1 ? "es" : ""}</span>
        {monthStats.completed > 0 && <span>{monthStats.completed} played</span>}
        {monthStats.upcoming > 0 && <span>{monthStats.upcoming} upcoming</span>}
      </div>
      
      {/* Matches list - chronological */}
      {filteredMatches.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No matches in {MONTH_NAMES[selectedMonth]} {selectedYear}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredMatches.map((match) => (
            <MatchRow key={match.id} match={match} teamSlug={teamSlug} />
          ))}
        </div>
      )}
      
      {/* Season summary */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-600" />
            <span>PL: {allMatches.filter(m => m.competition === "Premier League").length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-700" />
            <span>UCL: {allMatches.filter(m => m.competition === "Champions League").length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600" />
            <span>FA Cup: {allMatches.filter(m => m.competition === "FA Cup").length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600" />
            <span>EFL Cup: {allMatches.filter(m => m.competition === "EFL Cup").length}</span>
          </div>
        </div>
      </div>
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
  const upcomingFixtures = sortedMatches?.filter((m) => 
    new Date(m.kickoffTime) > now || m.status === "postponed"
  );
  const nextMatch = upcomingFixtures?.[0];
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
                  {getTeamInitial(team)}
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

            {activeTab === "discipline" && (
              <DisciplineTabContent 
                teamSlug={slug}
                teamName={team.name}
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
                upcomingFixtures={upcomingFixtures?.slice(1)}
                teamName={team.name}
                teamId={team.id}
                teamSlug={team.slug}
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
