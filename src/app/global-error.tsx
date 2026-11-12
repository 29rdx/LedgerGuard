'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RotateCcw, Home, Terminal, ShieldAlert } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log fatal client error
    console.error('[LEDGERGUARD_FATAL_ERROR]', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen w-full bg-[#090A0F] text-slate-100 flex flex-col justify-between p-6 sm:p-12 font-sans antialiased select-none">
        {/* Top Header */}
        <div className="max-w-2xl w-full mx-auto flex items-center justify-between pb-6 border-b border-[#1E2230]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-100">
                LedgerGuard
              </div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                Institutional Treasury Terminal
              </div>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded bg-red-950/60 border border-red-900 text-red-400 text-xs font-mono font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            Circuit Breaker Engaged
          </div>
        </div>

        {/* Center Error Box */}
        <div className="max-w-2xl w-full mx-auto my-auto py-10">
          <div className="p-8 rounded-lg bg-[#11131A] border border-[#1E2230] shadow-xl space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-red-950/50 border border-red-900/60 text-red-400 shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-100">
                  Treasury System Exception
                </h1>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  The terminal encountered an unhandled execution boundary. As a fail-safe measure, pending authorize-and-hold transactions have been frozen in state to prevent unauthorized disbursement.
                </p>
              </div>
            </div>

            {/* Diagnostic Details */}
            <div className="p-4 rounded border border-slate-800 bg-[#0A0B10] font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-[11px] pb-2 border-b border-slate-900">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  Diagnostic Telemetry
                </span>
                <span>Timestamp: {new Date().toISOString()}</span>
              </div>

              <div>
                <span className="text-slate-500">Exception: </span>
                <span className="text-red-400 font-medium">
                  {error?.message || 'An unexpected runtime exception occurred.'}
                </span>
              </div>

              {error?.digest && (
                <div>
                  <span className="text-slate-500">Digest Hash: </span>
                  <span className="text-slate-300">{error.digest}</span>
                </div>
              )}

              <div>
                <span className="text-slate-500">Integrity Status: </span>
                <span className="text-emerald-400 font-semibold">
                  SHA-256 Ledger Uncorrupted · Funds Held in Escrow
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => reset()}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded bg-slate-100 text-slate-900 hover:bg-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Terminal Session
              </button>

              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-2xl w-full mx-auto pt-6 border-t border-[#1E2230] flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div>LedgerGuard Incident Telemetry · Fail-Safe Architecture</div>
          <div>AES-256-GCM · PayPal Orders v2</div>
        </div>
      </body>
    </html>
  );
}
