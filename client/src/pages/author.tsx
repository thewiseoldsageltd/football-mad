import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearch } from "wouter";
import { ArrowLeft, ChevronRight, Globe, PenLine } from "lucide-react";
import { FaLinkedin } from "react-icons/fa6";
import { SiX } from "react-icons/si";
import { format } from "date-fns";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PaDeskAuthorBadge } from "@/components/authors/pa-desk-author-badge";
import type { AuthorPageApiResponse } from "@shared/author-slug";
import { formatAuthorForUi } from "@shared/author-display";
import { isPaSportDeskAuthor } from "@shared/author-enrichment";
import type { Article } from "@shared/schema";
import { newsArticle } from "@/lib/urls";

function authorBio(displayName: string): string {
  const name = displayName.trim() || "This journalist";
  return `${name} covers football for Football Mad with syndicated reporting from PA Media — match news, injury updates, and the stories that matter to supporters.`;
}

function toArticleCardModel(row: AuthorPageApiResponse["articles"][number]): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    content: row.openingText ?? "",
    coverImage: row.coverImage,
    authorName: row.authorName,
    publishedAt: row.publishedAt ? new Date(row.publishedAt) : new Date(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
    sortAt: row.sortAt ? new Date(row.sortAt) : new Date(),
    viewCount: row.viewCount,
    tags: row.tags,
    competition: row.competition ?? "Premier League",
    contentType: row.contentType ?? "story",
    category: "news",
    isFeatured: false,
    isTrending: false,
    isBreaking: false,
    isEditorPick: false,
    commentsCount: 0,
    source: "pa_media",
    sourceId: null,
    sourceVersion: null,
    sourcePublishedAt: null,
    sourceUpdatedAt: null,
    heroImageCredit: null,
    authorId: null,
    entityEnrichStatus: "done",
    entityEnrichAttemptedAt: null,
    entityEnrichError: null,
    createdAt: new Date(),
  } as unknown as Article;
}

function authorRoleLine(data: AuthorPageApiResponse): string {
  if (data.showPaDeskAvatar) return "Syndicated desk · PA Media";
  return "Journalist · Football correspondent";
}

