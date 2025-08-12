import React from 'react';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <footer aria-label="Footer" style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', marginTop: '2rem', textAlign: 'center' }}>
          <nav aria-label="Footer navigation">
            <a href="/privacy" style={{ margin: '0 1rem' }}>Privacy Policy</a>
            <a href="/terms" style={{ margin: '0 1rem' }}>Terms</a>
            <a href="/cookie" style={{ margin: '0 1rem' }}>Cookie Policy</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
