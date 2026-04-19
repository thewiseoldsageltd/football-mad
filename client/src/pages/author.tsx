import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams, useSearch } from "wouter";
import { ArrowLeft, Globe, PenLine } from "lucide-react";
import { FaLinkedin } from "react-icons/fa6";
import { SiX } from "react-icons/si";
import { format } from "date-fns";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PaDeskAuthorBadge } from "@/components/authors/pa-desk-author-badge";
import type { AuthorPageApiResponse } from "@shared/author-slug";
import { formatAuthorForUi } from "@shared/author-display";
import { isPaSportDeskAuthor } from "@shared/author-enrichment";
import type { Article } from "@shared/schema";
import { formatPrimaryBeatForDisplay } from "@/lib/pill-display-names";

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
    authorProfileSlug: row.authorProfileSlug,
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

const socialLinkClass =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-3 text-xs font-medium text-foreground/90 transition-colors hover:bg-muted/55 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Stat card value: one shared style for count, date, and primary beat. */
const authorStatValueClass =
  "mt-1.5 text-base font-semibold leading-snug tracking-tight text-foreground tabular-nums sm:text-lg";

/** Stat cards: tighter on mobile (single row), roomier from sm+. */
const authorStatCardContentClass = "min-w-0 px-2.5 py-2.5 pt-3 sm:p-4";

/** Stat labels: compact on xs for 3-up grid. */
const authorStatLabelClass =
  "text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground leading-tight sm:text-[0.65rem]";

/** Reserve two label lines on mobile so stat values align across the row; relaxed from sm+. */
const authorStatLabelWrapClass = "min-h-[2.75rem] sm:min-h-0";

export default function AuthorPage() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const search = useSearch();
  const [, setLocation] = useLocation();
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
    const canon = data?.canonicalAuthorSlug?.trim().toLowerCase();
    if (!canon || !slug || canon === slug) return;
    const tail =
      search && search.length > 0 ? (search.startsWith("?") ? search : `?${search}`) : "";
    setLocation(`/authors/${encodeURIComponent(canon)}${tail}`, { replace: true });
  }, [data?.canonicalAuthorSlug, slug, search, setLocation]);

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
    const slugForUrl = (data.canonicalAuthorSlug?.trim() || slug).toLowerCase();
    const url = `${window.location.origin}/authors/${encodeURIComponent(slugForUrl)}`;
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
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-40 mb-5" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Skeleton className="h-24 w-24 shrink-0 rounded-full mx-auto sm:mx-0" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-9 w-2/3 max-w-sm" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-16 w-full max-w-xl" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-8">
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
  const hasSocialLinks = Boolean(linkedInUrl || xUrl || websiteUrl);
  const primaryBeat = data.primaryBeat?.trim() || null;
  const primaryBeatDisplayed = primaryBeat ? formatPrimaryBeatForDisplay(primaryBeat) : null;

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <Link href="/news">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 h-8 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            News
          </Button>
        </Link>

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          <div className="flex-1 min-w-0">
            <header className="mb-8 border-b border-border/50 pb-6 sm:mb-9 sm:pb-7">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5 text-center sm:text-left">
                <div className="relative shrink-0">
                  {showPa ? (
                    <div
                      className="h-24 w-24 sm:h-[7.25rem] sm:w-[7.25rem] overflow-hidden rounded-full ring-2 ring-border/50 shadow-sm"
                      data-testid="author-avatar-pa-desk"
                    >
                      <PaDeskAuthorBadge className="h-full w-full border-0 shadow-none" />
                    </div>
                  ) : showHeadshot ? (
                    <Avatar className="h-24 w-24 sm:h-[7.25rem] sm:w-[7.25rem] rounded-full ring-2 ring-border/50 shadow-sm">
                      <AvatarImage src={headshotUrl!} alt="" className="object-cover" />
                      <AvatarFallback className="rounded-full text-base font-semibold">
                        {authorHeading[0] ?? "A"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div
                      className="flex h-24 w-24 sm:h-[7.25rem] sm:w-[7.25rem] items-center justify-center rounded-full bg-gradient-to-br from-primary/14 to-primary/5 ring-2 ring-border/50 shadow-sm"
                      data-testid="author-avatar-fallback"
                    >
                      <PenLine className="h-10 w-10 sm:h-11 sm:w-11 text-primary/75" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 flex flex-col">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl md:text-4xl">
                      {authorHeading}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-[0.9375rem]">{authorRoleLine(data)}</p>
                  </div>

                  {hasSocialLinks && (
                    <nav
                      className="mt-2.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start"
                      aria-label="Author social profiles"
                    >
                      {linkedInUrl && (
                        <a
                          href={linkedInUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="LinkedIn"
                          className={socialLinkClass}
                        >
                          <FaLinkedin className="h-[18px] w-[18px] min-h-[18px] min-w-[18px] shrink-0 text-[#0A66C2]" aria-hidden />
                          <span>LinkedIn</span>
                        </a>
                      )}
                      {xUrl && (
                        <a
                          href={xUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="X"
                          className={socialLinkClass}
                        >
                          <SiX className="h-[17px] w-[17px] min-h-[17px] min-w-[17px] shrink-0 text-foreground" aria-hidden />
                          <span>X</span>
                        </a>
                      )}
                      {websiteUrl && (
                        <a
                          href={websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Website"
                          className={socialLinkClass}
                        >
                          <Globe className="h-[17px] w-[17px] min-h-[17px] min-w-[17px] shrink-0 text-muted-foreground" aria-hidden />
                          <span>Website</span>
                        </a>
                      )}
                    </nav>
                  )}

                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-2xl mx-auto text-pretty sm:mx-0 sm:text-[0.9375rem]">
                    {data.bio?.trim() ? data.bio.trim() : authorBio(authorHeading)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3">
                <Card className="min-w-0 border-border/60 bg-card/40 shadow-sm">
                  <CardContent className={authorStatCardContentClass}>
                    <div className={authorStatLabelWrapClass}>
                      <p className={authorStatLabelClass}>Articles written</p>
                    </div>
                    <p className={authorStatValueClass}>{data.articleCount.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="min-w-0 border-border/60 bg-card/40 shadow-sm">
                  <CardContent className={authorStatCardContentClass}>
                    <div className={authorStatLabelWrapClass}>
                      <p className={authorStatLabelClass}>First published</p>
                    </div>
                    <p className={`${authorStatValueClass} break-words hyphens-auto`}>{first}</p>
                  </CardContent>
                </Card>
                <Card className="min-w-0 border-border/60 bg-card/40 shadow-sm">
                  <CardContent className={authorStatCardContentClass}>
                    <div className={authorStatLabelWrapClass}>
                      <p className={authorStatLabelClass}>Primary beat</p>
                    </div>
                    <p
                      className={`${authorStatValueClass} break-words hyphens-auto text-balance line-clamp-3 sm:line-clamp-2`}
                      title={primaryBeat || undefined}
                    >
                      {primaryBeatDisplayed ?? "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </header>

            <section>
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl mb-3 sm:mb-4">Latest articles</h2>
              <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
                {data.articles.map((row) => (
                  <ArticleCard key={row.id} article={toArticleCardModel(row)} showPills />
                ))}
              </div>
              {data.hasMore && data.nextCursor && (
                <div className="mt-7 flex justify-center">
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
            <Card className="border-border/60 shadow-sm lg:sticky lg:top-24">
              <CardHeader className="pb-2">
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
