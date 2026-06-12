import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCommunity } from "@/contexts/CommunityContext";
import { Users, Shield, UserPlus, Copy, Check, UserX, UserCheck, Clock } from "lucide-react";

interface CommunityStats {
  totalMembers: number;
  stewards: number;
  recentJoins: number;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'steward';
  created_at: string;
  intro_text: string | null;
  zip_code: string | null;
  membership_status: 'pending' | 'active' | 'deactivated' | 'rejected';
}

export function CommunityOverview() {
  const [stats, setStats] = useState<CommunityStats>({
    totalMembers: 0,
    stewards: 0,
    recentJoins: 0
  });
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<Member | null>(null);
  const { toast } = useToast();
  const { communityId } = useCommunity();

  const copyEmail = async (email: string) => {
    await navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const fetchCommunityData = async () => {
    if (!communityId) return;
    try {
      const { data: members, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at, intro_text, zip_code, membership_status')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const memberList: Member[] = (members || []) as Member[];

      const stewardCount = memberList.filter(m => m.role === 'steward').length;
      const recentCount = memberList.filter(m => {
        const joinDate = new Date(m.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return joinDate > weekAgo;
      }).length;

      setStats({
        totalMembers: memberList.length,
        stewards: stewardCount,
        recentJoins: recentCount
      });

      setAllMembers(memberList);
    } catch (error: any) {
      toast({
        title: "Error loading community data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setMemberActive = async (member: Member, activate: boolean) => {
    setTogglingId(member.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ membership_status: activate ? 'active' : 'deactivated' })
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: activate ? "Member reactivated" : "Member deactivated",
        description: `${member.name} has been ${activate ? 'reactivated' : 'deactivated'}.`
      });

      fetchCommunityData();
    } catch (error: any) {
      toast({
        title: "Error updating member",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTogglingId(null);
      setPendingDeactivate(null);
    }
  };

  useEffect(() => {
    fetchCommunityData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  if (loading) {
    return <div className="text-center py-4">Loading community overview...</div>;
  }

  type MemberStatus = 'steward' | 'active' | 'pending' | 'deactivated' | 'rejected';
  const statusFor = (m: Member): MemberStatus => {
    if (m.role === 'steward') return 'steward';
    return m.membership_status;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stewards</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stewards}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Joins</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentJoins}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        <strong>Pending approval</strong> = waiting for you to approve in the Join Requests tab.
        <strong className="ml-2">Deactivated</strong> = you previously turned off their access.
      </p>

      {/* All Members Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Connection</TableHead>
            <TableHead>Zip</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allMembers.map((member) => {
            const status = statusFor(member);
            return (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-1">
                    <span>{member.email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyEmail(member.email)}
                    >
                    {copiedEmail === member.email ? (
                        <Check className="h-3 w-3 text-primary" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                  {member.intro_text || '—'}
                </TableCell>
                <TableCell className="text-sm">{member.zip_code || '—'}</TableCell>
                <TableCell>
                  {status === 'steward' && (
                    <Badge variant="default">
                      <Shield className="h-3 w-3 mr-1" />
                      Steward
                    </Badge>
                  )}
                  {status === 'active' && (
                    <Badge variant="secondary">Active</Badge>
                  )}
                  {status === 'pending' && (
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending approval
                    </Badge>
                  )}
                  {status === 'deactivated' && (
                    <Badge variant="destructive">Deactivated</Badge>
                  )}
                  {status === 'rejected' && (
                    <Badge variant="destructive">Rejected</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(member.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {status === 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={togglingId === member.id}
                      onClick={() => setPendingDeactivate(member)}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Deactivate
                    </Button>
                  )}
                  {(status === 'deactivated' || status === 'rejected') && (
                    <Button
                      size="sm"
                      variant="default"
                      disabled={togglingId === member.id}
                      onClick={() => setMemberActive(member, true)}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      {status === 'rejected' ? 'Approve' : 'Reactivate'}
                    </Button>
                  )}
                  {status === 'pending' && (
                    <span className="text-xs text-muted-foreground">
                      Review in Join Requests tab
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={pendingDeactivate !== null}
        onOpenChange={(open) => { if (!open) setPendingDeactivate(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {pendingDeactivate?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll lose access to the community immediately. You can reactivate them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDeactivate && setMemberActive(pendingDeactivate, false)}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