export default function AuthorPage() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const search = useSearch();
  const slug = useMemo(() => decodeURIComponent(rawSlug ?? "").trim().toLowerCase(), [rawSlug]);
  const cursor = useMemo(() => new URLSearchParams(search).get("cursor") ?? undefined, [search]);

  const { data, isLoading, isError } = useQuery<AuthorPageApiResponse>({
    queryKey: ["/api/authors", slug, cursor],
    queryFn: async () => {
      const q = new URLSearchParams({ limit: "20" });
      if (cursor) q.set("cursor", cursor);
      const res = await fetch(`/api/authors/${encodeURIComponent(slug)}?${q.toString()}`);
      if (!res.ok) throw new Error("Failed to load author");
      return res.json();
    },
    enabled: Boolean(slug),
  });

  useEffect(() => {
    if (!data?.found || !data.displayName) return;
    const titleName = formatAuthorForUi(data.displayName);
    document.title = `${titleName} | Authors | Football Mad`;
    const desc = `${data.displayName} — ${data.articleCount} articles on Football Mad.`;
    let m = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!m) {
      m = document.createElement("meta");
      m.name = "description";
      document.head.appendChild(m);
    }
    m.content = desc;
    return () => {
      document.title = "Football Mad";
    };
  }, [data?.found, data?.displayName, data?.articleCount]);

  useEffect(() => {
    if (!data?.found || typeof window === "undefined") return;
    const url = `${window.location.origin}/authors/${encodeURIComponent(slug)}`;
    const sameAs = [data.linkedInUrl, data.xUrl, data.websiteUrl].filter(
      (u): u is string => typeof u === "string" && u.trim().length > 0,
    );
    let script = document.getElementById("author-jsonld") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "author-jsonld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: data.displayName,
      url,
      jobTitle: data.showPaDeskAvatar ? "Sports desk" : "Journalist",
      worksFor: { "@type": "Organization", name: "Press Association" },
    };
    if (sameAs.length > 0) jsonLd.sameAs = sameAs;
    script.textContent = JSON.stringify(jsonLd);
    return () => {
      document.getElementById("author-jsonld")?.remove();
    };
  }, [data?.found, data?.displayName, data?.linkedInUrl, data?.xUrl, data?.websiteUrl, data?.showPaDeskAvatar, slug]);

  if (!slug) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Invalid author.</div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto px-4 py-10">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Skeleton className="h-28 w-28 shrink-0 rounded-2xl mx-auto sm:mx-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-10 w-3/4 max-w-md" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-20 w-full max-w-2xl" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isError || !data || !data.found) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Author not found</h1>
          <p className="text-muted-foreground mb-6">We couldn&apos;t find articles for this author profile.</p>
          <Link href="/news">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to News
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const first = data.firstPublishedAt ? format(new Date(data.firstPublishedAt), "d MMM yyyy") : "—";
  const authorHeading = formatAuthorForUi(data.displayName);
  const headshotUrl = data.headshotUrl?.trim() || null;
  const showPa = Boolean(data.showPaDeskAvatar) || isPaSportDeskAuthor(data.displayName);
  const showHeadshot = Boolean(headshotUrl) && !showPa;
  const linkedInUrl = data.linkedInUrl?.trim();
  const xUrl = data.xUrl?.trim();
  const websiteUrl = data.websiteUrl?.trim();
  const expertiseTags = data.expertiseTags ?? [];
  const latest = data.latestArticle;

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <Link href="/news">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            News
          </Button>
        </Link>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
          <div className="flex-1 min-w-0">
            <header className="mb-10 border-b border-border/60 pb-8 sm:pb-10">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start text-center sm:text-left">
                <div className="relative shrink-0">
                  {showPa ? (
                    <div
                      className="h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-2xl ring-2 ring-border/60 shadow-md"
                      data-testid="author-avatar-pa-desk"
                    >
                      <PaDeskAuthorBadge className="h-full w-full rounded-2xl border-0 shadow-none" />
                    </div>
                  ) : showHeadshot ? (
                    <Avatar className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl ring-2 ring-border/60 shadow-md">
                      <AvatarImage src={headshotUrl!} alt="" className="object-cover" />
                      <AvatarFallback className="rounded-2xl text-lg font-semibold">
                        {authorHeading[0] ?? "A"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div
                      className="flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/12 to-primary/5 ring-2 ring-border/60 shadow-md"
                      data-testid="author-avatar-fallback"
                    >
                      <PenLine className="h-12 w-12 sm:h-14 sm:w-14 text-primary/80" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">{authorHeading}</h1>
                    <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">{authorRoleLine(data)}</p>
                  </div>

                  {(linkedInUrl || xUrl || websiteUrl) && (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      {linkedInUrl && (
                        <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full" asChild>
                          <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                            <FaLinkedin className="h-4 w-4 shrink-0 opacity-90" />
                            <span className="text-xs font-medium">LinkedIn</span>
                          </a>
                        </Button>
                      )}
                      {xUrl && (
                        <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full" asChild>
                          <a href={xUrl} target="_blank" rel="noopener noreferrer" aria-label="X">
                            <SiX className="h-4 w-4 shrink-0 opacity-90" />
                            <span className="text-xs font-medium">X</span>
                          </a>
                        </Button>
                      )}
                      {websiteUrl && (
                        <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full" asChild>
                          <a href={websiteUrl} target="_blank" rel="noopener noreferrer" aria-label="Website">
                            <Globe className="h-4 w-4 shrink-0 opacity-90" />
                            <span className="text-xs font-medium">Website</span>
                          </a>
                        </Button>
                      )}
                    </div>
                  )}

                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto sm:mx-0 text-pretty">
                    {authorBio(authorHeading)}
                  </p>

                  {expertiseTags.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-2 pt-2">
                      <span className="text-xs font-medium text-muted-foreground mr-1">Topics</span>
                      {expertiseTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="font-normal text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <Card className="border-border/70 bg-card/50 shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Articles written</p>
                    <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">
                      {data.articleCount.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/70 bg-card/50 shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">First published</p>
                    <p className="mt-2 text-lg sm:text-xl font-semibold tabular-nums">{first}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/70 bg-card/50 shadow-sm sm:col-span-2 lg:col-span-1">
                  <CardContent className="p-4 sm:p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latest article</p>
                    {latest ? (
                      <Link
                        href={newsArticle(latest.slug)}
                        className="mt-2 group flex items-start gap-2 text-left rounded-md -m-1 p-1 hover:bg-muted/60 transition-colors"
                      >
                        <span className="text-base sm:text-lg font-semibold leading-snug group-hover:text-primary group-hover:underline line-clamp-2">
                          {latest.title}
                        </span>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary mt-0.5" />
                      </Link>
                    ) : (
                      <p className="mt-2 text-lg font-semibold text-muted-foreground">—</p>
                    )}
                    {latest?.publishedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(latest.publishedAt), "d MMM yyyy")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </header>

            <section>
              <h2 className="text-xl font-semibold mb-4">Latest articles</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {data.articles.map((row) => (
                  <ArticleCard key={row.id} article={toArticleCardModel(row)} showPills />
                ))}
              </div>
              {data.hasMore && data.nextCursor && (
                <div className="mt-8 flex justify-center">
                  <Button variant="outline" asChild>
                    <Link href={`/authors/${encodeURIComponent(slug)}?cursor=${encodeURIComponent(data.nextCursor)}`}>
                      Older articles
                    </Link>
                  </Button>
                </div>
              )}
            </section>
          </div>

          <aside className="w-full lg:w-72 shrink-0">
            <Card className="lg:sticky lg:top-24 border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Never miss a story</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Get matchweek briefings and big headlines from Football Mad.
                </p>
                <NewsletterForm compact />
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
