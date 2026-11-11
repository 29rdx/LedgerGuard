import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LedgerGuard — Institutional Agentic Treasury & Escrow Terminal',
  description:
    'Autonomous B2B Treasury, Conditional Authorize-and-Hold Escrow, and Reconciliation Terminal built on PayPal Developer Platform and AG Grid.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 dark:bg-[#090A0F] dark:text-slate-100 selection:bg-slate-200 dark:selection:bg-slate-800">
        {children}
      </body>
    </html>
  );
}

