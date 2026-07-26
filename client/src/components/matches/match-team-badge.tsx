import { useState } from "react";
import { getCountryFlagUrl, type FlagImageWidth } from "@/lib/flags";
import { useEntityMedia } from "@/hooks/use-entity-media";

export type MatchTeamBadgeTeam = {
  id?: string | null;
  name: string;
  logoUrl?: string | null;
};

export type MatchTeamBadgeSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<MatchTeamBadgeSize, string> = {
  xs: "w-8 h-8",
  sm: "w-14 h-14 md:w-16 md:h-16",
  md: "w-16 h-16",
  lg: "w-20 h-20",
};

const FLAG_WIDTH_BY_SIZE: Record<MatchTeamBadgeSize, FlagImageWidth> = {
  xs: 80,
  sm: 160,
  md: 160,
  lg: 160,
};

/** Fixed 7:5 frame — uniform footprint; object-cover normalises varying source aspect ratios. */
const FLAG_FRAME_CLASSES: Record<MatchTeamBadgeSize, string> = {
  xs: "w-7 h-5",
  sm: "w-12 h-8",
  md: "w-12 h-8",
  lg: "w-14 h-10",
};

function getInitials(label: string): string {
  const words = label.split(/\s+/).filter((word) => word && word !== "&");
  if (words.length >= 2) return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

function TeamInitialsFallback({ name, sizeClasses }: { name: string; sizeClasses: string }) {
  return (
    <div
      className={`${sizeClasses} rounded-xl flex items-center justify-center flex-shrink-0 border border-border/60 bg-muted`}
    >
      <span className="text-sm font-medium text-muted-foreground leading-none">{getInitials(name || "?")}</span>
    </div>
  );
}

/** National-team flag — fixed frame; crest tiles use square sizeClasses unchanged. */
function TeamCountryFlag({
  name,
  size,
  sizeClasses,
  flagWidth,
}: {
  name: string;
  size: MatchTeamBadgeSize;
  sizeClasses: string;
  flagWidth: FlagImageWidth;
}) {
  const [imgError, setImgError] = useState(false);
  const flagUrl = getCountryFlagUrl(name, flagWidth);
  const frameClasses = FLAG_FRAME_CLASSES[size];

  if (!flagUrl || imgError) {
    return <TeamInitialsFallback name={name} sizeClasses={sizeClasses} />;
  }

  return (
    <div className={`${sizeClasses} flex items-center justify-center flex-shrink-0`}>
      <div
        className={`${frameClasses} overflow-hidden rounded-sm border border-border/50 bg-muted/30 flex-shrink-0`}
      >
        <img
          src={flagUrl}
          alt={name}
          width={flagWidth}
          height={Math.round(flagWidth * 0.714)}
          decoding="async"
          loading="lazy"
          className="h-full w-full object-cover object-center"
          onError={() => setImgError(true)}
        />
      </div>
    </div>
  );
}

/** Club / ingested crest — unchanged tile treatment. */
function TeamCrestImage({
  name,
  crestUrl,
  sizeClasses,
}: {
  name: string;
  crestUrl: string;
  sizeClasses: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return <TeamInitialsFallback name={name} sizeClasses={sizeClasses} />;
  }

  return (
    <div
      className={`${sizeClasses} rounded-xl flex items-center justify-center flex-shrink-0 border border-border/60 bg-white/95 dark:bg-background/95 p-0.5 shadow-sm`}
    >
      <img
        src={crestUrl}
        alt={name}
        className="h-full w-full rounded-lg object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

/**
 * Match team badge: crest when available, else national flag, else initials.
 * Shared by /matches cards and homepage Today's Matches strip.
 */
export function MatchTeamBadge({
  team,
  size = "md",
  className,
}: {
  team: MatchTeamBadgeTeam;
  size?: MatchTeamBadgeSize;
  className?: string;
}) {
  const sizeClasses = className ?? SIZE_CLASSES[size];
  const flagWidth = FLAG_WIDTH_BY_SIZE[size];
  const directLogoUrl = team.logoUrl?.trim() || null;
  const { url: entityMediaUrl, hasMedia } = useEntityMedia("team", team.id || null, "hub_header");
  const crestUrl = directLogoUrl || (hasMedia && entityMediaUrl ? entityMediaUrl : null);

  if (crestUrl) {
    return <TeamCrestImage name={team.name} crestUrl={crestUrl} sizeClasses={sizeClasses} />;
  }

  const countryFlagUrl = getCountryFlagUrl(team.name, flagWidth);
  if (countryFlagUrl) {
    return (
      <TeamCountryFlag
        name={team.name}
        size={size}
        sizeClasses={sizeClasses}
        flagWidth={flagWidth}
      />
    );
  }

  return <TeamInitialsFallback name={team.name} sizeClasses={sizeClasses} />;
}
