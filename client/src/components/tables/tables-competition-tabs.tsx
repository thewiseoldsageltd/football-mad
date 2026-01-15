import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { leagueCompetitions, europeCompetitions, cupCompetitions } from "@/data/tables-mock";

type TopTab = "leagues" | "cups" | "europe";

interface TablesCompetitionTabsProps {
  topTab: TopTab;
  leagueCompetition: string;
  europeCompetition: string;
  cupCompetition: string;
  onLeagueChange: (value: string) => void;
  onEuropeChange: (value: string) => void;
  onCupChange: (value: string) => void;
}

export function TablesCompetitionTabs({
  topTab,
  leagueCompetition,
  europeCompetition,
  cupCompetition,
  onLeagueChange,
  onEuropeChange,
  onCupChange,
}: TablesCompetitionTabsProps) {
  if (topTab === "leagues") {
    return (
      <Tabs value={leagueCompetition} onValueChange={onLeagueChange}>
        <TabsList className="inline-flex h-auto gap-1 w-max" data-testid="tabs-leagues-competition">
          <TabsTrigger value="all" className="whitespace-nowrap" data-testid="tab-league-all">
            All
          </TabsTrigger>
          {leagueCompetitions.map((comp) => (
            <TabsTrigger
              key={comp.id}
              value={comp.id}
              className="whitespace-nowrap"
              data-testid={`tab-league-${comp.id}`}
            >
              {comp.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    );
  }

  if (topTab === "europe") {
    return (
      <Tabs value={europeCompetition} onValueChange={onEuropeChange}>
        <TabsList className="inline-flex h-auto gap-1 w-max" data-testid="tabs-europe-competition">
          {europeCompetitions.map((comp) => (
            <TabsTrigger
              key={comp.id}
              value={comp.id}
              className="whitespace-nowrap"
              data-testid={`tab-europe-${comp.id}`}
            >
              {comp.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    );
  }

  if (topTab === "cups") {
    return (
      <Tabs value={cupCompetition} onValueChange={onCupChange}>
        <TabsList className="inline-flex h-auto gap-1 w-max" data-testid="tabs-cups-competition">
          {cupCompetitions.map((comp) => (
            <TabsTrigger
              key={comp.id}
              value={comp.id}
              className="whitespace-nowrap"
              data-testid={`tab-cup-${comp.id}`}
            >
              {comp.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    );
  }

  return null;
}
