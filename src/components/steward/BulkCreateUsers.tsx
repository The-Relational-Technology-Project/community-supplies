import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface BulkCreateResult {
  email: string;
  status: 'created' | 'already_exists' | 'error';
  user_id?: string;
  message: string;
}

interface BulkCreateResponse {
  success: boolean;
  results: BulkCreateResult[];
  summary: {
    total: number;
    created: number;
    already_exists: number;
    errors: number;
  };
  error?: string;
}

export function BulkCreateUsers() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkCreateResult[] | null>(null);
  const { toast } = useToast();

  const handleBulkCreate = async () => {
    setLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('bulk-create-users');

      if (error) throw error;

      const response: BulkCreateResponse = data;

      if (!response.success) {
        throw new Error(response.error || 'Unknown error occurred');
      }

      setResults(response.results);
      
      toast({
        title: "Bulk user creation completed!",
        description: `Created ${response.summary.created} accounts, ${response.summary.already_exists} already existed, ${response.summary.errors} errors.`
      });

    } catch (error: any) {
      toast({
        title: "Error creating user accounts",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'created':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'already_exists':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Bulk Create User Accounts
        </CardTitle>
        <CardDescription>
          Create Supabase auth accounts for all approved join requests who don't already have accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleBulkCreate}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Creating Accounts...' : 'Create Accounts for Approved Members'}
        </Button>

        {results && (
          <div className="space-y-3">
            <h3 className="font-semibold">Results:</h3>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.email}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {result.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}