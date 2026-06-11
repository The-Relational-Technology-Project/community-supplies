import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCommunity } from "@/contexts/CommunityContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";

interface SupplyRequest {
  id: string;
  supply_name: string;
  sender_name: string;
  sender_contact: string;
  message: string;
  status: string;
  created_at: string;
  supply_owner_id: string;
}

export function SupplyRequestsManager() {
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { communityId } = useCommunity();

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  const fetchRequests = async () => {
    if (!communityId) return;
    try {
      const { data, error } = await supabase
        .from('supply_requests')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading supply requests",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading supply requests...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No supply requests yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supply</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.supply_name}</TableCell>
              <TableCell>{request.sender_name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {request.sender_contact}
              </TableCell>
              <TableCell className="max-w-xs">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-sm line-clamp-2">{request.message}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={request.status === 'pending' ? 'default' : 'secondary'}>
                  {request.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(request.created_at), 'MMM d, yyyy')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}