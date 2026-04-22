import { useState } from "react";
import { UserPlus, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCommunity } from "@/contexts/CommunityContext";

export function InviteNeighborsButton() {
  const { communitySlug, communityName } = useCommunity();
  const [open, setOpen] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/c/${communitySlug}`
      : `/c/${communitySlug}`;

  const suggestedMessage = `Hi! I just started a neighborhood sharing community called ${communityName} on Community Supplies — a free way for neighbors to lend and borrow things like tools, party supplies, and books. Join us here: ${inviteUrl}`;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Could not copy. Please copy manually.");
    }
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: communityName,
          text: suggestedMessage,
          url: inviteUrl,
        });
      } catch {
        // user cancelled — no-op
      }
    } else {
      copy(inviteUrl, "Link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite neighbors
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite neighbors to {communityName}</DialogTitle>
          <DialogDescription>
            Share this link with neighbors so they can join your community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-deep-brown">
              Community link
            </label>
            <div className="flex gap-2">
              <Input value={inviteUrl} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copy(inviteUrl, "Link")}
                aria-label="Copy link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-deep-brown">
              Suggested message
            </label>
            <Textarea
              value={suggestedMessage}
              readOnly
              rows={4}
              className="text-sm resize-none"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copy(suggestedMessage, "Message")}
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy message
            </Button>
          </div>

          <Button onClick={share} className="w-full">
            <Share2 className="h-4 w-4 mr-2" />
            Share link
          </Button>

          <p className="text-xs text-muted-foreground">
            Tip: You can choose whether new neighbors join instantly or need
            your approval using the “Community access” toggle on this page.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
