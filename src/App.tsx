import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import Index from "./pages/Index";
import { CommunityProvider } from "./contexts/CommunityContext";
import { AuthGuard } from "./components/auth/AuthGuard";
import { RedirectToCommunity } from "./components/auth/RedirectToCommunity";



const MySupplies = lazy(() => import("./pages/MySupplies"));
const MyBooks = lazy(() => import("./pages/MyBooks"));
const Profile = lazy(() => import("./pages/Profile"));
const Steward = lazy(() => import("./pages/Steward"));
const StartCommunity = lazy(() => import("./pages/StartCommunity"));
const PrivacyTerms = lazy(() => import("./pages/PrivacyTerms"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
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

function CommunityScopedPage({ children }: { children: React.ReactNode }) {
  const { communitySlug } = useParams();
  return <CommunityProvider slug={communitySlug}>{children}</CommunityProvider>;
}

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<CommunityProvider><Index /></CommunityProvider>} />
          {/* Legacy bare paths — redirect to slug-scoped equivalents */}
          <Route path="/my-supplies" element={<RedirectToCommunity suffix="/my-supplies" />} />
          <Route path="/my-books" element={<RedirectToCommunity suffix="/my-books" />} />
          <Route path="/profile" element={<RedirectToCommunity suffix="/profile" />} />
          <Route path="/steward" element={<RedirectToCommunity suffix="/steward" />} />
          <Route path="/start-community" element={<StartCommunity />} />
          <Route path="/privacy" element={<PrivacyTerms />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/c/:communitySlug" element={<CommunitySlugRoute />} />
          <Route path="/c/:communitySlug/my-supplies" element={<CommunityScopedPage><MySupplies /></CommunityScopedPage>} />
          <Route path="/c/:communitySlug/my-books" element={<CommunityScopedPage><MyBooks /></CommunityScopedPage>} />
          <Route path="/c/:communitySlug/profile" element={<CommunityScopedPage><Profile /></CommunityScopedPage>} />
          <Route path="/c/:communitySlug/steward" element={<CommunityStewardRoute />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
