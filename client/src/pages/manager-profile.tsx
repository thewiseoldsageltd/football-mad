import { useRoute, Link } from "wouter";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MainLayout } from "@/components/layout/main-layout";

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function ManagerProfilePage() {
  const [, params] = useRoute("/managers/:slug");
  const slug = params?.slug || "";
  const managerName = slugToName(slug);
  const initials = managerName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/teams">
          <Button variant="ghost" size="sm" className="mb-6" data-testid="link-back-to-teams">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">{managerName}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">Manager / Head Coach</Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-muted-foreground py-8">
              <Briefcase className="h-8 w-8" />
              <div>
                <p className="font-medium">More manager data coming soon</p>
                <p className="text-sm">Career history, trophies, and detailed information will be available here.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
