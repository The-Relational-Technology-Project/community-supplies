import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityOverview } from "./CommunityOverview";
import { SupplyRequestsManager } from "./SupplyRequestsManager";
import { JoinRequestsManager } from "./JoinRequestsManager";
import { Users, MessageSquare, UserPlus } from "lucide-react";

export function CommunityStewardDashboard() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-serif font-bold text-deep-brown mb-6">Steward Dashboard</h1>
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
      </Tabs>
    </div>
  );
}
