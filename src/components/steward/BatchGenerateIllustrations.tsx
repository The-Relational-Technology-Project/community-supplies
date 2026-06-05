import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useCommunity } from "@/contexts/CommunityContext";


export const BatchGenerateIllustrations = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(0);
  const { communityId } = useCommunity();

  const generateIllustrationsForAllItems = async () => {
    setIsGenerating(true);
    setProgress(0);
    setCurrent(0);

    try {
      // Fetch supplies in THIS community without illustrations (for progress UI)
      const { data: supplies, error } = await supabase
        .from('supplies')
        .select('id, name, description, images, image_url')
        .eq('community_id', communityId)
        .is('illustration_url', null);

      if (error) throw error;

      if (!supplies || supplies.length === 0) {
        toast.info('All items already have illustrations!');
        setIsGenerating(false);
        return;
      }



      setTotal(supplies.length);
      toast.info(`Starting illustration generation for ${supplies.length} items...`);

      // Generate illustrations one by one
      for (let i = 0; i < supplies.length; i++) {
        const supply = supplies[i];
        setCurrent(i + 1);
        setProgress(((i + 1) / supplies.length) * 100);

        try {
          const imageUrl = supply.images?.[0] || supply.image_url;
          
          const { data, error: funcError } = await supabase.functions.invoke('generate-illustration', {
            body: {
              supplyId: supply.id,
              itemName: supply.name,
              description: supply.description,
              imageUrl
            }
          });

          if (funcError) {
            console.error(`Error generating illustration for ${supply.name}:`, funcError);
            toast.error(`Failed: ${supply.name}`);
            continue;
          }

          if (data?.error) {
            console.error(`AI error for ${supply.name}:`, data.error);
            toast.error(`Failed: ${supply.name} - ${data.error}`);
            continue;
          }

          toast.success(`Generated: ${supply.name}`);
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (itemError) {
          console.error(`Error processing ${supply.name}:`, itemError);
          toast.error(`Failed: ${supply.name}`);
        }
      }

      toast.success('Batch generation complete!');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Batch generation error:', error);
      toast.error('Failed to generate illustrations');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-terracotta" />
          Batch Generate Illustrations
        </CardTitle>
        <CardDescription>
          Generate minimalist line drawings for all items that don't have illustrations yet.
          This uses Lovable AI to create catalog-style illustrations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Generating illustrations...</span>
              <span>{current} of {total}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        <Button
          onClick={generateIllustrationsForAllItems}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating... ({current}/{total})
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate All Illustrations
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Note: This process takes about 2-3 seconds per item. Large batches may take several minutes.
        </p>
      </CardContent>
    </Card>
  );
};