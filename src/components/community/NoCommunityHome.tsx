import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { DiscoverableCommunitiesList } from "@/components/DiscoverableCommunitiesList";
import { Mail, Users } from "lucide-react";

/**
 * Shown at the root URL for a signed-in person whose profile isn't attached to
 * any community yet. Previously this state silently fell back to the flagship
 * Sunset & Richmond community, which is how people invited to other groups
 * ended up staring at a neighborhood across the country.
 */
export function NoCommunityHome() {
  return (
    <main className="min-h-screen flex flex-col bg-sand">
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-20">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-peach/60 flex items-center justify-center mx-auto mb-6">
            <Users className="w-7 h-7 text-terracotta" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-deep-brown mb-4">
            You're signed in — now let's find your group
          </h1>
          <p className="text-deep-brown/70 text-lg leading-relaxed">
            Your account isn't part of a sharing community yet. Most groups are private,
            so the way in is the invite link your steward shared.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-deep-brown/10 bg-white/70 p-6">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-terracotta mt-1 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-serif text-xl text-deep-brown mb-1">Have an invite link?</h2>
              <p className="text-deep-brown/70">
                Open it and you'll be able to join right there. It looks like{" "}
                <span className="font-mono text-sm text-deep-brown">
                  communitysupplies.org/c/your-group
                </span>
                . If you can't find it, ask whoever invited you to resend it.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-serif text-xl text-deep-brown mb-3">Or browse open communities</h2>
          <DiscoverableCommunitiesList />
        </div>

        <div className="mt-10 text-center">
          <p className="text-deep-brown/70 mb-3">Don't have a group nearby?</p>
          <Button asChild variant="outline">
            <Link to="/start-community">Start one for your neighborhood</Link>
          </Button>
        </div>
      </div>
      <Footer />
    </main>
  );
}
