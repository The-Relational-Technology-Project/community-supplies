import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useCommunity } from "@/contexts/CommunityContext";

interface Supply {
  id: string;
  name: string;
  category: string;
  owner_name: string;
  cross_streets: string | null;
  neighborhood: string | null;
  lent_out: boolean;
  created_at: string;
}

export function AllSuppliesManager() {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { communityId } = useCommunity();

  const fetchSupplies = async () => {
    try {
      const { data, error } = await supabase.rpc('get_supplies_with_owners', { p_community_id: communityId });

      if (error) throw error;

      setSupplies(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading supplies",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplies();
  }, []);

  if (loading) {
    return <div className="text-center py-4">Loading supplies...</div>;
  }

  if (supplies.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No supplies have been added yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Added</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {supplies.map((supply) => (
          <TableRow key={supply.id}>
            <TableCell className="font-medium">{supply.name}</TableCell>
            <TableCell>{supply.category}</TableCell>
            <TableCell>{supply.owner_name || '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {supply.neighborhood || supply.cross_streets || '—'}
            </TableCell>
            <TableCell>
              <Badge variant={supply.lent_out ? 'secondary' : 'default'}>
                {supply.lent_out ? 'Lent Out' : 'Available'}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">
              {format(new Date(supply.created_at), 'MMM d, yyyy')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
