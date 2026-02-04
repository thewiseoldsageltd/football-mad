import { useState, useEffect } from "react";
import { Clock, Eye, Bookmark, Copy, Check } from "lucide-react";
import { SiWhatsapp, SiX, SiFacebook } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

const BOOKMARKS_KEY = "footballmad:bookmarks";

function getBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setBookmarks(bookmarks: string[]) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

interface ArticleMetaBarProps {
  articleId: string;
  articleSlug: string;
  authorName: string;
  authorInitial?: string;
  publishedLabel: string;
  readTimeLabel: string;
  viewCount?: number;
  shareUrl: string;
  shareTitle: string;
}

export function ArticleMetaBar({
  articleId,
  articleSlug,
  authorName,
  authorInitial,
  publishedLabel,
  readTimeLabel,
  viewCount,
  shareUrl,
  shareTitle,
}: ArticleMetaBarProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const bookmarks = getBookmarks();
    setIsBookmarked(bookmarks.includes(articleId) || bookmarks.includes(articleSlug));
  }, [articleId, articleSlug]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ description: "Link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBookmark = () => {
    const bookmarks = getBookmarks();
    const identifier = articleSlug || articleId;
    
    if (bookmarks.includes(identifier)) {
      const updated = bookmarks.filter(b => b !== identifier);
      setBookmarks(updated);
      setIsBookmarked(false);
      toast({ description: "Removed from saved articles" });
    } else {
      const updated = [...bookmarks, identifier];
      setBookmarks(updated);
      setIsBookmarked(true);
      toast({ description: "Saved to your bookmarks" });
    }
  };

  const encodedText = encodeURIComponent(`${shareTitle} - Football Mad`);
  const encodedUrl = encodeURIComponent(shareUrl);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-sm">
            {authorInitial || authorName?.[0] || "F"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{authorName || "Football Mad"}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span>{publishedLabel}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {readTimeLabel}
            </span>
            {viewCount != null && viewCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {viewCount.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-muted"
            onClick={() => window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, "_blank")}
            data-testid="button-meta-share-whatsapp"
          >
            <SiWhatsapp className="h-4 w-4 text-[#25D366]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-muted"
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, "_blank")}
            data-testid="button-meta-share-x"
          >
            <SiX className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-muted"
            onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank")}
            data-testid="button-meta-share-facebook"
          >
            <SiFacebook className="h-4 w-4 text-[#1877F2]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-muted"
            onClick={handleCopy}
            data-testid="button-meta-copy-link"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full hover:bg-muted"
          onClick={handleBookmark}
          data-testid="button-meta-bookmark"
        >
          <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current text-primary" : ""}`} />
        </Button>
      </div>
    </div>
  );
}
