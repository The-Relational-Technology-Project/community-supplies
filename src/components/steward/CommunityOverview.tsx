import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Shield, UserPlus, Copy, Check } from "lucide-react";

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
  const { toast } = useToast();

  const copyEmail = async (email: string) => {
    await navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const fetchCommunityData = async () => {
    try {
      const { data: members, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at, intro_text, zip_code')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const memberList = members || [];
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

  useEffect(() => {
    fetchCommunityData();
  }, []);

  if (loading) {
    return <div className="text-center py-4">Loading community overview...</div>;
  }

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

      {/* All Members Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Connection</TableHead>
            <TableHead>Zip</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allMembers.map((member) => (
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
                <Badge variant={member.role === 'steward' ? 'default' : 'secondary'}>
                  {member.role === 'steward' && <Shield className="h-3 w-3 mr-1" />}
                  {member.role}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {new Date(member.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
