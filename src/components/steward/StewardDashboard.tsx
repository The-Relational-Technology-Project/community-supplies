import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Shield, Users, Package, MessageSquare, Globe, Link as LinkIcon, ArrowLeft, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useCommunity } from "@/contexts/CommunityContext";
import { CommunityOverview } from "./CommunityOverview";
import { SupplyRequestsManager } from "./SupplyRequestsManager";
import { AllSuppliesManager } from "./AllSuppliesManager";
import { RefreshIllustrations } from "./RefreshIllustrations";
import { CommunityRequestsManager } from "./CommunityRequestsManager";
import { NeighborCommunitiesManager } from "./NeighborCommunitiesManager";
import { JoinModeToggle } from "./JoinModeToggle";
import { DiscoverabilityToggle } from "./DiscoverabilityToggle";
import { RenameCommunity } from "./RenameCommunity";
import { StewardWelcomeBatch } from "./StewardWelcomeBatch";
import { InviteNeighborsButton } from "./InviteNeighborsButton";
import { CommunityAiSettings } from "./CommunityAiSettings";
import { CustomJoinQuestion } from "./CustomJoinQuestion";

export function StewardDashboard() {
  const { communitySlug } = useCommunity();
  const communityHome = communitySlug ? `/c/${communitySlug}` : "/";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={communityHome} className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to community
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/profile" className="flex items-center gap-1">
            <User className="h-4 w-4" />
            Your profile
          </Link>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Steward Dashboard</h1>
          <p className="text-muted-foreground">Community overview and activity</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <InviteNeighborsButton />
          <RefreshIllustrations />
        </div>
      </div>

      <RenameCommunity />

      <JoinModeToggle />

      <CustomJoinQuestion />

      <DiscoverabilityToggle />

      <CommunityAiSettings />

      <StewardWelcomeBatch />

      <Tabs defaultValue="members" className="space-y-4">

        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="supplies" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Supplies
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="communities" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Communities
          </TabsTrigger>
          <TabsTrigger value="neighbors" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Neighbors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>All Members</CardTitle>
              <CardDescription>
                View all community members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommunityOverview />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supplies">
          <Card>
            <CardHeader>
              <CardTitle>All Supplies</CardTitle>
              <CardDescription>
                All supplies shared in the community, newest first
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AllSuppliesManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Supply Requests</CardTitle>
              <CardDescription>
                Recent requests from people wanting to borrow supplies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SupplyRequestsManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communities">
          <Card>
            <CardHeader>
              <CardTitle>Community Requests</CardTitle>
              <CardDescription>
                People who want to start a sharing community in their neighborhood
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommunityRequestsManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="neighbors">
          <Card>
            <CardHeader>
              <CardTitle>Nearby Communities</CardTitle>
              <CardDescription>
                Manage federated search connections with nearby sharing communities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NeighborCommunitiesManager />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
