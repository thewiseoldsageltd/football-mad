import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Calendar } from "lucide-react";
import { isToday, isTomorrow, addDays, startOfDay, isBefore, isAfter } from "date-fns";
import { MatchesTabs, type MatchTab } from "@/components/matches/MatchesTabs";
import { MatchesFilters } from "@/components/matches/MatchesFilters";
import { MatchesList } from "@/components/matches/MatchesList";
import { mockMatches, type MockMatch } from "@/components/matches/mockMatches";

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState<MatchTab>("today");
  const [competition, setCompetition] = useState("all");
  const [sortBy, setSortBy] = useState("kickoff");
  const [teamSearch, setTeamSearch] = useState("");

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const endOfWeek = addDays(today, 7);

  const filterByTab = (matches: MockMatch[], tab: MatchTab): MockMatch[] => {
    return matches.filter((match) => {
      const kickoff = new Date(match.kickOffTime);
      const kickoffDay = startOfDay(kickoff);
      
      switch (tab) {
        case "today":
          return isToday(kickoff);
        case "tomorrow":
          return isTomorrow(kickoff);
        case "thisWeek":
          return isAfter(kickoffDay, tomorrow) && isBefore(kickoff, endOfWeek);
        case "results":
          return match.status === "finished" || match.status === "postponed";
        default:
          return true;
      }
    });
  };

  const applyFilters = (matches: MockMatch[]): MockMatch[] => {
    let filtered = [...matches];

    if (competition !== "all") {
      const compName = competition
        .split("-")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      filtered = filtered.filter(m => m.competition === compName);
    }

    if (teamSearch.trim()) {
      const search = teamSearch.toLowerCase().trim();
      filtered = filtered.filter(
        m =>
          m.homeTeam.name.toLowerCase().includes(search) ||
          m.awayTeam.name.toLowerCase().includes(search) ||
          m.homeTeam.shortName.toLowerCase().includes(search) ||
          m.awayTeam.shortName.toLowerCase().includes(search)
      );
    }

    if (sortBy === "kickoff") {
      filtered.sort((a, b) => new Date(a.kickOffTime).getTime() - new Date(b.kickOffTime).getTime());
    } else if (sortBy === "competition") {
      filtered.sort((a, b) => a.competition.localeCompare(b.competition));
    }

    return filtered;
  };

  const todaysMatches = useMemo(() => filterByTab(mockMatches, "today"), []);
  const tomorrowsMatches = useMemo(() => filterByTab(mockMatches, "tomorrow"), []);
  const thisWeekMatches = useMemo(() => filterByTab(mockMatches, "thisWeek"), []);
  const resultsMatches = useMemo(() => filterByTab(mockMatches, "results"), []);

  const counts = {
    today: todaysMatches.length,
    tomorrow: tomorrowsMatches.length,
    thisWeek: thisWeekMatches.length,
    results: resultsMatches.length,
  };

  const currentMatches = useMemo(() => {
    const tabMatches = filterByTab(mockMatches, activeTab);
    return applyFilters(tabMatches);
  }, [activeTab, competition, sortBy, teamSearch]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold" data-testid="heading-matches">Matches</h1>
            <p className="text-muted-foreground text-lg">
              Premier League fixtures and results
            </p>
          </div>
        </div>

        <div className="hidden md:flex md:items-center md:justify-between gap-4 mb-6">
          <MatchesTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
            variant="desktop"
          />
          <MatchesFilters
            competition={competition}
            onCompetitionChange={setCompetition}
            sortBy={sortBy}
            onSortChange={setSortBy}
            teamSearch={teamSearch}
            onTeamSearchChange={setTeamSearch}
            variant="inline"
          />
        </div>

        <div className="md:hidden">
          <MatchesTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
            variant="mobile"
          />
          <MatchesFilters
            competition={competition}
            onCompetitionChange={setCompetition}
            sortBy={sortBy}
            onSortChange={setSortBy}
            teamSearch={teamSearch}
            onTeamSearchChange={setTeamSearch}
            variant="stacked"
          />
        </div>

        <MatchesList matches={currentMatches} />
      </div>
    </MainLayout>
  );
}
