import { EntityIcon } from "@/components/entity-media";

interface TeamCrestProps {
  teamId?: string | null;
  teamName: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizePx = { sm: 20, md: 24, lg: 32 } as const;

export function TeamCrest({ teamId, teamName, src, size = "md", className = "" }: TeamCrestProps) {
  const tileClassName = "rounded-[6px] border border-border/70 bg-white/95 dark:bg-background/95 p-[1.5px]";
  const sizeClassName =
    size === "sm" ? "h-5 w-5" : size === "lg" ? "h-8 w-8" : "h-6 w-6";

  if (src) {
    return (
      <div className={`${tileClassName} ${className}`.trim()}>
        <img src={src} alt={teamName} className={`${sizeClassName} object-contain`} />
      </div>
    );
  }

  return (
    <EntityIcon
      entityType="team"
      entityId={teamId}
      size={sizePx[size]}
      label={teamName}
      surface="pill"
      className={`${tileClassName} ${className}`.trim()}
    />
  );
}
