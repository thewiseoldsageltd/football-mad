import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type CompetitionNavGroup = "leagues" | "cups" | "europe";

export interface GroupedCompetitionNavItem {
  value: string;
  label: string;
}

interface GroupedCompetitionNavProps {
  selectedGroup: CompetitionNavGroup;
  onGroupChange: (group: CompetitionNavGroup) => void;
  selectedCompetition: string;
  onCompetitionChange: (competitionValue: string) => void;
  competitions: GroupedCompetitionNavItem[];
  rightDesktopSlot?: ReactNode;
  rightMobileSlot?: ReactNode;
  desktopGroupTabsTestId?: string;
  desktopCompetitionTabsTestId?: string;
  mobileGroupTabsTestId?: string;
  mobileCompetitionTabsTestId?: string;
  desktopGroupTabTestIdPrefix?: string;
  desktopCompetitionTabTestIdPrefix?: string;
  mobileGroupTabTestIdPrefix?: string;
  mobileCompetitionTabTestIdPrefix?: string;
}

export function GroupedCompetitionNav({
  selectedGroup,
  onGroupChange,
  selectedCompetition,
  onCompetitionChange,
  competitions,
  rightDesktopSlot,
  rightMobileSlot,
  desktopGroupTabsTestId = "tabs-top",
  desktopCompetitionTabsTestId = "tabs-competition",
  mobileGroupTabsTestId = "tabs-top-mobile",
  mobileCompetitionTabsTestId = "tabs-competition-mobile",
  desktopGroupTabTestIdPrefix = "tab-top",
  desktopCompetitionTabTestIdPrefix = "tab-competition",
  mobileGroupTabTestIdPrefix = "tab-top",
  mobileCompetitionTabTestIdPrefix = "tab-competition",
}: GroupedCompetitionNavProps) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const competitionScrollRef = useRef<HTMLDivElement>(null);
  const [showTopLeftFade, setShowTopLeftFade] = useState(false);
  const [showTopRightFade, setShowTopRightFade] = useState(false);
  const [showCompLeftFade, setShowCompLeftFade] = useState(false);
  const [showCompRightFade, setShowCompRightFade] = useState(false);

  const updateFades = useCallback(() => {
    const topEl = topScrollRef.current;
    if (topEl) {
      const { scrollLeft, scrollWidth, clientWidth } = topEl;
      const isScrollable = scrollWidth > clientWidth;
      setShowTopLeftFade(isScrollable && scrollLeft > 0);
      setShowTopRightFade(isScrollable && scrollLeft + clientWidth < scrollWidth - 1);
    }

    const compEl = competitionScrollRef.current;
    if (compEl) {
      const { scrollLeft, scrollWidth, clientWidth } = compEl;
      const isScrollable = scrollWidth > clientWidth;
      setShowCompLeftFade(isScrollable && scrollLeft > 0);
      setShowCompRightFade(isScrollable && scrollLeft + clientWidth < scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = 0;
    }
    if (competitionScrollRef.current) {
      competitionScrollRef.current.scrollLeft = 0;
    }
    setShowTopLeftFade(false);
    setShowCompLeftFade(false);
    requestAnimationFrame(updateFades);
  }, [updateFades]);

  useEffect(() => {
    if (competitionScrollRef.current) {
      competitionScrollRef.current.scrollLeft = 0;
    }
    setShowCompLeftFade(false);
    requestAnimationFrame(updateFades);
  }, [selectedGroup, updateFades]);

  useEffect(() => {
    const topEl = topScrollRef.current;
    const compEl = competitionScrollRef.current;
    const handleScroll = () => updateFades();

    if (topEl) {
      topEl.addEventListener("scroll", handleScroll, { passive: true });
      const topObserver = new ResizeObserver(updateFades);
      topObserver.observe(topEl);
    }

    if (compEl) {
      compEl.addEventListener("scroll", handleScroll, { passive: true });
      const compObserver = new ResizeObserver(updateFades);
      compObserver.observe(compEl);
    }

    updateFades();

    return () => {
      topEl?.removeEventListener("scroll", handleScroll);
      compEl?.removeEventListener("scroll", handleScroll);
    };
  }, [updateFades, selectedGroup, competitions]);

  return (
    <>
      <div className="hidden md:block mb-6">
        <div className="bg-muted/50 rounded-lg p-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Tabs value={selectedGroup} onValueChange={(v) => onGroupChange(v as CompetitionNavGroup)}>
                <TabsList className="h-auto gap-1" data-testid={desktopGroupTabsTestId}>
                  <TabsTrigger value="leagues" data-testid={`${desktopGroupTabTestIdPrefix}-leagues`}>Leagues</TabsTrigger>
                  <TabsTrigger value="cups" data-testid={`${desktopGroupTabTestIdPrefix}-cups`}>Cups</TabsTrigger>
                  <TabsTrigger value="europe" data-testid={`${desktopGroupTabTestIdPrefix}-europe`}>Europe</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="h-6 w-px bg-border shrink-0" />

              <div className="overflow-x-auto scrollbar-hide">
                <Tabs value={selectedCompetition} onValueChange={onCompetitionChange}>
                  <TabsList className="inline-flex h-auto gap-1 w-max" data-testid={desktopCompetitionTabsTestId}>
                    {competitions.map((comp) => (
                      <TabsTrigger
                        key={comp.value}
                        value={comp.value}
                        className="whitespace-nowrap"
                        data-testid={`${desktopCompetitionTabTestIdPrefix}-${comp.value}`}
                      >
                        {comp.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {rightDesktopSlot}
          </div>
        </div>
      </div>

      <div className="md:hidden space-y-4 mb-6">
        <div className="relative">
          <div
            ref={topScrollRef}
            className="overflow-x-auto scrollbar-hide"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <Tabs value={selectedGroup} onValueChange={(v) => onGroupChange(v as CompetitionNavGroup)}>
              <TabsList className="inline-flex h-auto gap-1 w-max" data-testid={mobileGroupTabsTestId}>
                <TabsTrigger value="leagues" className="whitespace-nowrap" data-testid={`${mobileGroupTabTestIdPrefix}-leagues-mobile`}>Leagues</TabsTrigger>
                <TabsTrigger value="cups" className="whitespace-nowrap" data-testid={`${mobileGroupTabTestIdPrefix}-cups-mobile`}>Cups</TabsTrigger>
                <TabsTrigger value="europe" className="whitespace-nowrap" data-testid={`${mobileGroupTabTestIdPrefix}-europe-mobile`}>Europe</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {showTopLeftFade && (
            <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" />
          )}
          {showTopRightFade && (
            <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background to-transparent" />
          )}
        </div>

        <div className="relative">
          <div
            ref={competitionScrollRef}
            className="overflow-x-auto scrollbar-hide"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <Tabs value={selectedCompetition} onValueChange={onCompetitionChange}>
              <TabsList className="inline-flex h-auto gap-1 w-max" data-testid={mobileCompetitionTabsTestId}>
                {competitions.map((comp) => (
                  <TabsTrigger
                    key={comp.value}
                    value={comp.value}
                    className="whitespace-nowrap"
                    data-testid={`${mobileCompetitionTabTestIdPrefix}-${comp.value}-mobile`}
                  >
                    {comp.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          {showCompLeftFade && (
            <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" />
          )}
          {showCompRightFade && (
            <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background to-transparent" />
          )}
        </div>

        {rightMobileSlot}
      </div>
    </>
  );
}
