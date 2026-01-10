import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function ArticleCardSkeleton({ featured = false }: { featured?: boolean }) {
  if (featured) {
    return (
      <Card className="overflow-hidden">
        <Skeleton className="aspect-[16/9] w-full" />
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
      <Skeleton className="aspect-[16/9] w-full" />
      <CardContent className="p-4">
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-3" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

export function TeamCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MatchCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <Skeleton className="w-12 h-12 mx-auto rounded-lg mb-2" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
          <Skeleton className="h-8 w-16" />
          <div className="flex-1 text-center">
            <Skeleton className="w-12 h-12 mx-auto rounded-lg mb-2" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        </div>
        <Skeleton className="h-4 w-32 mx-auto mt-4" />
      </CardContent>
    </Card>
  );
}

export function TransferCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-5 w-24 mb-2" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

export function InjuryCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-4 w-48 mb-3" />
        <Skeleton className="h-2 w-full" />
      </CardContent>
    </Card>
  );
}

export function ProductCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <CardContent className="p-4">
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-3" />
        <Skeleton className="h-6 w-20 mb-3" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

export function PostCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-3" />
        <div className="flex gap-4 pt-2 border-t">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Skeleton className="h-8 w-64 mb-6" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
