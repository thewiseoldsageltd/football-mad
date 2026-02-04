import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Heart, Copy, Check, Share2, ChevronRight } from "lucide-react";
import { SiWhatsapp, SiX, SiFacebook } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { EntityPill, type EntityData } from "@/components/entity-pill";
import { ArticleMetaBar } from "@/components/article-meta-bar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { newsArticle } from "@/lib/urls";
import type { Article, Team, Player, Manager } from "@shared/schema";

// Extended article type with entity data from backend
interface ArticleWithEntities extends Article {
  entityTeams?: Pick<Team, "id" | "name" | "slug" | "shortName" | "primaryColor">[];
  entityPlayers?: Pick<Player, "id" | "name" | "slug">[];
  entityManagers?: Pick<Manager, "id" | "name" | "slug">[];
}

// Normalize text for comparison (lowercase, strip HTML, collapse whitespace)
function normalizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Check if excerpt duplicates the first paragraph of body
function isExcerptDuplicate(excerpt: string, body: string): boolean {
  const normExcerpt = normalizeText(excerpt).slice(0, 140);
  const normBody = normalizeText(body).slice(0, 140);
  if (!normExcerpt || !normBody) return false;
  return normBody.startsWith(normExcerpt) || normExcerpt.startsWith(normBody);
}

function calculateReadingTime(content: string): number {
  const text = content.replace(/<[^>]*>/g, "");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, "") + "...";
}

function slugifyCompetition(competition: string): string {
  return competition.toLowerCase().replace(/\s+/g, "-");
}

function useArticleSEO(article: Article | undefined, canonicalSlug: string) {
  const [articleUrl, setArticleUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setArticleUrl(`${window.location.origin}${newsArticle(canonicalSlug)}`);
    }
  }, [canonicalSlug]);

  useEffect(() => {
    if (!article || !articleUrl) return;

    const description = article.excerpt 
      ? truncateText(article.excerpt, 155)
      : truncateText(article.content.replace(/<[^>]*>/g, ""), 155);

    const previousTitle = document.title;
    document.title = `${article.title} | Football Mad`;

    const createdElements: HTMLElement[] = [];

    const setMeta = (attr: string, key: string, content: string) => {
      const id = `article-seo-${key.replace(/[:/]/g, "-")}`;
      let tag = document.getElementById(id) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.id = id;
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
        createdElements.push(tag);
      }
      tag.content = content;
    };

    let canonical = document.getElementById("article-canonical") as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.id = "article-canonical";
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
      createdElements.push(canonical);
    }
    canonical.href = articleUrl;

    setMeta("name", "description", description);
    setMeta("property", "og:title", article.title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", "article");
    setMeta("property", "og:url", articleUrl);
    setMeta("property", "og:site_name", "Football Mad");
    if (article.coverImage) {
      setMeta("property", "og:image", article.coverImage);
    }
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", article.title);
    setMeta("name", "twitter:description", description);
    if (article.coverImage) {
      setMeta("name", "twitter:image", article.coverImage);
    }

    let jsonLd = document.getElementById("article-jsonld") as HTMLScriptElement | null;
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.id = "article-jsonld";
      jsonLd.type = "application/ld+json";
      document.head.appendChild(jsonLd);
      createdElements.push(jsonLd);
    }
    
    const baseUrl = articleUrl.replace(newsArticle(canonicalSlug), "");
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      description: description,
      image: article.coverImage || undefined,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt || article.publishedAt,
      author: {
        "@type": "Person",
        name: article.authorName || "Football Mad",
      },
      publisher: {
        "@type": "Organization",
        name: "Football Mad",
        logo: baseUrl ? {
          "@type": "ImageObject",
          url: `${baseUrl}/favicon.ico`,
        } : undefined,
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": articleUrl,
      },
    });

    return () => {
      createdElements.forEach(el => el.remove());
      document.title = previousTitle;
    };
  }, [article, articleUrl, canonicalSlug]);

  return articleUrl;
}

