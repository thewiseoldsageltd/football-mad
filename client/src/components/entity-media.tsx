import { useState } from "react";
import { cn } from "@/lib/utils";
import { useEntityMedia, type MediaEntityType, type MediaSurface } from "@/hooks/use-entity-media";

function normalizeLabel(label: unknown): string {
  return typeof label === "string" ? label.trim() : "";
}

function getInitials(label: unknown): string {
  const safe = normalizeLabel(label);
  if (!safe) return "?";
  const words = safe.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  return safe.slice(0, 2).toUpperCase();
}

interface FallbackProps {
  label?: string | null;
  className?: string;
  textClassName?: string;
}

function InitialsFallback({ label, className, textClassName }: FallbackProps) {
  return (
    <div className={cn("flex items-center justify-center bg-muted text-muted-foreground font-medium", className)}>
      <span className={cn("leading-none", textClassName)}>{getInitials(label)}</span>
    </div>
  );
}

interface EntityIconProps {
  entityType: MediaEntityType;
  entityId?: string | null;
  size?: number;
  label?: string | null;
  surface?: "pill";
  className?: string;
}

export function EntityIcon({
  entityType,
  entityId,
  size = 20,
  label,
  surface = "pill",
  className,
}: EntityIconProps) {
  const { url, hasMedia } = useEntityMedia(entityType, entityId, surface);
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(hasMedia && url && !imgError);
  const safeLabel = normalizeLabel(label);

  const boxStyle = { width: size, height: size };
  const baseClass = cn("rounded-full overflow-hidden shrink-0", className);

  if (showImage) {
    return (
      <div className={baseClass} style={boxStyle}>
        <img src={url!} alt={safeLabel} className="h-full w-full object-contain" onError={() => setImgError(true)} />
      </div>
    );
  }

  return (
    <InitialsFallback
      label={label}
      className={cn("rounded-full shrink-0", baseClass)}
      textClassName="text-[10px]"
    />
  );
}

interface EntityAvatarProps {
  entityType: MediaEntityType;
  entityId?: string | null;
  surface?: "hub_header";
  label?: string | null;
  sizeClassName?: string;
  shape?: "circle" | "square";
  objectFit?: "contain" | "cover";
  className?: string;
}

export function EntityAvatar({
  entityType,
  entityId,
  surface = "hub_header",
  label,
  sizeClassName = "h-16 w-16",
  shape = "circle",
  objectFit = "contain",
  className,
}: EntityAvatarProps) {
  const { url, hasMedia } = useEntityMedia(entityType, entityId, surface);
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(hasMedia && url && !imgError);
  const safeLabel = normalizeLabel(label);

  const shapeClass = shape === "square" ? "rounded-none" : "rounded-full";

  if (showImage) {
    return (
      <div className={cn(shapeClass, "overflow-hidden shrink-0", sizeClassName, className)}>
        <img
          src={url!}
          alt={safeLabel}
          className={cn("h-full w-full", objectFit === "cover" ? "object-cover" : "object-contain")}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <InitialsFallback
      label={label}
      className={cn(shapeClass, "shrink-0", sizeClassName, className)}
      textClassName="text-sm"
    />
  );
}

interface EntityPillIconProps {
  entityType: MediaEntityType;
  entityId?: string | null;
  label?: string | null;
  size?: "small" | "default";
}

export function EntityPillIcon({
  entityType,
  entityId,
  label,
  size = "small",
}: EntityPillIconProps) {
  const { url, hasMedia } = useEntityMedia(entityType, entityId, "pill");
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(hasMedia && url && !imgError);
  const safeLabel = normalizeLabel(label);

  const isHeadshotType = entityType === "player" || entityType === "manager";
  const iconSizeClass = size === "small" ? (isHeadshotType ? "w-[18px] h-[18px]" : "w-[16px] h-[16px]") : "w-[18px] h-[18px]";
  const containerSizeClass = size === "small" ? (isHeadshotType ? "w-[18px] h-[18px]" : "w-4 h-4") : "w-[18px] h-[18px]";
  const tileClass = "rounded-[6px] border border-border/70 bg-white/95 dark:bg-background/95 p-[1.5px]";
  const avatarClass = "rounded-full border border-border/50 bg-background";

  if (showImage) {
    if (isHeadshotType) {
      return (
        <div className={cn("overflow-hidden flex-shrink-0", avatarClass, containerSizeClass)}>
          <img
            src={url!}
            alt={safeLabel}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      );
    }

    return (
      <div className={cn("overflow-hidden flex-shrink-0 flex items-center justify-center", tileClass, containerSizeClass)}>
        <img
          src={url!}
          alt={safeLabel}
          className={cn("object-contain", iconSizeClass)}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  if (isHeadshotType) {
    return (
      <InitialsFallback
        label={label}
        className={cn("flex-shrink-0", avatarClass, containerSizeClass)}
        textClassName={size === "small" ? "text-[9px]" : "text-[10px]"}
      />
    );
  }

  return (
    <InitialsFallback
      label={label}
      className={cn("flex-shrink-0", tileClass, containerSizeClass)}
      textClassName={size === "small" ? "text-[9px]" : "text-[10px]"}
    />
  );
}
