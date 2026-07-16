import { useState, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCommunity } from "@/contexts/CommunityContext";
import { CheckCircle, XCircle, Clock, Trash2, ChevronDown, ChevronRight } from "lucide-react";


interface JoinRequest {
  id: string;
  name: string;
  email: string;
  intro: string;
  connection_context: string | null;
  cross_streets: string | null;
  referral_source: string | null;
  custom_answer: string | null;
  community_id: string;
  status: 'pending' | 'rejected' | 'vouched' | 'approved';
  requested_at: string;
  user_id: string | null;
}

export function JoinRequestsManager() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState<string | null>(null);
  const { toast } = useToast();
  const { communityId } = useCommunity();


  const fetchRequests = async () => {
    if (!communityId) return;
    try {
      const { data, error } = await supabase
        .from('join_requests')
        .select('id, name, email, intro, connection_context, cross_streets, referral_source, custom_answer, community_id, status, requested_at, user_id')
        .eq('community_id', communityId)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as JoinRequest[]);

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

  const handleDismiss = async (request: JoinRequest) => {
    if (!confirm(`Dismiss this duplicate request from ${request.name}? Their membership is not affected — only this extra row is removed.`)) return;
    setProcessingId(request.id);
    try {
      const { error } = await supabase.rpc('dismiss_join_request' as any, {
        p_request_id: request.id,
      });
      if (error) throw error;
      toast({ title: "Dismissed", description: "The duplicate row was removed." });
      fetchRequests();
    } catch (error: any) {
      toast({ title: "Couldn't dismiss", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchRequests();
    if (communityId) {
      supabase
        .from('communities')
        .select('custom_join_question')
        .eq('id', communityId)
        .maybeSingle()
        .then(({ data }) => setCustomQuestion((data as any)?.custom_join_question ?? null));
    }
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

  const hasDetail = (r: JoinRequest) =>
    !!(customQuestion || r.intro || r.connection_context || r.cross_streets || r.referral_source || r.custom_answer);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => {
          const expanded = expandedId === request.id;
          const expandable = hasDetail(request);
          return (
            <Fragment key={request.id}>
              <TableRow>
                <TableCell>
                  {expandable ? (
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : request.id)}
                      className="p-1 hover:bg-muted rounded"
                      aria-label={expanded ? "Collapse" : "Expand"}
                    >
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  ) : null}
                </TableCell>
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
                  <div className="flex flex-wrap gap-2">
                    {request.status === 'pending' && (
                      <>
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
                      </>
                    )}
                    {request.status !== 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismiss(request)}
                        disabled={processingId === request.id}
                        title="Remove this row (e.g. a duplicate). Doesn't affect membership."
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {expanded && expandable && (
                <TableRow>
                  <TableCell colSpan={6} className="bg-muted/30">
                    <div className="space-y-2 py-2 text-sm">
                      {customQuestion && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">{customQuestion}</p>
                          <p>{request.custom_answer?.trim() || "No answer recorded"}</p>
                        </div>
                      )}
                      {request.intro && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">How they heard about us</p>
                          <p>{request.intro}</p>
                        </div>
                      )}
                      {request.connection_context && !request.intro && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Connection</p>
                          <p>{request.connection_context}</p>
                        </div>
                      )}
                      {request.cross_streets && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Cross streets</p>
                          <p>{request.cross_streets}</p>
                        </div>
                      )}
                      {request.referral_source && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Referral source</p>
                          <p>{request.referral_source}</p>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

