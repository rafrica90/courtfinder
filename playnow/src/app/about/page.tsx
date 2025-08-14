export const metadata = {
  title: "About • CourtFinder",
  description:
    "We connect players to courts, games, and each other—anywhere. Learn our story, mission, and how CourtFinder helps you play more, with less friction.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-16">
      <header className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold">
          We love what happens when people play.
        </h1>
        <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto">
          CourtFinder exists to make pickup sports effortless—helping you find a court,
          host a game, and rally the players you need, wherever you are.
        </p>
      </header>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-[var(--border)] p-6 bg-gradient-to-b from-[#0a1628]/40 to-[#0f2847]/40 shadow-[var(--card-shadow)]">
          <h3 className="text-xl font-semibold mb-2">Connection</h3>
          <p className="text-[var(--text-secondary)]">
            Sport brings people together. New friendships, old rivalries, shared moments — that's the magic we're here for.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-6 bg-gradient-to-b from-[#0a1628]/40 to-[#0f2847]/40 shadow-[var(--card-shadow)]">
          <h3 className="text-xl font-semibold mb-2">Well-being</h3>
          <p className="text-[var(--text-secondary)]">
            Moving your body boosts health and strengthens mental well-being. We're building tools that make it easier to play more often.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-6 bg-gradient-to-b from-[#0a1628]/40 to-[#0f2847]/40 shadow-[var(--card-shadow)]">
          <h3 className="text-xl font-semibold mb-2">Simplicity</h3>
          <p className="text-[var(--text-secondary)]">
            Beautiful, seamless, and fast. From discovery to the first serve, every step should feel effortless.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Our story</h2>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-3xl">
          I started CourtFinder because organising games kept falling apart at the last minute — someone moved away, a couple of people got stuck at work, and we'd be short. I wanted a better way: create a game in minutes, find nearby courts, and quickly message players to fill the last few spots. What began as a tool to help my friends and me play more has grown into a platform for anyone who loves sport and community.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Find a court anywhere</h3>
          <p className="text-[var(--text-secondary)]">Search by location and sport to discover nearby courts and venues in seconds.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Host a game in minutes</h3>
          <p className="text-[var(--text-secondary)]">Set the time, place, and format — we'll handle invites and sign-ups.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Rally the players you need</h3>
          <p className="text-[var(--text-secondary)]">Share your game, fill open spots fast, and keep momentum with simple updates.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] p-8 bg-gradient-to-br from-[#00d9ff]/10 via-transparent to-[#00ff88]/10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Why it matters</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Sport builds resilience, reduces stress, and strengthens communities. When the barrier to play drops, participation rises. Our mission is to make it easy for anyone to say yes to a game — on a weekday lunch break, after work, or early on a weekend.
            </p>
          </div>
          <div className="space-y-3">
            <ul className="grid sm:grid-cols-2 gap-3">
              <li className="rounded-xl border border-[var(--border)] p-4 bg-[#0a1628]/40">Fast discovery</li>
              <li className="rounded-xl border border-[var(--border)] p-4 bg-[#0a1628]/40">Frictionless invites</li>
              <li className="rounded-xl border border-[var(--border)] p-4 bg-[#0a1628]/40">Reliable coordination</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="text-center space-y-6">
        <h2 className="text-2xl font-semibold">Ready to play?</h2>
        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
          Whether you're picking up a racket for the first time or chasing a personal best,
          CourtFinder helps you get on court—quickly and confidently.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/venues" className="px-6 py-3 rounded-lg bg-[#00d9ff] text-[#0a1628] font-semibold hover:bg-[#00a8cc] transition-colors">Find a Court</a>
          <a href="/games/new" className="px-6 py-3 rounded-lg bg-[#00ff88] text-[#0a1628] font-semibold hover:bg-[#00cc6a] transition-colors">Host a Game</a>
        </div>
      </section>

      <section className="max-w-3xl mx-auto border-t border-[var(--border)] pt-8">
        <p className="text-sm text-[var(--text-muted)] text-center">
          Inspired by how great platforms connect people and experiences, we're focused on the same outcome for sport: more moments that matter. 
        </p>
      </section>
    </main>
  );
}


