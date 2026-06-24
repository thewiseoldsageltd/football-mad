import { useCallback, useEffect, useState } from "react";
import {
  articleDisplayImageUrl,
  isLegacyGhostArticleImageUrl,
} from "@/lib/article-images";

export type ArticleCoverImageVariant = "hero" | "card-featured" | "card" | "thumb";

type ArticleCoverImageProps = {
  article: {
    heroImageUrl?: string | null;
    coverImage?: string | null;
  };
  variant: ArticleCoverImageVariant;
  alt?: string;
  priorityCover?: boolean;
  imgClassName?: string;
};

function ArticleCoverFallback({ variant }: { variant: ArticleCoverImageVariant }) {
  if (variant === "hero") {
    return (
      <div className="my-8 aspect-[16/9] w-full rounded-lg bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
        <span className="text-8xl font-bold text-primary/30" aria-hidden>
          F
        </span>
      </div>
    );
  }

  if (variant === "card-featured") {
    return (
      <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
        <span className="text-6xl font-bold text-primary/30" aria-hidden>
          F
        </span>
      </div>
    );
  }

  if (variant === "thumb") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20">
        <span className="text-lg font-bold text-primary/30" aria-hidden>
          F
        </span>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
      <span className="text-4xl font-bold text-muted-foreground/30" aria-hidden>
        F
      </span>
    </div>
  );
}

const CARD_IMG_CLASS =
  "h-full w-full object-cover object-[center_top] transition-transform duration-300 group-hover:scale-105";

/**
 * Article hero / card cover with legacy Ghost URL filtering and load-error fallback.
 */
export function ArticleCoverImage({
  article,
  variant,
  alt = "",
  priorityCover = false,
  imgClassName,
}: ArticleCoverImageProps) {
  const rawUrl = articleDisplayImageUrl(article);
  const initialUrl =
    rawUrl && !isLegacyGhostArticleImageUrl(rawUrl) ? rawUrl : null;
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [rawUrl]);

  const handleError = useCallback(() => {
    setLoadFailed(true);
  }, []);

  const showImage = Boolean(initialUrl && !loadFailed);

  if (variant === "hero") {
    if (!showImage) {
      return <ArticleCoverFallback variant="hero" />;
    }
    return (
      <figure className="my-8 relative aspect-video w-full overflow-hidden rounded-lg bg-black/5">
        <img
          src={initialUrl!}
          alt={alt}
          width={1280}
          height={720}
          decoding="async"
          fetchPriority="high"
          loading="eager"
          className={imgClassName ?? "h-full w-full object-cover object-[center_top]"}
          onError={handleError}
        />
      </figure>
    );
  }

  if (!showImage) {
    return <ArticleCoverFallback variant={variant} />;
  }

  if (variant === "thumb") {
    return (
      <img
        src={initialUrl!}
        alt={alt}
        className={imgClassName ?? "w-full h-full object-cover"}
        onError={handleError}
      />
    );
  }

  const isFeatured = variant === "card-featured";
  return (
    <img
      src={initialUrl!}
      alt={alt}
      width={isFeatured ? 1280 : 640}
      height={isFeatured ? 720 : 360}
      sizes={
        isFeatured
          ? "(max-width: 1280px) 100vw, 1216px"
          : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      }
      decoding="async"
      fetchPriority={priorityCover ? "high" : undefined}
      loading={priorityCover ? "eager" : "lazy"}
      className={imgClassName ?? CARD_IMG_CLASS}
      onError={handleError}
    />
  );
}
