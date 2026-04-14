
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCommunity } from "@/contexts/CommunityContext";

export function JoinRequestForm() {
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
        toast({ 
          title: "Signup failed", 
          description: authError.message, 
          variant: "destructive" 
        });
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

      // Create join request linked to the user
      const { error: requestError } = await supabase
        .from('join_requests')
        .insert({
          user_id: authData.user.id,
          name,
          email,
          cross_streets: crossStreets,
          referral_source: referralSource,
          phone_number: referralSource === 'other' ? phoneNumber : null,
          community_id: communityId,
        });

      if (requestError) {
        toast({ 
          title: "Error", 
          description: requestError.message, 
          variant: "destructive" 
        });
      } else {
        // Send notification email
        supabase.functions.invoke('send-join-notification', {
          body: {
            name,
            email,
            referralSource,
            crossStreets,
            phoneNumber: referralSource === 'other' ? phoneNumber : null
          }
        }).then(({ error: emailError }) => {
          if (emailError) {
            console.error('Failed to send notification email:', emailError);
          }
        });

        toast({ 
          title: "Request submitted!", 
          description: "A community steward will review your application." 
        });
        setName("");
        setEmail("");
        setPassword("");
        setCrossStreets("");
        setReferralSource("");
        setPhoneNumber("");
        setCaptchaAnswer("");
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