function ShareButtonsInline({ 
  title, 
  url 
}: { 
  title: string; 
  url: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const encodedText = encodeURIComponent(`${title} - Football Mad`);
  const encodedUrl = encodeURIComponent(url);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ description: "Link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, "_blank")}
        data-testid="button-share-whatsapp"
      >
        <SiWhatsapp className="h-4 w-4 text-[#25D366]" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, "_blank")}
        data-testid="button-share-x"
      >
        <SiX className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank")}
        data-testid="button-share-facebook"
      >
        <SiFacebook className="h-4 w-4 text-[#1877F2]" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        data-testid="button-share-copy"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function RightRail({
  article,
  teams,
  relatedArticles,
  articleUrl,
  followedTeamIds,
  onFollow,
  isFollowing,
  isAuthenticated,
}: {
  article: Article;
  teams: Team[];
  relatedArticles: Article[];
  articleUrl: string;
  followedTeamIds: string[];
  onFollow: (teamId: string) => void;
  isFollowing: boolean;
  isAuthenticated: boolean;
}) {
  const articleTeams = teams.filter(t => article.tags?.includes(t.slug));
  const primaryTeam = articleTeams[0];
  const isFollowed = primaryTeam ? followedTeamIds.includes(primaryTeam.id) : false;

  return (
    <aside className="hidden lg:block w-80 flex-shrink-0">
      <div className="sticky top-24 space-y-4">
        {primaryTeam && !isFollowed && (
          <Card data-testid="card-follow-team">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: primaryTeam.primaryColor || "#333" }}
                >
                  <img 
                    src={`/crests/teams/${primaryTeam.slug}.svg`} 
                    alt={primaryTeam.name}
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                  <span className="text-white font-bold text-sm">
                    {primaryTeam.shortName?.[0] || primaryTeam.name[0]}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{primaryTeam.name}</p>
                  <p className="text-xs text-muted-foreground">Get team updates</p>
                </div>
              </div>
              <Button 
                className="w-full gap-2"
                onClick={() => onFollow(primaryTeam.id)}
                disabled={isFollowing || !isAuthenticated}
                data-testid="button-follow-team-rail"
              >
                <Heart className="h-4 w-4" />
                {isAuthenticated ? `Follow ${primaryTeam.shortName || primaryTeam.name}` : "Log in to follow"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-newsletter-rail">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Stay in the loop</h3>
            <p className="text-sm text-muted-foreground mb-3">Get breaking news delivered to your inbox.</p>
            <NewsletterForm compact />
          </CardContent>
        </Card>

        {relatedArticles.length > 0 && (
          <Card data-testid="card-more-like-this">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold">More like this</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {relatedArticles.slice(0, 3).map((a) => (
                  <Link key={a.id} href={newsArticle(a.slug)}>
                    <div className="group flex gap-3 hover-elevate rounded p-1 -m-1 cursor-pointer" data-testid={`link-related-${a.id}`}>
                      <div className="w-16 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                        {a.coverImage ? (
                          <img src={a.coverImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20">
                            <span className="text-lg font-bold text-primary/30">F</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {a.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(a.publishedAt || new Date()), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </aside>
  );
}

function MobileBottomBar({
  article,
  teams,
  articleUrl,
  followedTeamIds,
  onFollow,
  isFollowing,
  isAuthenticated,
}: {
  article: Article;
  teams: Team[];
  articleUrl: string;
  followedTeamIds: string[];
  onFollow: (teamId: string) => void;
  isFollowing: boolean;
  isAuthenticated: boolean;
}) {
  const { toast } = useToast();
  const [shareCopied, setShareCopied] = useState(false);
  const [copyCopied, setCopyCopied] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    setHasNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const articleTeams = teams.filter(t => article.tags?.includes(t.slug));
  const primaryTeam = articleTeams[0];
  const isFollowed = primaryTeam ? followedTeamIds.includes(primaryTeam.id) : false;

  const handleShare = async () => {
    if (hasNativeShare) {
      try {
        await navigator.share({ title: article.title, url: articleUrl });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(articleUrl);
    setShareCopied(true);
    toast({ description: "Link copied" });
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(articleUrl);
    setCopyCopied(true);
    toast({ description: "Link copied" });
    setTimeout(() => setCopyCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background border-t p-3 z-50">
      <div className="flex items-center justify-around gap-2 max-w-lg mx-auto">
        <Button
          variant="default"
          size="sm"
          className="gap-2 flex-1"
          onClick={handleShare}
          data-testid="button-mobile-share"
        >
          {shareCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          Share
        </Button>
        {primaryTeam && !isFollowed && isAuthenticated && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 flex-1"
            onClick={() => onFollow(primaryTeam.id)}
            disabled={isFollowing}
            data-testid="button-mobile-follow"
          >
            <Heart className="h-4 w-4" />
            Follow
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          data-testid="button-mobile-copy"
        >
          {copyCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function ArticleNotFound({ popularArticles }: { popularArticles: Article[] }) {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold mb-4">Article not found</h1>
          <p className="text-muted-foreground mb-6">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/news">
            <Button data-testid="button-back-news">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to News
            </Button>
          </Link>
        </div>
        {popularArticles.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-6">Popular Articles</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularArticles.slice(0, 6).map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}

function ArticleSkeleton() {
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          <div className="flex-1 max-w-3xl">
            <Skeleton className="h-6 w-24 mb-4" />
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-12 w-3/4 mb-6" />
            <Skeleton className="h-6 w-full mb-4" />
            <div className="flex gap-4 mb-6">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="aspect-[16/9] w-full mb-8 rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
          <div className="hidden lg:block w-80">
            <Skeleton className="h-40 w-full mb-4 rounded-lg" />
            <Skeleton className="h-32 w-full mb-4 rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}


export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: article, isLoading } = useQuery<ArticleWithEntities>({
    queryKey: ["/api/articles", slug],
  });

  const { data: allArticles = [] } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: managers = [] } = useQuery<Manager[]>({
    queryKey: ["/api/managers"],
  });

  const { data: followedTeamIdsRaw } = useQuery<string[] | null>({
    queryKey: ["/api/follows"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });
  
  const followedTeamIds = followedTeamIdsRaw ?? [];

  const followMutation = useMutation({
    mutationFn: async (teamId: string) => {
      return apiRequest("POST", "/api/follows", { teamId });
    },
    onSuccess: () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/follows"] });
      }
      toast({ description: "Team followed!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Please log in to follow teams", variant: "destructive" });
    },
  });

  const articleUrl = useArticleSEO(article, slug || "");

  const relatedArticles = useMemo(() => {
    if (!article || allArticles.length === 0) return [];
    
    const otherArticles = allArticles.filter(a => a.id !== article.id);
    const teamSlugs = teams.map(t => t.slug);
    
    const articleTeamSlugs = (article.tags || []).filter(t => teamSlugs.includes(t));
    
    const scored = otherArticles.map(a => {
      let score = 0;
      const aTeamSlugs = (a.tags || []).filter(t => teamSlugs.includes(t));
      const teamOverlap = articleTeamSlugs.filter(t => aTeamSlugs.includes(t)).length;
      score += teamOverlap * 10;
      if (a.category === article.category) score += 5;
      const tagOverlap = (article.tags || []).filter(t => (a.tags || []).includes(t)).length;
      score += tagOverlap * 2;
      if (a.isTrending) score += 3;
      if (a.isEditorPick) score += 2;
      return { article: a, score };
    });

    const sorted = scored.sort((a, b) => b.score - a.score);
    
    if (sorted.length >= 3) {
      return sorted.slice(0, 3).map(s => s.article);
    }
    
    const result = sorted.map(s => s.article);
    const trendingFallback = otherArticles
      .filter(a => !result.some(r => r.id === a.id))
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    
    while (result.length < 3 && trendingFallback.length > 0) {
      result.push(trendingFallback.shift()!);
    }
    
    return result.slice(0, 3);
  }, [article, allArticles, teams]);

  const popularArticles = useMemo(() => {
    return [...allArticles]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 6);
  }, [allArticles]);

  // Check if backend has any entity data (safe when article is undefined)
  const backendHasEntities = 
    (article?.entityTeams?.length || 0) +
    (article?.entityPlayers?.length || 0) +
    (article?.entityManagers?.length || 0) > 0;
  
  // Build entity pill arrays with fallback to tags when backend is empty
  // Must be called unconditionally (before early returns) per React hook rules
  const { articleTeams, competitionPills, playerPills, managerPills } = useMemo(() => {
    if (!article) {
      return { articleTeams: [], competitionPills: [], playerPills: [], managerPills: [] };
    }
    
    const tags = article.tags || [];
    
    // Helper to slugify a tag name for comparison
    const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    
    // Helper to normalize text (remove accents, lowercase)
    const normalize = (text: string) => 
      text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Build team list
    let resolvedTeams: typeof teams = [];
    if (backendHasEntities && article.entityTeams?.length) {
      resolvedTeams = article.entityTeams as typeof teams;
    } else {
      // Fallback: match tags against known teams (by name or slug)
      resolvedTeams = teams.filter(t => 
        tags.some(tag => 
          t.name.toLowerCase() === tag.toLowerCase() || 
          t.slug === slugify(tag)
        )
      );
    }
    
    // Build player pills
    let resolvedPlayerPills: EntityData[] = [];
    if (backendHasEntities && article.entityPlayers?.length) {
      resolvedPlayerPills = article.entityPlayers.map(p => ({
        type: "player" as const,
        name: p.name,
        slug: p.slug,
        href: `/news?player=${p.slug}`,
        fallbackText: p.name.slice(0, 2).toUpperCase(),
      }));
    } else {
      // Fallback: match tags against known players (by name, normalized)
      const matchedPlayers = players.filter(p =>
        tags.some(tag => normalize(p.name) === normalize(tag))
      );
      resolvedPlayerPills = matchedPlayers.map(p => ({
        type: "player" as const,
        name: p.name,
        slug: p.slug,
        href: `/news?player=${p.slug}`,
        fallbackText: p.name.slice(0, 2).toUpperCase(),
      }));
    }
    
    // Build manager pills
    let resolvedManagerPills: EntityData[] = [];
    if (backendHasEntities && article.entityManagers?.length) {
      resolvedManagerPills = article.entityManagers.map(m => ({
        type: "manager" as const,
        name: m.name,
        slug: m.slug,
        href: `/news?manager=${m.slug}`,
        fallbackText: m.name.slice(0, 2).toUpperCase(),
      }));
    } else {
      // Fallback: match tags against known managers (by name, normalized)
      const matchedManagers = managers.filter(m =>
        tags.some(tag => normalize(m.name) === normalize(tag))
      );
      resolvedManagerPills = matchedManagers.map(m => ({
        type: "manager" as const,
        name: m.name,
        slug: m.slug,
        href: `/news?manager=${m.slug}`,
        fallbackText: m.name.slice(0, 2).toUpperCase(),
      }));
    }
    
    // Build competition pills (always from article.competition + tag matches)
    const knownCompetitions = ["Premier League", "Carabao Cup", "FA Cup", "Champions League", "Europa League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"];
    const competitionSet = new Set<string>();
    
    if (article.competition) {
      competitionSet.add(article.competition);
    }
    
    // Add any competition-like tags
    tags.forEach(tag => {
      if (knownCompetitions.some(c => c.toLowerCase() === tag.toLowerCase())) {
        competitionSet.add(tag);
      }
    });
    
    const resolvedCompetitionPills: EntityData[] = Array.from(competitionSet).map(comp => ({
      type: "competition" as const,
      name: comp,
      slug: slugifyCompetition(comp),
      href: `/news?competition=${slugifyCompetition(comp)}`,
      iconUrl: `/crests/comps/${slugifyCompetition(comp)}.svg`,
      fallbackText: comp.slice(0, 2),
    }));
    
    return {
      articleTeams: resolvedTeams,
      competitionPills: resolvedCompetitionPills,
      playerPills: resolvedPlayerPills,
      managerPills: resolvedManagerPills,
    };
  }, [article, teams, players, managers, backendHasEntities]);

  // Early returns AFTER all hooks
  if (isLoading) {
    return <ArticleSkeleton />;
  }

  if (!article) {
    return <ArticleNotFound popularArticles={popularArticles} />;
  }

  const publishedAt = article.publishedAt ? new Date(article.publishedAt) : new Date();
  const readingTime = calculateReadingTime(article.content);
  
  // Check if excerpt should be shown (not empty and not duplicate of body start)
  const showExcerpt = article.excerpt?.trim() && !isExcerptDuplicate(article.excerpt, article.content);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          <article className="flex-1 min-w-0 max-w-3xl">
            <Link href="/news">
              <Button variant="ghost" size="sm" className="mb-6 -ml-2" data-testid="link-back-to-news">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to News
              </Button>
            </Link>

            <header className="mb-8">
              {(articleTeams.length > 0 || competitionPills.length > 0) && (
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  {competitionPills[0] && (
                    <EntityPill
                      entity={competitionPills[0]}
                      size="default"
                      data-testid="pill-competition"
                    />
                  )}
                  {articleTeams.slice(0, 2).map((team) => (
                    <EntityPill
                      key={team.id}
                      entity={{
                        type: "team",
                        name: team.name,
                        slug: team.slug,
                        href: `/teams/${team.slug}`,
                        iconUrl: `/crests/teams/${team.slug}.svg`,
                        fallbackText: (team.shortName || team.name).slice(0, 2),
                        color: team.primaryColor,
                      }}
                      size="default"
                      data-testid={`pill-team-${team.slug}`}
                    />
                  ))}
                </div>
              )}

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">
                {article.title}
              </h1>

              <div className="border-t my-4" />

              <ArticleMetaBar
                articleId={article.id}
                articleSlug={article.slug}
                authorName={article.authorName || "Football Mad"}
                authorInitial={article.authorName?.[0]}
                publishedLabel={formatDistanceToNow(publishedAt, { addSuffix: true })}
                readTimeLabel={`${readingTime} min read`}
                viewCount={article.viewCount ?? undefined}
                shareUrl={articleUrl}
                shareTitle={article.title}
              />
            </header>

            {article.coverImage ? (
              <figure className="my-8">
                <img
                  src={article.coverImage}
                  alt={article.title}
                  className="w-full rounded-lg"
                />
              </figure>
            ) : (
              <div className="my-8 aspect-[16/9] w-full rounded-lg bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                <span className="text-8xl font-bold text-primary/30">F</span>
              </div>
            )}

            {showExcerpt && (
              <>
                <p className="text-lg md:text-xl text-muted-foreground italic leading-relaxed mb-6">
                  {article.excerpt}
                </p>
                <div className="border-t mb-8" />
              </>
            )}

            <div
              className="prose prose-lg dark:prose-invert max-w-none mb-12 prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {(competitionPills.length > 0 || articleTeams.length > 0 || playerPills.length > 0 || managerPills.length > 0) && (
              <section className="mb-8 py-6 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">In this article</h3>
                <div className="space-y-4">
                  {competitionPills.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Competitions</p>
                      <div className="flex flex-wrap gap-2">
                        {competitionPills.map((pill) => (
                          <EntityPill
                            key={pill.slug}
                            entity={pill}
                            size="small"
                            data-testid={`pill-bottom-competition-${pill.slug}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {articleTeams.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Teams</p>
                      <div className="flex flex-wrap gap-2">
                        {articleTeams.map((team) => (
                          <EntityPill
                            key={team.id}
                            entity={{
                              type: "team",
                              name: team.name,
                              slug: team.slug,
                              href: `/teams/${team.slug}`,
                              iconUrl: `/crests/teams/${team.slug}.svg`,
                              fallbackText: (team.shortName || team.name).slice(0, 2),
                              color: team.primaryColor,
                            }}
                            size="small"
                            data-testid={`pill-bottom-team-${team.slug}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {playerPills.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Players</p>
                      <div className="flex flex-wrap gap-2">
                        {playerPills.map((player) => (
                          <EntityPill
                            key={player.slug}
                            entity={player}
                            size="small"
                            data-testid={`pill-bottom-player-${player.slug}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {managerPills.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Managers</p>
                      <div className="flex flex-wrap gap-2">
                        {managerPills.map((manager) => (
                          <EntityPill
                            key={manager.slug}
                            entity={manager}
                            size="small"
                            data-testid={`pill-bottom-manager-${manager.slug}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="mb-12 lg:hidden">
              <NewsletterForm />
            </section>

            {articleTeams.length > 0 && !followedTeamIds.includes(articleTeams[0].id) && isAuthenticated && (
              <section className="mb-12 lg:hidden">
                <Card className="bg-gradient-to-r from-primary/10 to-transparent">
                  <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: articleTeams[0].primaryColor || "#333" }}
                      >
                        <img 
                          src={`/crests/teams/${articleTeams[0].slug}.svg`}
                          alt={articleTeams[0].name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                        <span className="text-white font-bold">
                          {articleTeams[0].shortName?.[0] || articleTeams[0].name[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">Follow {articleTeams[0].name}</p>
                        <p className="text-sm text-muted-foreground">Get more updates</p>
                      </div>
                    </div>
                    <Button 
                      className="gap-2"
                      onClick={() => followMutation.mutate(articleTeams[0].id)}
                      disabled={followMutation.isPending}
                      data-testid="button-follow-team-inline"
                    >
                      <Heart className="h-4 w-4" />
                      Follow
                    </Button>
                  </CardContent>
                </Card>
              </section>
            )}

            {relatedArticles.length > 0 && (
              <section className="mb-24 lg:mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Related Articles</h2>
                  <Link href="/news">
                    <Button variant="ghost" size="sm" className="gap-1">
                      More News <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relatedArticles.map((related) => (
                    <ArticleCard key={related.id} article={related} />
                  ))}
                </div>
              </section>
            )}
          </article>

          <RightRail
            article={article}
            teams={teams}
            relatedArticles={relatedArticles}
            articleUrl={articleUrl}
            followedTeamIds={followedTeamIds}
            onFollow={(teamId) => followMutation.mutate(teamId)}
            isFollowing={followMutation.isPending}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>

      <MobileBottomBar
        article={article}
        teams={teams}
        articleUrl={articleUrl}
        followedTeamIds={followedTeamIds}
        onFollow={(teamId) => followMutation.mutate(teamId)}
        isFollowing={followMutation.isPending}
        isAuthenticated={isAuthenticated}
      />
    </MainLayout>
  );
}
