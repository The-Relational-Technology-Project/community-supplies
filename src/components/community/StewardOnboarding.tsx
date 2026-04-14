import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Users, Copy, Check, ArrowRight } from "lucide-react";

interface StewardOnboardingProps {
  communityName: string;
  communitySlug: string;
  onDismiss: () => void;
}

export function StewardOnboarding({ communityName, communitySlug, onDismiss }: StewardOnboardingProps) {
  const [copied, setCopied] = useState(false);
  const communityUrl = `${window.location.origin}/c/${communitySlug}`;

  const copyUrl = async () => {
    await navigator.clipboard.writeText(communityUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">🎉</div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-deep-brown">
          {communityName} is live!
        </h1>
        <p className="text-muted-foreground">
          Your sharing community is ready. Here's how to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center mb-2">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Add your first items</CardTitle>
            <CardDescription>
              Share tools, gear, kitchen supplies, or anything your neighbors might need.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onDismiss} className="w-full gap-2">
              Add Supplies <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center mb-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Invite your neighbors</CardTitle>
            <CardDescription>
              Share your community's link — anyone can sign up and start sharing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md truncate">
                {communityUrl}
              </code>
              <Button variant="outline" size="icon" onClick={copyUrl}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button variant="ghost" onClick={onDismiss} className="text-muted-foreground">
          Skip for now — go to my community
        </Button>
      </div>
    </div>
  );
}
