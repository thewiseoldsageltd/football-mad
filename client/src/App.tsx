import { Switch, Route, Redirect, useSearch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ScrollToTop } from "@/components/scroll-to-top";
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

function seasonApiToSlug(apiSeason: string): string {
  const match = apiSeason.match(/^(\d{4})\/(\d{2,4})$/);
  if (match) {
    const startYear = match[1];
    const endPart = match[2];
    const endYear = endPart.length === 4 ? endPart.slice(2) : endPart;
    return `${startYear}-${endYear}`;
  }
  return apiSeason.replace("/", "-");
}

function TablesLegacyRedirect() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const league = params.get("league") || "premier-league";
  const season = params.get("season") || "2025/26";
  const seasonSlug = seasonApiToSlug(season);
  return <Redirect to={`/tables/${league}/${seasonSlug}`} replace />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/news" component={NewsPage} />
      <Route path="/news/:slug" component={NewsResolver} />
      <Route path="/teams" component={TeamsPage} />
      <Route path="/teams/:slug" component={TeamHubPage} />
      <Route path="/teams/:slug/:tab" component={TeamHubPage} />
      <Route path="/matches" component={MatchesPage} />
      <Route path="/matches/:competitionSlug" component={MatchesPage} />
      <Route path="/matches/:homeSlug-vs-:awaySlug-:date" component={MatchPage} />
      <Route path="/players/:slug" component={PlayerProfilePage} />
      <Route path="/managers/:slug" component={ManagerProfilePage} />
      <Route path="/transfers" component={TransfersPage} />
      <Route path="/injuries" component={InjuriesPage} />
      <Route path="/tables/:leagueSlug/:seasonSlug" component={TablesPage} />
      <Route path="/tables" component={TablesLegacyRedirect} />
      <Route path="/fpl" component={FPLPage} />
      <Route path="/community" component={CommunityPage} />
      <Route path="/shop" component={ShopPage} />
      <Route path="/shop/cart" component={CartPage} />
      <Route path="/shop/:teamSlug" component={ShopPage} />
      <Route path="/account" component={AccountPage} />
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
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
