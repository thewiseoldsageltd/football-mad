import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, Copy, Share2 } from "lucide-react";
import { SiWhatsapp, SiX, SiFacebook } from "react-icons/si";

type SharePlatform = "whatsapp" | "twitter" | "facebook" | "copy" | "native";

interface ShareButtonsProps {
  articleId: string;
  title: string;
  url: string;
  description?: string;
}

export function ShareButtons({ articleId, title, url, description }: ShareButtonsProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const trackShareMutation = useMutation({
    mutationFn: async (platform: SharePlatform) => {
      await apiRequest("POST", "/api/share-click", {
        articleId,
        platform,
      });
    },
  });

  const shareText = `${title} - Football Mad`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(url);

  const handleShare = async (platform: SharePlatform) => {
    trackShareMutation.mutate(platform);

    switch (platform) {
      case "whatsapp":
        window.open(
          `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
          "_blank",
          "noopener,noreferrer"
        );
        break;
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
          "_blank",
          "noopener,noreferrer"
        );
        break;
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          "_blank",
          "noopener,noreferrer"
        );
        break;
      case "copy":
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast({ description: "Link copied to clipboard" });
        setTimeout(() => setCopied(false), 2000);
        break;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Share this article</p>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("whatsapp")}
          className="gap-2"
          data-testid="button-share-whatsapp"
        >
          <SiWhatsapp className="h-4 w-4 text-[#25D366]" />
          <span className="hidden sm:inline">WhatsApp</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("twitter")}
          className="gap-2"
          data-testid="button-share-twitter"
        >
          <SiX className="h-4 w-4" />
          <span className="hidden sm:inline">X</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("facebook")}
          className="gap-2"
          data-testid="button-share-facebook"
        >
          <SiFacebook className="h-4 w-4 text-[#1877F2]" />
          <span className="hidden sm:inline">Facebook</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("copy")}
          className="gap-2"
          data-testid="button-share-copy"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy Link"}</span>
        </Button>
      </div>
    </div>
  );
}

interface MobileStickyShareProps {
  articleId: string;
  title: string;
  url: string;
  description?: string;
}

export function MobileStickyShare({ articleId, title, url, description }: MobileStickyShareProps) {
  const { toast } = useToast();
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHasNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const trackShareMutation = useMutation({
    mutationFn: async (platform: SharePlatform) => {
      await apiRequest("POST", "/api/share-click", {
        articleId,
        platform,
      });
    },
  });

  const handleMobileShare = async () => {
    if (hasNativeShare) {
      try {
        trackShareMutation.mutate("native");
        await navigator.share({
          title: title,
          text: `${title} - Football Mad`,
          url: url,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          fallbackCopy();
        }
      }
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = async () => {
    trackShareMutation.mutate("copy");
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ description: "Link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-4 right-4 md:hidden z-50">
      <Button
        size="lg"
        onClick={handleMobileShare}
        className="rounded-full shadow-lg gap-2"
        data-testid="button-mobile-share"
      >
        {copied ? (
          <Check className="h-5 w-5" />
        ) : (
          <Share2 className="h-5 w-5" />
        )}
        Share
      </Button>
    </div>
  );
}
