import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchResults } from "@/lib/urls";

/** MVP: News, Matches, Tables, Teams — hidden routes remain reachable by URL for v2. */
const mvpNavItems = [
  { label: "News", href: "/news" },
  { label: "Matches", href: "/matches" },
  { label: "Tables", href: "/tables" },
  { label: "Teams", href: "/teams" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [location, navigate] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isSearchOpen]);

  const submitSearch = () => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    setIsSearchOpen(false);
    setSearchQuery("");
    navigate(searchResults(q));
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-150 ${
        isScrolled
          ? "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b"
          : "bg-background border-b"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
              <img
                src="/assets/football-mad-fm-logo.webp"
                alt="Football Mad"
                className="h-8 w-8 shrink-0 rounded-md object-contain"
              />
              <span className="font-bold text-xl sm:hidden">
                Football Mad
              </span>
              <span className="hidden text-xl font-bold leading-none sm:block">Football Mad</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {mvpNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors hover-elevate ${
                    location === item.href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`link-nav-${item.label.toLowerCase()}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label="Search"
              onClick={() => setIsSearchOpen(true)}
              data-testid="button-search"
            >
              <Search className="h-5 w-5" />
            </Button>

            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              type="button"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="primary-mobile-navigation"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div id="primary-mobile-navigation" className="lg:hidden pb-4 border-t pt-4">
            <nav className="flex flex-col gap-1">
              {mvpNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    location === item.href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-testid={`link-mobile-nav-${item.label.toLowerCase()}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>

      <Dialog
        open={isSearchOpen}
        onOpenChange={(open) => {
          setIsSearchOpen(open);
          if (!open) setSearchQuery("");
        }}
      >
        <DialogContent className="sm:max-w-md" data-testid="dialog-search">
          <DialogHeader>
            <DialogTitle>Search Football Mad</DialogTitle>
            <DialogDescription>
              Search article titles and excerpts. Press Enter to view results.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch();
            }}
          >
            <Input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news and articles…"
              aria-label="Search news and articles"
              data-testid="input-search-dialog"
            />
            <Button type="submit" disabled={searchQuery.trim().length < 2} data-testid="button-search-submit">
              Search
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
