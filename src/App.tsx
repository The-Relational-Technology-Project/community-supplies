import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import Index from "./pages/Index";
import { CommunityProvider } from "./contexts/CommunityContext";
import { AuthGuard } from "./components/auth/AuthGuard";

const MySupplies = lazy(() => import("./pages/MySupplies"));
const MyBooks = lazy(() => import("./pages/MyBooks"));
const Profile = lazy(() => import("./pages/Profile"));
const Steward = lazy(() => import("./pages/Steward"));
const StartCommunity = lazy(() => import("./pages/StartCommunity"));
const PrivacyTerms = lazy(() => import("./pages/PrivacyTerms"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CommunityStewardDashboard = lazy(() =>
  import("./components/steward/CommunityStewardDashboard").then((m) => ({
    default: m.CommunityStewardDashboard,
  }))
);

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-sand">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-terracotta border-t-transparent" />
  </div>
);

function CommunitySlugRoute() {
  const { communitySlug } = useParams();
  return (
    <CommunityProvider slug={communitySlug}>
      <Index />
    </CommunityProvider>
  );
}

function CommunityStewardRoute() {
  const { communitySlug } = useParams();
  return (
    <CommunityProvider slug={communitySlug}>
      <AuthGuard requireSteward>
        <CommunityStewardDashboard />
      </AuthGuard>
    </CommunityProvider>
  );
}

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<CommunityProvider><Index /></CommunityProvider>} />
          <Route path="/my-supplies" element={<CommunityProvider><MySupplies /></CommunityProvider>} />
          <Route path="/my-books" element={<CommunityProvider><MyBooks /></CommunityProvider>} />
          <Route path="/profile" element={<CommunityProvider><Profile /></CommunityProvider>} />
          <Route path="/steward" element={<CommunityProvider><Steward /></CommunityProvider>} />
          <Route path="/start-community" element={<StartCommunity />} />
          <Route path="/privacy" element={<PrivacyTerms />} />
          <Route path="/c/:communitySlug" element={<CommunitySlugRoute />} />
          <Route path="/c/:communitySlug/steward" element={<CommunityStewardRoute />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
