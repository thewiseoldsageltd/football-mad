import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TopTab = "leagues" | "cups" | "europe";

interface TablesTopTabsProps {
  value: TopTab;
  onValueChange: (value: TopTab) => void;
  mobile?: boolean;
}

export function TablesTopTabs({ value, onValueChange, mobile = false }: TablesTopTabsProps) {
  const testIdSuffix = mobile ? "-mobile" : "";

  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as TopTab)}>
      <TabsList 
        className={`h-auto gap-1 ${mobile ? "inline-flex w-max" : ""}`} 
        data-testid={`tabs-top${testIdSuffix}`}
      >
        <TabsTrigger 
          value="leagues" 
          className={mobile ? "whitespace-nowrap" : ""}
          data-testid={`tab-top-leagues${testIdSuffix}`}
        >
          Leagues
        </TabsTrigger>
        <TabsTrigger 
          value="cups" 
          className={mobile ? "whitespace-nowrap" : ""}
          data-testid={`tab-top-cups${testIdSuffix}`}
        >
          Cups
        </TabsTrigger>
        <TabsTrigger 
          value="europe" 
          className={mobile ? "whitespace-nowrap" : ""}
          data-testid={`tab-top-europe${testIdSuffix}`}
        >
          Europe
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
