import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { EntityAvatar } from "@/components/entity-media";
import { RelatedArticlesSection } from "@/components/related-articles-section";
import { teamHub, playerProfile } from "@/lib/urls";
import type { Team, Article } from "@shared/schema";
import type { PlayerHubCurrentClub, PlayerHubTeammate } from "@shared/player-hub";
import {
  formatPlayerPositionLabel,
  parseShirtNumber,
} from "@shared/player-current-club";
import { buildPlayerPersonJsonLd } from "@shared/player-hub-seo";
import {
  usePageSeo,
  useJsonLd,
  DEFAULT_SOCIAL_IMAGE_PATH,
  shouldBlockIndexingFromClient,
  absoluteSeoUrl,
  canonicalPublicUrl,
  CANONICAL_PUBLIC_ORIGIN,
} from "@/lib/seo";
import { useEntityMedia } from "@/hooks/use-entity-media";

type PlayerApiResponse = {
  id: string;
  name: string;
  slug: string;
  position?: string | null;
  nationality?: string | null;
  age?: number | null;
  imageUrl?: string | null;
  team?: Team | null;
  currentClub?: PlayerHubCurrentClub | null;
  teammates?: PlayerHubTeammate[];
  mvpIndexable?: boolean;
  seo?: {
    indexable: boolean;
    canonicalUrl: string;
    title?: string;
    description?: string;
  };
};

type PlayerArchiveResponse = {
  articles: Article[];
  nextCursor: string | null;
  hasMore: boolean;
};

function joinMeta(parts: Array<string | null | undefined>): string | null {
  const cleaned = parts.map((p) => (p == null ? "" : String(p).trim())).filter(Boolean);
  return cleaned.length ? cleaned.join(" · ") : null;
}

