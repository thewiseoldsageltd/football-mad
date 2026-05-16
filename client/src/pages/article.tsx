import { useEffect, useState, useMemo, useCallback } from "react";
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
import { PillsRow } from "@/components/pills-row";
import { ArticleMetaBar } from "@/components/article-meta-bar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { newsArticle, authorProfile } from "@/lib/urls";
import { absoluteSeoUrl } from "@/lib/seo";
import {
  articleCanonicalShareUrl,
  buildFacebookShareUrl,
  buildWhatsAppShareUrl,
  buildXShareUrl,
} from "@/lib/share-urls";
import { effectiveAuthorProfileSlug } from "@shared/author-slug";
import { formatAuthorForUi } from "@shared/author-display";
import { buildPillsForFooter, buildPillsForHeader, type PillSourceArticle } from "@/lib/entity-utils";
import type { Article, Team, Player, Manager, Competition } from "@shared/schema";

interface EntityWithProvenance {
  id: string;
  name: string;
  slug: string;
  source: string;
  salienceScore: number;
}

interface ArticleWithEntities extends Article {
  entityTeams?: (Pick<Team, "id" | "name" | "slug" | "shortName" | "primaryColor" | "logoUrl"> & { source: string; salienceScore: number })[];
  entityPlayers?: (Pick<Player, "id" | "name" | "slug"> & { source: string; salienceScore: number })[];
  entityManagers?: (Pick<Manager, "id" | "name" | "slug"> & { source: string; salienceScore: number })[];
  entityCompetitions?: (Pick<Competition, "id" | "name" | "slug"> & { source: string; salienceScore: number })[];
}


const SHOW_PILLS = true;

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

function prepareArticleHtmlForRender(rawHtml: string): string {
  if (typeof window === "undefined" || !rawHtml) return rawHtml;
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");
  const stripStyleDeclarations = (style: string, properties: string[]): string => {
    if (!style) return "";
    const propertySet = new Set(properties.map((p) => p.toLowerCase()));
    return style
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((decl) => {
        const [prop] = decl.split(":");
        return !propertySet.has((prop || "").trim().toLowerCase());
      })
      .join("; ");
  };

  // 1) Remove empty structural blocks that can create large vertical gaps.
  const isMeaningfullyEmpty = (el: Element): boolean => {
    const text = (el.textContent || "").replace(/\u00a0/g, " ").trim();
    if (text.length > 0) return false;
    return !el.querySelector("img,video,iframe,blockquote.twitter-tweet,blockquote.instagram-media,blockquote.tiktok-embed,embed,object");
  };
  const emptySelectors = "p,div,figure,section";
  doc.querySelectorAll(emptySelectors).forEach((el) => {
    if (isMeaningfullyEmpty(el)) el.remove();
  });

  // 2) Ensure inline images are always responsive.
  doc.querySelectorAll("img").forEach((img) => {
    img.removeAttribute("width");
    img.removeAttribute("height");
    const existingStyle = img.getAttribute("style") || "";
    const sanitized = stripStyleDeclarations(existingStyle, ["width", "max-width", "height", "float", "margin-left", "margin-right"]);
    const append = "width:100%;max-width:100%;height:auto;display:block;";
    img.setAttribute("style", `${sanitized}${sanitized.endsWith(";") || sanitized.length === 0 ? "" : ";"}${append}`);
  });
  doc.querySelectorAll("figure").forEach((figure) => {
    const existingStyle = figure.getAttribute("style") || "";
    const sanitized = stripStyleDeclarations(existingStyle, ["width", "max-width", "float", "margin-left", "margin-right"]);
    const append = "width:100%;max-width:100%;margin:1.5rem 0;";
    figure.setAttribute("style", `${sanitized}${sanitized.endsWith(";") || sanitized.length === 0 ? "" : ";"}${append}`);
  });

  // 3) Remove empty embeds/iframes containers that reserve space.
  doc.querySelectorAll("iframe").forEach((iframe) => {
    const src = (iframe.getAttribute("src") || "").trim();
    if (!src) iframe.remove();
  });
  doc.querySelectorAll("figure").forEach((figure) => {
    if (!figure.querySelector("img,video,iframe,blockquote")) {
      figure.remove();
    }
  });

  // 4) Convert plain X/Twitter status links into blockquote embeds.
  const twitterStatusRe = /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^/]+\/status\/\d+/i;
  doc.querySelectorAll("p").forEach((p) => {
    const text = (p.textContent || "").trim();
    const links = Array.from(p.querySelectorAll("a"));
    if (links.length === 0 && twitterStatusRe.test(text)) {
      const blockquote = doc.createElement("blockquote");
      blockquote.className = "twitter-tweet";
      const a = doc.createElement("a");
      a.href = text;
      a.textContent = text;
      blockquote.appendChild(a);
      p.replaceWith(blockquote);
      return;
    }
    if (links.length !== 1) return;
    const href = links[0].getAttribute("href") || "";
    if (!twitterStatusRe.test(href)) return;
    if (text !== href && text !== links[0].textContent?.trim()) return;

    const blockquote = doc.createElement("blockquote");
    blockquote.className = "twitter-tweet";
    const a = doc.createElement("a");
    a.href = href;
    a.textContent = href;
    blockquote.appendChild(a);
    p.replaceWith(blockquote);
  });

  return doc.body.innerHTML;
}

