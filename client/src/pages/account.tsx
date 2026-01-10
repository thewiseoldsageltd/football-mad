import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Heart, ShoppingBag, Settings, LogOut, HeartOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Team, Order } from "@shared/schema";
import { useEffect } from "react";

export default function AccountPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  const { data: followedTeams, isLoading: followsLoading } = useQuery<Team[]>({
    queryKey: ["/api/follows/teams"],
    enabled: isAuthenticated,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated,
  });

  const unfollowMutation = useMutation({
    mutationFn: async (teamId: string) => {
      return apiRequest("DELETE", `/api/follows/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/follows/teams"] });
      toast({ title: "Team unfollowed" });
    },
  });

  if (authLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-32 w-full rounded-lg mb-8" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.profileImageUrl || undefined} />
                <AvatarFallback className="text-2xl">
                  {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">Free Member</Badge>
                </div>
              </div>
              <Button variant="outline" onClick={() => logout()} data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="follows" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="follows">
              <Heart className="h-4 w-4 mr-2" />
              Followed Teams
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="follows">
            <Card>
              <CardHeader>
                <CardTitle>Followed Teams</CardTitle>
                <CardDescription>
                  Teams you follow will appear in your personalized feed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {followsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : followedTeams && followedTeams.length > 0 ? (
                  <div className="space-y-4">
                    {followedTeams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-4 bg-muted rounded-lg"
                      >
                        <Link href={`/teams/${team.slug}`} className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: team.primaryColor || "#1a1a2e" }}
                          >
                            {team.logoUrl ? (
                              <img src={team.logoUrl} alt={team.name} className="w-8 h-8 object-contain" />
                            ) : (
                              <span className="text-lg font-bold text-white">
                                {team.shortName?.[0] || team.name[0]}
                              </span>
                            )}
                          </div>
                          <span className="font-medium">{team.name}</span>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unfollowMutation.mutate(team.id)}
                          disabled={unfollowMutation.isPending}
                          data-testid={`button-unfollow-${team.slug}`}
                        >
                          <HeartOff className="h-4 w-4 mr-2" />
                          Unfollow
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      You're not following any teams yet.
                    </p>
                    <Link href="/teams">
                      <Button>Browse Teams</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>
                  View your past orders and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : orders && orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt!).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">£{parseFloat(order.total).toFixed(2)}</p>
                          <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      You haven't placed any orders yet.
                    </p>
                    <Link href="/shop">
                      <Button>Start Shopping</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Email Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your newsletter subscriptions from the footer of any email.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Account Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your account is managed through Replit authentication.
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => logout()}
                    data-testid="button-logout-settings"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
