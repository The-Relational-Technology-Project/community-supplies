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
import { compressFile } from "@/lib/imageCompression";
import { categories } from "@/data/categories";
import { useCommunity } from "@/contexts/CommunityContext";
import { fulfillItemRequest, type ItemRequest } from "@/hooks/useItemRequests";

interface AddSupplyProps {
  /** When set, this item is being shared in answer to a Request Board post. */
  fulfillRequest?: Pick<ItemRequest, "id" | "title" | "category" | "note"> | null;
  onDone?: () => void;
}

export function AddSupply({ fulfillRequest = null, onDone }: AddSupplyProps = {}) {
  const navigate = useNavigate();
  const { communityId, communitySlug, aiFeaturesEnabled } = useCommunity();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
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

  // Sharing in answer to a request: skip the intro screen and prefill.
  useEffect(() => {
    if (!fulfillRequest) return;
    setFormData(prev => ({
      ...prev,
      name: prev.name || fulfillRequest.title,
      category: prev.category || fulfillRequest.category || "",
    }));
    setShowForm(true);
  }, [fulfillRequest]);

  const openManualForm = async (publicUrl?: string) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error("You must be logged in to add items");
      return;
    }
    if (!user) setUser(currentUser);
    const savedNeighborhood = localStorage.getItem('lastNeighborhood') || "";
    const savedCrossStreets = localStorage.getItem('lastCrossStreets') || "";
    setFormData({
      name: "",
      description: "",
      category: "",
      condition: "good",
      neighborhood: savedNeighborhood,
      crossStreets: savedCrossStreets,
      contactEmail: userProfile?.email || currentUser.email || "",
      images: publicUrl ? [publicUrl] : [],
    });
    setHouseRules([]);
    if (!publicUrl) setUploadedImage("");
    setShowForm(true);
  };

  // Compress + upload a single file, returning the public URL.
  // Throws on failure.
  const compressAndUpload = async (file: File, currentUserId: string): Promise<{ publicUrl: string; previewUrl: string }> => {
    if (file.size > 25 * 1024 * 1024) {
      throw new Error("That photo is over 25 MB. Please pick a smaller one — most phone photos work great.");
    }
    const compressed = await compressFile(file);
    const storagePath = `${currentUserId}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('supply-images')
      .upload(storagePath, compressed.blob, { contentType: 'image/jpeg' });
    if (uploadError) {
      URL.revokeObjectURL(compressed.previewUrl);
      throw new Error("Couldn't upload your photo. Please check your connection and try again.");
    }
    const publicUrl = supabase.storage.from('supply-images').getPublicUrl(storagePath).data.publicUrl;
    return { publicUrl, previewUrl: compressed.previewUrl };
  };

  // Manual path: upload photo, open form, no AI involved.
  const handlePhotoUploadManual = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error("You must be logged in to add items");
      return;
    }
    if (!user) setUser(currentUser);

    setIsUploadingPhoto(true);
    try {
      const { publicUrl, previewUrl } = await compressAndUpload(file, currentUser.id);
      setUploadedImage(previewUrl);
      await openManualForm(publicUrl);
    } catch (err: any) {
      console.error("[AddSupply] manual upload failed", err);
      toast.error(err?.message || "Couldn't process that photo. Please try a different one.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // AI path: upload photo, open form, then attempt AI draft in background.
  const handlePhotoUploadWithAI = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error("You must be logged in to add items");
      return;
    }
    if (!user) setUser(currentUser);

    setIsDraftingWithAI(true);
    let publicUrl = "";
    try {
      const uploaded = await compressAndUpload(file, currentUser.id);
      publicUrl = uploaded.publicUrl;
      setUploadedImage(uploaded.previewUrl);
      await openManualForm(publicUrl);
    } catch (err: any) {
      console.error("[AddSupply] AI upload failed", err);
      toast.error(err?.message || "Couldn't process that photo. Please try a different one.");
      setIsDraftingWithAI(false);
      return;
    }

    // Non-blocking AI draft.
    try {
      const { data, error } = await supabase.functions.invoke('draft-item-from-image', {
        body: { imageUrl: publicUrl }
      });
      if (error || !data) throw error || new Error('No draft data');
      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        description: data.description || prev.description,
        category: data.category || prev.category,
        condition: data.condition || prev.condition,
        contactEmail: data.contactEmail || prev.contactEmail,
      }));
      if (Array.isArray(data.houseRules) && data.houseRules.length) {
        setHouseRules(data.houseRules);
      }
      toast.success("✨ AI draft ready — please review and edit before publishing.");
    } catch (aiErr) {
      console.error('[AddSupply] AI draft failed', aiErr);
      toast.message("Photo uploaded — please fill in the details below.", {
        description: "AI couldn't draft this one. You can write a brief description yourself.",
      });
    } finally {
      setIsDraftingWithAI(false);
    }
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
            owner_id: user.id,
            community_id: communityId,
          }
        ])
        .select();

      if (error) throw error;

      const supplyId = insertedData[0].id;

      // Notify the community's stewards. Illustration generation is no longer
      // auto-triggered here — stewards can batch-generate illustrations later.
      supabase.functions.invoke('send-supply-notification', {
        body: {
          communityId,
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

      // If this item was added in answer to a Request Board post, close the
      // request and let the requester know.
      if (fulfillRequest?.id) {
        try {
          await fulfillItemRequest(fulfillRequest.id, supplyId);
          toast.success("Item added — the neighbor who asked has been notified!");
        } catch (fulfillErr: any) {
          console.error('[AddSupply] fulfill request failed', fulfillErr);
          toast.message("Item added, but we couldn't mark the request as fulfilled.", {
            description: fulfillErr?.message,
          });
        }
      } else {
        toast.success("Item added!");
      }

      
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
      
      navigate(`/c/${communitySlug}?tab=browse`);
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
                  Add an item
                </h2>
                <p className="text-muted-foreground">
                  {aiFeaturesEnabled
                    ? "Add a photo and write the details yourself, let AI draft them from your photo, or skip the photo entirely."
                    : "Add a photo and write a short description, or skip the photo entirely."}
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                {/* Manual photo upload — always available, never calls AI */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUploadManual}
                  className="hidden"
                  id="image-upload-manual"
                  disabled={isUploadingPhoto || isDraftingWithAI}
                />
                <label htmlFor="image-upload-manual">
                  <Button
                    type="button"
                    size="lg"
                    className="cursor-pointer"
                    disabled={isUploadingPhoto || isDraftingWithAI}
                    asChild
                  >
                    <span>
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Uploading photo...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-5 w-5" />
                          Add a photo & write it myself
                        </>
                      )}
                    </span>
                  </Button>
                </label>

                {/* Optional AI photo path */}
                {aiFeaturesEnabled && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUploadWithAI}
                      className="hidden"
                      id="image-upload-ai"
                      disabled={isUploadingPhoto || isDraftingWithAI}
                    />
                    <label htmlFor="image-upload-ai">
                      <Button
                        type="button"
                        size="lg"
                        variant="secondary"
                        className="cursor-pointer"
                        disabled={isUploadingPhoto || isDraftingWithAI}
                        asChild
                      >
                        <span>
                          {isDraftingWithAI ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Uploading & analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-5 w-5" />
                              Use AI to draft from photo
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  </>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => openManualForm()}
                  disabled={isUploadingPhoto || isDraftingWithAI}
                >
                  Skip the photo — write it myself
                </Button>
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
                    Your photo
                  </h2>
                </div>
                <img
                  src={uploadedImage}
                  alt="Uploaded item"
                  className="w-full h-64 object-cover rounded-sm"
                />
                <p className="text-sm text-muted-foreground mt-4">
                  Review and edit anything below before publishing. AI suggestions are a starting point — please correct anything wrong.
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
