
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthButtons } from "./AuthButtons";
import { JoinRequestForm } from "../community/JoinRequestForm";
import { Shield, Users } from "lucide-react";
import { useCommunity } from "@/contexts/CommunityContext";

interface AuthGuardProps {
  children: React.ReactNode;
  requireSteward?: boolean;
}

export function AuthGuard({ children, requireSteward = false }: AuthGuardProps) {
  const [user, setUser] = useState<any>(null);
  const [isSteward, setIsSteward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const { communityName } = useCommunity();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error('AuthGuard session error:', sessionError);
          setLoading(false);
          return;
        }
        
        const user = session?.user ?? null;
        setUser(user);
        
        if (user) {
          // Check steward role from user_roles table (authoritative source)
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'steward')
            .maybeSingle();
          
          if (!mounted) return;
          setIsSteward(!!roleData);
        }
        
        if (mounted) setLoading(false);
      } catch (error) {
        console.error('AuthGuard error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsSteward(false);
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session) {
        setLoading(true);
        checkAuth();
      }
    });

    checkAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          {showJoinForm ? (
            <JoinRequestForm />
          ) : (
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-orange-500 p-3 rounded-full">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Welcome to {communityName}</CardTitle>
                <CardDescription>
                  A trust-based community for sharing supplies with your neighbors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Join our community to share supplies and make amazing parties happen!
                  </p>
                </div>
                <AuthButtons />
                <div className="text-center">
                  <button 
                    onClick={() => setShowJoinForm(true)}
                    className="text-sm text-orange-600 hover:underline"
                  >
                    Don't have an account? Request to join our community
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (requireSteward && !isSteward) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-orange-500 p-3 rounded-full">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle>Steward Access Required</CardTitle>
            <CardDescription>
              You need steward privileges to access this area
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              This section is only available to community stewards who help manage 
              member applications and maintain our trust-based system.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-orange-600">
              <Shield className="h-4 w-4" />
              <span>Protected steward area</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
