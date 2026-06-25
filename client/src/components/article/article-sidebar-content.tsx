import { cn } from "@/lib/utils";
import type { EntityModuleData } from "@/hooks/use-article-entity-modules";
import { EntityArticleModule } from "./entity-article-module";

interface ArticleSidebarContentProps {
  entityModules: EntityModuleData[];
  className?: string;
}

export function ArticleSidebarContent({ entityModules, className }: ArticleSidebarContentProps) {
  if (entityModules.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {entityModules.map((module) => (
        <EntityArticleModule key={`${module.entity.type}:${module.entity.slug}`} {...module} />
      ))}
    </div>
  );
}

export function ArticleRightRail({ entityModules }: { entityModules: EntityModuleData[] }) {
  if (entityModules.length === 0) return null;

  return (
    <aside className="hidden lg:block w-80 flex-shrink-0">
      <ArticleSidebarContent entityModules={entityModules} className="sticky top-24" />
    </aside>
  );
}

export function ArticleMobileEntityModules({ entityModules }: { entityModules: EntityModuleData[] }) {
  if (entityModules.length === 0) return null;

  return (
    <section className="mb-8 lg:hidden" data-testid="article-mobile-entity-modules">
      <ArticleSidebarContent entityModules={entityModules} />
    </section>
  );
}
