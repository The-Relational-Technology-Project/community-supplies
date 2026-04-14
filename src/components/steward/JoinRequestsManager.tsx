
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Heart } from "lucide-react";

interface JoinRequest {
  id: string;
  name: string;
  email: string;
  intro: string;
  connection_context: string | null;
  status: 'pending' | 'rejected' | 'vouched' | 'approved';
  requested_at: string;
  voucher_id: string | null;
}

export function JoinRequestsManager() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('join_requests')
        .select('*')
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
    toast({
      title: "Simplified Process",
      description: "Since you know everyone personally, just ask them to sign up again with their email. No approval needed!"
    });
  };

  const handleReject = async (request: JoinRequest) => {
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
      <div className="text-center py-8 text-gray-500">
        No join requests to review
      </div>
    );
  }

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
                  (request.status === 'vouched' || request.status === 'approved') ? 'default' : 'secondary'
                }
              >
                {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                {request.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                {(request.status === 'vouched' || request.status === 'approved') && <CheckCircle className="h-3 w-3 mr-1" />}
                {request.status === 'vouched' ? 'approved' : request.status}
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
                    variant="outline"
                  >
                    <Heart className="h-4 w-4 mr-1" />
                    Ask to Sign Up
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleReject(request)}
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
