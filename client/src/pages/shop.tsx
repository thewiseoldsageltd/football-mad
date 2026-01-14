import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ProductCard } from "@/components/cards/product-card";
import { ProductCardSkeleton } from "@/components/skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product, Team } from "@shared/schema";

export default function ShopPage() {
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<(Product & { team?: Team })[]>({
    queryKey: ["/api/products"],
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const filteredProducts = products?.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesTeam = teamFilter === "all" || p.teamId === teamFilter || (!p.teamId && teamFilter === "general");
    return matchesSearch && matchesTeam;
  });

  const featuredProducts = products?.filter((p) => p.featured) || [];
  const generalProducts = products?.filter((p) => !p.teamId) || [];
  const teamProducts = products?.filter((p) => p.teamId) || [];

  const addToCart = (product: Product) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingItem = cart.find((item: any) => item.id === product.id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    toast({ title: `${product.name} added to cart` });
    window.dispatchEvent(new Event("cartUpdated"));
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingBag className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold">Shop</h1>
            <p className="text-muted-foreground text-lg">
              Official Football Mad merchandise and club editions
            </p>
          </div>
        </div>

        {search || teamFilter !== "all" ? (
          <>
            {/* Filters only - no tabs when searching/filtering */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-products"
                />
              </div>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-full md:w-[200px]" data-testid="select-team-filter">
                  <SelectValue placeholder="Filter by team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="general">Football Mad</SelectItem>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <section>
            {isLoading ? (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredProducts && filteredProducts.length > 0 ? (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={() => addToCart(product)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No products found.</p>
              </div>
            )}
          </section>
          </>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            {/* Desktop: Tabs + Filters on same row */}
            <div className="hidden md:flex md:items-center md:justify-between gap-4 mb-6">
              <TabsList className="flex-wrap h-auto gap-1" data-testid="tabs-shop">
                <TabsTrigger value="all" data-testid="tab-all">All ({products?.length || 0})</TabsTrigger>
                <TabsTrigger value="featured" data-testid="tab-featured">Featured ({featuredProducts.length})</TabsTrigger>
                <TabsTrigger value="general" data-testid="tab-general">Football Mad ({generalProducts.length})</TabsTrigger>
                <TabsTrigger value="club" data-testid="tab-club">Club Editions ({teamProducts.length})</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-[180px]"
                    data-testid="input-search-products"
                  />
                </div>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-team-filter">
                    <SelectValue placeholder="Filter by team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="general">Football Mad</SelectItem>
                    {teams?.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mobile: Tabs first (horizontally scrollable), then filters stacked below */}
            <div className="md:hidden space-y-4 mb-6">
              <div className="relative">
                <div 
                  className="overflow-x-auto scrollbar-hide"
                  style={{ 
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                >
                  <TabsList className="inline-flex h-auto gap-1 w-max" data-testid="tabs-shop-mobile">
                    <TabsTrigger value="all" className="whitespace-nowrap" data-testid="tab-all-mobile">All ({products?.length || 0})</TabsTrigger>
                    <TabsTrigger value="featured" className="whitespace-nowrap" data-testid="tab-featured-mobile">Featured ({featuredProducts.length})</TabsTrigger>
                    <TabsTrigger value="general" className="whitespace-nowrap" data-testid="tab-general-mobile">Football Mad ({generalProducts.length})</TabsTrigger>
                    <TabsTrigger value="club" className="whitespace-nowrap" data-testid="tab-club-mobile">Club Editions ({teamProducts.length})</TabsTrigger>
                  </TabsList>
                </div>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background to-transparent" />
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-products-mobile"
                />
              </div>

              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-full" data-testid="select-team-filter-mobile">
                  <SelectValue placeholder="Filter by team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="general">Football Mad</SelectItem>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="all">
              {isLoading ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : products && products.length > 0 ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={() => addToCart(product)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No products available.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="featured">
              {featuredProducts.length > 0 ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {featuredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={() => addToCart(product)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No featured products.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="general">
              {generalProducts.length > 0 ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {generalProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={() => addToCart(product)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No general products available.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="club">
              {teamProducts.length > 0 ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {teamProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={() => addToCart(product)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No club edition products available.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
