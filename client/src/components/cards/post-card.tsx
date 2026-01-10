import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle } from "lucide-react";
import type { Post, Team } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: Post & { team?: Team };
  onLike?: () => void;
  isLiked?: boolean;
}

export function PostCard({ post, onLike, isLiked = false }: PostCardProps) {
  const createdAt = post.createdAt ? new Date(post.createdAt) : new Date();

  return (
    <Card className="hover-elevate" data-testid={`card-post-${post.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.userImage || undefined} alt={post.userName || "User"} />
            <AvatarFallback>
              {post.userName?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{post.userName || "Anonymous"}</span>
              {post.team && (
                <Badge variant="outline" className="text-xs">
                  {post.team.name}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </p>
          </div>
        </div>

        <Link href={`/community/${post.id}`}>
          <p className="text-foreground mb-3 whitespace-pre-wrap cursor-pointer hover:text-primary/80">
            {post.content}
          </p>
        </Link>

        {post.imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img
              src={post.imageUrl}
              alt="Post image"
              className="w-full h-auto max-h-96 object-cover"
            />
          </div>
        )}

        <div className="flex items-center gap-4 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${isLiked ? "text-red-500" : ""}`}
            onClick={onLike}
            data-testid={`button-like-post-${post.id}`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            <span>{post.likesCount || 0}</span>
          </Button>
          <Link href={`/community/${post.id}`}>
            <Button variant="ghost" size="sm" className="gap-2" data-testid={`button-comment-post-${post.id}`}>
              <MessageCircle className="h-4 w-4" />
              <span>{post.commentsCount || 0}</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
