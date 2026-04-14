import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCommunity } from "@/contexts/CommunityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Supply } from "@/types/supply";
import { Edit2, Save, X, Trash2, ArrowLeft, FileText } from "lucide-react";
import { CatalogHeader } from "@/components/CatalogHeader";
import { Footer } from "@/components/Footer";
import { GenerateIllustrationButton } from "@/components/GenerateIllustrationButton";
import { MultipleImageUpload } from "@/components/MultipleImageUpload";

export default function MySupplies() {
  const navigate = useNavigate();
  const { communitySlug } = useCommunity();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Supply>>({});
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [currentNotesSupply, setCurrentNotesSupply] = useState<Supply | null>(null);
  const [tempNotes, setTempNotes] = useState("");
  const { toast } = useToast();

  const fetchMySupplies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('supplies')
        .select(`
          *,
          profiles:owner_id (
            name,
            zip_code
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedSupplies: Supply[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        condition: item.condition as 'excellent' | 'good' | 'fair',
        partyTypes: item.party_types || [],
        dateAvailable: item.date_available || new Date().toISOString().split('T')[0],
        location: item.location,
        neighborhood: item.neighborhood,
        crossStreets: item.cross_streets,
        contactEmail: item.contact_email,
        image: item.image_url,
        images: item.images || (item.image_url ? [item.image_url] : []),
        houseRules: item.house_rules || [],
        lentOut: item.lent_out || false,
        lenderNotes: item.lender_notes || '',
        owner: {
          name: item.profiles?.name || 'Unknown',
          zipCode: item.profiles?.zip_code || '00000',
          location: item.location || `${item.profiles?.zip_code || 'Unknown'} area`,
          avatar: ''
        }
      }));

      setSupplies(transformedSupplies);
    } catch (error: any) {
      toast({
        title: "Error loading your supplies",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySupplies();
  }, []);

  const handleEdit = (supply: Supply) => {
    setEditingId(supply.id);
    setEditForm(supply);
  };

  const handleSave = async () => {
    if (!editingId || !editForm) return;

    try {
        const { error } = await supabase
        .from('supplies')
        .update({
          name: editForm.name,
          description: editForm.description,
          category: editForm.category,
          condition: editForm.condition,
          party_types: editForm.partyTypes,
          date_available: editForm.dateAvailable,
          location: editForm.location,
          contact_email: editForm.contactEmail,
          images: editForm.images,
          image_url: editForm.images && editForm.images.length > 0 ? editForm.images[0] : null,
          house_rules: editForm.houseRules,
        })
        .eq('id', editingId);

      if (error) throw error;

      toast({
        title: "Supply updated",
        description: "Your supply has been updated successfully."
      });

      setEditingId(null);
      setEditForm({});
      fetchMySupplies();
    } catch (error: any) {
      toast({
        title: "Error updating supply",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supply?")) return;

    try {
      const { error } = await supabase
        .from('supplies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Supply deleted",
        description: "Your supply has been deleted successfully."
      });

      fetchMySupplies();
    } catch (error: any) {
      toast({
        title: "Error deleting supply",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleGoBack = () => {
    navigate(`/c/${communitySlug}`);
  };

  const handleTabChange = (tab: string) => {
    navigate(`/c/${communitySlug}?tab=${tab}`);
  };

  const handleToggleLentOut = async (supply: Supply) => {
    try {
      const { error } = await supabase
        .from('supplies')
        .update({ lent_out: !supply.lentOut })
        .eq('id', supply.id);

      if (error) throw error;

      toast({
        title: supply.lentOut ? "Item marked as available" : "Item marked as lent out",
        description: "Status updated successfully."
      });

      fetchMySupplies();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleOpenNotes = (supply: Supply) => {
    setCurrentNotesSupply(supply);
    setTempNotes(supply.lenderNotes || '');
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!currentNotesSupply) return;

    try {
      const { error } = await supabase
        .from('supplies')
        .update({ lender_notes: tempNotes })
        .eq('id', currentNotesSupply.id);

      if (error) throw error;

      toast({
        title: "Notes saved",
        description: "Your notes have been saved successfully."
      });

      setNotesDialogOpen(false);
      setCurrentNotesSupply(null);
      setTempNotes('');
      fetchMySupplies();
    } catch (error: any) {
      toast({
        title: "Error saving notes",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <CatalogHeader onNavigate={handleTabChange} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading your supplies...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CatalogHeader onNavigate={handleTabChange} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={handleGoBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">My Supplies ({supplies.length})</h1>
        </div>

        {supplies.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">You haven't added any supplies yet.</p>
              <Button onClick={handleGoBack}>Add Your First Supply</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {supplies.map((supply) => (
              <Card key={supply.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  {supply.images && supply.images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {supply.images.slice(0, 4).map((image, index) => (
                        <div key={index} className="aspect-square bg-gradient-to-br from-accent/20 to-accent/40 rounded-lg overflow-hidden">
                          <img 
                            src={image} 
                            alt={`${supply.name} ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  ) : supply.image && (
                    <div className="aspect-video bg-gradient-to-br from-accent/20 to-accent/40 rounded-lg overflow-hidden mb-4">
                      <img 
                        src={supply.image} 
                        alt={supply.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  
                  {editingId === supply.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Supply name"
                      />
                      <Select
                        value={editForm.condition || ''}
                        onValueChange={(value) => setEditForm({ ...editForm, condition: value as 'excellent' | 'good' | 'fair' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{supply.name}</CardTitle>
                      <div className="flex gap-1">
                        <Badge variant={supply.condition === 'excellent' ? 'default' : 'secondary'}>
                          {supply.condition}
                        </Badge>
                        <Badge variant={supply.lentOut ? "destructive" : "outline"}>
                          {supply.lentOut ? "lent out" : "available"}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  {/* Show generate illustration button if item has photos but no illustration */}
                  {!editingId && (supply.images?.length || supply.image) && !supply.illustration_url && (
                    <div className="mt-2">
                      <GenerateIllustrationButton
                        supplyId={supply.id}
                        itemName={supply.name}
                        description={supply.description}
                        imageUrl={supply.image}
                        onGenerated={fetchMySupplies}
                      />
                    </div>
                  )}
                </CardHeader>
                
                <CardContent>
                  {editingId === supply.id ? (
                    <div className="space-y-4">
                      <MultipleImageUpload 
                        onImagesChange={(images) => setEditForm({ ...editForm, images })}
                        currentImages={editForm.images || []}
                        maxImages={4}
                      />
                      <Textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Description"
                        rows={3}
                      />
                      <Input
                        value={editForm.location || ''}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        placeholder="Location (e.g., San Francisco, CA)"
                      />
                      <Input
                        type="email"
                        value={editForm.contactEmail || ''}
                        onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                        placeholder="Contact email"
                      />
                      <Input
                        type="date"
                        value={editForm.dateAvailable || ''}
                        onChange={(e) => setEditForm({ ...editForm, dateAvailable: e.target.value })}
                      />
                      <div className="flex gap-2 pt-4">
                        <Button onClick={handleSave} className="flex-1">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline" onClick={handleCancel}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-muted-foreground text-sm">{supply.description}</p>
                      
                      {supply.location && (
                        <p className="text-sm text-muted-foreground">📍 {supply.location}</p>
                      )}
                      
                      <p className="text-sm text-muted-foreground">📅 Available: {supply.dateAvailable}</p>
                      
                      {supply.partyTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {supply.partyTypes.map((type) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {supply.lenderNotes && (
                        <div className="bg-muted p-3 rounded-sm">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Your Notes:</p>
                          <p className="text-sm whitespace-pre-wrap">{supply.lenderNotes}</p>
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-2 pt-4">
                        <div className="flex gap-2">
                          <Button 
                            variant={supply.lentOut ? "default" : "outline"} 
                            onClick={() => handleToggleLentOut(supply)} 
                            className="flex-1"
                          >
                            {supply.lentOut ? "Mark as Available" : "Mark as Lent Out"}
                          </Button>
                          <Dialog open={notesDialogOpen && currentNotesSupply?.id === supply.id} onOpenChange={(open) => {
                            if (!open) {
                              setNotesDialogOpen(false);
                              setCurrentNotesSupply(null);
                              setTempNotes('');
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" onClick={() => handleOpenNotes(supply)}>
                                <FileText className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Lender Notes for {supply.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <p className="text-sm text-muted-foreground">
                                  Add notes about who you lent this to, expected return date, or any other details for your reference.
                                </p>
                                <Textarea
                                  value={tempNotes}
                                  onChange={(e) => setTempNotes(e.target.value)}
                                  placeholder="e.g., Lent to Sarah for her daughter's birthday party on 12/15. Expected return: 12/16"
                                  rows={6}
                                />
                                <Button onClick={handleSaveNotes} className="w-full">
                                  Save Notes
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => handleEdit(supply)} className="flex-1">
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button variant="destructive" onClick={() => handleDelete(supply.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}