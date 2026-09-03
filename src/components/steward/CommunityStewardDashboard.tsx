import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { CommunityOverview } from "./CommunityOverview";
import { SupplyRequestsManager } from "./SupplyRequestsManager";
import { JoinRequestsManager } from "./JoinRequestsManager";
import { JoinModeToggle } from "./JoinModeToggle";
import { StewardWelcomeBatch } from "./StewardWelcomeBatch";
import { CommunityAiSettings } from "./CommunityAiSettings";
import { CustomJoinQuestion } from "./CustomJoinQuestion";
import { RequestNotificationSettings } from "./RequestNotificationSettings";
import { ExportCommunityData } from "./ExportCommunityData";
import { RequestBoard } from "@/components/requests/RequestBoard";
import { useCommunity } from "@/contexts/CommunityContext";
import { Users, MessageSquare, MessageSquarePlus, UserPlus, ArrowLeft, User } from "lucide-react";

export function CommunityStewardDashboard() {
  const { communitySlug } = useCommunity();
  const navigate = useNavigate();
  const communityHome = communitySlug ? `/c/${communitySlug}` : "/";
  const profileHome = communitySlug ? `/c/${communitySlug}/profile` : "/profile";
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to={communityHome} className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to community
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to={profileHome} className="flex items-center gap-1">
            <User className="h-4 w-4" />
            Your profile
          </Link>
        </Button>
      </div>
      <h1 className="text-2xl font-serif font-bold text-deep-brown mb-6">Steward Dashboard</h1>
      <div className="mb-6 space-y-6">
        <JoinModeToggle />
        <CustomJoinQuestion />
        <CommunityAiSettings />
        <RequestNotificationSettings />
        <ExportCommunityData />
        <StewardWelcomeBatch />

      </div>
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="join-requests" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Join Requests
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Supply Requests
          </TabsTrigger>
          <TabsTrigger value="item-requests" className="gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            Request Board
          </TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <CommunityOverview />
        </TabsContent>
        <TabsContent value="join-requests">
          <JoinRequestsManager />
        </TabsContent>
        <TabsContent value="requests">
          <SupplyRequestsManager />
        </TabsContent>
        <TabsContent value="item-requests">
          <RequestBoard
            isSteward
            onFulfill={() => navigate(`${communityHome}?tab=add`)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
