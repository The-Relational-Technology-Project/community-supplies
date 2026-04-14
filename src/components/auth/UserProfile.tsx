
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Shield, Package, Settings, LayoutDashboard } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useCommunity } from "@/contexts/CommunityContext";

interface Profile {
  id: string;
  name: string;
  email: string;
}

export function UserProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSteward, setIsSteward] = useState(false);
  const { toast } = useToast();
  const { communitySlug } = useCommunity();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('id', user.id)
          .single();
        
        if (data) setProfile(data);

        // Check steward role from user_roles table (authoritative source)
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'steward')
          .maybeSingle();
        
        setIsSteward(!!roleData);
      }
    };

    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setIsSteward(false);
      } else if (event === 'SIGNED_IN' && session) {
        fetchProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Signed out", description: "You've been signed out successfully." });
    }
  };

  if (!profile) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 text-primary-foreground hover:bg-primary-foreground/10 px-2 sm:px-4">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{profile.name}</span>
            {isSteward && <Shield className="h-4 w-4 text-accent hidden sm:inline" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm">
            <div className="font-medium">{profile.name}</div>
            <div className="text-muted-foreground">{profile.email}</div>
            {isSteward && (
              <div className="text-xs mt-1">
                <span className="text-accent">Steward</span>
              </div>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            <Settings className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/my-supplies')}>
            <Package className="mr-2 h-4 w-4" />
            My Supplies
          </DropdownMenuItem>
          {isSteward && (
            <DropdownMenuItem onClick={() => navigate(`/c/${communitySlug}/steward`)}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Steward Dashboard
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
