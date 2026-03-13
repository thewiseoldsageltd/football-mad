import { EntityIcon } from "@/components/entity-media";

interface TeamCrestProps {
  teamId?: string | null;
  teamName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizePx = { sm: 20, md: 24, lg: 32 } as const;

export function TeamCrest({ teamId, teamName, size = "md", className = "" }: TeamCrestProps) {
  return (
    <EntityIcon
      entityType="team"
      entityId={teamId}
      size={sizePx[size]}
      label={teamName}
      surface="pill"
      className={className}
    />
  );
}
