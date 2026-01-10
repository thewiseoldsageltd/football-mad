import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { ArticleCardSkeleton } from "@/components/skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Article } from "@shared/schema";

const categories = [
  { value: "all", label: "All" },
  { value: "news", label: "News" },
  { value: "analysis", label: "Analysis" },
  { value: "transfers", label: "Transfers" },
  { value: "fpl", label: "FPL" },
  { value: "opinion", label: "Opinion" },
];

export default function NewsPage() {
  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  const featuredArticle = articles?.find((a) => a.isFeatured) || articles?.[0];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">News</h1>
          <p className="text-muted-foreground text-lg">
            The latest football news, analysis, and insights
          </p>
        </div>

        {featuredArticle && !isLoading && (
          <section className="mb-8">
            <ArticleCard article={featuredArticle} featured />
          </section>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} data-testid={`tab-${cat.value}`}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.value} value={cat.value}>
              {isLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <ArticleCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles
                    ?.filter((a) => {
                      if (cat.value === "all") return a.id !== featuredArticle?.id;
                      return a.category === cat.value && a.id !== featuredArticle?.id;
                    })
                    .map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </MainLayout>
  );
}
