import { useRoute } from "wouter";
import NewsEntityPage from "./news-entity";

export default function CompetitionProfilePage() {
  const [, params] = useRoute("/competitions/:slug");
  const slug = params?.slug ?? "";
  return <NewsEntityPage slug={slug} entityType="competition" />;
}
