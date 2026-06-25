import { cn } from "@/lib/utils";
import type { EntityModuleData } from "@/hooks/use-article-entity-modules";
import type { Article } from "@shared/schema";
import { EntityArticleModule, MoreLikeThisCard } from "./entity-article-module";

interface ArticleSidebarContentProps {
  entityModules: EntityModuleData[];
  relatedArticles: Article[];
  showMoreLikeThis?: boolean;
  className?: string;
}

export function ArticleSidebarContent({
  entityModules,
  relatedArticles,
  showMoreLikeThis = true,
  className,
}: ArticleSidebarContentProps) {
  const hasEntityModules = entityModules.length > 0;
  const hasMoreLikeThis = showMoreLikeThis && relatedArticles.length > 0;

  if (!hasEntityModules && !hasMoreLikeThis) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {entityModules.map((module) => (
        <EntityArticleModule key={`${module.entity.type}:${module.entity.slug}`} {...module} />
      ))}
      {hasMoreLikeThis && <MoreLikeThisCard articles={relatedArticles} />}
    </div>
  );
}

export function ArticleRightRail({
  entityModules,
  relatedArticles,
}: {
  entityModules: EntityModuleData[];
  relatedArticles: Article[];
}) {
  const hasEntityModules = entityModules.length > 0;
  const hasMoreLikeThis = relatedArticles.length > 0;
  if (!hasEntityModules && !hasMoreLikeThis) return null;

  return (
    <aside className="hidden lg:block w-80 flex-shrink-0">
      <ArticleSidebarContent
        entityModules={entityModules}
        relatedArticles={relatedArticles}
        className="sticky top-24"
      />
    </aside>
  );
}

export function ArticleMobileEntityModules({
  entityModules,
}: {
  entityModules: EntityModuleData[];
}) {
  if (entityModules.length === 0) return null;

  return (
    <section className="mb-8 lg:hidden" data-testid="article-mobile-entity-modules">
      <ArticleSidebarContent
        entityModules={entityModules}
        relatedArticles={[]}
        showMoreLikeThis={false}
      />
    </section>
  );
}
