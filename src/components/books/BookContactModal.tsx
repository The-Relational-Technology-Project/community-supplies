import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Book } from "@/types/book";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2 } from "lucide-react";

interface BookContactModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
}

export function BookContactModal({ isOpen, book, onClose }: BookContactModalProps) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  if (!book) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !contact.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in your name and contact details",
        variant: "destructive",
      });
      return;
    }

    if (!book.ownerEmail) {
      toast({
        title: "Cannot send request",
        description: "The book owner's contact information is not available.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      // Use the edge function to send email notifications
      const response = await supabase.functions.invoke('send-contact-message', {
        body: {
          supplyId: book.id,
          supplyName: `Book: ${book.title}`,
          supplyOwnerId: book.ownerId,
          senderName: name.trim(),
          senderContact: contact.trim(),
          message: message.trim() || `I'd like to borrow "${book.title}".`
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Request sent!",
        description: `Your borrowing request for "${book.title}" has been sent.`,
      });

      // Reset form and close
      setName("");
      setContact("");
      setMessage("");
      onClose();
    } catch (error) {
      console.error("Error sending request:", error);
      toast({
        title: "Failed to send request",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif text-deep-brown">
            {book.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Book details */}
          <div className="bg-white p-4 rounded-sm border border-border">
            {book.author && (
              <p className="text-sm text-muted-foreground italic">by {book.author}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="capitalize text-xs">
                {book.condition}
              </Badge>
            </div>
            {book.houseRules.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Borrowing guidelines:</p>
                <ul className="text-xs text-foreground space-y-0.5">
                  {book.houseRules.map((rule, i) => (
                    <li key={i}>• {rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Contact form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-deep-brown font-medium">
                Your Name *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                className="border-border mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact" className="text-deep-brown font-medium">
                Your Email or Phone *
              </Label>
              <Input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="your-email@example.com"
                required
                className="border-border mt-1"
              />
            </div>
            <div>
              <Label htmlFor="message" className="text-deep-brown font-medium">
                Message
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1">
                Add a personal note – e.g. why and when would you like to borrow this?
              </p>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder=""
                className="border-border min-h-[100px]"
              />
            </div>
            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
