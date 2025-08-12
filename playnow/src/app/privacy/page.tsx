export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">Privacy Policy</h1>
        <p className="mt-2 text-[var(--text-secondary)]"><strong>Effective date:</strong> [Month Day, Year]</p>
        <p className="mt-4 text-[var(--text-secondary)]">This Privacy Policy explains how [Your Company Name] ("we", "us") collects, uses, and shares personal information when you access or use our website and services at [domain] (the "Service"). If you do not agree with this Policy, please do not use the Service.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Data Controller and Contact</h2>
        <p className="text-[var(--text-secondary)]">Controller: [Your Company Name], [Address]. Contact: [email]</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Information We Collect</h2>
        <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
          <li><strong>Information you provide:</strong> account details (name, email), authentication data (password hash), profile information (e.g., phone), content you submit (venue listings, messages, reviews), preferences and communications.</li>
          <li><strong>Transactional data:</strong> booking details (venue, date/time, participants). If payments are processed, we receive limited payment metadata from our payment processor; we do not store full card details.</li>
          <li><strong>Usage and device data:</strong> IP address, browser and OS, pages viewed, referring URLs, and interactions with features. Approximate location derived from IP or device settings when enabled.</li>
          <li><strong>Cookies and similar technologies:</strong> used to operate the Service, remember preferences, analyze usage, and (with consent where required) for marketing. See our Cookie Policy.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How We Use Your Information</h2>
        <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
          <li>Provide and operate the Service (account creation, bookings, venue discovery).</li>
          <li>Process transactions and communicate about bookings, updates, and support.</li>
          <li>Maintain safety and integrity, prevent fraud and abuse, and enforce our Terms.</li>
          <li>Analyze usage and improve the Service, including personalization.</li>
          <li>Comply with legal obligations and respond to lawful requests.</li>
          <li>With your consent where required (e.g., marketing communications, non-essential cookies).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Legal Bases for Processing (EEA/UK)</h2>
        <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
          <li>Performance of a contract (e.g., providing your account and bookings).</li>
          <li>Our legitimate interests (e.g., security, analytics, improving the Service), balanced against your rights.</li>
          <li>Consent (e.g., marketing, certain cookies) which you can withdraw at any time.</li>
          <li>Legal obligation (e.g., tax, accounting, regulatory requirements).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Notice at Collection (CPRA/CCPA)</h2>
        <p className="text-[var(--text-secondary)]">We collect the categories described above for the purposes outlined in this Policy. We <strong>do not sell</strong> personal information and we <strong>do not share</strong> personal information for cross-context behavioral advertising. We use service providers and contractors under written agreements restricting their use of personal information.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How We Share Information</h2>
        <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
          <li><strong>Service providers:</strong> hosting, authentication, analytics, customer support, and payment processors, under data processing agreements.</li>
          <li><strong>Partners/venues:</strong> as needed to fulfill bookings, applying data minimization.</li>
          <li><strong>Legal and safety:</strong> to comply with law, respond to lawful requests, or protect rights, property, and safety of users, us, or others.</li>
          <li><strong>Business transfers:</strong> in connection with a merger, acquisition, or asset sale, subject to this Policy.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">International Data Transfers</h2>
        <p className="text-[var(--text-secondary)]">If we transfer personal information outside your country (e.g., to the EEA/UK/US), we implement appropriate safeguards such as Standard Contractual Clauses or equivalent measures.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Retention</h2>
        <p className="text-[var(--text-secondary)]">We retain personal information for as long as necessary to provide the Service, comply with legal obligations, resolve disputes, and enforce agreements. Criteria include account status, booking history, and legal retention periods. We delete or anonymize data when no longer needed.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Your Rights</h2>
        <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
          <li><strong>EEA/UK:</strong> access, rectify, erase, restrict, object, and data portability; right to lodge a complaint with a supervisory authority.</li>
          <li><strong>California:</strong> right to know, delete, correct, and to limit use of sensitive personal information (if collected); no discrimination for exercising rights.</li>
        </ul>
        <p className="text-[var(--text-secondary)]">To exercise rights or submit a request, contact us at [email]. We may verify your identity and respond within the timeframe required by law. Authorized agents may submit requests as permitted.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Automated Decision-Making</h2>
        <p className="text-[var(--text-secondary)]">We do not engage in solely automated decisions that produce legal or similarly significant effects. If this changes, we will disclose the logic involved and your rights related to such processing.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Cookies and Tracking</h2>
        <p className="text-[var(--text-secondary)]">We use cookies and similar technologies as described in our <a className="underline text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/cookie">Cookie Policy</a>. Where required, we obtain consent through our cookie banner. You can manage preferences at any time through your browser settings and our in‑product controls.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Security</h2>
        <p className="text-[var(--text-secondary)]">We implement reasonable technical and organizational measures to protect personal information, including transport encryption, access controls, and monitoring. No method of transmission or storage is fully secure.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Children</h2>
        <p className="text-[var(--text-secondary)]">The Service is not directed to children under the age required by applicable law, and we do not knowingly collect their personal information without appropriate consent.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Changes to This Policy</h2>
        <p className="text-[var(--text-secondary)]">We may update this Policy from time to time. We will post the updated version and change the effective date above. If changes are material, we will provide additional notice as required.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How to Contact Us</h2>
        <p className="text-[var(--text-secondary)]">Questions or requests regarding this Policy may be sent to [email].</p>
      </section>
    </main>
  );
}
