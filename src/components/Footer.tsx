interface SiblingSite {
  question: string;
  name: string;
  domain: string;
  url: string;
  cardBg: string;
  rotation: string;
  pinPosition: string;
  pinColor: string;
}

const SIBLING_SITES: SiblingSite[] = [
{
  question: "Looking for local community?",
  name: "Community Guide",
  domain: "outersunset.us",
  url: "https://outersunset.us",
  cardBg: "#eef3f7",
  rotation: "-2deg",
  pinPosition: "left-[40%]",
  pinColor: "#3a6e9e"
},
{
  question: "Exploring the neighborhood?",
  name: "Outer Sunset Field Guide",
  domain: "outersunset.place",
  url: "https://outersunset.place",
  cardBg: "#fdf5ec",
  rotation: "1.5deg",
  pinPosition: "left-1/2 -translate-x-1/2",
  pinColor: "#c37c67"
},
{
  question: "Curious what's happening today?",
  name: "Outer Sunset Today",
  domain: "outersunset.today",
  url: "https://outersunset.today",
  cardBg: "#f0f4ec",
  rotation: "-1deg",
  pinPosition: "right-5",
  pinColor: "#5a7a52"
},
{
  question: "Live near 48th and Irving?",
  name: "Cozy Corner",
  domain: "cozycorner.place",
  url: "https://cozycorner.place",
  cardBg: "#f5f0e6",
  rotation: "2.5deg",
  pinPosition: "left-[30%]",
  pinColor: "#9c5a4a"
}];


function darken(hex: string): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
  return `rgb(${r},${g},${b})`;
}

function Pushpin({ position, color }: {position: string;color: string;}) {
  return (
    <div className={`absolute top-2 ${position} pointer-events-none`}>
      <div
        className="absolute top-[2px] left-[1px] w-4 h-4 rounded-full"
        style={{ background: "rgba(0,0,0,0.25)", filter: "blur(1px)" }} />
      
      <div
        className="relative w-4 h-4 rounded-full"
        style={{
          background: `radial-gradient(circle at 40% 35%, ${color}, ${darken(color)})`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
        }}>
        
        <div
          className="absolute top-[2px] left-[3px] w-[5px] h-[5px] rounded-full"
          style={{ background: "rgba(255,255,255,0.55)" }} />
        
      </div>
    </div>);

}

function PinnedCard({ site }: {site: SiblingSite;}) {
  return (
    <a
      href={site.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block text-center transition-all duration-200 p-5 pt-10"
      style={{
        backgroundColor: site.cardBg,
        transform: `rotate(${site.rotation})`,
        boxShadow: "1px 2px 6px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)",
        borderRadius: "2px",
        border: "1px solid rgba(0,0,0,0.04)"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "rotate(0deg) scale(1.05) translateY(-4px)";
        e.currentTarget.style.boxShadow = "2px 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = `rotate(${site.rotation})`;
        e.currentTarget.style.boxShadow = "1px 2px 6px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)";
      }}>
      
      <Pushpin position={site.pinPosition} color={site.pinColor} />
      <p className="text-sm font-semibold leading-snug mb-2 text-deep-brown">
        {site.question}
      </p>
      <p className="text-xs leading-tight text-deep-brown/80">
        {site.name}
      </p>
      <p className="mt-1.5 text-[11px] font-mono text-deep-brown/50">
        {site.domain}
      </p>
    </a>);

}

export function Footer() {
  return (
    <footer>
      {/* Bulletin board */}
      <div
        style={{
          backgroundImage: `
            radial-gradient(circle, hsl(28 30% 72%) 1px, transparent 1px),
            radial-gradient(circle, hsl(28 35% 82%) 0.5px, transparent 0.5px)
          `,
          backgroundSize: "8px 8px, 12px 12px",
          backgroundPosition: "0 0, 4px 4px"
        }}
        className="bg-sand py-12 md:py-16 px-6">
        
        <div className="container mx-auto">
          <h2 className="text-center font-serif text-lg md:text-xl font-bold mb-8 md:mb-10 text-deep-brown">Neighborhood tools made by us, for us

          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-4xl mx-auto">
            {SIBLING_SITES.map((site) =>
            <PinnedCard key={site.domain} site={site} />
            )}
          </div>
        </div>
      </div>

      {/* Credits */}
      <div className="py-8 text-center bg-sand border-t border-border">
        <div className="container mx-auto px-6 space-y-1">
          <p className="text-sm text-muted-foreground">
            Built in the Outer Sunset by neighbors, for neighbors
          </p>
          <p className="text-sm text-muted-foreground">
            <a
              href="https://studio.relationaltechproject.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80 transition-opacity font-semibold text-deep-brown/70">
              Relational Tech Studio
            </a>{" "}
            · Reuse and remix for your neighborhood
          </p>
          <p className="text-sm text-muted-foreground">
            Questions or ideas? Reach out to us at{" "}
            <a
              href="mailto:hello@relationaltechproject.org"
              className="underline underline-offset-2 hover:opacity-80 transition-opacity font-semibold text-deep-brown/70">
              hello@relationaltechproject.org
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            <a
              href="/privacy"
              className="underline underline-offset-2 hover:opacity-80 transition-opacity text-deep-brown/60">
              Privacy & Terms
            </a>
          </p>
        </div>
      </div>
    </footer>);

}