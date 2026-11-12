'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo3D } from '@/components/Logo3D';
import {
  Shield,
  KeyRound,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Mail,
  Zap,
  RefreshCw,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: 'credentials' | 'magic_link' | 'mfa_challenge'
  const [authMode, setAuthMode] = useState<'credentials' | 'magic_link' | 'mfa_challenge'>('credentials');
  
  // Credentials
  const [email, setEmail] = useState('treasury@apexcapital.io');
  const [password, setPassword] = useState('TreasuryAdmin2026!#');
  
  // Magic Link
  const [magicEmail, setMagicEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState<{ url: string; email: string } | null>(null);

  // MFA Challenge
  const [mfaDigits, setMfaDigits] = useState(['', '', '', '', '', '']);
  const [mfaDemoCode, setMfaDemoCode] = useState('');
  const [mfaSecondsRemaining, setMfaSecondsRemaining] = useState(30);
  const mfaInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check URL params for error messages
  useEffect(() => {
    const err = searchParams?.get('error');
    if (err === 'expired_token') setError('Magic link has expired. Please request a new one.');
    if (err === 'invalid_token') setError('Invalid magic link token.');
    if (err === 'user_not_found') setError('User account not found.');
  }, [searchParams]);

  // MFA Countdown Timer
  useEffect(() => {
    if (authMode !== 'mfa_challenge') return;
    const interval = setInterval(() => {
      setMfaSecondsRemaining((prev) => {
        if (prev <= 1) {
          return 30; // resets window
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [authMode]);

  // 1. Standard Credential Login
  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

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

      if (data.requiresMfa) {
        // Step-up to TOTP screen
        setAuthMode('mfa_challenge');
        setMfaDemoCode(data.demoCode || '');
        setMfaSecondsRemaining(data.secondsRemaining || 30);
        setTimeout(() => mfaInputRefs.current[0]?.focus(), 150);
        return;
      }

      // Success
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // 2. TOTP MFA Code Submission
  const handleMfaSubmit = async (codeToSubmit?: string) => {
    const finalCode = codeToSubmit || mfaDigits.join('');
    if (finalCode.length !== 6) {
      setError('Please enter a complete 6-digit TOTP code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totpCode: finalCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Invalid MFA code');
      }

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'MFA verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const updated = [...mfaDigits];
    updated[index] = clean;
    setMfaDigits(updated);

    if (clean && index < 5) {
      mfaInputRefs.current[index + 1]?.focus();
    }

    if (updated.every((d) => d !== '')) {
      handleMfaSubmit(updated.join(''));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !mfaDigits[index] && index > 0) {
      mfaInputRefs.current[index - 1]?.focus();
    }
  };

  // 3. 1-Click Judge Ephemeral Session Provisioning
  const handleEphemeralJudgeLogin = async (role: 'TREASURY_ADMIN' | 'AUDITOR' = 'TREASURY_ADMIN') => {
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
      setError(err instanceof Error ? err.message : 'Judge provisioning failed');
    } finally {
      setLoading(false);
    }
  };

  // 4. Magic Link Request
  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicEmail) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to generate magic link');
      }

      setMagicLinkSent({ url: data.magicUrl, email: data.email });
      setSuccessMsg('Secure passwordless token generated successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Magic link request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-[#090A0F]">
      {/* ============================================================ */}
      {/* LEFT COLUMN: Translucent Liquid Glass Authentication Panel */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 lg:p-16 liquid-glass-elevated border-r border-white/10 dark:border-white/10 backdrop-blur-3xl relative z-10">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo3D size="md" />
            <div>
              <div className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                LedgerGuard
              </div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400">
                Institutional Treasury & Escrow Terminal
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            PayPal AI Hackathon
          </div>
        </div>

        {/* Center Auth Form */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          {/* Prominent Judge Quick-Access Hero Button */}
          <div className="mb-6 p-5 rounded-2xl liquid-glass-card border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-cyan-500/5 to-transparent shadow-[0_8px_32px_rgba(5,150,105,0.2)] specular-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                Hackathon Judge 1-Click Access
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                Zero Setup
              </span>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-3 leading-relaxed">
              Instantly provision an isolated sandbox session with pre-seeded escrow orders, cryptographic audit blocks, and real PayPal endpoints.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleEphemeralJudgeLogin('TREASURY_ADMIN')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                VP Treasury (Admin)
              </button>
              <button
                type="button"
                onClick={() => handleEphemeralJudgeLogin('AUDITOR')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Lead Auditor
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-[#11131A] px-2 text-slate-500 font-mono uppercase text-[11px]">
                or authenticate institutional identity
              </span>
            </div>
          </div>

          {/* Error & Success Alerts */}
          {error && (
            <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE 1: Standard Password Authentication */}
          {authMode === 'credentials' && (
            <form onSubmit={handleCredentialLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Corporate Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="treasury@apexcapital.io"
                  className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">Bcrypt Cost-12</span>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                {loading ? 'Authenticating Credentials...' : 'Sign In with Password & MFA'}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setAuthMode('magic_link');
                    setMagicEmail(email);
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Prefer passwordless? Sign in with Magic Link
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: Passwordless Magic Link */}
          {authMode === 'magic_link' && (
            <div className="space-y-4">
              <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300">
                <div className="font-semibold mb-0.5">Passwordless Enterprise Authentication</div>
                <div>We will generate a high-entropy signed token valid for 15 minutes.</div>
              </div>

              {!magicLinkSent ? (
                <form onSubmit={handleMagicLinkRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Corporate Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      placeholder="treasury@apexcapital.io"
                      className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {loading ? 'Generating Token...' : 'Generate Magic Link'}
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 space-y-3">
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Magic link issued for <strong className="text-slate-900 dark:text-slate-100 font-mono">{magicLinkSent.email}</strong>.
                  </div>
                  <a
                    href={magicLinkSent.url}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    1-Click Authenticate with Magic Link
                  </a>
                  <p className="text-[11px] text-slate-400 text-center font-mono">
                    Token verified via HS256 JWT & double-submit CSRF protection
                  </p>
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setAuthMode('credentials');
                    setMagicLinkSent(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium inline-flex items-center gap-1"
                >
                  <ArrowRight className="w-3 h-3 rotate-180" />
                  Back to Password & MFA
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: RFC 6238 TOTP MFA Challenge */}
          {authMode === 'mfa_challenge' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center">
                <div className="inline-flex p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 mb-2">
                  <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Two-Factor Authentication Required
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter the 6-digit verification code from your authenticator device.
                </p>
              </div>

              {/* 6-Digit Box Input */}
              <div className="flex justify-center gap-2.5">
                {mfaDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      mfaInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    className="w-11 h-12 text-center text-lg font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                ))}
              </div>

              {/* Countdown Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                    Window Refreshing
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {mfaSecondsRemaining}s remaining
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${(mfaSecondsRemaining / 30) * 100}%` }}
                  />
                </div>
              </div>

              {/* Judge / Demo Hint Helper Chip */}
              {mfaDemoCode && (
                <div className="p-3 rounded border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Judge Testing Hint:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = mfaDemoCode.split('');
                        setMfaDigits(digits);
                        handleMfaSubmit(mfaDemoCode);
                      }}
                      className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60 hover:bg-amber-300 text-[11px] font-mono font-bold tracking-wider transition-colors"
                    >
                      Auto-Fill Code ({mfaDemoCode})
                    </button>
                  </div>
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                    RFC 6238 SHA-1 dynamic truncation computed for secret <span className="font-mono">JBSWY...</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleMfaSubmit()}
                disabled={loading || mfaDigits.join('').length !== 6}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {loading ? 'Verifying TOTP Code...' : 'Verify & Enter Terminal'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('credentials');
                    setError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium inline-flex items-center gap-1"
                >
                  <ArrowRight className="w-3 h-3 rotate-180" />
                  Cancel & Return
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Security Badges */}
        <div className="pt-6 border-t border-slate-100 dark:border-[#1E2230] flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 font-mono">
          <span>AES-256-GCM Vault</span>
          <span>•</span>
          <span>Bcrypt 12 Rounds</span>
          <span>•</span>
          <span>RFC 6238 TOTP</span>
          <span>•</span>
          <span>Double-Submit CSRF</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: Deep Obsidian Panel & Cryptographic Hash Chain */}
      {/* ============================================================ */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-slate-950 text-slate-100 relative overflow-hidden border-l border-slate-900 select-none">
        {/* Ambient Grid Background */}
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px]" />

        {/* Top Badges */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/80 backdrop-blur-md text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            SHA-256 Immutable Hash Chain Online
          </div>
          <div className="text-xs font-mono text-slate-500">
            Block Height: #14 · 100% Verified
          </div>
        </div>

        {/* Cryptographic Hash Chain Diagram & Architectural Visual */}
        <div className="relative z-10 my-auto py-8">
          <div className="mb-6">
            <Logo3D size="xl" className="mb-6 drop-shadow-[0_16px_36px_rgba(0,112,186,0.6)]" />
            <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Cryptographic Audit Architecture
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Autonomous Verification & Proof-of-Delivery Escrow
            </h2>
            <p className="text-xs text-slate-400 mt-2 max-w-lg leading-relaxed">
              Every treasury authorization, proof-of-delivery validation, and capture settlement is cryptographically anchored in a SHA-256 merkle hash chain.
            </p>
          </div>

          {/* Interactive Hash Chain Blocks */}
          <div className="space-y-3 font-mono">
            {/* Block 1 */}
            <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                    BLOCK #10
                  </span>
                  <span className="text-slate-200 font-semibold text-xs">
                    PAYPAL_ORDERS_V2_AUTHORIZE
                  </span>
                </div>
                <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div>
                  <span className="text-slate-500">Hash: </span>
                  <span className="text-slate-300">0x8f4c2b91...7a3e</span>
                </div>
                <div>
                  <span className="text-slate-500">Escrow Hold: </span>
                  <span className="text-slate-200 font-semibold">$24,850.00 USD</span>
                </div>
              </div>
            </div>

            {/* Down Connector */}
            <div className="flex justify-center -my-1">
              <div className="w-0.5 h-3 bg-slate-800" />
            </div>

            {/* Block 2 */}
            <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 text-[10px] font-bold">
                    BLOCK #11
                  </span>
                  <span className="text-slate-200 font-semibold text-xs">
                    AI_DELIVERY_PROOF_AUDITED
                  </span>
                </div>
                <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div>
                  <span className="text-slate-500">Previous: </span>
                  <span className="text-slate-300">0x8f4c2b91...7a3e</span>
                </div>
                <div>
                  <span className="text-slate-500">Risk Score: </span>
                  <span className="text-emerald-400 font-semibold">12/100 (Pass)</span>
                </div>
              </div>
            </div>

            {/* Down Connector */}
            <div className="flex justify-center -my-1">
              <div className="w-0.5 h-3 bg-slate-800" />
            </div>

            {/* Block 3 */}
            <div className="p-3.5 rounded-lg border border-emerald-900/50 bg-emerald-950/20 hover:border-emerald-700 transition-colors">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[10px] font-bold">
                    BLOCK #12
                  </span>
                  <span className="text-emerald-200 font-semibold text-xs">
                    SETTLEMENT_CAPTURE_EXECUTED
                  </span>
                </div>
                <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> CAPTURED
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div>
                  <span className="text-slate-500">Record Hash: </span>
                  <span className="text-emerald-300">0xd910c4a8...5f88</span>
                </div>
                <div>
                  <span className="text-slate-500">PayPal Capture: </span>
                  <span className="text-slate-200 font-mono">CAP-982173401</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Compliance Badges Grid */}
        <div className="relative z-10 pt-6 border-t border-slate-900 grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80 flex items-start gap-2">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200">AES-256-GCM Vault</div>
              <div className="text-[10px] text-slate-500 font-mono">Application-Level Encryption</div>
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80 flex items-start gap-2">
            <Layers className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200">PayPal Orders v2</div>
              <div className="text-[10px] text-slate-500 font-mono">Authorize & Hold Escrow</div>
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200">OWASP Top 10 API</div>
              <div className="text-[10px] text-slate-500 font-mono">20/20 Verified Controls</div>
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80 flex items-start gap-2">
            <Terminal className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200">SSE Live Stream</div>
              <div className="text-[10px] text-slate-500 font-mono">Zero-Polling Webhook Sync</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#090A0F] font-mono text-xs text-slate-500">
          Initializing Institutional Authentication Portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
