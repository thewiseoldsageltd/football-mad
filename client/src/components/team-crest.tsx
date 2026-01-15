import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TeamCrestProps {
  teamName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function getTeamInitials(name: string): string {
  const words = name.split(" ");
  if (words.length === 1) {
    return name.slice(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const sizeClasses = {
  sm: "h-5 w-5 text-[10px]",
  md: "h-6 w-6 text-xs",
  lg: "h-8 w-8 text-sm",
};

export function TeamCrest({ teamName, size = "md", className = "" }: TeamCrestProps) {
  const normalizedName = normalizeTeamName(teamName);
  const initials = getTeamInitials(teamName);
  const crestPath = `/crests/${normalizedName}.png`;

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`} data-testid={`crest-${normalizedName}`}>
      <AvatarImage src={crestPath} alt={`${teamName} crest`} />
      <AvatarFallback className="bg-muted text-muted-foreground font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
