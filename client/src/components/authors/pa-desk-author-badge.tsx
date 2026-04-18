import { cn } from "@/lib/utils";

/**
 * Desk byline visual for PA Sport Staff / PA Sport Reporters — not an official PA Media trademark asset;
 * geometric mark + label for trust in the Football Mad UI.
 */
export function PaDeskAuthorBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center rounded-2xl border border-border/80 bg-gradient-to-br from-muted/80 to-muted/40 px-2 py-2 text-center shadow-sm",
        className,
      )}
      aria-label="PA Media syndicated desk"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
        <span className="font-black tracking-tight text-primary text-sm leading-none">PA</span>
      </div>
      <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
        Media
      </span>
    </div>
  );
}
