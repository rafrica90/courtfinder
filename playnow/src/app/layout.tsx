import React from 'react';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <footer aria-label="Footer" className="mt-16 border-t border-[var(--border)]">
            <nav aria-label="Footer navigation" className="mx-auto max-w-5xl px-6 py-6 text-center">
              <a className="mx-3 underline text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/privacy">Privacy Policy</a>
              <a className="mx-3 underline text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/terms">Terms</a>
              <a className="mx-3 underline text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/cookie">Cookie Policy</a>
            </nav>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
