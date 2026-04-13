
import { Search, Plus, Sparkles, Menu, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthButtons } from "./auth/AuthButtons";
import { UserProfile } from "./auth/UserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/contexts/CommunityContext";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const navigate = useNavigate();
  const { communityName } = useCommunity();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSteward, setIsSteward] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Header: Current user:", user);
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        console.log("Header: User profile:", profile);
        setUserProfile(profile);
        
        // Check for steward role
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'steward')
          .single();
        setIsSteward(!!roles);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user || null;
      console.log("Header: Auth state changed:", event, currentUser);
      setUser(currentUser);
      
      if (currentUser) {
        // Defer Supabase calls with setTimeout to prevent deadlocks
        setTimeout(() => {
          supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()
            .then(({ data: profile }) => {
              console.log("Header: Updated profile:", profile);
              setUserProfile(profile);
            });
          
          // Check for steward role
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUser.id)
            .eq('role', 'steward')
            .single()
            .then(({ data: roles }) => {
              setIsSteward(!!roles);
            });
        }, 0);
      } else {
        setUserProfile(null);
        setIsSteward(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigationItems = [{
    key: 'browse',
    label: 'Browse Supplies',
    icon: Search
  }, {
    key: 'add',
    label: 'Add Supply',
    icon: Plus
  }, {
    key: 'planner',
    label: 'Party Planner',
    icon: Sparkles
  }];

  const handleTabChange = (tab: string) => {
    if (tab === 'steward') {
      navigate('/steward');
      setIsMobileMenuOpen(false);
      return;
    }
    onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-sand">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button className="cursor-pointer" onClick={() => handleTabChange('home')}>
            <h1 className="text-lg md:text-xl font-serif font-bold text-deep-brown hover:text-primary transition-colors">{communityName}</h1>
          </button>
          
          {/* Desktop Navigation & Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <nav className="flex space-x-2">
                {navigationItems.map(({ key, label, icon: Icon }) => (
                  <Button 
                    key={key} 
                    variant={activeTab === key ? 'secondary' : 'ghost'} 
                    onClick={() => handleTabChange(key)} 
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {label}
                  </Button>
                ))}
                {isSteward && (
                  <Button 
                    variant="ghost"
                    onClick={() => handleTabChange('steward')} 
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Steward
                  </Button>
                )}
              </nav>
            )}
            
            {user ? <UserProfile /> : <AuthButtons onSuccess={() => onTabChange('browse')} />}
          </div>

          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-border pt-4">
            <div className="flex flex-col space-y-2">
              {user ? (
                <>
                  {navigationItems.map(({ key, label, icon: Icon }) => (
                    <Button 
                      key={key} 
                      variant={activeTab === key ? 'secondary' : 'ghost'} 
                      onClick={() => handleTabChange(key)} 
                      className="w-full justify-start"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {label}
                    </Button>
                  ))}
                  {isSteward && (
                    <Button 
                      variant="ghost"
                      onClick={() => handleTabChange('steward')} 
                      className="w-full justify-start"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Steward Dashboard
                    </Button>
                  )}
                  <div className="pt-2 border-t border-border mt-2">
                    <UserProfile />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <AuthButtons onSuccess={() => handleTabChange('browse')} />
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
