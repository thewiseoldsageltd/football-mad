import { useState } from "react";
import { Link } from "wouter";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaxonomyPillVariant = "team" | "competition" | "default";

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
          className="w-4 h-4 rounded-sm flex-shrink-0"
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

function AccentBar({ color }: { color: string }) {
  return (
    <div 
      className="w-1 h-4 rounded-full flex-shrink-0 -ml-0.5"
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
  const isEntityPill = variant === "team" || variant === "competition";
  
  const accentColor = variant === "team" 
    ? (teamColor || "#334155")
    : variant === "competition" 
      ? "#64748b"
      : null;

  const renderIcon = () => {
    if (icon) return icon;
    
    if (variant === "team" && crestUrl) {
      return (
        <CrestWithFallback 
          src={crestUrl} 
          alt={label} 
          fallbackColor={teamColor}
        />
      );
    }

    if (variant === "competition" && crestUrl) {
      return (
        <CrestWithFallback 
          src={crestUrl} 
          alt={label}
          fallbackIcon={<Trophy className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
        />
      );
    }
    
    if (variant === "competition") {
      return <Trophy className="h-4 w-4 text-slate-500 dark:text-slate-400" />;
    }

    return null;
  };

  const pillIcon = renderIcon();

  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
        "text-sm font-medium",
        "bg-white dark:bg-gray-900",
        "border border-gray-200 dark:border-gray-700",
        "cursor-pointer transition-all",
        href && "hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm",
        className
      )}
      data-testid={testId}
    >
      {accentColor && <AccentBar color={accentColor} />}
      {pillIcon}
      <span className="text-foreground">{label}</span>
    </div>
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
