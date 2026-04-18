import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearch } from "wouter";
import { ArrowLeft, PenLine } from "lucide-react";
import { format } from "date-fns";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuthorPageApiResponse } from "@shared/author-slug";
import type { Article } from "@shared/schema";

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
    document.title = `${data.displayName} | Authors | Football Mad`;
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
    let script = document.getElementById("author-jsonld") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "author-jsonld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      name: data.displayName,
      url,
      jobTitle: "Journalist",
      worksFor: { "@type": "Organization", name: "Football Mad" },
    });
    return () => {
      document.getElementById("author-jsonld")?.remove();
    };
  }, [data?.found, data?.displayName, slug]);

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
          <Skeleton className="h-24 w-full mb-8" />
          <div className="grid md:grid-cols-2 gap-4">
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
  const last = data.lastPublishedAt ? format(new Date(data.lastPublishedAt), "d MMM yyyy") : "—";

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <Link href="/news">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            News
          </Button>
        </Link>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 min-w-0">
            <header className="mb-10 border-b pb-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <PenLine className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{data.displayName}</h1>
                  <p className="text-muted-foreground mt-1">Journalist · Football correspondent</p>
                </div>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">{authorBio(data.displayName)}</p>
              <dl className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Articles</dt>
                  <dd className="font-semibold text-lg">{data.articleCount.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">First published</dt>
                  <dd className="font-semibold">{first}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Latest</dt>
                  <dd className="font-semibold">{last}</dd>
                </div>
              </dl>
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
            <Card className="sticky top-24">
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
