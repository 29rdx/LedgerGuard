'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  LayoutDashboard,
  Coins,
  FileSpreadsheet,
  History,
  Lock,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  Key,
  UserCheck,
  UserCog,
  Search,
  Building2,
  Bot,
} from 'lucide-react';
import { UserSession } from '@/types';
import { CommandPalette } from '@/components/CommandPalette';
import { DemoFailsafeProvider, DemoFailsafeIndicator } from '@/components/DemoFailsafeContext';
import { AgenticTreasuryDrawer } from '@/components/AgenticTreasuryDrawer';
import { Logo3D } from '@/components/Logo3D';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [demoMfa, setDemoMfa] = useState<{ code: string; secondsRemaining: number } | null>(null);
  const [isLlmDegraded, setIsLlmDegraded] = useState(false);
  const [paypalStatus, setPaypalStatus] = useState<{
    connected: boolean;
    latencyMs: number;
    mode: string;
    message: string;
  } | null>(null);

  // AI Drawer State
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data?.authenticated) {
        setSession(data.user);
        setDemoMfa(data.demoMfa);
      }
    } catch {
      router.push('/login');
    }
  };

  const fetchPayPalStatus = async () => {
    try {
      const res = await fetch('/api/paypal/status');
      const data = await res.json();
      setPaypalStatus(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchSession();
    fetchPayPalStatus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    const handleAgentDirective = (e: Event) => {
      const customEvent = e as CustomEvent<{ isDegraded?: boolean }>;
      if (customEvent.detail?.isDegraded) {
        setIsLlmDegraded(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('ledgerguard:agent-directive', handleAgentDirective);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('ledgerguard:agent-directive', handleAgentDirective);
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  // 1-Click Live RBAC Role Switcher (Admin <-> Auditor)
  const handleToggleRole = async () => {
    if (!session || switchingRole) return;
    setSwitchingRole(true);
    const targetRole = session.role === 'TREASURY_ADMIN' ? 'AUDITOR' : 'TREASURY_ADMIN';

    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole }),
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.user);
        router.refresh();
      }
    } catch (err) {
      console.error('Role switch failed', err);
    } finally {
      setSwitchingRole(false);
    }
  };

  const navItems = [
    { label: 'Treasury Blotter', href: '/', icon: LayoutDashboard },
    { label: 'Escrow Studio', href: '/escrows', icon: Coins },
    { label: 'Invoicing v2', href: '/invoices', icon: FileSpreadsheet },
    { label: 'Audit Trail', href: '/audit-log', icon: History },
    { label: 'Security Posture', href: '/security-audit', icon: Lock },
    { label: 'Enterprise Onboarding', href: '/onboarding', icon: Building2 },
    { label: 'Settings & Sandbox', href: '/settings', icon: Settings },
  ];

  return (
    <DemoFailsafeProvider>
      <div className="flex h-screen w-full bg-transparent overflow-hidden relative">
      {/* 1. Command Rail */}
      <aside className="w-64 liquid-ice border-r border-sky-400/20 dark:border-sky-500/15 flex flex-col shrink-0 select-none relative z-20 backdrop-blur-3xl specular-border">
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-sky-400/15 dark:border-sky-500/15 bg-white/20 dark:bg-sky-950/20">
          <Logo3D size="sm" />
          <div className="overflow-hidden">
            <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-sky-50 leading-tight flex items-center gap-1.5">
              <span>LedgerGuard</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-500/15 text-sky-400 border border-sky-400/30">ICE</span>
            </div>
            <div className="text-[10px] uppercase font-mono text-sky-600 dark:text-sky-400/80 truncate">
              {session?.organizationName || 'Apex Global Capital'}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-all duration-300 ${
                  active
                    ? 'bg-gradient-to-r from-sky-500/90 via-cyan-500/90 to-blue-600/90 text-white font-semibold shadow-[0_4px_20px_rgba(14,165,233,0.35)] border border-sky-200/50'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-sky-500/10 hover:text-sky-900 dark:hover:text-sky-100 hover:border-sky-400/25 border border-transparent backdrop-blur-md'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-300 ${active ? 'text-inherit scale-110' : 'text-slate-400 dark:text-sky-400/60'}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 opacity-75 animate-pulse" />}
              </a>
            );
          })}
        </nav>

        {/* AI Drawer Toggle */}
        <div className="p-3 border-t border-sky-400/15 dark:border-sky-500/15 bg-white/10 dark:bg-sky-950/20">
          <button
            onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl border border-sky-400/30 dark:border-sky-500/30 bg-sky-500/10 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 hover:bg-sky-500/20 dark:hover:bg-sky-900/50 transition-all duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(56,189,248,0.25)]"
          >
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>AI Treasury Agent</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </button>
        </div>

        {/* User Session Footer */}
        <div className="p-3 border-t border-sky-400/15 dark:border-sky-500/15 bg-white/20 dark:bg-sky-950/40">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {session?.name || 'Loading...'}
              </div>
              <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400/70 truncate">
                {session?.role === 'TREASURY_ADMIN' ? 'VP Treasury (Admin)' : 'Lead Auditor (Read-Only)'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg hover:bg-sky-500/15 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Viewport */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Status Bar */}
        <header className="h-14 px-6 liquid-ice border-b border-sky-400/20 dark:border-sky-500/15 flex items-center justify-between shrink-0 backdrop-blur-2xl relative z-10 specular-border">
          <div className="flex items-center gap-3 text-xs">
            {/* Live PayPal Status */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl liquid-ice border-sky-400/20 dark:border-sky-500/20 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] shrink-0 animate-pulse" />
              <span className="font-semibold text-slate-700 dark:text-sky-200">
                PayPal Sandbox:
              </span>
              <span className="font-mono text-sky-600 dark:text-sky-400">
                {paypalStatus ? `${paypalStatus.latencyMs}ms` : 'Connecting...'}
              </span>
            </div>

            {/* Live RBAC Role Switcher */}
            {session && (
              <button
                onClick={handleToggleRole}
                disabled={switchingRole}
                title="Click to live-switch RBAC role and test server-side 403 enforcement"
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-mono transition-all duration-300 ${
                  session.role === 'TREASURY_ADMIN'
                    ? 'bg-sky-500/20 text-sky-100 border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.2)] font-semibold hover:bg-sky-500/30'
                    : 'bg-amber-500/20 text-amber-200 border-amber-400/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                }`}
              >
                {session.role === 'TREASURY_ADMIN' ? (
                  <UserCog className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Role: {session.role} (Switch)</span>
              </button>
            )}

            {/* Circuit Breaker LLM Degraded Badge */}
            {isLlmDegraded && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-mono font-medium animate-pulse"
                title="Circuit Breaker engaged: LLM latency or rate limit triggered fallback to Deterministic Policy Ruleset"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>LLM Degraded: Deterministic Ruleset</span>
              </div>
            )}

            {/* OWASP Matrix Badge */}
            <a
              href="/security-audit"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-medium hover:bg-emerald-500/25 transition-all shadow-xs"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>OWASP 20/20 Passing</span>
            </a>

            {/* Demo Step-Up MFA Code */}
            {demoMfa && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-mono">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium text-[11px]">Step-Up TOTP:</span>
                <span className="font-bold tracking-wider text-amber-300">{demoMfa.code}</span>
                <span className="text-[10px] text-amber-400/70">({demoMfa.secondsRemaining}s)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <DemoFailsafeIndicator />

            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-xl border border-sky-400/25 dark:border-sky-500/25 bg-white/40 dark:bg-sky-950/40 text-slate-700 dark:text-sky-200 hover:text-slate-900 dark:hover:text-white hover:bg-sky-500/20 transition-all shadow-xs backdrop-blur-md"
              title="Open Spotlight Command Palette (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Search & Actions</span>
              <span className="text-[10px] bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-400/30 font-semibold text-sky-300">
                ⌘K
              </span>
            </button>

            <button
              onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
              className="btn-ice btn-ice-primary px-3 py-1.5 text-xs font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>Agent Drawer</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>

        {/* Global Spotlight Command Palette (Cmd+K) */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </div>

      {/* 3. Dockable AI Treasury Drawer (Streaming Vercel AI SDK) */}
      <AgenticTreasuryDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        isLlmDegraded={isLlmDegraded}
      />
    </div>
    </DemoFailsafeProvider>
  );
}
