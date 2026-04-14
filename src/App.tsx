import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import Index from "./pages/Index";
import MySupplies from "./pages/MySupplies";
import MyBooks from "./pages/MyBooks";
import Profile from "./pages/Profile";
import Steward from "./pages/Steward";
import StartCommunity from "./pages/StartCommunity";
import NotFound from "./pages/NotFound";
import PrivacyTerms from "./pages/PrivacyTerms";
import { CommunityProvider } from "./contexts/CommunityContext";
import { CommunityStewardDashboard } from "./components/steward/CommunityStewardDashboard";
import { AuthGuard } from "./components/auth/AuthGuard";

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
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
