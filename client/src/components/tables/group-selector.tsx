import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GroupSelectorProps {
  groups: string[];
  selectedGroup: string;
  onGroupChange: (group: string) => void;
}

export function GroupSelector({ groups, selectedGroup, onGroupChange }: GroupSelectorProps) {
  return (
    <Tabs value={selectedGroup} onValueChange={onGroupChange} className="w-auto">
      <TabsList className="flex-wrap h-auto gap-1" data-testid="tabs-groups">
        {groups.map((group) => (
          <TabsTrigger 
            key={group} 
            value={group}
            className="text-xs"
            data-testid={`tab-group-${group.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {group}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
