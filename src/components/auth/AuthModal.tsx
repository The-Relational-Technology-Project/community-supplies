
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup' | 'join-request';
  onSuccess?: () => void;
  communityId?: string;
  communityName?: string;
}

export function AuthModal({ isOpen, onClose, mode, onSuccess, communityId, communityName }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [intro, setIntro] = useState("");
  const [connectionContext, setConnectionContext] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Bot detection
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState({ question: "", answer: 0 });
  const [loading, setLoading] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const { toast } = useToast();

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

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!", description: "You've successfully logged in." });
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
    
    // Simplified signup without emailRedirectTo to avoid hanging
    const metadata: Record<string, string> = { 
      name,
      connection_context: connectionContext 
    };
    if (communityId) {
      metadata.community_id = communityId;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    
    toast({ 
      title: "Account created!", 
      description: "You can now sign in with your email and password." 
    });
    
    onClose();
    setLoading(false);
  };

  const handleJoinRequest = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('join_requests')
      .insert({
        name,
        email,
        intro,
        connection_context: connectionContext
      });
    
    if (error) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
    } else {
      toast({ 
        title: "Request submitted!", 
        description: "A community steward will review your application." 
      });
      onClose();
    }
    setLoading(false);
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'signup': return 'Join the Party';
      case 'join-request': return 'Request to Join';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto flex-1 px-1">
          {mode === 'join-request' ? (
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
              <div>
                <Label htmlFor="intro" className="text-sm">Introduction</Label>
                <Textarea
                  id="intro"
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  placeholder="Tell us about yourself and why you'd like to join..."
                  rows={3}
                  className="text-base resize-none"
                />
              </div>
              <div>
                <Label htmlFor="connection" className="text-sm">Connection to Community</Label>
                <Textarea
                  id="connection"
                  value={connectionContext}
                  onChange={(e) => setConnectionContext(e.target.value)}
                  placeholder="How did you hear about us? Do you know any current members?"
                  rows={2}
                  className="text-base resize-none"
                />
              </div>
              <Button onClick={handleJoinRequest} disabled={loading} className="w-full h-11">
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </>
          ) : (
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
                <button
                  type="button"
                  onClick={() => setUseMagicLink(!useMagicLink)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto block min-h-[44px] flex items-center justify-center"
                >
                  {useMagicLink ? 'Use password instead' : 'Email me a magic link'}
                </button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
