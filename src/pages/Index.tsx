
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
import { useCommunity } from "@/contexts/CommunityContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { communityId, communityName, communitySlug, loading: communityLoading, notFound, isSlugRoute } = useCommunity();
  const { user, isReady } = useAuth();
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [membershipChecked, setMembershipChecked] = useState(false);
  const [isMember, setIsMember] = useState(false);

  // Membership gate: on /c/:slug, verify logged-in user actually belongs to this community.
  useEffect(() => {
    if (!isSlugRoute) {
      setMembershipChecked(true);
      setIsMember(true);
      return;
    }
    if (!isReady) return;
    if (!user) {
      setMembershipChecked(true);
      setIsMember(false);
      return;
    }
    if (communityLoading) return;

    let cancelled = false;
    setMembershipChecked(false);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("community_id")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setIsMember((data as any)?.community_id === communityId);
      setMembershipChecked(true);
    })();
    return () => { cancelled = true; };
  }, [isSlugRoute, isReady, user?.id, communityId, communityLoading]);

  // Read URL params once on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['browse', 'add', 'bulk-add', 'steward'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    const onboardingParam = searchParams.get('onboarding');
    if (onboardingParam === 'true') {
      setShowOnboarding(true);
    }
    if (tabParam || onboardingParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('tab');
      next.delete('onboarding');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wait for both auth bootstrap AND community resolution before rendering shell.
  // This prevents flashing the authenticated library before community context is settled.
  const loading = !isReady || (!!user && communityLoading) || (isSlugRoute && !!user && !membershipChecked);

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

  // On /c/:slug, if logged-in user isn't a member of this community,
  // show the public community landing with join CTA instead of the library shell.
  if (isSlugRoute && !isMember) {
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
