import { useRoute, Redirect } from "wouter";
import { isEntitySlug, isTeamSlug, parseMatchSlug, matchDetail } from "@/lib/urls";
import NewsEntityPage from "./news-entity";
import ArticlePage from "./article";
import NotFound from "./not-found";

function isMatchSlug(slug: string): boolean {
  return parseMatchSlug(slug) !== null;
}

export default function NewsResolver() {
  const [, params] = useRoute("/news/:slug");
  const slug = params?.slug;

  if (!slug) {
    return null;
  }

  if (isMatchSlug(slug)) {
    const parsed = parseMatchSlug(slug);
    if (parsed) {
      return <Redirect to={matchDetail(parsed.homeSlug, parsed.awaySlug, parsed.date)} />;
    }
    return <NotFound />;
  }

  if (isEntitySlug(slug)) {
    const entityType = isTeamSlug(slug) ? "team" : "competition";
    return <NewsEntityPage slug={slug} entityType={entityType} />;
  }

  return <ArticlePage />;
}
