import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const WORLD_CUP_NEWS_HREF = "/news?comp=fifa-world-cup";
const WORLD_CUP_LOGO_SRC = "/assets/fifa-world-cup-logo.svg";

type NavItem = {
  label: string;
  href: string;
  iconSrc?: string;
  iconAlt?: string;
  isActive?: (location: string, search: string) => boolean;
};

function isWorldCupNewsActive(location: string, search: string): boolean {
  if (location !== "/news") return false;
  const qs = search.startsWith("?") ? search.slice(1) : search;
  const comp = new URLSearchParams(qs).get("comp");
  return comp === "fifa-world-cup" || comp === "world-cup";
}

/** MVP nav — World Cup href can later become /world-cup or /competitions/world-cup. */
const mvpNavItems: NavItem[] = [
  {
    label: "News",
    href: "/news",
    isActive: (loc, search) => loc === "/news" && !isWorldCupNewsActive(loc, search),
  },
  {
    label: "World Cup",
    href: WORLD_CUP_NEWS_HREF,
    iconSrc: WORLD_CUP_LOGO_SRC,
    iconAlt: "FIFA World Cup",
    isActive: (loc, search) => isWorldCupNewsActive(loc, search),
  },
  { label: "Matches", href: "/matches" },
  { label: "Tables", href: "/tables" },
  { label: "Teams", href: "/teams" },
];

function navItemActive(item: NavItem, location: string, search: string): boolean {
  if (item.isActive) return item.isActive(location, search);
  return location === item.href;
}

function NavLinkContent({ item }: { item: NavItem }) {
  return (
    <span className="inline-flex items-center gap-2">
      {item.iconSrc ? (
        <img
          src={item.iconSrc}
          alt={item.iconAlt ?? ""}
          className="h-[18px] w-auto max-w-[22px] shrink-0 object-contain sm:h-5"
          width={20}
          height={20}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <span>{item.label}</span>
    </span>
  );
}

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const search = useSearch();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
              <span className="font-bold text-xl sm:hidden">Football Mad</span>
              <span className="hidden text-xl font-bold leading-none sm:block">Football Mad</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {mvpNavItems.map((item) => {
                const active = navItemActive(item, location, search);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors hover-elevate ${
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`link-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <NavLinkContent item={item} />
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex"
              type="button"
              aria-label="Search"
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
              {mvpNavItems.map((item) => {
                const active = navItemActive(item, location, search);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid={`link-mobile-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <NavLinkContent item={item} />
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
