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
        {/* Ambient Liquid Glass Ice Floating Orbs & Caustics */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <div className="absolute -top-[12%] -left-[8%] w-[58vw] h-[58vw] rounded-full bg-gradient-to-br from-sky-500/22 via-cyan-400/16 to-transparent blur-[140px] animate-ice-orb-1" />
          <div className="absolute top-[20%] -right-[12%] w-[52vw] h-[52vw] rounded-full bg-gradient-to-bl from-blue-600/20 via-sky-400/14 to-transparent blur-[150px] animate-ice-orb-2" />
          <div className="absolute -bottom-[18%] left-[15%] w-[62vw] h-[62vw] rounded-full bg-gradient-to-tr from-teal-500/14 via-cyan-400/12 to-transparent blur-[140px] animate-ice-orb-3" />
          <div className="absolute top-[45%] left-[30%] w-[35vw] h-[35vw] rounded-full bg-radial from-cyan-300/8 via-sky-500/4 to-transparent blur-[100px] animate-ice-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(186,230,253,0.06)_1px,transparent_1px)] [background-size:28px_28px] opacity-40" />
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
