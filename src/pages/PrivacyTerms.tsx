import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyTerms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-12 md:py-16">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Community Supplies
        </Link>

        {/* Header */}
        <header className="mb-10 pb-8 border-b border-border">
          <p className="text-xs font-sans uppercase tracking-wider text-muted-foreground mb-1">
            Effective April 6, 2026
          </p>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
            Privacy & Terms
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Community Supplies is a neighborhood sharing platform, built and stewarded by neighbors. These policies are written to be read by real people, not just lawyers.
          </p>
          <nav className="flex flex-wrap gap-4 mt-4 text-sm font-sans">
            <a href="#privacy" className="text-primary hover:underline underline-offset-2">Privacy</a>
            <a href="#terms" className="text-primary hover:underline underline-offset-2">Terms of Use</a>
            <a href="#community-care" className="text-primary hover:underline underline-offset-2">Community Care</a>
            <a href="#contact" className="text-primary hover:underline underline-offset-2">Questions?</a>
          </nav>
        </header>

        {/* Privacy */}
        <section id="privacy" className="mb-10">
          <h2 className="text-lg font-sans font-semibold text-foreground mb-4">Privacy</h2>
          <ul className="space-y-2.5 mb-4">
            {[
              "We don't sell or share your data.",
              "We don't use tracking cookies beyond what's needed to run the site.",
              "If you give us your contact information, we only use it to connect you with neighbors for sharing. That's it.",
              "Your name, neighborhood, and item listings are visible to other users. That's how the site works. Your email and phone number are not displayed publicly unless you choose to share them.",
              "We may share aggregated, non-identifying data (like \"42 items shared this month in the Outer Sunset\") for community reporting or grant applications.",
              "The site is hosted on third-party infrastructure (Supabase and Lovable-deployed hosting). We use reasonable measures to protect your information but cannot guarantee absolute security.",
              "You can ask us to delete your information at any time.",
              "This site is intended for people 18 and older.",
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <hr className="border-border my-10" />

        {/* Terms of Use */}
        <section id="terms" className="mb-10">
          <h2 className="text-lg font-sans font-semibold text-foreground mb-4">Terms of Use</h2>
          <ul className="space-y-2.5 mb-6">
            {[
              "Please use this site with care and respect for your neighbors.",
              "You are responsible for your own decisions about lending, borrowing, or sharing items.",
              "We don't endorse, verify, or inspect items listed by users.",
              "We don't screen or background-check users.",
              "Community Supplies, its creator, stewards, and volunteers accept no responsibility for any loss, damage, injury, or liability that may arise from your participation.",
              "All users participate at their own risk.",
              "This site is operated in California, USA, and any disputes are subject to its laws.",
              "We may update these terms if needed, but we'll keep them simple and human.",
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-dusk-pink shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <h3 className="text-[0.95rem] font-sans font-semibold text-foreground mt-6 mb-2">What Community Supplies Is</h3>
          <p className="text-sm leading-relaxed mb-3">
            Community Supplies (<a href="https://communitysupplies.org" className="text-primary hover:underline underline-offset-2">communitysupplies.org</a>) is a free, volunteer-run platform that helps neighbors share physical items with one another. It provides a directory and coordination layer. It does not own, store, inspect, or transport any items listed on the platform. It does not process payments or broker transactions.
          </p>
          <p className="text-sm leading-relaxed mb-3">
            The site is stewarded by Josh Nesbit as part of the <a href="https://relationaltech.org" className="text-primary hover:underline underline-offset-2" target="_blank" rel="noopener noreferrer">Relational Tech Project</a>.
          </p>

          <h3 className="text-[0.95rem] font-sans font-semibold text-foreground mt-6 mb-2">If You're Sharing an Item</h3>
          <p className="text-sm leading-relaxed mb-3">
            When you list something on Community Supplies, you represent that you have the right to share it. You are responsible for disclosing any known defects, safety concerns, or conditions. You understand that lending an item to another person may carry risk, including damage to or loss of that item, and that Community Supplies does not provide insurance, coverage, or reimbursement of any kind.
          </p>
          <p className="text-sm leading-relaxed mb-3">
            You are solely responsible for any representations you make about your items and for any agreements you enter into with a borrower.
          </p>

          <h3 className="text-[0.95rem] font-sans font-semibold text-foreground mt-6 mb-2">If You're Borrowing an Item</h3>
          <p className="text-sm leading-relaxed mb-3">
            When you borrow through Community Supplies, you are receiving items "as is," based on whatever the lender has described. You are responsible for inspecting items before use, using them safely and as intended, and returning them in the condition you received them (normal wear aside).
          </p>
          <p className="text-sm leading-relaxed mb-3">
            Neither Community Supplies nor the lender guarantees the safety, condition, or fitness of any item for any purpose. By borrowing, you voluntarily assume the risks involved, including the risk of personal injury or property damage.
          </p>

          <h3 className="text-[0.95rem] font-sans font-semibold text-foreground mt-6 mb-2">Meeting Other Users In Person</h3>
          <p className="text-sm leading-relaxed mb-3">
            Sharing supplies often involves meeting a neighbor in person to hand off items. You are solely responsible for your own safety when meeting other users. We do not verify anyone's identity, conduct, or background. Use your judgment and take reasonable precautions.
          </p>

          <h3 className="text-[0.95rem] font-sans font-semibold text-foreground mt-6 mb-2">Assumption of Risk & Limitation of Liability</h3>

          <div className="bg-muted border-l-3 border-primary rounded-r-sm px-4 py-3 my-5">
            <p className="text-sm leading-relaxed">
              <strong>In plain language:</strong> Community Supplies is a bulletin board, not a party to your sharing arrangement. If you borrow a neighbor's ladder and fall, or lend your table saw and it comes back damaged, that is between you and your neighbor. We strongly encourage you to check your homeowner's or renter's insurance to understand your existing coverage for lending and borrowing items.
            </p>
          </div>

          <p className="text-sm leading-relaxed mb-3">
            By using Community Supplies, you acknowledge that sharing physical items with other people involves inherent risks, including the risk of personal injury, property damage, or loss. You voluntarily assume these risks.
          </p>
          <p className="text-sm leading-relaxed mb-3">
            To the maximum extent permitted by applicable law, Community Supplies, its creator, stewards, volunteers, and contributors ("Community Supplies Parties") are not liable for any damages arising from your use of the platform or from any sharing arrangement facilitated through the platform. This includes, without limitation: personal injury, illness, or death resulting from the use of shared items; damage to, loss of, or failure to return items; disputes between users over sharing terms, condition, or value of items; defects, malfunctions, or safety hazards in listed items; and any indirect, incidental, special, consequential, or punitive damages of any kind.
          </p>
          <p className="text-sm leading-relaxed mb-3">
            You agree to indemnify and hold harmless the Community Supplies Parties from any claims, damages, losses, or expenses (including reasonable attorney's fees) arising from your use of the platform, your violation of these terms, or your participation in any sharing arrangement.
          </p>
          <p className="text-sm leading-relaxed mb-3">
            The platform is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not warrant that the platform will be uninterrupted, error-free, or secure, or that any listed items will be safe, functional, or as described.
          </p>

          <h3 className="text-[0.95rem] font-sans font-semibold text-foreground mt-6 mb-2">Your Content</h3>
          <p className="text-sm leading-relaxed mb-3">
            You own what you post (item descriptions, photos, messages). By posting, you give us permission to display it on the platform so the site can function. You can remove your content at any time. We may remove content that violates these terms or that we determine is inappropriate for the platform.
          </p>

          <h3 className="text-[0.95rem] font-sans font-semibold text-foreground mt-6 mb-2">Termination</h3>
          <p className="text-sm leading-relaxed mb-3">
            We may suspend or remove access to the platform at any time, for any reason. You may stop using the platform at any time.
          </p>
        </section>

        <hr className="border-border my-10" />

        {/* Community Care */}
        <section id="community-care" className="mb-10">
          <h2 className="text-lg font-sans font-semibold text-foreground mb-4">Community Care</h2>
          <p className="text-sm leading-relaxed mb-3">
            We know things don't always go perfectly. If a misunderstanding, conflict, or problem arises between neighbors using this tool, we're happy to help talk it through. That's the nature of community: we figure things out together.
          </p>
          <p className="text-sm leading-relaxed mb-4">
            If an item gets damaged, lost, or a sharing arrangement goes sideways, reach out. We can't resolve it for you, but we can help facilitate a conversation between neighbors so you can find a path forward.
          </p>
          <ul className="space-y-2.5">
            {[
              "Be honest about the condition of items you share.",
              "Communicate clearly about pickup, return, and expectations.",
              "Treat borrowed items at least as well as you'd treat your own.",
              "If something goes wrong, talk to your neighbor first. Most things resolve with a conversation.",
              "If you need help, reach out to us.",
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <hr className="border-border my-10" />

        {/* Contact */}
        <section id="contact" className="mb-10">
          <h2 className="text-lg font-sans font-semibold text-foreground mb-4">Questions?</h2>
          <div className="bg-card rounded-lg p-5 border border-border">
            <p className="text-sm leading-relaxed mb-2">
              Community Supplies is stewarded by Josh Nesbit as part of the{" "}
              <a href="https://relationaltech.org" className="text-primary hover:underline underline-offset-2" target="_blank" rel="noopener noreferrer">Relational Tech Project</a>.
            </p>
            <p className="text-sm leading-relaxed mb-2">For questions about these policies, your account, or the platform:</p>
            <p className="text-sm font-semibold">hello@communitysupplies.org</p>
          </div>
        </section>

        {/* Footer */}
        <div className="text-xs text-muted-foreground pt-8 border-t border-border">
          Built by neighbors, for neighbors as{" "}
          <a href="https://relationaltech.org" className="text-primary hover:underline underline-offset-2" target="_blank" rel="noopener noreferrer">relational tech</a>.{" "}
          <a href="https://github.com/The-Relational-Technology-Project" className="text-primary hover:underline underline-offset-2" target="_blank" rel="noopener noreferrer">Open source</a>.
        </div>
      </div>
    </div>
  );
}
