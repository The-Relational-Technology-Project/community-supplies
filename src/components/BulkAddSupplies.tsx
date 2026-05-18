import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, Sparkles, X, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { HouseRules } from "@/components/HouseRules";
import { supabase } from "@/integrations/supabase/client";
import { compressFile } from "@/lib/imageCompression";
import { categories } from "@/data/categories";
import { useCommunity } from "@/contexts/CommunityContext";

interface DraftItem {
  storagePath: string;
  publicUrl: string;
  previewUrl: string;
  name: string;
  description: string;
  category: string;
  condition: "excellent" | "good" | "fair";
  error?: string;
  published?: boolean;
}

type Step = "upload" | "processing" | "review" | "publishing" | "done";

export function BulkAddSupplies() {
  const navigate = useNavigate();
  const { communityId, communitySlug, aiFeaturesEnabled } = useCommunity();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [step, setStep] = useState<Step>("upload");
  const [images, setImages] = useState<{ blob: Blob; previewUrl: string }[]>([]);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Shared fields
  const [sharedFields, setSharedFields] = useState({
    neighborhood: "",
    crossStreets: "",
    contactEmail: "",
  });
  const [houseRules, setHouseRules] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
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
          setSharedFields(prev => ({
            ...prev,
            contactEmail: profile.email || user.email || "",
          }));
        }
      }
      const savedNeighborhood = localStorage.getItem('lastNeighborhood');
      const savedCrossStreets = localStorage.getItem('lastCrossStreets');
      if (savedNeighborhood || savedCrossStreets) {
        setSharedFields(prev => ({
          ...prev,
          neighborhood: savedNeighborhood || '',
          crossStreets: savedCrossStreets || '',
        }));
      }
    };
    init();
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const remaining = 10 - images.length;
    const toProcess = Math.min(files.length, remaining);
    if (toProcess === 0) return;

    const newImages: { blob: Blob; previewUrl: string }[] = [];
    for (let i = 0; i < toProcess; i++) {
      const f = files[i];
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`Skipping a photo over 25 MB.`);
        continue;
      }
      try {
        const compressed = await compressFile(f);
        newImages.push(compressed);
      } catch (e: any) {
        console.error('Failed to compress image:', e);
        toast.error(e?.message || 'Failed to process a photo');
      }
    }
    setImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const analyzeAll = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setStep("processing");
    setProgress(0);
    const results: DraftItem[] = [];

    for (let i = 0; i < images.length; i++) {
      setProgressLabel(`Analyzing item ${i + 1} of ${images.length}...`);
      setProgress(((i) / images.length) * 100);

      const item = images[i];
      const storagePath = `${user.id}/${crypto.randomUUID()}.jpg`;
      let publicUrl = '';
      let uploadedOk = false;

      try {
        const { error: uploadError } = await supabase.storage
          .from('supply-images')
          .upload(storagePath, item.blob, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        uploadedOk = true;
        publicUrl = supabase.storage.from('supply-images').getPublicUrl(storagePath).data.publicUrl;

        const { data, error } = await supabase.functions.invoke('draft-item-from-image', {
          body: { imageUrl: publicUrl }
        });
        if (error) throw error;

        results.push({
          storagePath,
          publicUrl,
          previewUrl: item.previewUrl,
          name: data.name || "",
          description: data.description || "",
          category: data.category || "",
          condition: data.condition || "good",
        });
      } catch (error: any) {
        console.error(`Failed to analyze image ${i + 1}:`, error);
        results.push({
          storagePath: uploadedOk ? storagePath : '',
          publicUrl,
          previewUrl: item.previewUrl,
          name: "",
          description: "",
          category: "",
          condition: "good",
          error: error?.message || "Analysis failed — fill in manually",
        });
      } finally {
        if (i < images.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    setProgress(100);
    setDrafts(results);
    setStep("review");

    const successCount = results.filter(r => !r.error).length;
    const failCount = results.filter(r => r.error).length;
    if (failCount > 0) {
      toast.warning(`${successCount} items analyzed, ${failCount} need manual entry.`);
    } else {
      toast.success(`All ${successCount} items analyzed! Review and publish.`);
    }
  };

  // Upload all selected photos without AI — creates blank editable drafts.
  const uploadAllManual = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    setStep("processing");
    setProgress(0);
    const results: DraftItem[] = [];

    for (let i = 0; i < images.length; i++) {
      setProgressLabel(`Uploading photo ${i + 1} of ${images.length}...`);
      setProgress((i / images.length) * 100);
      const item = images[i];
      const storagePath = `${user.id}/${crypto.randomUUID()}.jpg`;
      try {
        const { error: uploadError } = await supabase.storage
          .from('supply-images')
          .upload(storagePath, item.blob, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        const publicUrl = supabase.storage.from('supply-images').getPublicUrl(storagePath).data.publicUrl;
        results.push({
          storagePath,
          publicUrl,
          previewUrl: item.previewUrl,
          name: "",
          description: "",
          category: "",
          condition: "good",
        });
      } catch (error: any) {
        console.error(`Failed to upload image ${i + 1}:`, error);
        results.push({
          storagePath: '',
          publicUrl: '',
          previewUrl: item.previewUrl,
          name: "",
          description: "",
          category: "",
          condition: "good",
          error: "Photo upload failed — please try again",
        });
      }
    }

    setProgress(100);
    setDrafts(results);
    setStep("review");
    toast.success(`${results.length} photo${results.length !== 1 ? 's' : ''} uploaded. Add details for each below.`);
  };

  const updateDraft = (index: number, field: keyof DraftItem, value: string) => {
    setDrafts(prev => prev.map((d, i) => i === index ? { ...d, [field]: value, error: undefined } : d));
  };

  const removeDraft = (index: number) => {
    setDrafts(prev => prev.filter((_, i) => i !== index));
  };

  const publishAll = async () => {
    if (!user) return;

    const validDrafts = drafts.filter(d => d.name && d.description && d.category);
    if (validDrafts.length === 0) {
      toast.error("No valid items to publish. Fill in required fields.");
      return;
    }

    setIsPublishing(true);
    setStep("publishing");
    setProgress(0);

    // Save location
    if (sharedFields.neighborhood) localStorage.setItem('lastNeighborhood', sharedFields.neighborhood);
    if (sharedFields.crossStreets) localStorage.setItem('lastCrossStreets', sharedFields.crossStreets);

    let published = 0;
    const publishedNames: string[] = [];

    for (let i = 0; i < validDrafts.length; i++) {
      const draft = validDrafts[i];
      setProgressLabel(`Publishing item ${i + 1} of ${validDrafts.length}...`);
      setProgress(((i) / validDrafts.length) * 100);

      try {
        const { data: insertedData, error } = await supabase
          .from('supplies')
          .insert([{
            name: draft.name,
            description: draft.description,
            category: draft.category,
            condition: draft.condition || 'good',
            neighborhood: sharedFields.neighborhood,
            cross_streets: sharedFields.crossStreets,
            contact_email: sharedFields.contactEmail,
            images: draft.publicUrl ? [draft.publicUrl] : [],
            image_url: draft.publicUrl || null,
            house_rules: houseRules,
            owner_id: user.id,
            community_id: communityId,
          }])
          .select();

        if (error) throw error;

        published++;
        publishedNames.push(draft.name);
        // Illustration auto-gen removed — stewards can batch-generate later.
      } catch (error: any) {
        console.error(`Failed to publish "${draft.name}":`, error);
      }
    }

    // Notify the community's stewards
    if (published > 0) {
      supabase.functions.invoke('send-bulk-supply-notification', {
        body: {
          communityId,
          items: publishedNames.map((name, i) => ({
            name,
            category: validDrafts[i]?.category || 'misc',
          })),
          ownerName: userProfile?.name || user.email || 'A neighbor',
          ownerEmail: sharedFields.contactEmail,
          neighborhood: sharedFields.neighborhood,
        }
      }).catch(e => console.error('Batch notification failed:', e));
    }

    setProgress(100);
    setStep("done");
    setIsPublishing(false);
    toast.success(`${published} item${published !== 1 ? 's' : ''} published!`);
  };

  // UPLOAD STEP
  if (step === "upload") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-semibold text-deep-brown mb-2">
              Bulk Add Items
            </h1>
            <p className="text-muted-foreground">
              Upload photos of up to 10 items — AI will identify each one
            </p>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img.previewUrl} alt={`Item ${i + 1}`} className="w-full h-28 object-cover rounded-sm border border-border" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-card border border-border rounded-sm p-8">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center cursor-pointer hover:border-terracotta transition-colors"
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-1">Click to add photos</p>
              <p className="text-xs text-muted-foreground">
                One photo per item • Any size, auto-compressed ({images.length}/10)
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {images.length > 0 && (
              <div className="mt-6 flex gap-3 flex-wrap">
                {aiFeaturesEnabled && (
                  <Button onClick={analyzeAll} size="lg" className="flex-1 min-w-[200px]">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Analyze {images.length} Item{images.length !== 1 ? 's' : ''} with AI
                  </Button>
                )}
                <Button
                  onClick={uploadAllManual}
                  size="lg"
                  variant={aiFeaturesEnabled ? "secondary" : "default"}
                  className="flex-1 min-w-[200px]"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload &amp; add details myself
                </Button>
                <Button variant="outline" size="lg" onClick={() => setImages([])}>
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // PROCESSING STEP
  if (step === "processing") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-2xl font-serif font-semibold text-deep-brown">{progressLabel}</h2>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground">
            This may take a minute. Don't close the page.
          </p>
        </div>
      </div>
    );
  }

  // PUBLISHING STEP
  if (step === "publishing") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-2xl font-serif font-semibold text-deep-brown">{progressLabel}</h2>
          <Progress value={progress} className="w-full" />
        </div>
      </div>
    );
  }

  // DONE STEP
  if (step === "done") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-accent" />
          </div>
          <h2 className="text-2xl font-serif font-semibold text-deep-brown">All Done!</h2>
          <p className="text-muted-foreground">Your items are now in the catalog.</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate(`/c/${communitySlug}?tab=browse`)}>Browse Catalog</Button>
            <Button variant="outline" onClick={() => {
              setStep("upload");
              setImages([]);
              setDrafts([]);
              setProgress(0);
            }}>Add More Items</Button>
          </div>
        </div>
      </div>
    );
  }

  // REVIEW STEP
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-semibold text-deep-brown mb-2">
            Review Items
          </h1>
          <p className="text-muted-foreground">
            Edit AI-drafted details, then publish all at once
          </p>
        </div>

        {/* Shared Fields */}
        <div className="bg-card border border-border rounded-sm p-6 space-y-6 mb-8">
          <h2 className="text-lg font-serif font-semibold text-deep-brown">Shared Details</h2>
          <p className="text-sm text-muted-foreground -mt-2">Applied to all items</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-deep-brown font-medium">Neighborhood</Label>
              <Input
                placeholder="e.g., Sunset District"
                value={sharedFields.neighborhood}
                onChange={(e) => setSharedFields(prev => ({ ...prev, neighborhood: e.target.value }))}
                className="border-border mt-1"
              />
            </div>
            <div>
              <Label className="text-deep-brown font-medium">Cross Streets</Label>
              <Input
                placeholder="e.g., 25th & Irving"
                value={sharedFields.crossStreets}
                onChange={(e) => setSharedFields(prev => ({ ...prev, crossStreets: e.target.value }))}
                className="border-border mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-deep-brown font-medium">Contact Email *</Label>
              <Input
                type="email"
                value={sharedFields.contactEmail}
                onChange={(e) => setSharedFields(prev => ({ ...prev, contactEmail: e.target.value }))}
                className="border-border mt-1"
                required
              />
            </div>
          </div>

          <div>
            <h3 className="text-deep-brown font-medium mb-2">Borrowing Guidelines</h3>
            <HouseRules rules={houseRules} onRulesChange={setHouseRules} />
          </div>
        </div>

        {/* Draft Cards */}
        <div className="space-y-6 mb-8">
          {drafts.map((draft, i) => (
            <div key={i} className={`bg-card border rounded-sm p-6 ${draft.error ? 'border-destructive' : 'border-border'}`}>
              <div className="flex gap-6">
                <img src={draft.previewUrl || draft.publicUrl} alt={draft.name || `Item ${i + 1}`} className="w-32 h-32 object-cover rounded-sm flex-shrink-0" />
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      {draft.error && (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>AI analysis failed — fill in manually</span>
                        </div>
                      )}
                      <div>
                        <Label className="text-deep-brown font-medium text-xs">Name *</Label>
                        <Input
                          value={draft.name}
                          onChange={(e) => updateDraft(i, 'name', e.target.value)}
                          placeholder="Item name"
                          className="border-border mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-deep-brown font-medium text-xs">Description *</Label>
                        <Textarea
                          value={draft.description}
                          onChange={(e) => updateDraft(i, 'description', e.target.value)}
                          placeholder="Describe the item..."
                          className="border-border mt-1 min-h-[60px]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-deep-brown font-medium text-xs">Category *</Label>
                          <Select value={draft.category} onValueChange={(v) => updateDraft(i, 'category', v)}>
                            <SelectTrigger className="border-border mt-1">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.filter(c => c.id !== 'all').map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-deep-brown font-medium text-xs">Condition *</Label>
                          <Select value={draft.condition} onValueChange={(v) => updateDraft(i, 'condition', v)}>
                            <SelectTrigger className="border-border mt-1">
                              <SelectValue />
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
                    <Button variant="ghost" size="sm" onClick={() => removeDraft(i)} className="ml-2">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {drafts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">All items removed.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setStep("upload"); setImages([]); }}>
              Start Over
            </Button>
          </div>
        ) : (
          <div className="flex gap-4">
            <Button onClick={publishAll} size="lg" className="flex-1" disabled={isPublishing}>
              <Sparkles className="mr-2 h-5 w-5" />
              Publish {drafts.filter(d => d.name && d.description && d.category).length} Item{drafts.filter(d => d.name && d.description && d.category).length !== 1 ? 's' : ''}
            </Button>
            <Button variant="outline" size="lg" onClick={() => { setStep("upload"); setDrafts([]); }}>
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
