import { Switch, Route, Redirect, useSearch, useParams } from "wouter";
import { useQuery, QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ScrollToTop } from "@/components/scroll-to-top";
import { GoogleAnalytics } from "@/components/google-analytics";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import NewsPage from "@/pages/news";
import NewsResolver from "@/pages/news-resolver";
import TeamsPage from "@/pages/teams";
import TeamHubPage from "@/pages/team-hub";
import MatchesPage from "@/pages/matches";
import MatchPage from "@/pages/match";
import TransfersPage from "@/pages/transfers";
import InjuriesPage from "@/pages/injuries";
import FPLPage from "@/pages/fpl";
import CommunityPage from "@/pages/community";
import ShopPage from "@/pages/shop";
import CartPage from "@/pages/cart";
import AccountPage from "@/pages/account";
import PlayerProfilePage from "@/pages/player-profile";
import ManagerProfilePage from "@/pages/manager-profile";
import TablesPage from "@/pages/tables";
import CompetitionProfilePage from "@/pages/competition-profile";
import AuthorPage from "@/pages/author";
import AdminJobsPage from "@/pages/admin-jobs";
import SearchPage from "@/pages/search";
import { parseMatchSlug } from "@/lib/urls";
import { getGoalserveLeagueId } from "@/lib/league-config";
import {
  calendarFootballSeasonKey,
  seasonKeyToUrlSlug,
  seasonSlugToCanonical,
} from "@shared/season";

/**
 * regexparam does not treat `:home-vs-:away-:date` as three params with literals —
 * it becomes one oddly named key. Use a single `:slug` and dispatch on shape.
 */
function MatchesSlugResolver() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug?.trim() ?? "";
  if (slug && parseMatchSlug(slug)) {
    return <MatchPage />;
  }
  return <MatchesPage />;
}

function useCurrentTablesSeasonSlug(leagueSlug: string): { slug: string | null; loading: boolean } {
  const leagueId = getGoalserveLeagueId(leagueSlug) ?? "1204";
  const { data, isPending, isFetching } = useQuery<{ currentSeason: { slug: string } }>({
    queryKey: ["/api/standings/seasons", leagueId],
    queryFn: async () => {
      const res = await fetch(`/api/standings/seasons?leagueId=${encodeURIComponent(leagueId)}`);
      if (!res.ok) throw new Error("Failed to load seasons");
      return res.json();
    },
    staleTime: 60_000,
    retry: 2,
  });
  if (data?.currentSeason?.slug) return { slug: data.currentSeason.slug, loading: false };
  // Wait for the seasons API — do not calendar-fallback while in flight (July calendar
  // is still the previous season and would send users to a stale historical URL).
  if (isPending || isFetching) return { slug: null, loading: true };
  return { slug: seasonKeyToUrlSlug(calendarFootballSeasonKey()), loading: false };
}

function TablesLegacyRedirect() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const league = params.get("league") || "premier-league";
  const explicitSeason = params.get("season");
  const { slug, loading } = useCurrentTablesSeasonSlug(league);

  if (explicitSeason) {
    const canonical =
      seasonSlugToCanonical(explicitSeason.replace("/", "-")) ||
      seasonSlugToCanonical(explicitSeason);
    const seasonSlug = canonical
      ? seasonKeyToUrlSlug(canonical)
      : explicitSeason.replace("/", "-");
    return <Redirect to={`/tables/${league}/${seasonSlug}`} replace />;
  }

  if (loading || !slug) return null;
  return <Redirect to={`/tables/${league}/${slug}`} replace />;
}

function TablesCupsDefaultRedirect() {
  const slug = seasonKeyToUrlSlug(calendarFootballSeasonKey());
  return <Redirect to={`/tables/cups/fa-cup/${slug}`} replace />;
}

function TablesEuropeDefaultRedirect() {
  const slug = seasonKeyToUrlSlug(calendarFootballSeasonKey());
  return <Redirect to={`/tables/europe/champions-league/${slug}`} replace />;
}

function TablesLeagueDefaultRedirect() {
  const params = useParams<{ leagueSlug?: string }>();
  const leagueSlug = params.leagueSlug || "premier-league";
  const { slug, loading } = useCurrentTablesSeasonSlug(leagueSlug);
  if (loading || !slug) return null;
  return <Redirect to={`/tables/${leagueSlug}/${slug}`} replace />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/news" component={NewsPage} />
      <Route path="/authors/:slug" component={AuthorPage} />
      <Route path="/news/:slug" component={NewsResolver} />
      {/* Teams browse must be before /teams/:slug — that segment is team hub (club profiles). */}
      <Route path="/teams/league/:competitionSlug" component={TeamsPage} />
      <Route path="/teams" component={TeamsPage} />
      <Route path="/teams/:slug" component={TeamHubPage} />
      <Route path="/teams/:slug/:tab" component={TeamHubPage} />
      <Route path="/competitions/:slug" component={CompetitionProfilePage} />
      <Route path="/matches" component={MatchesPage} />
      <Route path="/matches/:slug" component={MatchesSlugResolver} />
      <Route path="/players/:slug" component={PlayerProfilePage} />
      <Route path="/managers/:slug" component={ManagerProfilePage} />
      <Route path="/transfers" component={TransfersPage} />
      <Route path="/injuries" component={InjuriesPage} />
      <Route path="/tables/cups/:cupSlug/:seasonSlug" component={TablesPage} />
      <Route path="/tables/europe/:competitionSlug/:seasonSlug" component={TablesPage} />
      <Route path="/tables/cups" component={TablesCupsDefaultRedirect} />
      <Route path="/tables/europe" component={TablesEuropeDefaultRedirect} />
      <Route path="/tables/:leagueSlug/:seasonSlug" component={TablesPage} />
      <Route path="/tables/:leagueSlug" component={TablesLeagueDefaultRedirect} />
      <Route path="/tables" component={TablesLegacyRedirect} />
      <Route path="/fpl" component={FPLPage} />
      <Route path="/community" component={CommunityPage} />
      <Route path="/shop" component={ShopPage} />
      <Route path="/shop/cart" component={CartPage} />
      <Route path="/shop/:teamSlug" component={ShopPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/admin/jobs" component={AdminJobsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="football-mad-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ScrollToTop />
          <GoogleAnalytics />
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