function useArticleSEO(article: Article | undefined, canonicalSlug: string, authorSlug: string | null) {
  const [articleUrl, setArticleUrl] = useState("");

  useEffect(() => {
    setArticleUrl(articleCanonicalShareUrl(canonicalSlug));
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
    setMeta("property", "og:locale", "en_GB");
    const imageUrl = absoluteSeoUrl(article.coverImage || "/assets/football-mad-fm-logo.webp");
    setMeta("property", "og:image", imageUrl);
    setMeta("property", "og:image:alt", article.title);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:site", "@FootballMadUK");
    setMeta("name", "twitter:title", article.title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", imageUrl);
    setMeta("name", "twitter:image:alt", article.title);

    let jsonLd = document.getElementById("article-jsonld") as HTMLScriptElement | null;
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.id = "article-jsonld";
      jsonLd.type = "application/ld+json";
      document.head.appendChild(jsonLd);
      createdElements.push(jsonLd);
    }
    
    const baseUrl = articleUrl.replace(newsArticle(canonicalSlug), "");
    const authorPageUrl =
      authorSlug && baseUrl ? `${baseUrl.replace(/\/$/, "")}${authorProfile(authorSlug)}` : undefined;
    const rawAuthor = (article.authorName ?? "").trim();
    const isSiteAuthor = !rawAuthor || /^football\s*mad$/i.test(rawAuthor);
    const authorBlock: Record<string, unknown> = {
      "@type": "Person",
      name: rawAuthor || "Football Mad",
    };
    if (!isSiteAuthor) {
      authorBlock.worksFor = { "@type": "Organization", name: "Press Association" };
    }
    if (authorPageUrl) {
      authorBlock.url = authorPageUrl;
    }
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      description: description,
      image: article.coverImage || undefined,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt || article.publishedAt,
      author: authorBlock,
      publisher: {
        "@type": "Organization",
        name: "Football Mad",
        logo: baseUrl ? {
          "@type": "ImageObject",
          url: absoluteSeoUrl("/assets/football-mad-fm-logo.webp"),
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
  }, [article, articleUrl, canonicalSlug, authorSlug]);

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
        onClick={() => window.open(buildWhatsAppShareUrl(title, url), "_blank")}
        data-testid="button-share-whatsapp"
      >
        <SiWhatsapp className="h-4 w-4 text-[#25D366]" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(buildXShareUrl(title, url), "_blank")}
        data-testid="button-share-x"
      >
        <SiX className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(buildFacebookShareUrl(url), "_blank")}
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
  articleTeams,
  relatedArticles,
  articleUrl,
  followedTeamIds,
  onFollow,
  isFollowing,
  isAuthenticated,
}: {
  article: Article;
  articleTeams: Team[];
  relatedArticles: Article[];
  articleUrl: string;
  followedTeamIds: string[];
  onFollow: (teamId: string) => void;
  isFollowing: boolean;
  isAuthenticated: boolean;
}) {
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
  articleTeams,
  articleUrl,
  followedTeamIds,
  onFollow,
  isFollowing,
  isAuthenticated,
}: {
  article: Article;
  articleTeams: Team[];
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

  const { data: article, isLoading, isPending: articlePending } = useQuery<ArticleWithEntities>({
    queryKey: ["/api/articles", slug],
  });

  const { data: relatedArticles = [] } = useQuery<Article[]>({
    queryKey: ["/api/articles/related", slug],
    queryFn: async () => {
      if (!slug) return [];
      const res = await fetch(`/api/articles/related/${encodeURIComponent(slug)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: Boolean(slug && article?.id),
  });

  const { data: popularArticles = [] } = useQuery<Article[]>({
    queryKey: ["/api/articles/popular", "6"],
    queryFn: async () => {
      const res = await fetch("/api/articles/popular?limit=6");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: Boolean(slug) && !articlePending && !article,
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

  const authorSlug = useMemo(() => {
    const s = effectiveAuthorProfileSlug(article ?? {});
    return s || null;
  }, [article?.authorName, article?.authorProfileSlug]);

  const authorDisplay = useMemo(
    () => formatAuthorForUi(article?.authorName || "Football Mad") || "Football Mad",
    [article?.authorName],
  );

  const articleUrl = useArticleSEO(article, slug || "", authorSlug);
  const processedContent = useMemo(
    () => (article?.content ? prepareArticleHtmlForRender(article.content) : ""),
    [article?.content],
  );

  useEffect(() => {
    if (!processedContent || typeof window === "undefined") return;
    const hasTwitterEmbeds = processedContent.includes("twitter-tweet");
    if (!hasTwitterEmbeds) return;

    const w = window as Window & { twttr?: { widgets?: { load: (el?: Element | Document) => void } } };
    const loadWidgets = () => w.twttr?.widgets?.load(document.body);

    if (w.twttr?.widgets?.load) {
      loadWidgets();
      return;
    }

    const existing = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
    if (existing) return;
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = loadWidgets;
    document.body.appendChild(script);
  }, [processedContent]);

  // Display-only pills in hierarchy order: competition -> teams -> players -> managers
  const { headerPills, footerPills, articleTeams } = useMemo(() => {
    const empty = { headerPills: [], footerPills: [], articleTeams: [] as Team[] };
    if (!article) return empty;
    const derivedTeams =
      article.entityTeams?.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        shortName: t.shortName ?? null,
        primaryColor: t.primaryColor ?? null,
        logoUrl: t.logoUrl ?? null,
      } as Team)) ?? [];

    return {
      headerPills: buildPillsForHeader(article as PillSourceArticle, derivedTeams),
      footerPills: buildPillsForFooter(article as PillSourceArticle, derivedTeams),
      articleTeams: derivedTeams,
    };
  }, [article]);

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
              {SHOW_PILLS && headerPills.length > 0 && (
                <PillsRow pills={headerPills} max={4} className="mb-4" constrainHeight={false} />
              )}

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">
                {article.title}
              </h1>

              <div className="border-t my-4" />

              <ArticleMetaBar
                articleId={article.id}
                articleSlug={article.slug}
                authorName={authorDisplay}
                authorProfileHref={authorSlug ? authorProfile(authorSlug) : undefined}
                authorInitial={authorDisplay[0]}
                publishedLabel={formatDistanceToNow(publishedAt, { addSuffix: true })}
                readTimeLabel={`${readingTime} min read`}
                viewCount={article.viewCount ?? undefined}
                shareUrl={articleUrl}
                shareTitle={article.title}
              />
            </header>

            {article.coverImage ? (
              <figure className="my-8 relative aspect-video w-full overflow-hidden rounded-lg bg-black/5">
                <img
                  src={article.coverImage}
                  alt={article.title}
                  className="h-full w-full object-cover object-[center_top]"
                />
              </figure>
            ) : (
              <div className="my-8 aspect-[16/9] w-full rounded-lg bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                <span className="text-8xl font-bold text-primary/30">F</span>
              </div>
            )}

            {showExcerpt && (
              <>
                <p className="text-lg md:text-xl text-muted-foreground/90 italic leading-relaxed mb-6 border-l-4 border-muted pl-4">
                  {article.excerpt}
                </p>
                <div className="border-t mb-8" />
              </>
            )}

            <div
              className="article-body-content prose prose-lg dark:prose-invert max-w-none mb-12 prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 [&_img]:block [&_img]:w-full [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_figure]:w-full [&_figure]:max-w-full [&_figure]:mx-0 [&_figure]:my-6 [&_figure_img]:w-full [&_figure_img]:max-w-full [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground [&_figcaption]:mt-2 [&_figcaption]:mb-6 [&_iframe]:block [&_iframe]:mx-auto [&_iframe]:max-w-full [&_blockquote]:block [&_blockquote]:mx-auto [&_blockquote]:max-w-full [&_.twitter-tweet]:my-6 [&_.twitter-tweet]:mx-auto [&_.instagram-media]:mx-auto [&_.instagram-media]:max-w-full"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />

            {SHOW_PILLS && footerPills.length > 0 && (
              <section className="mb-8 py-6 border-t" data-testid="in-this-article-section">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">In this article</h3>
                <PillsRow pills={footerPills} max={footerPills.length} constrainHeight={false} />
              </section>
            )}

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
            articleTeams={articleTeams}
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
        articleTeams={articleTeams}
        articleUrl={articleUrl}
        followedTeamIds={followedTeamIds}
        onFollow={(teamId) => followMutation.mutate(teamId)}
        isFollowing={followMutation.isPending}
        isAuthenticated={isAuthenticated}
      />
    </MainLayout>
  );
}
