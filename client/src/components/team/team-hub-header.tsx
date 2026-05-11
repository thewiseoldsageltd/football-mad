import { EntityAvatar } from "@/components/entity-media";

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  return (words[0] ?? "?").slice(0, 2).toUpperCase();
}

export interface TeamHubHeaderProps {
  teamName: string;
  teamSlug: string;
  teamCrestUrl?: string | null;
  managerName?: string | null;
  clubPrimaryColor: string;
  clubSecondaryColor?: string;
  teamEntityId?: string | null;
}

export function TeamHubHeader({
  teamName,
  teamSlug,
  teamCrestUrl,
  managerName,
  clubPrimaryColor,
  clubSecondaryColor,
  teamEntityId,
}: TeamHubHeaderProps) {
  const safeTeamName = typeof teamName === "string" && teamName.trim() ? teamName.trim() : "Team";
  const safeTeamSlug = typeof teamSlug === "string" ? teamSlug.trim().toLowerCase() : "";
  const safePrimary = typeof clubPrimaryColor === "string" && clubPrimaryColor.trim() ? clubPrimaryColor : "#1a1a2e";
  const safeSecondary = typeof clubSecondaryColor === "string" && clubSecondaryColor.trim() ? clubSecondaryColor : "#FFFFFF";
  const baseStyle = {
    backgroundColor: safePrimary,
  };
  const glowStyle = {
    background:
      "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 26%, transparent 56%)",
  };
  const watermarkMaskStyle = {
    backgroundColor: safeSecondary,
    maskImage: `url(/assets/crests/mono/${safeTeamSlug}.svg)`,
    WebkitMaskImage: `url(/assets/crests/mono/${safeTeamSlug}.svg)`,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
    maskSize: "contain",
    WebkitMaskSize: "contain",
    opacity: 0.12,
  };

  return (
    <div className="relative overflow-hidden py-12 md:py-16">
      <div className="absolute inset-0" style={baseStyle} aria-hidden="true" />
      <div className="absolute inset-0" style={glowStyle} aria-hidden="true" />
      {safeTeamSlug ? (
        <div
          className="absolute right-[-3%] top-1/2 -translate-y-1/2 h-[145%] w-[45%] pointer-events-none"
          style={watermarkMaskStyle}
          aria-hidden="true"
        />
      ) : null}

      <div className="relative max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg bg-white/95 border border-white/60">
            {teamCrestUrl ? (
              <img src={teamCrestUrl} alt={safeTeamName} className="h-full w-full object-contain" />
            ) : teamEntityId ? (
              <EntityAvatar
                entityType="team"
                entityId={teamEntityId}
                surface="hub_header"
                label={safeTeamName}
                sizeClassName="h-full w-full"
                shape="square"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                {getInitials(safeTeamName)}
              </div>
            )}
          </div>

          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">{safeTeamName}</h1>
            {managerName ? (
              <div className="text-white/85 text-sm md:text-base">
                <span className="font-medium">Manager:</span> {managerName}
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}
