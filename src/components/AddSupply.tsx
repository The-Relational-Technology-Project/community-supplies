import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { HouseRules } from "@/components/HouseRules";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";
import { categories } from "@/data/categories";

export function AddSupply() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftingWithAI, setIsDraftingWithAI] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string>("");
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    condition: "good" as "excellent" | "good" | "fair",
    neighborhood: "",
    crossStreets: "",
    contactEmail: "",
    images: [] as string[],
  });

  const [houseRules, setHouseRules] = useState<string[]>([]);

  useEffect(() => {
    const getUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }
      }
    };
    getUserAndProfile();

    // Load saved location data from localStorage
    const savedNeighborhood = localStorage.getItem('lastNeighborhood');
    const savedCrossStreets = localStorage.getItem('lastCrossStreets');
    if (savedNeighborhood || savedCrossStreets) {
      setFormData(prev => ({
        ...prev,
        neighborhood: savedNeighborhood || '',
        crossStreets: savedCrossStreets || '',
      }));
    }
  }, []);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Re-check auth directly to avoid stale state race condition
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error("You must be logged in to add items");
      return;
    }
    if (!user) setUser(currentUser);

    setIsDraftingWithAI(true);

    // Convert image to data URL for display
    const reader = new FileReader();
    reader.onloadend = async () => {
      let tempFilePath: string | null = null;
      try {
        const imageDataUrl = reader.result as string;

        // Compress image before display and upload
        const compressedImage = await compressImage(imageDataUrl);
        setUploadedImage(compressedImage);

        // Convert compressed base64 to blob for storage upload
        const res = await fetch(compressedImage);
        const blob = await res.blob();
        tempFilePath = `tmp/${crypto.randomUUID()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('supply-images')
          .upload(tempFilePath, blob, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        // Get the public URL to pass to edge function
        const { data: urlData } = supabase.storage
          .from('supply-images')
          .getPublicUrl(tempFilePath);

        // Call AI to draft the item using the short URL
        const { data, error } = await supabase.functions.invoke('draft-item-from-image', {
          body: { imageUrl: urlData.publicUrl }
        });

        if (error) {
          console.error('AI draft error:', error);
          toast.error('Failed to analyze image. Please try again.');
          setIsDraftingWithAI(false);
          return;
        }

        // Pre-fill form with AI-generated data
        const savedNeighborhood = localStorage.getItem('lastNeighborhood');
        const savedCrossStreets = localStorage.getItem('lastCrossStreets');
        
        setFormData({
          name: data.name || "",
          description: data.description || "",
          category: data.category || "",
          condition: data.condition || "good",
          neighborhood: data.neighborhood || savedNeighborhood || "",
          crossStreets: data.crossStreets || savedCrossStreets || "",
          contactEmail: data.contactEmail || userProfile?.email || currentUser.email || "",
          images: [compressedImage],
        });

        setHouseRules(data.houseRules || []);
        setShowForm(true);
        setIsDraftingWithAI(false);
        toast.success("✨ Item details drafted by AI! Review and edit as needed.");
      } catch (error: any) {
        console.error('Error processing image:', error);
        toast.error('Failed to process image. Please try again.');
        setIsDraftingWithAI(false);
      } finally {
        // Clean up temp file from storage
        if (tempFilePath) {
          supabase.storage.from('supply-images').remove([tempFilePath]).catch(() => {});
        }
      }
    };

    reader.readAsDataURL(file);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.category || !formData.condition || !formData.contactEmail) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to add supplies");
      return;
    }

    setIsLoading(true);
    
    try {
      // Save location data to localStorage for next time
      if (formData.neighborhood) {
        localStorage.setItem('lastNeighborhood', formData.neighborhood);
      }
      if (formData.crossStreets) {
        localStorage.setItem('lastCrossStreets', formData.crossStreets);
      }

      // Insert the item
      const { data: insertedData, error } = await supabase
        .from('supplies')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            category: formData.category,
            condition: formData.condition || 'good',
            neighborhood: formData.neighborhood,
            cross_streets: formData.crossStreets,
            contact_email: formData.contactEmail,
            images: formData.images,
            image_url: formData.images[0] || null,
            house_rules: houseRules,
            owner_id: user.id
          }
        ])
        .select();

      if (error) throw error;

      const supplyId = insertedData[0].id;

      // Auto-generate illustration in the background
      supabase.functions.invoke('generate-illustration', {
        body: {
          supplyId,
          itemName: formData.name,
          description: formData.description,
          imageUrl: formData.images[0]
        }
      }).then(({ error: illustrationError }) => {
        if (illustrationError) {
          console.error('Illustration generation failed:', illustrationError);
        }
      });

      // Send notification email
      supabase.functions.invoke('send-supply-notification', {
        body: {
          itemName: formData.name,
          category: formData.category,
          ownerName: userProfile?.name || user?.email || 'Unknown',
          ownerEmail: formData.contactEmail,
          description: formData.description,
          neighborhood: formData.neighborhood
        }
      }).then(({ error: emailError }) => {
        if (emailError) {
          console.error('Failed to send notification email:', emailError);
        }
      });

      toast.success("Item added successfully! Generating illustration...");
      
      // Reset form but keep location data
      const savedNeighborhood = localStorage.getItem('lastNeighborhood') || '';
      const savedCrossStreets = localStorage.getItem('lastCrossStreets') || '';
      
      setFormData({
        name: "",
        description: "",
        category: "",
        condition: "good",
        neighborhood: savedNeighborhood,
        crossStreets: savedCrossStreets,
        contactEmail: userProfile?.email || user?.email || "",
        images: [],
      });
      setHouseRules([]);
      setUploadedImage("");
      setShowForm(false);
      
      navigate('/?tab=browse');
    } catch (error: any) {
      console.error('Error adding supply:', error);
      toast.error(error.message || "Failed to add item. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-semibold text-deep-brown mb-2">
            Add an Item
          </h1>
          <p className="text-muted-foreground">
            Share an item with your neighbors
          </p>
        </div>

        {!showForm ? (
          <div className="bg-card border border-border rounded-sm p-12">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center">
                  <Upload className="w-12 h-12 text-accent" />
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-serif font-semibold text-deep-brown mb-2">
                  Upload a Photo
                </h2>
                <p className="text-muted-foreground">
                  Take a photo of your item and our AI will help draft the listing
                </p>
              </div>

              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={isDraftingWithAI}
                />
                <label htmlFor="image-upload">
                  <Button
                    type="button"
                    size="lg"
                    className="cursor-pointer"
                    disabled={isDraftingWithAI}
                    asChild
                  >
                    <span>
                      {isDraftingWithAI ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Analyzing with AI...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Choose Photo
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>

              <p className="text-sm text-muted-foreground">
                Photos are automatically compressed — any size works
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Image Preview */}
            {uploadedImage && (
              <div className="bg-card border border-border rounded-sm p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <h2 className="text-lg font-serif font-semibold text-deep-brown">
                    AI-Drafted Listing
                  </h2>
                </div>
                <img 
                  src={uploadedImage} 
                  alt="Uploaded item" 
                  className="w-full h-64 object-cover rounded-sm"
                />
                <p className="text-sm text-muted-foreground mt-4">
                  Review and edit the details below before publishing
                </p>
              </div>
            )}

            {/* Basic Information */}
            <div className="bg-card border border-border rounded-sm p-6 space-y-6">
              <h2 className="text-lg font-serif font-semibold text-deep-brown">Item Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="name" className="text-deep-brown font-medium">
                    Item Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Folding Tables (2)"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="border-border mt-1"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description" className="text-deep-brown font-medium">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the item, its condition, and any important details..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="border-border mt-1 min-h-[100px]"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-deep-brown font-medium">
                    Category *
                  </Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="border-border mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.id !== 'all').map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="condition" className="text-deep-brown font-medium">
                    Condition *
                  </Label>
                  <Select value={formData.condition} onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value as any }))}>
                    <SelectTrigger className="border-border mt-1">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Location & Contact */}
            <div className="bg-card border border-border rounded-sm p-6 space-y-6">
              <h2 className="text-lg font-serif font-semibold text-deep-brown">Location & Contact</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="neighborhood" className="text-deep-brown font-medium">
                    Neighborhood
                  </Label>
                  <Input
                    id="neighborhood"
                    placeholder="e.g., Upper West Side"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                    className="border-border mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="crossStreets" className="text-deep-brown font-medium">
                    Cross Streets
                  </Label>
                  <Input
                    id="crossStreets"
                    placeholder="e.g., 5th Ave & Main St"
                    value={formData.crossStreets}
                    onChange={(e) => setFormData(prev => ({ ...prev, crossStreets: e.target.value }))}
                    className="border-border mt-1"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="contactEmail" className="text-deep-brown font-medium">
                    Contact Email *
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    className="border-border mt-1"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Borrowing Guidelines */}
            <div className="bg-card border border-border rounded-sm p-6 space-y-6">
              <h2 className="text-lg font-serif font-semibold text-deep-brown">Borrowing Guidelines</h2>
              <p className="text-sm text-muted-foreground -mt-2">
                Set clear expectations for borrowers
              </p>
              
              <HouseRules rules={houseRules} onRulesChange={setHouseRules} />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                type="submit" 
                size="lg"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish Item"
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="lg"
                onClick={() => {
                  setShowForm(false);
                  setUploadedImage("");
                }}
              >
                Start Over
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
