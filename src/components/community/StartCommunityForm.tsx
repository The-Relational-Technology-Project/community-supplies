import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight } from "lucide-react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export function StartCommunityForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"details" | "account">("details");

  // Community details
  const [stewardName, setStewardName] = useState("");
  const [stewardEmail, setStewardEmail] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [location, setLocation] = useState("");
  const [reason, setReason] = useState("");
  const [questions, setQuestions] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState({ question: "", answer: 0 });

  // Account creation
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion({ question: `${num1} + ${num2}`, answer: num1 + num2 });
  }, []);

  // Auto-generate slug from community name unless manually edited
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(communityName));
    }
  }, [communityName, slugEdited]);

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(captchaAnswer) !== captchaQuestion.answer) {
      toast({ title: "Incorrect answer", description: "Please solve the math problem correctly.", variant: "destructive" });
      return;
    }
    if (!slug) {
      toast({ title: "Invalid community URL", description: "Please enter a valid community name.", variant: "destructive" });
      return;
    }
    setStep("account");
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await supabase.functions.invoke("create-community", {
        body: {
          communityName: communityName.trim(),
          communitySlug: slug.trim(),
          location: location.trim(),
          reason: reason.trim(),
          questions: questions.trim() || null,
          stewardName: stewardName.trim(),
          stewardEmail: stewardEmail.trim(),
          stewardPassword: password,
        },
      });

      if (response.error) {
        const errMsg = response.error.message || "Failed to create community.";
        toast({ title: "Error", description: errMsg, variant: "destructive" });
        setLoading(false);
        return;
      }

      const data = response.data;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Sign in the newly created user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: stewardEmail.trim(),
        password,
      });

      if (signInError) {
        toast({ title: "Community created!", description: "Please sign in at your new community page.", variant: "default" });
        navigate(`/c/${slug}`);
      } else {
        // Redirect to community with onboarding flag
        navigate(`/c/${slug}?onboarding=true`);
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }

    setLoading(false);
  };

  if (step === "account") {
    return (
      <Card className="max-w-2xl mx-auto my-4 sm:my-8">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-xl sm:text-2xl font-serif">Create Your Account</CardTitle>
          <CardDescription className="text-sm sm:text-base leading-relaxed">
            Set a password to create your steward account for <strong>{communityName}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <form onSubmit={handleCreateCommunity} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={stewardEmail} disabled className="h-11 sm:h-10 text-base bg-muted" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min. 6 characters)"
                required
                minLength={6}
                maxLength={200}
                className="h-11 sm:h-10 text-base"
                autoComplete="new-password"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep("details")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 h-11 sm:h-10 text-base gap-2">
                {loading ? "Creating your community..." : <>Create Community <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto my-4 sm:my-8">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-xl sm:text-2xl font-serif">Start a Sharing Community</CardTitle>
        <CardDescription className="text-sm sm:text-base leading-relaxed">
          Community Supplies is a free, open-source tool for neighborhoods to share supplies, tools, and more.
          Create your community in minutes — no approval needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <form onSubmit={handleDetailsSubmit} className="space-y-4">
          <div>
            <Label htmlFor="stewardName">Your Name</Label>
            <Input
              id="stewardName"
              value={stewardName}
              onChange={(e) => setStewardName(e.target.value)}
              placeholder="Your full name"
              required
              maxLength={200}
              className="h-11 sm:h-10 text-base"
              autoComplete="name"
            />
          </div>

          <div>
            <Label htmlFor="stewardEmail">Your Email</Label>
            <Input
              id="stewardEmail"
              type="email"
              value={stewardEmail}
              onChange={(e) => setStewardEmail(e.target.value)}
              placeholder="you@email.com"
              required
              maxLength={255}
              className="h-11 sm:h-10 text-base"
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="communityName">Community Name</Label>
            <Input
              id="communityName"
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
              placeholder="e.g., Outer Sunset Sharing, Oakland Community Supplies"
              required
              maxLength={200}
              className="h-11 sm:h-10 text-base"
            />
            {slug && (
              <p className="text-xs text-muted-foreground mt-1">
                Your community URL: <span className="font-mono">communitysupplies.org/c/{slug}</span>
                {" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setSlugEdited(true)}
                >
                  edit
                </button>
              </p>
            )}
          </div>

          {slugEdited && (
            <div>
              <Label htmlFor="slug">Custom URL</Label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">communitysupplies.org/c/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="my-community"
                  required
                  maxLength={100}
                  className="h-11 sm:h-10 text-base font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Oakland Hills, Mission District SF"
              required
              maxLength={500}
              className="h-11 sm:h-10 text-base"
            />
          </div>

          <div>
            <Label htmlFor="reason">Why do you want to start a sharing community?</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us about your neighborhood and what inspired you..."
              required
              maxLength={2000}
              className="min-h-[100px] text-base"
            />
          </div>

          <div>
            <Label htmlFor="questions">Any questions for us? (optional)</Label>
            <Textarea
              id="questions"
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              placeholder="Anything you'd like to know..."
              maxLength={2000}
              className="min-h-[60px] text-base"
            />
          </div>

          <div>
            <Label htmlFor="captcha">What is {captchaQuestion.question}?</Label>
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

          <Button type="submit" className="w-full h-11 sm:h-10 text-base mt-2 gap-2">
            Next: Create Your Account <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
