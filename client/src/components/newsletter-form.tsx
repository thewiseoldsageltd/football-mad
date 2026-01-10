import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NewsletterFormProps {
  edition?: string;
  title?: string;
  description?: string;
  compact?: boolean;
}

export function NewsletterForm({
  edition = "general",
  title = "Stay in the game",
  description = "Get the latest football news, transfer updates, and exclusive content delivered to your inbox.",
  compact = false,
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const { toast } = useToast();

  const subscribeMutation = useMutation({
    mutationFn: async (data: { email: string; tags: string[] }) => {
      return apiRequest("POST", "/api/subscribers", data);
    },
    onSuccess: () => {
      setSubscribed(true);
      toast({
        title: "Subscribed!",
        description: "You've been added to our newsletter.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to subscribe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    subscribeMutation.mutate({ email, tags: [edition] });
  };

  if (subscribed) {
    return (
      <Card className={compact ? "border-0 shadow-none bg-transparent" : ""}>
        <CardContent className={compact ? "p-0" : "p-6"}>
          <div className="flex items-center gap-3 text-primary">
            <CheckCircle className="h-6 w-6" />
            <div>
              <p className="font-semibold">You're subscribed!</p>
              <p className="text-sm text-muted-foreground">Check your inbox for confirmation.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
          data-testid="input-newsletter-email"
        />
        <Button type="submit" disabled={subscribeMutation.isPending} data-testid="button-newsletter-subscribe">
          {subscribeMutation.isPending ? "..." : "Subscribe"}
        </Button>
      </form>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 bg-background"
            data-testid="input-newsletter-email"
          />
          <Button type="submit" disabled={subscribeMutation.isPending} data-testid="button-newsletter-subscribe">
            {subscribeMutation.isPending ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-3">
          By subscribing, you agree to our privacy policy. Unsubscribe anytime.
        </p>
      </CardContent>
    </Card>
  );
}
