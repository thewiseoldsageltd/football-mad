import { getTeamStyle, isLightBackground } from "@/lib/team-styles";
import { cn } from "@/lib/utils";

interface TeamBadgeProps {
  teamName: string | undefined | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-base",
};

export function TeamBadge({ teamName, size = "md", className }: TeamBadgeProps) {
  const style = getTeamStyle(teamName);
  const needsBorder = isLightBackground(style.bg);

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold tracking-tight shrink-0",
        sizeClasses[size],
        needsBorder && "border border-black/12 dark:border-white/20",
        className
      )}
      style={{
        backgroundColor: style.bg,
        color: style.fg,
      }}
      data-testid={`badge-team-${teamName?.toLowerCase().replace(/\s+/g, "-") || "unknown"}`}
    >
      {style.abbr}
    </div>
  );
}
