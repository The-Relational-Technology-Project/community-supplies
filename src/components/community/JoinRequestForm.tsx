
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCommunity } from "@/contexts/CommunityContext";
import { fileJoinRequest } from "@/lib/joinCommunity";
import { CheckCircle2, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export function JoinRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [crossStreets, setCrossStreets] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState({ question: "", answer: 0 });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { communityId, communityName } = useCommunity();

  // Generate math captcha when component mounts
  useEffect(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion({
      question: `${num1} + ${num2}`,
      answer: num1 + num2
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate captcha
    if (parseInt(captchaAnswer) !== captchaQuestion.answer) {
      toast({
        title: "Incorrect answer",
        description: "Please solve the math problem correctly.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Create auth user with password
      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            community_id: communityId,
          }
        }
      });

      if (authError) {
        const msg = (authError.message || "").toLowerCase();
        const alreadyRegistered =
          msg.includes("already registered") ||
          msg.includes("user already") ||
          msg.includes("already exists");
        if (alreadyRegistered) {
          toast({
            title: "You already have an account",
            description:
              "Please sign in with your existing account, then click Join from the community page to send your request.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Signup failed",
            description: authError.message,
            variant: "destructive",
          });
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast({ 
          title: "Signup failed", 
          description: "Failed to create user account.", 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      // File the join request + notify stewards via the shared helper.
      const { error: requestError } = await fileJoinRequest({
        communityId,
        userId: authData.user.id,
        name,
        email,
        crossStreets,
        referralSource,
        phoneNumber: referralSource === 'other' ? phoneNumber : null,
      });

      if (requestError) {
        toast({
          title: "Error",
          description: requestError.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Request submitted!",
          description: "A community steward will review your application."
        });
        setSubmittedEmail(email);
        setSubmitted(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto my-4 sm:my-8">
        <CardHeader className="px-4 sm:px-6 pt-6 sm:pt-8 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-terracotta/10 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-terracotta" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-serif">You're on the list!</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Your request to join <strong>{communityName}</strong> has been received.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
          <div className="bg-peach/30 border border-border rounded-sm p-4 mb-4">
            <h3 className="font-serif font-semibold text-deep-brown text-sm mb-2">What happens next</h3>
            <ol className="space-y-2 text-sm text-deep-brown list-decimal list-inside">
              <li>A community steward will review your request (usually within 1–2 days).</li>
              <li>You'll get an email at <strong>{submittedEmail}</strong> once you're approved.</li>
              <li>After approval, sign in to browse and request supplies from neighbors.</li>
            </ol>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground mb-5">
            <Mail className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              Check your inbox (and spam folder) for a verification email — confirming your address helps stewards review your request faster.
            </span>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto my-4 sm:my-8">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-xl sm:text-2xl">Request to Join {communityName}</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          We're a trust-based sharing community.
          Create your account and a community steward will review your application.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm sm:text-base">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              className="h-11 sm:h-10 text-base"
              autoComplete="name"
            />
          </div>
          
          <div>
            <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="h-11 sm:h-10 text-base"
              autoComplete="email"
            />
          </div>
          
          <div>
            <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              minLength={6}
              className="h-11 sm:h-10 text-base"
              autoComplete="new-password"
            />
          </div>
          
          <div>
            <Label htmlFor="crossStreets" className="text-sm sm:text-base">What are your cross streets?</Label>
            <Input
              id="crossStreets"
              value={crossStreets}
              onChange={(e) => setCrossStreets(e.target.value)}
              placeholder="e.g., 25th Ave & Irving St"
              required
              className="h-11 sm:h-10 text-base"
              autoComplete="street-address"
            />
          </div>
          
          <div>
            <Label htmlFor="referralSource" className="text-sm sm:text-base">Who told you about Community Supplies?</Label>
            <Select value={referralSource} onValueChange={setReferralSource} required>
              <SelectTrigger id="referralSource" className="h-11 sm:h-10 text-base">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="community_member">Community member</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {referralSource === 'other' && (
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-sm sm:text-base">Are you open to a quick call with one of our stewards?</Label>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-xs sm:text-sm text-muted-foreground">
                  If yes, enter your phone number:
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="h-11 sm:h-10 text-base"
                  autoComplete="tel"
                />
              </div>
            </div>
          )}
          
          <div>
            <Label htmlFor="captcha" className="text-sm sm:text-base">What is {captchaQuestion.question}?</Label>
            <Input
              id="captcha"
              type="number"
              inputMode="numeric"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              placeholder="Your answer"
              required
              className="h-11 sm:h-10 text-base"
            />
          </div>
          
          <Button type="submit" disabled={loading} className="w-full h-11 sm:h-10 text-base mt-2">
            {loading ? "Submitting..." : "Submit Request to Join"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
