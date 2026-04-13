import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "./auth/AuthModal";
import { Footer } from "./Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Share2, HandHeart, ArrowRight, MapPin } from "lucide-react";
import { SunsetSkyline } from "./SunsetSkyline";

interface LandingPageProps {
  onTabChange: (tab: string) => void;
}

export function LandingPage({ onTabChange }: LandingPageProps) {
  const [user, setUser] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'login' | 'signup' | null>(null);
  const [illustrations, setIllustrations] = useState<string[]>([]);
  const [loadingIllustrations, setLoadingIllustrations] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchIllustrations = async () => {
      try {
        const { data, error } = await supabase
          .from('site_config')
          .select('value')
          .eq('key', 'landing_illustrations')
          .single();
        if (!error && data?.value) {
          setIllustrations(data.value as string[]);
        }
      } catch (e) {
        console.error('Failed to fetch illustrations:', e);
      } finally {
        setLoadingIllustrations(false);
      }
    };
    fetchIllustrations();
  }, []);

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <SunsetSkyline className="absolute inset-0 w-full h-full text-deep-brown opacity-[0.08] pointer-events-none" />
        <div className="container mx-auto px-4 py-12 sm:py-20 text-center relative z-10">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-deep-brown mb-4 leading-tight">
              Community Supplies
            </h1>

            <p className="text-lg sm:text-xl text-dusk-pink mb-3">
              Borrow what you need. Share what you have.
            </p>

            <p className="text-base text-muted-foreground mb-10 sm:mb-14 max-w-xl mx-auto">
              A free, open-source tool for neighborhoods to share supplies, tools, party gear, and more.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6">
              {user ? (
                <Button
                  size="lg"
                  onClick={() => onTabChange('browse')}
                  className="text-base px-8"
                >
                  Join Sunset & Richmond Community
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => setModalMode('login')}
                  className="text-base px-8"
                >
                  Join Sunset & Richmond Community
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-2 border-primary text-primary hover:bg-primary/10 text-base px-8"
              >
                <Link to="/start-community">Start a Sharing Community</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 pb-12 sm:pb-16">
        <h2 className="text-xl sm:text-2xl font-serif font-semibold text-deep-brown mb-8 text-center">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            {
              icon: Users,
              title: "Start a community",
              description: "A steward sets up a sharing community for their neighborhood.",
            },
            {
              icon: Share2,
              title: "Invite your neighbors",
              description: "Members join and list the items they're happy to lend.",
            },
            {
              icon: HandHeart,
              title: "Share and borrow",
              description: "Browse what's available, reach out, and borrow what you need.",
            },
          ].map((step, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-sm p-6 text-center"
            >
              <step.icon className="h-8 w-8 text-terracotta mx-auto mb-3" />
              <h3 className="font-serif font-semibold text-deep-brown mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community Directory */}
      <section className="container mx-auto px-4 pb-12 sm:pb-16">
        <h2 className="text-xl sm:text-2xl font-serif font-semibold text-deep-brown mb-6 text-center">
          Active Communities
        </h2>
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Flagship community */}
          <div className="bg-card border border-border rounded-sm p-5 sm:p-6 flex items-start gap-4">
            <div className="bg-sand rounded-full p-2.5 shrink-0">
              <MapPin className="h-5 w-5 text-terracotta" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-semibold text-deep-brown text-lg">
                Sunset & Richmond, SF
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                The founding community — neighbors in San Francisco's Outer Sunset and Outer Richmond sharing supplies, tools, and party gear.
              </p>
            </div>
            <div className="shrink-0">
              {user ? (
                <Button size="sm" variant="ghost" onClick={() => onTabChange('browse')}>
                  Join <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setModalMode('login')}>
                  Join <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {/* Start your own CTA */}
          <div className="bg-card border-2 border-dashed border-terracotta/30 rounded-sm p-5 sm:p-6 text-center">
            <p className="text-deep-brown font-medium mb-2">
              Want to start a sharing community in your neighborhood?
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              It's free and open source. We'll help you get set up.
            </p>
            <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary/10">
              <Link to="/start-community">
                Get Started <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Illustration Gallery */}
      {(loadingIllustrations || illustrations.length > 0) && (
        <section className="container mx-auto px-4 pb-8 sm:pb-16">
          <h2 className="text-xl sm:text-2xl font-serif font-semibold text-deep-brown mb-6 text-center">
            A Peek Inside
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 max-w-5xl mx-auto">
            {loadingIllustrations
              ? Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-sm" />
                ))
              : illustrations.map((url, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-white border border-border rounded-sm overflow-hidden flex items-center justify-center"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-contain p-3"
                      loading="lazy"
                    />
                  </div>
                ))}
          </div>

          {!user && illustrations.length > 0 && (
            <div className="text-center mt-6 sm:mt-8">
              <Button
                variant="link"
                onClick={() => setModalMode('signup')}
                className="text-terracotta font-medium text-sm sm:text-base"
              >
                Join to browse all →
              </Button>
            </div>
          )}
        </section>
      )}

      <Footer />

      <AuthModal
        isOpen={!!modalMode}
        mode={modalMode}
        onClose={() => setModalMode(null)}
        onSuccess={() => onTabChange('browse')}
      />
    </div>
  );
}
