import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import MySupplies from "./pages/MySupplies";
import MyBooks from "./pages/MyBooks";
import Profile from "./pages/Profile";
import Steward from "./pages/Steward";
import StartCommunity from "./pages/StartCommunity";
import NotFound from "./pages/NotFound";
import PrivacyTerms from "./pages/PrivacyTerms";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/my-supplies" element={<MySupplies />} />
          <Route path="/my-books" element={<MyBooks />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/steward" element={<Steward />} />
          <Route path="/start-community" element={<StartCommunity />} />
          <Route path="/privacy" element={<PrivacyTerms />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
