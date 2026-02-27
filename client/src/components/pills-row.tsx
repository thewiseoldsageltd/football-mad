import { EntityPill, type EntityData } from "@/components/entity-pill";
import { cn } from "@/lib/utils";

interface PillsRowProps {
  pills: EntityData[];
  max?: number;
  className?: string;
  pillClassName?: string;
  testIdPrefix?: string;
  constrainHeight?: boolean;
}

/**
 * Reusable pills row for cards/lists.
 * Pills can optionally carry href for future navigation wiring.
 */
export function PillsRow({
  pills,
  max = 3,
  className,
  pillClassName,
  testIdPrefix = "pill",
  constrainHeight = true,
}: PillsRowProps) {
  const display = pills.slice(0, max);
  if (display.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-start content-start gap-1.5", constrainHeight && "max-h-12 overflow-hidden", className)}>
      {display.map((pill) => (
        <EntityPill
          key={`${pill.type}-${pill.slug}`}
          entity={pill}
          size="small"
          className={pillClassName}
          data-testid={`${testIdPrefix}-${pill.type}-${pill.slug}`}
        />
      ))}
    </div>
  );
}
