import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCommunity } from "@/contexts/CommunityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, User } from "lucide-react";
import { Header } from "@/components/Header";

export default function Profile() {
  const navigate = useNavigate();
  const { communitySlug } = useCommunity();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    zip_code: "",
    intro_text: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }
        
        setUser(user);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          toast({
            title: "Error loading profile",
            description: error.message,
            variant: "destructive"
          });
          return;
        }

        if (profile) {
          setFormData({
            name: profile.name || "",
            email: profile.email || user.email || "",
            zip_code: profile.zip_code || "",
            intro_text: profile.intro_text || "",
          });
        }
      } catch (error: any) {
        console.error('Error:', error);
        toast({
          title: "Error loading profile", 
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate, toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          email: formData.email.trim(),
          zip_code: formData.zip_code.trim(),
          intro_text: formData.intro_text.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully."
      });
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGoBack = () => {
    navigate(`/c/${communitySlug}`);
  };

  const handleTabChange = (tab: string) => {
    navigate(`/c/${communitySlug}?tab=${tab}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header activeTab="" onTabChange={handleTabChange} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading your profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab="" onTabChange={handleTabChange} />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={handleGoBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl md:text-2xl">Your Profile</CardTitle>
            <p className="text-muted-foreground text-sm md:text-base">
              This information is used to auto-populate the supply sharing form and connect with community members.
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This name will be shown when you share supplies
                  </p>
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be auto-populated as your contact email for supplies
                  </p>
                </div>

                <div>
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    placeholder="e.g., 94122"
                    value={formData.zip_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                    maxLength={5}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Helps community members find supplies near them
                  </p>
                </div>

                <div>
                  <Label htmlFor="intro_text">About You (Optional)</Label>
                  <Input
                    id="intro_text"
                    placeholder="Tell the community a bit about yourself..."
                    value={formData.intro_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, intro_text: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    A brief introduction that other community members can see
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={saving}
                className="w-full text-lg py-3"
              >
                {saving ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}