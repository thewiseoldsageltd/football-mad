import { Heart, HeartOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/entity-media";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

function darkenHex(hex: string, amount = 0.22): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 - clamp(amount, 0, 0.8);
  const r = Math.round(clamp(rgb.r * factor, 0, 255));
  const g = Math.round(clamp(rgb.g * factor, 0, 255));
  const b = Math.round(clamp(rgb.b * factor, 0, 255));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

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
  teamEntityId?: string | null;
  isFollowing: boolean;
  isFollowPending?: boolean;
  onFollowToggle: () => void;
}

export function TeamHubHeader({
  teamName,
  teamSlug,
  teamCrestUrl,
  managerName,
  clubPrimaryColor,
  teamEntityId,
  isFollowing,
  isFollowPending = false,
  onFollowToggle,
}: TeamHubHeaderProps) {
  const safeTeamName = typeof teamName === "string" && teamName.trim() ? teamName.trim() : "Team";
  const safePrimary = typeof clubPrimaryColor === "string" && clubPrimaryColor.trim() ? clubPrimaryColor : "#1a1a2e";
  const darker = darkenHex(safePrimary, 0.28);
  const baseStyle = {
    backgroundColor: safePrimary,
  };
  const glowStyle = {
    background:
      "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 26%, transparent 56%)",
  };

  return (
    <div className="relative overflow-hidden py-12 md:py-16">
      <div className="absolute inset-0" style={baseStyle} aria-hidden="true" />
      <div className="absolute inset-0" style={glowStyle} aria-hidden="true" />

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

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              variant={isFollowing ? "secondary" : "default"}
              onClick={onFollowToggle}
              disabled={isFollowPending}
              className="bg-white text-black shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200"
              data-testid="button-follow-team"
            >
              {isFollowing ? (
                <>
                  <HeartOff className="h-5 w-5 mr-2" />
                  Unfollow
                </>
              ) : (
                <>
                  <Heart className="h-5 w-5 mr-2" />
                  Follow
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 border-white/30 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:bg-white/20 active:translate-y-0 active:shadow-md transition-all duration-200"
              data-testid="button-subscribe-newsletter"
            >
              <Mail className="h-5 w-5 mr-2" />
              Subscribe
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
