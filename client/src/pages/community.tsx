import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { PostCard } from "@/components/cards/post-card";
import { PostCardSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, MessageSquare, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Post, Team } from "@shared/schema";

export default function CommunityPage() {
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: posts, isLoading } = useQuery<(Post & { team?: Team })[]>({
    queryKey: ["/api/posts"],
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: followedTeamIds } = useQuery<string[]>({
    queryKey: ["/api/follows"],
    enabled: isAuthenticated,
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: { content: string; teamId?: string }) => {
      return apiRequest("POST", "/api/posts", data);
    },
    onSuccess: () => {
      setNewPostContent("");
      setSelectedTeam("");
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Post created!" });
    },
    onError: () => {
      toast({ title: "Failed to create post", variant: "destructive" });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiRequest("POST", `/api/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    createPostMutation.mutate({
      content: newPostContent,
      teamId: selectedTeam || undefined,
    });
  };

  const followedPosts = posts?.filter((p) => p.teamId && followedTeamIds?.includes(p.teamId)) || [];
  const trendingPosts = posts?.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)).slice(0, 10) || [];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold">Community</h1>
            <p className="text-muted-foreground text-lg">
              Join the conversation with fellow football fans
            </p>
          </div>
        </div>

        {isAuthenticated ? (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea
                    placeholder="What's on your mind?"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="resize-none"
                    rows={3}
                    data-testid="textarea-new-post"
                  />
                  <div className="flex items-center justify-between">
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger className="w-[200px]" data-testid="select-post-team">
                        <SelectValue placeholder="Select a team (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No team</SelectItem>
                        {teams?.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim() || createPostMutation.isPending}
                      data-testid="button-create-post"
                    >
                      {createPostMutation.isPending ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardContent className="py-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Join the conversation</h3>
              <p className="text-muted-foreground mb-4">
                Sign in to post and interact with the community.
              </p>
              <Button asChild>
                <a href="/api/login">Sign in</a>
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              <MessageSquare className="h-4 w-4 mr-2" />
              All Posts
            </TabsTrigger>
            {isAuthenticated && followedTeamIds?.length ? (
              <TabsTrigger value="following">
                <Users className="h-4 w-4 mr-2" />
                Following
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="trending">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))
            ) : posts && posts.length > 0 ? (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => likeMutation.mutate(post.id)}
                />
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {isAuthenticated && followedTeamIds?.length ? (
            <TabsContent value="following" className="space-y-4">
              {followedPosts.length > 0 ? (
                followedPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={() => likeMutation.mutate(post.id)}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No posts from teams you follow yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ) : null}

          <TabsContent value="trending" className="space-y-4">
            {trendingPosts.length > 0 ? (
              trendingPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => likeMutation.mutate(post.id)}
                />
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No trending posts yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
