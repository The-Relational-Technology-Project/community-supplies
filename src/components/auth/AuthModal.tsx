
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCommunity } from "@/contexts/CommunityContext";
import { fileJoinRequest, autoJoinCommunity } from "@/lib/joinCommunity";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onSuccess?: () => void;
  communityId?: string;
  communityName?: string;
}

export function AuthModal({ isOpen, onClose, mode: initialMode, onSuccess, communityId, communityName }: AuthModalProps) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [connectionContext, setConnectionContext] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Bot detection
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState({ question: "", answer: 0 });
  const [loading, setLoading] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [customAnswer, setCustomAnswer] = useState("");
  const [customQuestion, setCustomQuestion] = useState<string | null>(null);
  const { toast } = useToast();
  const { communityId: contextCommunityId, communitySlug, communityName: contextCommunityName } = useCommunity();

  // Keep internal mode in sync if the parent reopens the modal in a different mode
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  // Generate math captcha when component mounts or mode changes to signup
  useEffect(() => {
    if (mode === 'signup') {
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      setCaptchaQuestion({
        question: `What is ${num1} + ${num2}?`,
        answer: num1 + num2
      });
      setCaptchaAnswer("");
    }
  }, [mode]);


  const effectiveCommunityId = communityId || contextCommunityId;
  const effectiveCommunityName = communityName || contextCommunityName;

  // Load target community's custom join question so we can render it in the signup flow.
  useEffect(() => {
    if (mode !== 'signup' || !effectiveCommunityId) return;
    (async () => {
      const { data } = await supabase
        .from('communities')
        .select('custom_join_question, join_mode')
        .eq('id', effectiveCommunityId)
        .maybeSingle();
      // Only prompt for approval-required communities; auto-join skips review.
      if ((data as any)?.join_mode === 'approval_required') {
        setCustomQuestion((data as any)?.custom_join_question ?? null);
      } else {
        setCustomQuestion(null);
      }
    })();
  }, [mode, effectiveCommunityId]);


  // After a successful login, if a community context is set and the user is not
  // already a member of it, try to join it (auto-join) or send a join request.
  const joinTargetCommunityIfNeeded = async () => {
    if (!effectiveCommunityId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("community_id")
      .eq("id", user.id)
      .maybeSingle();
    if ((profile as any)?.community_id === effectiveCommunityId) return;

    const { data: community } = await supabase
      .from("communities")
      .select("join_mode")
      .eq("id", effectiveCommunityId)
      .maybeSingle();

    if ((community as any)?.join_mode === "auto") {
      const { error: rpcError } = await autoJoinCommunity(effectiveCommunityId);
      if (!rpcError) {
        toast({
          title: `Welcome to ${effectiveCommunityName ?? "the community"}!`,
          description: "You're in.",
        });
      }
    } else {
      // approval_required — file a pending join request and notify stewards.
      await fileJoinRequest({
        communityId: effectiveCommunityId,
        userId: user.id,
        name: user.user_metadata?.name ?? user.email ?? "",
        email: user.email ?? "",
      });
      toast({
        title: "Request sent",
        description: `A ${effectiveCommunityName ?? "community"} steward will review your request.`,
      });
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!", description: "You've successfully logged in." });
      await joinTargetCommunityIfNeeded();
      onClose();
    }
    setLoading(false);
  };

  const handleMagicLink = async () => {
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithOtp({
      email
    });
    
    if (error) {
      toast({ title: "Failed to send magic link", description: error.message, variant: "destructive" });
    } else {
      toast({ 
        title: "Check your email!", 
        description: "We've sent you a magic link to sign in." 
      });
      onClose();
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({ title: "Enter your email first", description: "We'll send a reset link to that address.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't send reset email", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Check your email",
      description: "We sent you a link to reset your password.",
    });
  };

  const handleSignup = async () => {
    setLoading(true);
    
    // Bot protection checks
    if (honeypot.trim() !== "") {
      toast({ title: "Signup failed", description: "Please try again.", variant: "destructive" });
      setLoading(false);
      return;
    }
    
    if (parseInt(captchaAnswer) !== captchaQuestion.answer) {
      toast({ title: "Incorrect answer", description: "Please solve the math problem correctly.", variant: "destructive" });
      setLoading(false);
      return;
    }
    
    // Always tag the new user with the community they're signing up from.
    // Fall back to the URL-derived community context so callers that don't
    // pass an explicit communityId prop (e.g. the header "Sign Up" button)
    // don't silently dump users into the default flagship community.
    const effectiveCommunityIdForSignup = communityId || contextCommunityId;
    const metadata: Record<string, string> = { 
      name,
      connection_context: connectionContext 
    };
    if (effectiveCommunityIdForSignup) {
      metadata.community_id = effectiveCommunityIdForSignup;
    }
    // Land the confirmed user on THEIR community, not the project Site URL.
    const emailRedirectTo = communitySlug
      ? `${window.location.origin}/c/${communitySlug}`
      : `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata, emailRedirectTo }
    });

    
    if (error) {
      const msg = (error.message || "").toLowerCase();
      const alreadyRegistered =
        msg.includes("already registered") ||
        msg.includes("user already") ||
        msg.includes("already exists");
      if (alreadyRegistered) {
        toast({
          title: "You already have an account",
          description: `Sign in to join ${effectiveCommunityName ?? "this community"}.`,
        });
        setPassword("");
        setMode("login");
      } else {
        toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      }
      setLoading(false);
      return;
    }


    // Determine the target community's join mode so we can either auto-join
    // or file a pending join_request (mirroring JoinRequestForm).
    const targetCommunityId = effectiveCommunityIdForSignup;
    let isApprovalRequired = false;
    let targetCommunity: { name: string; slug: string } | null = null;
    try {
      if (targetCommunityId) {
        const { data: community } = await supabase
          .from('communities')
          .select('join_mode, name, slug')
          .eq('id', targetCommunityId)
          .single();
        if (community) {
          isApprovalRequired = community.join_mode === 'approval_required';
          targetCommunity = { name: community.name, slug: community.slug };
        }
      }
    } catch (lookupErr) {
      console.error('Failed to look up community join_mode:', lookupErr);
    }

    if (isApprovalRequired && data?.user && targetCommunityId) {
      // File a join request (and notify stewards) so the steward can review.
      const { error: jrError } = await fileJoinRequest({
        communityId: targetCommunityId,
        userId: data.user.id,
        name,
        email,
        intro: connectionContext || null,
        referralSource: 'signup_form',
        customAnswer: customQuestion ? customAnswer : null,
      });

      if (jrError) {
        console.error('Failed to create join request:', jrError);
      }

      toast({
        title: "Request sent!",
        description: `A ${targetCommunity?.name ?? 'community'} steward will review your request shortly.`,
      });
    } else {
      toast({
        title: "Account created!",
        description: "You can now sign in with your email and password.",
      });

      // Send welcome email for auto-join communities
      if (targetCommunity) {
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              memberName: name,
              memberEmail: email,
              communityName: targetCommunity.name,
              communitySlug: targetCommunity.slug,
            },
          });
        } catch (welcomeError) {
          console.error("Failed to send welcome email:", welcomeError);
        }
      }
    }

    onClose();
    setLoading(false);
  };

  const getTitle = () => (mode === 'login' ? 'Welcome Back' : 'Join the Party');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto flex-1 px-1">
          {(
            <>
              {mode === 'signup' && (
                <>
                  <div>
                    <Label htmlFor="name" className="text-sm">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="h-11 text-base"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="connection" className="text-sm">How did you hear about us?</Label>
                    <Textarea
                      id="connection"
                      value={connectionContext}
                      onChange={(e) => setConnectionContext(e.target.value)}
                      placeholder="Who referred you or how did you find out about this community?"
                      rows={2}
                      className="text-base resize-none"
                    />
                  </div>

                  {customQuestion && (
                    <div>
                      <Label htmlFor="customAnswerModal" className="text-sm">{customQuestion}</Label>
                      <Textarea
                        id="customAnswerModal"
                        value={customAnswer}
                        onChange={(e) => setCustomAnswer(e.target.value)}
                        rows={2}
                        required
                        className="text-base resize-none"
                      />
                    </div>
                  )}


                  
                  {/* Honeypot field - hidden from users, only bots fill this */}
                  <div style={{ display: 'none' }}>
                    <Input
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      placeholder="Leave this empty"
                      tabIndex={-1}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="captcha" className="text-sm">{captchaQuestion.question}</Label>
                    <Input
                      id="captcha"
                      type="number"
                      inputMode="numeric"
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      placeholder="Enter the answer"
                      required
                      className="h-11 text-base"
                    />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="h-11 text-base"
                  autoComplete="email"
                />
              </div>
              
              {mode === 'login' && !useMagicLink && (
                <div>
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="h-11 text-base"
                    autoComplete="current-password"
                  />
                </div>
              )}
              
              {mode === 'signup' && (
                <div>
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="h-11 text-base"
                    autoComplete="new-password"
                  />
                </div>
              )}
              
              {mode === 'login' && useMagicLink ? (
                <Button 
                  onClick={handleMagicLink} 
                  disabled={loading} 
                  className="w-full h-11"
                >
                  {loading ? "Sending..." : "Send Magic Link"}
                </Button>
              ) : (
                <Button 
                  onClick={mode === 'login' ? handleLogin : handleSignup} 
                  disabled={loading} 
                  className="w-full h-11"
                >
                  {loading ? "Loading..." : mode === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              )}
              
              {mode === 'login' && (
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setUseMagicLink(!useMagicLink)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center justify-center"
                  >
                    {useMagicLink ? 'Use password instead' : 'Email me a magic link'}
                  </button>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[36px] flex items-center justify-center disabled:opacity-50"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