export default function PlayerProfilePage() {
  const [, params] = useRoute("/players/:slug");
  const slug = params?.slug || "";

  const { data: player, isLoading } = useQuery<PlayerApiResponse | null>({
    queryKey: ["/api/players", slug],
    queryFn: async () => {
      const res = await fetch(`/api/players/${slug}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch player profile");
      }
      return res.json();
    },
    enabled: Boolean(slug),
  });

  const { url: playerMediaUrl } = useEntityMedia("player", player?.id, "hub_header");
  const { data: archiveData, isLoading: archiveLoading } = useQuery<PlayerArchiveResponse>({
    queryKey: ["/api/news/archive/player", slug, "hub"],
    queryFn: async () => {
      const res = await fetch(`/api/news/archive/player/${slug}?limit=3`);
      if (!res.ok) throw new Error("Failed to fetch player archive");
      return res.json();
    },
    enabled: Boolean(slug),
  });

  const currentClub = player?.currentClub ?? null;
  const shirt = parseShirtNumber(currentClub?.shirtNumber);
  const positionLabel = formatPlayerPositionLabel(currentClub?.position ?? player?.position);
  const clubLine = joinMeta([
    currentClub?.name,
    shirt != null ? `No. ${shirt}` : null,
  ]);
  const detailLine = joinMeta([
    positionLabel,
    player?.nationality,
    typeof player?.age === "number" && player.age > 0 ? String(player.age) : null,
  ]);

  const relatedArticles = archiveData?.articles ?? [];
  const teammates = player?.teammates ?? [];

  const seoTitle =
    player?.seo?.title ??
    (player ? `${player.name} | Football Mad` : "Player | Football Mad");
  const seoDescription =
    player?.seo?.description ??
    (player
      ? `Player profile for ${player.name} on Football Mad.`
      : "Football Mad player profile.");
  const canonicalPath = player?.slug
    ? playerProfile(player.slug)
    : slug
      ? playerProfile(slug)
      : "/players";

  usePageSeo({
    title: seoTitle,
    description: seoDescription,
    canonicalPath,
    imagePath: playerMediaUrl ?? player?.imageUrl ?? DEFAULT_SOCIAL_IMAGE_PATH,
    noIndex:
      shouldBlockIndexingFromClient() ||
      (player != null && (player.seo?.indexable === false || player.mvpIndexable === false)),
  });

  const personJsonLd = useMemo(() => {
    if (!player) return null;
    const canonicalUrl =
      player.seo?.canonicalUrl ||
      absoluteSeoUrl(canonicalPath) ||
      `${CANONICAL_PUBLIC_ORIGIN}${canonicalPath}`;
    return buildPlayerPersonJsonLd({
      name: player.name,
      canonicalUrl,
      imageUrl: playerMediaUrl ?? player.imageUrl,
      position: currentClub?.position ?? player.position,
      nationality: player.nationality,
      clubName: currentClub?.name,
      clubUrl: currentClub?.slug
        ? canonicalPublicUrl(teamHub(currentClub.slug))
        : null,
    });
  }, [player, playerMediaUrl, currentClub, canonicalPath]);

  useJsonLd("player-hub-person", personJsonLd);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Loading player profile...</h1>
        </div>
      </MainLayout>
    );
  }

  if (!player) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Player not found</h1>
          <p className="text-muted-foreground mb-6">
            The player you're looking for doesn't exist or detailed profile data is not yet available.
          </p>
          <Link href="/teams">
            <Button data-testid="link-back-to-teams">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teams
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {currentClub?.slug && (
          <Link href={teamHub(currentClub.slug)}>
            <Button variant="ghost" size="sm" className="mb-2" data-testid="link-back-to-team">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {currentClub.name}
            </Button>
          </Link>
        )}

        <section data-testid="player-hub-hero" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <EntityAvatar
              entityType="player"
              entityId={player.id}
              label={player.name}
              surface="hub_header"
              sizeClassName="h-24 w-24 sm:h-32 sm:w-32"
              className="bg-primary/5"
            />
            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{player.name}</h1>
              {clubLine && currentClub?.slug ? (
                <Link
                  href={teamHub(currentClub.slug)}
                  className="inline-flex items-center gap-2 text-base text-primary hover:underline"
                  data-testid="link-club"
                >
                  <EntityAvatar
                    entityType="team"
                    entityId={currentClub.id}
                    label={currentClub.name}
                    surface="hub_header"
                    sizeClassName="h-6 w-6"
                  />
                  <span>{clubLine}</span>
                </Link>
              ) : clubLine ? (
                <p className="text-base text-muted-foreground">{clubLine}</p>
              ) : null}
              {detailLine ? (
                <p className="text-sm text-muted-foreground" data-testid="player-hub-details">
                  {detailLine}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {!archiveLoading && relatedArticles.length > 0 ? (
          <RelatedArticlesSection
            articles={relatedArticles}
            limit={3}
            headingStyle="compact"
            heading="RELATED ARTICLES"
            showMoreNews={false}
            showPills={false}
            testId="player-hub-related-articles"
          />
        ) : null}

        {teammates.length > 0 ? (
          <section data-testid="player-hub-teammates">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase mb-3">
              TEAMMATES
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {teammates.map((teammate) => {
                const teammateShirt = parseShirtNumber(teammate.shirtNumber);
                const teammatePos = formatPlayerPositionLabel(teammate.position);
                const meta = joinMeta([
                  teammatePos,
                  teammateShirt != null ? `No. ${teammateShirt}` : null,
                ]);
                return (
                  <Link
                    key={teammate.id}
                    href={playerProfile(teammate.slug)}
                    className="flex items-center gap-3 min-w-0 rounded-md p-2 hover:bg-muted/40 transition-colors"
                    data-testid={`teammate-${teammate.slug}`}
                  >
                    <EntityAvatar
                      entityType="player"
                      entityId={teammate.id}
                      label={teammate.name}
                      surface="hub_header"
                      sizeClassName="h-10 w-10"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{teammate.name}</div>
                      {meta ? (
                        <div className="text-xs text-muted-foreground truncate">{meta}</div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </MainLayout>
  );
}
