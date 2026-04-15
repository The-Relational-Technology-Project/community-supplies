import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "./auth/AuthModal";
import { Footer } from "./Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Share2, HandHeart, ArrowRight } from "lucide-react";
import { useCommunity } from "@/contexts/CommunityContext";

interface LandingPageProps {
  onTabChange: (tab: string) => void;
}

export function LandingPage({ onTabChange }: LandingPageProps) {
  const [user, setUser] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'login' | 'signup' | null>(null);
  const [illustrations, setIllustrations] = useState<string[]>([]);
  const [loadingIllustrations, setLoadingIllustrations] = useState(true);
  const { communityName, communitySlug } = useCommunity();
  const isCommunitySpecific = communitySlug !== 'sunset-richmond';

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
      <section>
        <div className="container mx-auto px-4 py-12 sm:py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-deep-brown mb-4 leading-tight">
              {isCommunitySpecific ? communityName : "Community Supplies"}
            </h1>

            <p className="text-lg sm:text-xl text-dusk-pink mb-3">
              Borrow what you need. Share what you have.
            </p>

            {!isCommunitySpecific && (
              <p className="text-base text-muted-foreground mb-10 sm:mb-14 max-w-xl mx-auto">
                A free, open-source tool for neighborhoods to share supplies, tools, party gear, and more.
              </p>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-4">
              {isCommunitySpecific ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => setModalMode('login')}
                    className="text-base px-8"
                  >
                    Sign In
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setModalMode('signup')}
                    className="border-2 border-primary text-primary hover:bg-primary/10 text-base px-8"
                  >
                    Join {communityName}
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* "Already a member?" link for root landing */}
            {!isCommunitySpecific && !user && (
              <p className="text-sm text-muted-foreground">
                Already a member?{" "}
                <button
                  onClick={() => setModalMode('login')}
                  className="text-terracotta hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* How It Works - only on root landing */}
      {!isCommunitySpecific && (
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
      )}

      {/* Community Ticker - only on root landing */}
      {!isCommunitySpecific && (
        <section className="pb-10 sm:pb-14">
          <div className="overflow-hidden relative">
            <div className="flex whitespace-nowrap animate-[marquee_25s_linear_infinite]">
              {[0, 1].map((copy) => (
                <span key={copy} className="inline-block px-4 text-sm sm:text-base text-dusk-pink font-medium tracking-wide">
                  Outer Sunset, SF &nbsp;·&nbsp; Chevy Chase, MD &nbsp;·&nbsp; Mission District, SF &nbsp;·&nbsp; Baldwin Acres, VA &nbsp;·&nbsp; Cedars of Carrboro, NC &nbsp;·&nbsp; South Central Austin, TX &nbsp;·&nbsp; and spreading! &nbsp;&nbsp;&nbsp;&nbsp;
                </span>
              ))}
            </div>
          </div>

          {/* Start your own CTA */}
          <div className="container mx-auto px-4 mt-8">
            <div className="max-w-2xl mx-auto bg-card border-2 border-dashed border-terracotta/30 rounded-sm p-5 sm:p-6 text-center">
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
      )}

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
