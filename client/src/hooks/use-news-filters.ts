import { useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { 
  NEWS_COMPETITIONS, 
  NEWS_CONTENT_TYPES, 
  NEWS_SORT_OPTIONS, 
  NEWS_TIME_RANGES 
} from "@shared/schema";

export type CompetitionSlug = keyof typeof NEWS_COMPETITIONS;
export type ContentTypeSlug = keyof typeof NEWS_CONTENT_TYPES;
export type SortOption = keyof typeof NEWS_SORT_OPTIONS;
export type TimeRange = keyof typeof NEWS_TIME_RANGES;

export interface NewsFiltersState {
  comp: CompetitionSlug;
  type: ContentTypeSlug[];
  teams: string[];
  myTeams: boolean;
  sort: SortOption;
  range: TimeRange;
  breaking: boolean;
}

export interface UseNewsFiltersReturn {
  filters: NewsFiltersState;
  setFilter: <K extends keyof NewsFiltersState>(key: K, value: NewsFiltersState[K]) => void;
  setFilters: (updates: Partial<NewsFiltersState>) => void;
  toggleType: (type: ContentTypeSlug) => void;
  toggleTeam: (teamSlug: string) => void;
  removeFilter: (key: keyof NewsFiltersState, value?: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  shouldNoIndex: boolean;
  canonicalUrl: string;
  buildQueryString: (overrides?: Partial<NewsFiltersState>) => string;
  buildApiQueryString: () => string;
}

function parseSearchParams(search: string): NewsFiltersState {
  const params = new URLSearchParams(search);
  
  const comp = (params.get("comp") || "all") as CompetitionSlug;
  const typeParam = params.get("type");
  const teamsParam = params.get("teams");
  const sort = (params.get("sort") || "latest") as SortOption;
  const range = (params.get("range") || "all") as TimeRange;
  const breaking = params.get("breaking") === "true";
  
  const validComp = Object.keys(NEWS_COMPETITIONS).includes(comp) ? comp : "all";
  const validSort = Object.keys(NEWS_SORT_OPTIONS).includes(sort) ? sort : "latest";
  const validRange = Object.keys(NEWS_TIME_RANGES).includes(range) ? range : "all";
  
  const type = typeParam 
    ? typeParam.split(",").filter(t => Object.keys(NEWS_CONTENT_TYPES).includes(t)) as ContentTypeSlug[]
    : [];
  
  const myTeams = teamsParam === "my";
  const teams = teamsParam && teamsParam !== "my" 
    ? teamsParam.split(",").filter(Boolean)
    : [];

  return {
    comp: validComp,
    type,
    teams,
    myTeams,
    sort: validSort,
    range: validRange,
    breaking,
  };
}

function buildSearchString(filters: NewsFiltersState, forUrl: boolean = true): string {
  const params = new URLSearchParams();
  
  if (forUrl) {
    if (filters.comp !== "all") {
      params.set("comp", filters.comp);
    }
  } else {
    params.set("comp", filters.comp);
  }
  
  if (filters.type.length > 0) {
    params.set("type", filters.type.join(","));
  }
  
  if (filters.myTeams) {
    params.set("teams", "my");
  } else if (filters.teams.length > 0) {
    params.set("teams", filters.teams.join(","));
  }
  
  if (filters.sort !== "latest") {
    params.set("sort", filters.sort);
  }
  
  if (filters.range !== "all") {
    params.set("range", filters.range);
  }
  
  if (filters.breaking) {
    params.set("breaking", "true");
  }
  
  const str = params.toString();
  return str ? `?${str}` : "";
}

export function useNewsFilters(): UseNewsFiltersReturn {
  const search = useSearch();
  const [, setLocation] = useLocation();
  
  const filters = useMemo(() => parseSearchParams(search), [search]);
  
  const updateUrl = useCallback((newFilters: NewsFiltersState) => {
    const queryString = buildSearchString(newFilters);
    setLocation(`/news${queryString}`, { replace: true });
  }, [setLocation]);
  
  const setFilter = useCallback(<K extends keyof NewsFiltersState>(
    key: K, 
    value: NewsFiltersState[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    
    if (key === "myTeams" && value === true) {
      newFilters.teams = [];
    } else if (key === "teams" && (value as string[]).length > 0) {
      newFilters.myTeams = false;
    }
    
    updateUrl(newFilters);
  }, [filters, updateUrl]);
  
  const setFilters = useCallback((updates: Partial<NewsFiltersState>) => {
    const newFilters = { ...filters, ...updates };
    
    if (updates.myTeams === true) {
      newFilters.teams = [];
    } else if (updates.teams && updates.teams.length > 0) {
      newFilters.myTeams = false;
    }
    
    updateUrl(newFilters);
  }, [filters, updateUrl]);
  
  const toggleType = useCallback((type: ContentTypeSlug) => {
    const newTypes = filters.type.includes(type)
      ? filters.type.filter(t => t !== type)
      : [...filters.type, type];
    setFilter("type", newTypes);
  }, [filters.type, setFilter]);
  
  const toggleTeam = useCallback((teamSlug: string) => {
    const newTeams = filters.teams.includes(teamSlug)
      ? filters.teams.filter(t => t !== teamSlug)
      : [...filters.teams, teamSlug];
    
    const newFilters = { 
      ...filters, 
      teams: newTeams,
      myTeams: false,
    };
    updateUrl(newFilters);
  }, [filters, updateUrl]);
  
  const removeFilter = useCallback((key: keyof NewsFiltersState, value?: string) => {
    const newFilters = { ...filters };
    
    switch (key) {
      case "comp":
        newFilters.comp = "all";
        break;
      case "type":
        if (value) {
          newFilters.type = filters.type.filter(t => t !== value);
        } else {
          newFilters.type = [];
        }
        break;
      case "teams":
        if (value) {
          newFilters.teams = filters.teams.filter(t => t !== value);
        } else {
          newFilters.teams = [];
        }
        break;
      case "myTeams":
        newFilters.myTeams = false;
        newFilters.teams = [];
        break;
      case "sort":
        newFilters.sort = "latest";
        break;
      case "range":
        newFilters.range = "all";
        break;
      case "breaking":
        newFilters.breaking = false;
        break;
    }
    
    updateUrl(newFilters);
  }, [filters, updateUrl]);
  
  const clearFilters = useCallback(() => {
    const currentComp = filters.comp;
    updateUrl({
      comp: currentComp,
      type: [],
      teams: [],
      myTeams: false,
      sort: "latest",
      range: "all",
      breaking: false,
    });
  }, [filters.comp, updateUrl]);
  
  const hasActiveFilters = useMemo(() => {
    return (
      filters.type.length > 0 ||
      filters.teams.length > 0 ||
      filters.myTeams ||
      filters.sort !== "latest" ||
      filters.range !== "all" ||
      filters.breaking
    );
  }, [filters]);
  
  const shouldNoIndex = useMemo(() => {
    return (
      filters.type.length > 0 ||
      filters.teams.length > 0 ||
      filters.myTeams ||
      filters.sort !== "latest" ||
      filters.range !== "all" ||
      filters.breaking
    );
  }, [filters]);
  
  const canonicalUrl = useMemo(() => {
    const base = "/news";
    if (filters.comp !== "all") {
      return `${base}?comp=${filters.comp}`;
    }
    return base;
  }, [filters.comp]);
  
  const buildQueryString = useCallback((overrides?: Partial<NewsFiltersState>) => {
    const merged = { ...filters, ...overrides };
    return buildSearchString(merged, true);
  }, [filters]);
  
  const buildApiQueryString = useCallback(() => {
    return buildSearchString(filters, false);
  }, [filters]);
  
  return {
    filters,
    setFilter,
    setFilters,
    toggleType,
    toggleTeam,
    removeFilter,
    clearFilters,
    hasActiveFilters,
    shouldNoIndex,
    canonicalUrl,
    buildQueryString,
    buildApiQueryString,
  };
}
