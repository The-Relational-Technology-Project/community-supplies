import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Supply } from "@/types/supply";
import { MapPin, Calendar, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { GenerateIllustrationButton } from "./GenerateIllustrationButton";
import { useCommunity } from "@/contexts/CommunityContext";
import { GenerateIllustrationButton } from "./GenerateIllustrationButton";

interface ContactModalProps {
  supply: Supply | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ supply, isOpen, onClose }: ContactModalProps) {
  const [senderName, setSenderName] = useState("");
  const [senderContact, setSenderContact] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { toast } = useToast();
  const { communityId } = useCommunity();

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUserId();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supply || !senderName.trim() || !senderContact.trim() || !message.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    // Validate name length
    if (senderName.trim().length > 100) {
      toast({
        title: "Name too long",
        description: "Name must be less than 100 characters",
        variant: "destructive",
      });
      return;
    }

    // Validate contact length and format
    if (senderContact.trim().length > 255) {
      toast({
        title: "Contact info too long",
        description: "Contact information must be less than 255 characters",
        variant: "destructive",
      });
      return;
    }

    // Validate email or phone format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
    if (!emailRegex.test(senderContact.trim()) && !phoneRegex.test(senderContact.trim())) {
      toast({
        title: "Invalid contact information",
        description: "Please enter a valid email address or phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate message length
    if (message.trim().length > 2000) {
      toast({
        title: "Message too long",
        description: "Message must be less than 2000 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('send-contact-message', {
        body: {
          supplyId: supply.id,
          supplyName: supply.name,
          supplyOwnerId: supply.ownerId,
          supplyOwnerEmail: supply.contactEmail,
          senderName,
          senderContact,
          message,
          communityId
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Message sent!",
        description: `Your message has been sent to ${supply.owner.name}`,
      });

      setSenderName("");
      setSenderContact("");
      setMessage("");
      onClose();
    } catch (error: any) {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!supply) return null;

  const isOwner = currentUserId === supply.ownerId;
  const images = supply.images || (supply.image ? [supply.image] : []);
  const displayImage = images[selectedImageIndex] || null;

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-peach/20 text-deep-brown border-peach';
      case 'good': return 'bg-sand/50 text-deep-brown border-sand';
      case 'fair': return 'bg-terracotta/20 text-deep-brown border-terracotta';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-deep-brown">{supply.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Image Gallery */}
            <div className="space-y-2">
              <div className="aspect-square bg-white rounded-sm flex items-center justify-center overflow-hidden border border-border">
                {displayImage ? (
                  <img 
                    src={displayImage} 
                    alt={supply.name}
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <div className="text-6xl text-muted-foreground">📦</div>
                )}
              </div>
              
              {/* Image thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`flex-shrink-0 w-16 h-16 border-2 rounded-sm overflow-hidden ${
                        selectedImageIndex === idx ? 'border-terracotta' : 'border-border'
                      }`}
                    >
                      <img src={img} alt={`${supply.name} ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              
              {/* Generate Illustration Button for owners */}
              {isOwner && !supply.illustration_url && (
                <GenerateIllustrationButton
                  supplyId={supply.id}
                  itemName={supply.name}
                  description={supply.description}
                  imageUrl={images[0]}
                  onGenerated={() => {
                    toast({
                      title: "Illustration generated!",
                      description: "Your item now has a catalog-style illustration"
                    });
                  }}
                />
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge className={`${getConditionColor(supply.condition)} border`}>
                  {supply.condition}
                </Badge>
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  {supply.category}
                </Badge>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-deep-brown mb-1">Description</h3>
                <p className="text-sm text-muted-foreground">{supply.description}</p>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-border">
                {(supply.neighborhood || supply.crossStreets) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-terracotta" />
                    <span className="text-muted-foreground">
                      {[supply.neighborhood, supply.crossStreets].filter(Boolean).join(' • ')}
                    </span>
                  </div>
                )}
                
                {supply.dateAvailable && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-terracotta" />
                    <span className="text-muted-foreground">
                      Available: {new Date(supply.dateAvailable).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {supply.houseRules && supply.houseRules.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <h3 className="text-sm font-medium text-deep-brown mb-2">Borrowing Guidelines</h3>
                  <ul className="space-y-1">
                    {supply.houseRules.map((rule, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-terracotta">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="senderName" className="text-deep-brown font-medium">
                  Your Name *
                </Label>
                <Input
                  id="senderName"
                  placeholder="Enter your name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  required
                  className="border-border mt-1"
                />
              </div>

              <div>
                <Label htmlFor="senderContact" className="text-deep-brown font-medium">
                  Your Email or Phone *
                </Label>
                <Input
                  id="senderContact"
                  placeholder="your-email@example.com"
                  value={senderContact}
                  onChange={(e) => setSenderContact(e.target.value)}
                  required
                  className="border-border mt-1"
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-deep-brown font-medium">
                  Message *
                </Label>
                <Textarea
                  id="message"
                  placeholder="Hi! I'd like to borrow your..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  className="border-border mt-1 min-h-[120px]"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {isLoading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}