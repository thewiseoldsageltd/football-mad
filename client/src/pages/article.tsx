import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { Clock, Eye, ArrowLeft, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { ShareButtons, MobileStickyShare } from "@/components/share-buttons";
import type { Article } from "@shared/schema";

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: article, isLoading } = useQuery<Article>({
    queryKey: ["/api/articles", slug],
  });

  const { data: relatedArticles } = useQuery<Article[]>({
    queryKey: ["/api/articles", "related", slug],
    enabled: !!article,
  });

  const articleUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/article/${slug}` 
    : `/article/${slug}`;

  useEffect(() => {
    if (!article) return;

    const setMetaTag = (property: string, content: string, isName = false) => {
      const attr = isName ? "name" : "property";
      const existingId = `article-meta-${property.replace(/:/g, "-")}`;
      let tag = document.getElementById(existingId) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.id = existingId;
        tag.setAttribute(attr, property);
        document.head.appendChild(tag);
      }
      tag.content = content;
    };

    document.title = `${article.title} | Football Mad`;
    
    setMetaTag("og:title", article.title);
    setMetaTag("og:description", article.excerpt || "Read the latest football news on Football Mad");
    setMetaTag("og:type", "article");
    setMetaTag("og:url", articleUrl);
    if (article.coverImage) {
      setMetaTag("og:image", article.coverImage);
    }
    setMetaTag("og:site_name", "Football Mad");
    
    setMetaTag("twitter:card", "summary_large_image", true);
    setMetaTag("twitter:title", article.title, true);
    setMetaTag("twitter:description", article.excerpt || "Read the latest football news on Football Mad", true);
    if (article.coverImage) {
      setMetaTag("twitter:image", article.coverImage, true);
    }

    return () => {
      const metaTags = document.querySelectorAll('[id^="article-meta-"]');
      metaTags.forEach(tag => tag.remove());
      document.title = "Football Mad";
    };
  }, [article, articleUrl]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-12 w-full mb-2" />
          <Skeleton className="h-12 w-3/4 mb-6" />
          <Skeleton className="aspect-[16/9] w-full mb-8 rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!article) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Article not found</h1>
          <p className="text-muted-foreground mb-6">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/news">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to News
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const publishedAt = article.publishedAt ? new Date(article.publishedAt) : new Date();

  return (
    <MainLayout>
      <article className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/news">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2" data-testid="link-back-to-news">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to News
          </Button>
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="default" className="bg-primary">
              {article.category || "News"}
            </Badge>
            {article.isTrending && (
              <Badge variant="secondary">Trending</Badge>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="text-xl text-muted-foreground mb-6">
              {article.excerpt}
            </p>
          )}

          <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {article.authorName?.[0] || "F"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{article.authorName || "Football Mad"}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(publishedAt, "d MMM yyyy, HH:mm")}
                  </span>
                  {article.viewCount != null && article.viewCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {article.viewCount.toLocaleString()} views
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" data-testid="button-bookmark">
                <Bookmark className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {article.coverImage && (
          <figure className="mb-8">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full rounded-lg"
            />
          </figure>
        )}

        <div
          className="prose prose-lg dark:prose-invert max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <section className="py-6 border-y mb-8">
          <ShareButtons
            articleId={article.id}
            title={article.title}
            url={typeof window !== "undefined" ? window.location.href : `/article/${slug}`}
            description={article.excerpt || undefined}
          />
        </section>

        <section className="mb-12">
          <NewsletterForm />
        </section>

        {relatedArticles && relatedArticles.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedArticles.slice(0, 3).map((related) => (
                <ArticleCard key={related.id} article={related} />
              ))}
            </div>
          </section>
        )}
      </article>

      <MobileStickyShare
        articleId={article.id}
        title={article.title}
        url={typeof window !== "undefined" ? window.location.href : `/article/${slug}`}
        description={article.excerpt || undefined}
      />
    </MainLayout>
  );
}
