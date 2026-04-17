
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
import { useQueryClient } from "@tanstack/react-query";
import { SUPPLIES_QUERY_KEY, fetchSupplies } from "@/hooks/useSupplies";
import { useCommunity } from "@/contexts/CommunityContext";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { communityId, communityName, communitySlug, loading: communityLoading, notFound } = useCommunity();
  const { user, isReady } = useAuth();
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  // Prefetch supplies once user + community are ready
  useEffect(() => {
    if (isReady && user && communityId) {
      queryClient.prefetchQuery({
        queryKey: [...SUPPLIES_QUERY_KEY, communityId],
        queryFn: () => fetchSupplies(communityId),
      });
    }
  }, [isReady, user, communityId, queryClient]);

  const loading = !isReady;

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
