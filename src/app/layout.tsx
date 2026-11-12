import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { DemoFailsafeProvider } from '@/components/DemoFailsafeContext';

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
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 dark:bg-[#07090E] dark:text-slate-100 selection:bg-blue-500/20 relative"
        suppressHydrationWarning
      >
        {/* Ambient Liquid Glass Floating Orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <div className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-blue-600/20 via-cyan-500/15 to-transparent blur-[120px] animate-liquid-orb-1" />
          <div className="absolute top-[25%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-indigo-600/18 via-blue-500/12 to-transparent blur-[140px] animate-liquid-orb-2" />
          <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-emerald-600/12 via-teal-500/10 to-transparent blur-[130px] animate-liquid-orb-3" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
        </div>

        <DemoFailsafeProvider>
          <div className="relative z-10 flex-1 flex flex-col min-h-screen">
            {children}
          </div>
        </DemoFailsafeProvider>
      </body>
    </html>
  );
}
