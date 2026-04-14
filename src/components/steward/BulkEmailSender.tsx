import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Mail, Send, Users, AlertTriangle, CheckCircle2, Loader2, Upload, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCommunity } from "@/contexts/CommunityContext";

interface SendResult {
  success: boolean;
  recipientCount?: number;
  error?: string;
  dryRun?: boolean;
  recipients?: Array<{ name: string; email: string }>;
}

interface ImageStatus {
  books: boolean;
  home: boolean;
}

export function BulkEmailSender() {
  const { communityId } = useCommunity();
  const [subject, setSubject] = useState("New features on Community Party Supplies! 📚✨");
  const [excludeEmails, setExcludeEmails] = useState("minda.nicolas@gmail.com");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<SendResult | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [imageStatus, setImageStatus] = useState<ImageStatus>({ books: false, home: false });

  // Check if images exist in storage
  useEffect(() => {
    const checkImages = async () => {
      const { data: files } = await supabase.storage.from('email-assets').list();
      if (files) {
        setImageStatus({
          books: files.some(f => f.name === 'books.png'),
          home: files.some(f => f.name === 'home.png')
        });
      }
    };
    checkImages();
  }, []);

  const handleImageUpload = async (file: File, name: 'books.png' | 'home.png') => {
    setUploading(true);
    try {
      const { error } = await supabase.storage
        .from('email-assets')
        .upload(name, file, { upsert: true });
      
      if (error) throw error;
      
      setImageStatus(prev => ({ ...prev, [name.replace('.png', '')]: true }));
      toast.success(`${name} uploaded successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const parseExcludeEmails = (): string[] => {
    return excludeEmails
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(e => e.length > 0 && e.includes('@'));
  };

  const handleDryRun = async () => {
    setLoading(true);
    setDryRunResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-update', {
        body: {
          subject,
          excludeEmails: parseExcludeEmails(),
          dryRun: true,
          communityId
        }
      });

      if (error) throw error;
      setDryRunResult(data);
      toast.success(`Preview: ${data.recipientCount} recipients would receive this email`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to preview recipients');
      setDryRunResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setSendResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-update', {
        body: {
          subject,
          excludeEmails: parseExcludeEmails(),
          dryRun: false,
          communityId
        }
      });

      if (error) throw error;
      setSendResult(data);
      toast.success(`Successfully sent emails to ${data.recipientCount} members!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send emails');
      setSendResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const imagesReady = imageStatus.books && imageStatus.home;

  return (
    <div className="space-y-6">
      {/* Image Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Email Images
          </CardTitle>
          <CardDescription>
            Upload screenshots to include in the email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Books Screenshot</Label>
              <div className="flex items-center gap-2">
                {imageStatus.books ? (
                  <Badge variant="outline" className="border-green-600 text-green-700 bg-green-50">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Uploaded
                  </Badge>
                ) : (
                  <Badge variant="outline">Not uploaded</Badge>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'books.png');
                  }}
                  className="max-w-[200px]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Home Screenshot</Label>
              <div className="flex items-center gap-2">
                {imageStatus.home ? (
                  <Badge variant="outline" className="border-green-600 text-green-700 bg-green-50">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Uploaded
                  </Badge>
                ) : (
                  <Badge variant="outline">Not uploaded</Badge>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'home.png');
                  }}
                  className="max-w-[200px]"
                />
              </div>
            </div>
          </div>
          {!imagesReady && (
            <p className="text-sm text-orange-600">
              ⚠️ Please upload both screenshots before sending the email
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Community Update
          </CardTitle>
          <CardDescription>
            Send a bulk email update to all community members announcing new features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exclude">Exclude Emails (comma or newline separated)</Label>
            <Textarea
              id="exclude"
              value={excludeEmails}
              onChange={(e) => setExcludeEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              {parseExcludeEmails().length} email(s) will be excluded
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleDryRun}
              disabled={loading || !imagesReady}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
              Preview Recipients
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={loading || !dryRunResult?.success || !imagesReady}>
                  <Send className="h-4 w-4 mr-2" />
                  Send to All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Confirm Bulk Email Send
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to send an email to <strong>{dryRunResult?.recipientCount || 0} community members</strong>.
                    <br /><br />
                    Subject: <strong>{subject}</strong>
                    <br /><br />
                    This action cannot be undone. Are you sure you want to proceed?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSend}>
                    Yes, Send Emails
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {dryRunResult?.success && dryRunResult.dryRun && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Preview: {dryRunResult.recipientCount} Recipients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {dryRunResult.recipients?.map((r, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {r.name} &lt;{r.email}&gt;
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {sendResult?.success && !sendResult.dryRun && (
        <Card className="border-green-500/30 bg-green-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold">Emails Sent Successfully!</p>
                <p className="text-muted-foreground">
                  {sendResult.recipientCount} community members will receive the update.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(dryRunResult?.error || sendResult?.error) && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-muted-foreground">{dryRunResult?.error || sendResult?.error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Preview</CardTitle>
          <CardDescription>This is the email content that will be sent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-background space-y-4">
            <div className="text-center p-4 rounded-t-lg bg-primary">
              <h2 className="text-primary-foreground font-bold text-lg">🎉 Community Party Supplies</h2>
            </div>
            
            <div className="space-y-4 p-2">
              <p>Hey [Name]!</p>
              <p>Hope you're doing well! I wanted to share a couple of exciting updates to our community sharing site.</p>
              
              <div className="p-4 bg-muted border-l-4 border-primary rounded">
                <p className="font-semibold text-primary">📚 New: Community Book Library</p>
                <p className="text-sm mt-1">You can now share books from your home library with neighbors! Just snap a photo of your bookshelf, and our AI will automatically detect all the titles.</p>
                <div className="mt-2 p-2 bg-secondary rounded text-center text-sm text-muted-foreground">
                  [Books Screenshot]
                </div>
              </div>

              <div className="p-4 bg-muted border-l-4 border-primary rounded">
                <p className="font-semibold text-primary">✨ Fresh New Look</p>
                <p className="text-sm mt-1">The whole site got a visual refresh! The supplies catalog is now cleaner and easier to browse.</p>
                <div className="mt-2 p-2 bg-secondary rounded text-center text-sm text-muted-foreground">
                  [Home Screenshot]
                </div>
              </div>

              <p>Cheers,<br/>Josh</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}