import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface JoinRequest {
  id: string;
  name: string;
  email: string;
  intro: string;
  connection_context: string | null;
  status: 'pending' | 'rejected' | 'vouched' | 'approved';
  requested_at: string;
  user_id: string | null;
}

export function JoinRequestsManager() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('join_requests')
        .select('id, name, email, intro, connection_context, status, requested_at, user_id')
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update join request status to approved
      const { error: updateError } = await supabase
        .from('join_requests')
        .update({
          status: 'approved' as any,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // If there's a linked user, activate them by setting vouched_at
      if (request.user_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ vouched_at: new Date().toISOString() })
          .eq('id', request.user_id);

        if (profileError) throw profileError;
      }

      // Send welcome email to the approved member
      try {
        const { data: community } = await supabase
          .from('communities')
          .select('name, slug')
          .eq('id', request.community_id || '')
          .single();

        if (community) {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              memberName: request.name,
              memberEmail: request.email,
              communityName: community.name,
              communitySlug: community.slug,
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('join_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

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
  }, []);

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
