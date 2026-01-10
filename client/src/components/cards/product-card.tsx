import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import type { Product, Team } from "@shared/schema";

interface ProductCardProps {
  product: Product & { team?: Team };
  onAddToCart?: () => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const price = parseFloat(product.price);
  const comparePrice = product.comparePrice ? parseFloat(product.comparePrice) : null;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : null;

  return (
    <Card className="group h-full overflow-hidden hover-elevate" data-testid={`card-product-${product.id}`}>
      <Link href={`/shop/product/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl font-bold text-muted-foreground/30">F</span>
            </div>
          )}
          {product.team && (
            <div
              className="absolute top-3 right-3 w-8 h-8 rounded-md flex items-center justify-center"
              style={{ backgroundColor: product.team.primaryColor || "#1a1a2e" }}
            >
              {product.team.logoUrl ? (
                <img src={product.team.logoUrl} alt={product.team.name} className="w-6 h-6 object-contain" />
              ) : (
                <span className="text-xs font-bold text-white">{product.team.shortName?.[0] || product.team.name[0]}</span>
              )}
            </div>
          )}
          {discount && discount > 0 && (
            <Badge className="absolute top-3 left-3 bg-red-500 text-white border-0">
              -{discount}%
            </Badge>
          )}
          {!product.inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary">Out of Stock</Badge>
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <Link href={`/shop/product/${product.slug}`}>
          <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors cursor-pointer">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-primary">
            £{price.toFixed(2)}
          </span>
          {comparePrice && (
            <span className="text-sm text-muted-foreground line-through">
              £{comparePrice.toFixed(2)}
            </span>
          )}
        </div>
        {onAddToCart && product.inStock && (
          <Button
            className="w-full"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onAddToCart();
            }}
            data-testid={`button-add-to-cart-${product.id}`}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
