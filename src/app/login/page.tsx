'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, KeyRound, Lock, ArrowRight, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Authentication failed');
      }

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEphemeralLogin = async (role: 'TREASURY_ADMIN' | 'AUDITOR') => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ephemeralJudge: true, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Ephemeral session provisioning failed');
      }

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Provisioning failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-12 bg-slate-50 dark:bg-[#090A0F]">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 mb-4 shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            LedgerGuard
          </h1>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-mono mt-1">
            Institutional Treasury & Escrow Terminal
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            PayPal AI Hackathon · Orders v2 Escrow
          </div>
        </div>

        {/* Auth Box */}
        <div className="bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] rounded-lg shadow-sm p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-3 rounded border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Judge Demo Session */}
          <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                1-Click Judge Ephemeral Access
              </span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Zero Setup
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => handleEphemeralLogin('TREASURY_ADMIN')}
                disabled={loading}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <KeyRound className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
                  <div>
                    <div className="font-semibold">Enter as VP Treasury (Admin)</div>
                    <div className="text-[11px] text-slate-500">Eleanor Vance · Full Escrow & Capture Rights</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleEphemeralLogin('AUDITOR')}
                disabled={loading}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <UserCheck className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <div className="font-semibold">Enter as Lead Auditor (Read-Only)</div>
                    <div className="text-[11px] text-slate-500">Marcus Thorne · Compliance & Audit Logs</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>

          {/* Standard Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Corporate Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="treasury@apexcapital.io"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              {loading ? 'Authenticating...' : 'Sign In with Credentials'}
            </button>
          </form>

          {/* Institutional Security Notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-400 font-mono">
              Protected by 20-Point OWASP Hardening · High-Entropy JWT · Double-Submit CSRF
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
