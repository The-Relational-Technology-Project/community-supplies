
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CatalogHeader } from "@/components/CatalogHeader";
import { Footer } from "@/components/Footer";
import { LandingPage } from "@/components/LandingPage";
import { BrowseSupplies } from "@/components/BrowseSupplies";
import { AddSupply } from "@/components/AddSupply";
import { BulkAddSupplies } from "@/components/BulkAddSupplies";
import { StewardOnboarding } from "@/components/community/StewardOnboarding";

import { StewardDashboard } from "@/components/steward/StewardDashboard";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { SUPPLIES_QUERY_KEY, fetchSupplies } from "@/hooks/useSupplies";
import { useCommunity } from "@/contexts/CommunityContext";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { communityId, communityName, communitySlug, loading: communityLoading, notFound } = useCommunity();
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check for tab parameter in URL
    const tabParam = searchParams.get('tab');
    if (tabParam && ['browse', 'add', 'bulk-add', 'steward'].includes(tabParam)) {
      setActiveTab(tabParam);
      setSearchParams({});
    }
    
    const onboardingParam = searchParams.get('onboarding');
    if (onboardingParam === 'true') {
      setShowOnboarding(true);
      searchParams.delete('onboarding');
      setSearchParams(searchParams);
    }

    let mounted = true;

    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Auth error:', error);
          setUser(null);
        } else {
          setUser(session?.user ?? null);
          if (session?.user) {
            queryClient.prefetchQuery({ queryKey: [...SUPPLIES_QUERY_KEY, communityId], queryFn: () => fetchSupplies(communityId) });
          }
        }
      } catch (error) {
        console.error('Failed to check user:', error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Set up auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      if (mounted) {
        setUser(session?.user || null);
        setLoading(false);
      }
    });

    // Then check current user
    checkUser();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [searchParams, setSearchParams]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show the inspiring landing page
  if (!user) {
    return <LandingPage onTabChange={setActiveTab} />;
  }

  // Show onboarding for new stewards
  if (showOnboarding) {
    return (
      <main className="min-h-screen flex flex-col bg-sand">
        <StewardOnboarding
          communityName={communityName}
          communitySlug={communitySlug}
          onDismiss={() => {
            setShowOnboarding(false);
            setActiveTab("add");
          }}
        />
      </main>
    );
  }

  // If user is authenticated, show the functional interface
  const renderContent = () => {
    switch (activeTab) {
      case 'browse':
        return (
          <AuthGuard>
            <BrowseSupplies searchQuery={searchQuery} />
          </AuthGuard>
        );
      case 'add':
        return (
          <AuthGuard>
            <AddSupply />
          </AuthGuard>
        );
      case 'bulk-add':
        return (
          <AuthGuard>
            <BulkAddSupplies />
          </AuthGuard>
        );
      case 'steward':
        return (
          <AuthGuard requireSteward>
            <StewardDashboard />
          </AuthGuard>
        );
      default:
        return (
          <AuthGuard>
            <BrowseSupplies searchQuery={searchQuery} />
          </AuthGuard>
        );
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      <CatalogHeader onNavigate={setActiveTab} onSearch={setSearchQuery} searchQuery={searchQuery} />
      <div className="flex-1">
        {renderContent()}
      </div>
      <Footer />
    </main>
  );
};

export default Index;
