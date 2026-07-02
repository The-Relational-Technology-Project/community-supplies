import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCommunity } from "@/contexts/CommunityContext";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface JoinRequest {
  id: string;
  name: string;
  email: string;
  intro: string;
  connection_context: string | null;
  community_id: string;
  status: 'pending' | 'rejected' | 'vouched' | 'approved';
  requested_at: string;
  user_id: string | null;
}

export function JoinRequestsManager() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { communityId } = useCommunity();

  const fetchRequests = async () => {
    if (!communityId) return;
    try {
      const { data, error } = await supabase
        .from('join_requests')
        .select('id, name, email, intro, connection_context, community_id, status, requested_at, user_id')
        .eq('community_id', communityId)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading join requests",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: JoinRequest) => {
    setProcessingId(request.id);
    try {
      // Single RPC: verifies caller is a steward of the target community,
      // marks the request approved, and moves the applicant's profile into
      // this community as active — even if they were previously pinned to
      // another community (which the old client-side UPDATE couldn't do
      // because RLS on profiles evaluates against the row's current
      // community_id).
      const { data, error } = await supabase.rpc('approve_join_request' as any, {
        p_request_id: request.id,
      });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      const communityName = row?.community_name as string | undefined;
      const communitySlug = row?.community_slug as string | undefined;

      try {
        if (communityName && communitySlug) {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              memberName: request.name,
              memberEmail: request.email,
              communityName,
              communitySlug,
            },
          });
        }
      } catch (welcomeError) {
        console.error("Failed to send welcome email:", welcomeError);
      }

      toast({
        title: "Member approved",
        description: `${request.name} has been approved and can now access the community.`
      });

      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error approving request",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: JoinRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase.rpc('reject_join_request' as any, {
        p_request_id: request.id,
      });
      if (error) throw error;

      toast({
        title: "Application rejected",
        description: `${request.name}'s application has been rejected.`
      });

      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error rejecting request",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  if (loading) {
    return <div className="text-center py-4">Loading join requests...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No join requests to review
      </div>
    );
  }

  // Normalize legacy 'vouched' status to 'approved' for display
  const displayStatus = (status: string) => {
    if (status === 'vouched') return 'approved';
    return status;
  };

  const isApproved = (status: string) => status === 'approved' || status === 'vouched';

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell className="font-medium">{request.name}</TableCell>
            <TableCell>{request.email}</TableCell>
            <TableCell>
                <Badge 
                 variant={
                  request.status === 'rejected' ? 'destructive' : 
                  isApproved(request.status) ? 'default' : 'secondary'
                }
              >
                {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                {request.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                {isApproved(request.status) && <CheckCircle className="h-3 w-3 mr-1" />}
                {displayStatus(request.status)}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(request.requested_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              {request.status === 'pending' && (
                <div className="space-x-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleApprove(request)}
                    disabled={processingId === request.id}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleReject(request)}
                    disabled={processingId === request.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
