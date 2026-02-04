import { useState } from "react";
import { Link } from "wouter";
import { Trophy, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type EntityType = "competition" | "team" | "player" | "manager";

export interface EntityData {
  type: EntityType;
  name: string;
  slug: string;
  href?: string;
  iconUrl?: string;
  fallbackText?: string;
  color?: string | null;
  shortLabel?: string;
}

interface EntityPillProps {
  entity: EntityData;
  size?: "default" | "small";
  active?: boolean;
  className?: string;
  shortLabel?: string;
  responsiveLabel?: boolean;
  "data-testid"?: string;
}

function IconWithFallback({
  src,
  alt,
  fallbackText,
  size,
  entityType,
}: {
  src?: string;
  alt: string;
  fallbackText?: string;
  size: "default" | "small";
  entityType: EntityType;
}) {
  const [hasError, setHasError] = useState(false);
  const iconSize = size === "small" ? "w-[16px] h-[16px]" : "w-[18px] h-[18px]";
  const containerSize = size === "small" ? "w-4 h-4" : "w-[18px] h-[18px]";

  if (src && !hasError) {
    return (
      <div className={cn("rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-muted", containerSize)}>
        <img
          src={src}
          alt={alt}
          className={cn("object-cover", iconSize)}
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  if (fallbackText) {
    return (
      <div className={cn(
        "rounded-full flex-shrink-0 flex items-center justify-center bg-muted text-muted-foreground font-medium",
        containerSize,
        size === "small" ? "text-[9px]" : "text-[10px]"
      )}>
        {fallbackText.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  const iconClass = size === "small" ? "h-3 w-3" : "h-3.5 w-3.5";
  const FallbackIcon = entityType === "competition" ? Trophy 
    : entityType === "player" ? User 
    : entityType === "manager" ? Users 
    : Trophy;

  return (
    <div className={cn("rounded-full flex-shrink-0 flex items-center justify-center bg-muted", containerSize)}>
      <FallbackIcon className={cn(iconClass, "text-muted-foreground")} />
    </div>
  );
}

export function EntityPill({
  entity,
  size = "small",
  active = false,
  className,
  shortLabel,
  responsiveLabel = false,
  "data-testid": testId,
}: EntityPillProps) {
  const effectiveShortLabel = shortLabel || entity.shortLabel;
  const useResponsive = responsiveLabel && effectiveShortLabel;

  const labelContent = useResponsive ? (
    <>
      <span className="md:hidden text-foreground font-medium whitespace-nowrap">{effectiveShortLabel}</span>
      <span className="hidden md:inline text-foreground font-medium whitespace-nowrap">{entity.name}</span>
    </>
  ) : (
    <span className="text-foreground font-medium whitespace-nowrap">{entity.name}</span>
  );

  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full transition-all",
        "border",
        size === "default" ? "h-7 px-2.5 py-1 text-sm" : "h-6 px-2 py-0.5 text-xs",
        "bg-background",
        "border-border",
        entity.href && "cursor-pointer hover:bg-muted hover:border-muted-foreground/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        active && "bg-muted border-muted-foreground/40",
        className
      )}
      data-testid={testId}
      title={entity.name}
      aria-label={entity.name}
    >
      <IconWithFallback
        src={entity.iconUrl}
        alt={entity.name}
        fallbackText={entity.fallbackText}
        size={size}
        entityType={entity.type}
      />
      {labelContent}
    </div>
  );

  if (entity.href) {
    return <Link href={entity.href} title={entity.name} aria-label={entity.name}>{content}</Link>;
  }

  return content;
}

export function getEntityIconUrl(type: EntityType, slug: string): string {
  switch (type) {
    case "competition":
      return `/crests/comps/${slug}.svg`;
    case "team":
      return `/crests/teams/${slug}.svg`;
    case "player":
      return `/players/${slug}.jpg`;
    case "manager":
      return `/managers/${slug}.jpg`;
    default:
      return "";
  }
}

export function slugifyName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}
