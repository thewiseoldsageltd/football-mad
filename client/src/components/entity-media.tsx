import { useState } from "react";
import { cn } from "@/lib/utils";
import { useEntityMedia, type MediaEntityType, type MediaSurface } from "@/hooks/use-entity-media";

function getInitials(label: string): string {
  const safe = label.trim();
  if (!safe) return "?";
  const words = safe.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  return safe.slice(0, 2).toUpperCase();
}

interface FallbackProps {
  label: string;
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
  label: string;
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

  const boxStyle = { width: size, height: size };
  const baseClass = cn("rounded-full overflow-hidden shrink-0", className);

  if (showImage) {
    return (
      <div className={baseClass} style={boxStyle}>
        <img src={url!} alt={label} className="h-full w-full object-contain" onError={() => setImgError(true)} />
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
  label: string;
  sizeClassName?: string;
  className?: string;
}

export function EntityAvatar({
  entityType,
  entityId,
  surface = "hub_header",
  label,
  sizeClassName = "h-16 w-16",
  className,
}: EntityAvatarProps) {
  const { url, hasMedia } = useEntityMedia(entityType, entityId, surface);
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(hasMedia && url && !imgError);

  if (showImage) {
    return (
      <div className={cn("rounded-full overflow-hidden shrink-0 bg-muted", sizeClassName, className)}>
        <img src={url!} alt={label} className="h-full w-full object-contain" onError={() => setImgError(true)} />
      </div>
    );
  }

  return (
    <InitialsFallback
      label={label}
      className={cn("rounded-full shrink-0", sizeClassName, className)}
      textClassName="text-sm"
    />
  );
}

interface EntityPillIconProps {
  entityType: MediaEntityType;
  entityId?: string | null;
  label: string;
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

  const iconSizeClass = size === "small" ? "w-[16px] h-[16px]" : "w-[18px] h-[18px]";
  const containerSizeClass = size === "small" ? "w-4 h-4" : "w-[18px] h-[18px]";

  if (showImage) {
    return (
      <div className={cn("rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-muted", containerSizeClass)}>
        <img
          src={url!}
          alt={label}
          className={cn("object-contain", iconSizeClass)}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <InitialsFallback
      label={label}
      className={cn("rounded-full flex-shrink-0", containerSizeClass)}
      textClassName={size === "small" ? "text-[9px]" : "text-[10px]"}
    />
  );
}
