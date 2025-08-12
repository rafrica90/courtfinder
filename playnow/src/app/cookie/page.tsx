export default function CookiePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">Cookie Policy</h1>
        <p className="mt-2 text-[var(--text-secondary)]"><strong>Effective date:</strong> [Month Day, Year]</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What Are Cookies?</h2>
        <p className="text-[var(--text-secondary)]">Cookies are small text files stored on your device by your browser. They help websites function, remember your preferences, and understand how the site is used.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Types of Cookies We Use</h2>
        <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
          <li><strong>Essential:</strong> Required to operate the Service (e.g., authentication, security, core features).</li>
          <li><strong>Preferences:</strong> Remember your settings and choices.</li>
          <li><strong>Analytics:</strong> Help us understand usage to improve the Service.</li>
          <li><strong>Marketing:</strong> Used for personalized communications where permitted by law and with your consent where required.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Consent and Managing Preferences</h2>
        <p className="text-[var(--text-secondary)]">Where required, we obtain your consent through our cookie banner. You can manage or withdraw consent at any time via your browser settings and in-product controls.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Third-Party Cookies</h2>
        <p className="text-[var(--text-secondary)]">Some cookies are set by third parties providing services (e.g., analytics, payment providers). These third parties may use cookies consistent with their own policies.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How to Control Cookies</h2>
        <p className="text-[var(--text-secondary)]">You can usually instruct your browser to refuse cookies or delete them. Instructions are available at your browser’s support pages. Disabling cookies may impact functionality.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Retention</h2>
        <p className="text-[var(--text-secondary)]">Cookies remain for their designated lifespan (session or persistent) or until deleted. We regularly review and update our cookie usage.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="text-[var(--text-secondary)]">Questions about this policy: [email]</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Related</h2>
        <p className="text-[var(--text-secondary)]">See our <a className="underline text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/privacy">Privacy Policy</a> for more on how we process personal data.</p>
      </section>
    </main>
  );
}
