'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Loader2,
  ExternalLink,
  ChevronRight,
  Info,
  Building2,
  AlertCircle,
} from 'lucide-react';

function SandboxCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get('orderId') || 'ORD-SANDBOX-DEMO';
  const amount = searchParams.get('amount') || '1450.00';
  const currency = searchParams.get('currency') || 'USD';
  const vendor = searchParams.get('vendor') || 'Vertex Semiconductor';

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/paypal/orders/${encodeURIComponent(orderId)}/simulate-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setCaptureId(data.captureId);

        // Notify parent window if opened as popup
        if (typeof window !== 'undefined' && window.opener) {
          window.opener.postMessage({ type: 'PAYPAL_ORDER_APPROVED', orderId }, '*');
        }
      } else {
        setError(data.message || 'Approval execution failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error during approval');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070b14] flex flex-col items-center justify-center p-4 sm:p-6 text-slate-800 dark:text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
      {/* 1. Official PayPal Sandbox Header Banner */}
      <div className="w-full max-w-xl mb-4 bg-amber-500/15 border border-amber-400/40 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            PayPal Sandbox Environment
          </span>
        </div>
        <span className="font-mono text-[11px] opacity-80">
          Buyer Testing Session (Simulated Rail)
        </span>
      </div>

      {/* 2. Main Checkout Container */}
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-sky-500/20 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Header Bar */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          {/* PayPal Dual-P SVG Logo */}
          <div className="flex items-center gap-2.5">
            <svg
              className="h-7 w-auto"
              viewBox="0 0 101 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.666 3.125h-7.75c-.6 0-1.1.45-1.188 1.05L.035 24.288c-.062.438.275.825.713.825H5.46c.6 0 1.1-.45 1.188-1.05l.775-4.912c.088-.6.588-1.05 1.188-1.05h2.45c5.075 0 8.012-2.463 8.762-7.225.338-2.125-.013-3.775-1.013-4.887-.975-1.1-2.737-1.863-7.144-1.863z"
                fill="#003087"
              />
              <path
                d="M13.563 8.65h-2.45c-.6 0-1.1.45-1.188 1.05l-1.375 8.712c-.088.6.588 1.05 1.188 1.05h2.45c4.15 0 6.55-2.012 7.163-5.912.275-1.737-.013-3.087-.825-4-.8-.9-2.238-1.525-5.963-1.525z"
                fill="#0079C1"
              />
              <path
                d="M32.862 13.913h-4.3c-.338 0-.613.25-.663.587l-.237 1.488c-.038.238.15.45.387.45h1.363c1.9 0 3.013-.925 3.325-2.9.062-.375-.2-.712-.575-.712z"
                fill="#00457C"
              />
              <text
                x="32"
                y="22"
                className="fill-slate-900 dark:fill-white font-bold tracking-tight text-xl font-sans"
              >
                PayPal
              </text>
            </svg>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-400/30">
              SANDBOX
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-bit Encrypted</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {!success ? (
            <>
              {/* Order Summary Strip */}
              <div className="flex items-start justify-between pb-5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-xs uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400">
                    Payee / Vendor
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {vendor}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <span>Order: {orderId}</span>
                    <span>•</span>
                    <span className="text-sky-500 dark:text-sky-400 font-semibold">
                      Orders v2 Authorize Hold
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400">
                    Hold Amount
                  </span>
                  <div className="text-2xl font-bold font-mono text-slate-900 dark:text-emerald-400">
                    ${Number(amount).toFixed(2)}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{currency}</span>
                </div>
              </div>

              {/* Escrow Disclaimer Box */}
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-400/25 flex items-start gap-3 text-xs text-sky-900 dark:text-sky-200">
                <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-sky-800 dark:text-sky-100">
                    Conditional Escrow Protection:
                  </span>{' '}
                  This payment will place funds into an authorized escrow custody hold. The vendor
                  cannot capture these funds until cryptographic proof-of-delivery is verified by
                  LedgerGuard.
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase font-mono text-slate-500 dark:text-slate-400 block">
                  Simulated Funding Source
                </label>
                <div className="p-3.5 rounded-xl border border-sky-500/30 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full border-4 border-sky-500 bg-white" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>PayPal Corporate Treasury Balance</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        Available Sandbox Balance: $854,200.00 USD
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-400/30">
                    Active
                  </span>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Primary Action Button */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-full bg-[#FFC439] hover:bg-[#F2BA32] text-[#003087] font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#003087]" />
                      <span>Authorizing on PayPal Sandbox Rails...</span>
                    </>
                  ) : (
                    <>
                      <span>Approve & Authorize Escrow Hold</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <Link
                    href="/"
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Cancel and return to LedgerGuard Terminal
                  </Link>
                </div>
              </div>
            </>
          ) : (
            /* Verified Success State */
            <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Escrow Hold Successfully Authorized!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  PayPal Orders v2 authorization has completed. Funds for{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {vendor}
                  </span>{' '}
                  are held in cryptographic escrow custody.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-sky-500/20 max-w-md mx-auto text-left space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="text-sky-600 dark:text-cyan-300 font-semibold">{orderId}</span>
                </div>
                {captureId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Capture ID:</span>
                    <span className="text-emerald-500 font-semibold">{captureId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    ${Number(amount).toFixed(2)} {currency}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-[10px]">
                  <span className="text-slate-500">Audit Status:</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Chained to SHA-256 Ledger
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all shadow-md"
                >
                  <span>Return to Treasury Blotter</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>LedgerGuard Institutional Treasury Engine</span>
          </div>
          <Link
            href="/settings"
            className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>Custom PayPal Keys</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SandboxCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#070b14] text-sky-200">
          <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
        </div>
      }
    >
      <SandboxCheckoutContent />
    </Suspense>
  );
}

