import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ScrollToTop } from "@/components/scroll-to-top";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import NewsPage from "@/pages/news";
import ArticlePage, { LegacyArticleRedirect } from "@/pages/article";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/news" component={NewsPage} />
      <Route path="/article/:slug" component={ArticlePage} />
      <Route path="/news/:slug" component={LegacyArticleRedirect} />
      <Route path="/teams" component={TeamsPage} />
      <Route path="/teams/:slug" component={TeamHubPage} />
      <Route path="/teams/:slug/:tab" component={TeamHubPage} />
      <Route path="/matches" component={MatchesPage} />
      <Route path="/matches/:slug" component={MatchPage} />
      <Route path="/matches/:slug/report" component={MatchPage} />
      <Route path="/transfers" component={TransfersPage} />
      <Route path="/injuries" component={InjuriesPage} />
      <Route path="/fpl" component={FPLPage} />
      <Route path="/community" component={CommunityPage} />
      <Route path="/shop" component={ShopPage} />
      <Route path="/shop/cart" component={CartPage} />
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
