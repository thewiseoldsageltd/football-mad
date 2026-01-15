import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Zap, Star, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaxonomyPillVariant = "breaking" | "editor-pick" | "trending" | "team" | "competition" | "default";

interface TaxonomyPillProps {
  label: string;
  variant?: TaxonomyPillVariant;
  href?: string;
  icon?: React.ReactNode;
  teamColor?: string | null;
  crestUrl?: string | null;
  className?: string;
  "data-testid"?: string;
}

function CrestWithFallback({ 
  src, 
  alt,
  fallbackIcon,
  fallbackColor,
}: { 
  src: string; 
  alt: string;
  fallbackIcon?: React.ReactNode;
  fallbackColor?: string | null;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    if (fallbackColor) {
      return (
        <div 
          className="w-3 h-3 rounded-sm flex-shrink-0"
          style={{ backgroundColor: fallbackColor }}
        />
      );
    }
    return <>{fallbackIcon}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-4 h-4 object-contain"
      onError={() => setHasError(true)}
    />
  );
}

function ColorDot({ color }: { color: string }) {
  return (
    <div 
      className="w-3 h-3 rounded-sm flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

export function TaxonomyPill({
  label,
  variant = "default",
  href,
  icon,
  teamColor,
  crestUrl,
  className,
  "data-testid": testId,
}: TaxonomyPillProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "breaking":
        return "bg-destructive text-destructive-foreground border-destructive";
      case "editor-pick":
        return "bg-amber-500 text-white border-amber-500";
      case "trending":
        return "bg-secondary text-secondary-foreground border-secondary";
      case "team":
        return "bg-background border";
      case "competition":
        return "bg-transparent text-foreground border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50";
      default:
        return "";
    }
  };

  const getIcon = () => {
    if (icon) return icon;
    
    switch (variant) {
      case "breaking":
        return <Zap className="h-3 w-3" />;
      case "editor-pick":
        return <Star className="h-3 w-3" />;
      case "trending":
        return <TrendingUp className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const renderCrestOrFallback = () => {
    if (variant === "team" && crestUrl) {
      return (
        <CrestWithFallback 
          src={crestUrl} 
          alt={label} 
          fallbackColor={teamColor}
        />
      );
    }
    
    if (variant === "team" && teamColor) {
      return <ColorDot color={teamColor} />;
    }

    if (variant === "competition" && crestUrl) {
      return (
        <CrestWithFallback 
          src={crestUrl} 
          alt={label}
          fallbackIcon={<Trophy className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />}
        />
      );
    }
    
    if (variant === "competition") {
      return <Trophy className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />;
    }

    return null;
  };

  const pillIcon = getIcon();
  const crestOrFallback = renderCrestOrFallback();

  const content = (
    <Badge
      variant={(variant === "team" || variant === "competition") ? "outline" : "default"}
      className={cn(
        "gap-1.5 cursor-pointer transition-colors",
        variant === "team" && href && "hover-elevate",
        variant === "competition" && href && "hover-elevate",
        getVariantStyles(),
        variant === "team" && teamColor && "hover:opacity-90",
        className
      )}
      style={variant === "team" && teamColor ? { borderColor: teamColor } : undefined}
      data-testid={testId}
    >
      {crestOrFallback}
      {pillIcon}
      {label}
    </Badge>
  );

  if (href) {
    return (
      <Link href={href}>
        {content}
      </Link>
    );
  }

  return content;
}
