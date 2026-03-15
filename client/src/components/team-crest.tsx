import { EntityIcon } from "@/components/entity-media";

interface TeamCrestProps {
  teamId?: string | null;
  teamName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizePx = { sm: 20, md: 24, lg: 32 } as const;

export function TeamCrest({ teamId, teamName, size = "md", className = "" }: TeamCrestProps) {
  const tileClassName = "rounded-[6px] border border-border/55 bg-muted/25 p-[1px]";
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
