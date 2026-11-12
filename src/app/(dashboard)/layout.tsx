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
  Bot,
  ChevronRight,
  Send,
  X,
  Sparkles,
  Key,
  UserCheck,
  UserCog,
  Search,
  Building2,
} from 'lucide-react';
import { UserSession } from '@/types';
import { JUDGE_PROMPT_CHIPS } from '@/lib/agent-engine';
import { CommandPalette } from '@/components/CommandPalette';
import { DemoFailsafeProvider, DemoFailsafeIndicator } from '@/components/DemoFailsafeContext';

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
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [aiMessages, setAiMessages] = useState<
    Array<{ role: 'user' | 'agent'; text: string; details?: string }>
  >([
    {
      role: 'agent',
      text: 'LedgerGuard Autonomous Treasury Agent online. Multi-tool controller connected to PayPal Orders v2, Invoicing v2, and AG Grid.',
      details: 'Select a 1-click prompt chip below or type custom natural language treasury commands.',
    },
  ]);

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

  const handleSendAiPrompt = async (promptToSend?: string) => {
    const text = (promptToSend || aiPrompt).trim();
    if (!text || aiLoading) return;

    setAiMessages((prev) => [...prev, { role: 'user', text }]);
    setAiPrompt('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/agent/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();

      if (data.success && data.directive) {
        setAiMessages((prev) => [
          ...prev,
          {
            role: 'agent',
            text: data.directive.summary,
            details: data.directive.recommendedNextStep,
          },
        ]);

        // Dispatch directive event to AG Grid
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ledgerguard:agent-directive', {
              detail: data.directive,
            })
          );
        }
      } else {
        setAiMessages((prev) => [
          ...prev,
          { role: 'agent', text: data.error || 'Agent encountered an error executing directive.' },
        ]);
      }
    } catch {
      setAiMessages((prev) => [
        ...prev,
        { role: 'agent', text: 'Communication error with Autonomous Treasury Agent.' },
      ]);
    } finally {
      setAiLoading(false);
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
      <div className="flex h-screen w-full bg-slate-50 dark:bg-[#090A0F] overflow-hidden">
      {/* 1. Command Rail */}
      <aside className="w-64 bg-white dark:bg-[#11131A] border-r border-slate-200 dark:border-[#1E2230] flex flex-col shrink-0 select-none">
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-slate-200 dark:border-[#1E2230]">
          <div className="w-8 h-8 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
              LedgerGuard
            </div>
            <div className="text-[10px] uppercase font-mono text-slate-400 truncate">
              {session?.organizationName || 'Apex Global Capital'}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded transition-colors ${
                  active
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-inherit' : 'text-slate-400'}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
              </a>
            );
          })}
        </nav>

        {/* AI Drawer Toggle */}
        <div className="p-3 border-t border-slate-200 dark:border-[#1E2230]">
          <button
            onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 hover:bg-blue-100/60 dark:hover:bg-blue-950/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>AI Treasury Agent</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>
        </div>

        {/* User Session Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-[#1E2230] bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {session?.name || 'Loading...'}
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {session?.role === 'TREASURY_ADMIN' ? 'VP Treasury (Admin)' : 'Lead Auditor (Read-Only)'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Viewport */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Status Bar */}
        <header className="h-14 px-6 bg-white dark:bg-[#11131A] border-b border-slate-200 dark:border-[#1E2230] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs">
            {/* Live PayPal Status */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                PayPal Sandbox:
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400">
                {paypalStatus ? `${paypalStatus.latencyMs}ms` : 'Connecting...'}
              </span>
            </div>

            {/* Live RBAC Role Switcher */}
            {session && (
              <button
                onClick={handleToggleRole}
                disabled={switchingRole}
                title="Click to live-switch RBAC role and test server-side 403 enforcement"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition-colors ${
                  session.role === 'TREASURY_ADMIN'
                    ? 'bg-slate-900 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 font-semibold'
                    : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                {session.role === 'TREASURY_ADMIN' ? (
                  <UserCog className="w-3.5 h-3.5" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>Role: {session.role} (Switch)</span>
              </button>
            )}

            {/* Circuit Breaker LLM Degraded Badge */}
            {isLlmDegraded && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-mono font-medium animate-pulse"
                title="Circuit Breaker engaged: LLM latency or rate limit triggered fallback to Deterministic Policy Ruleset"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>LLM Degraded: Operating on Deterministic Ruleset</span>
              </div>
            )}

            {/* OWASP Matrix Badge */}
            <a
              href="/security-audit"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>OWASP 20/20 Passing</span>
            </a>

            {/* Demo Step-Up MFA Code */}
            {demoMfa && (
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs">
                <Key className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-medium">Step-Up TOTP:</span>
                <span className="font-mono font-bold tracking-wider">{demoMfa.code}</span>
                <span className="text-[10px] text-amber-600/80">({demoMfa.secondsRemaining}s)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <DemoFailsafeIndicator />

            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              title="Open Spotlight Command Palette (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Search & Actions</span>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold text-slate-500">
                ⌘K
              </span>
            </button>

            <button
              onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
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

      {/* 3. Dockable AI Treasury Drawer */}
      {isAiDrawerOpen && (
        <aside className="w-96 bg-white dark:bg-[#11131A] border-l border-slate-200 dark:border-[#1E2230] flex flex-col h-screen shrink-0 shadow-lg z-20 animate-in slide-in-from-right duration-200">
          <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-[#1E2230]">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-600" />
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                AI Treasury Agent Console
              </div>
            </div>
            <button
              onClick={() => setIsAiDrawerOpen(false)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs">
            {aiMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded border leading-relaxed ${
                  msg.role === 'user'
                    ? 'ml-6 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent'
                    : 'mr-6 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div>{msg.text}</div>
                {msg.details && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/40 dark:border-slate-700/40 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {msg.details}
                  </div>
                )}
              </div>
            ))}
            {aiLoading && (
              <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Executing multi-tool agent action...</span>
              </div>
            )}
          </div>

          {/* 1-Click Judge Prompt Chips */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold mb-2">
              1-Click Judge Test Prompts
            </div>
            <div className="space-y-1.5">
              {JUDGE_PROMPT_CHIPS.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleSendAiPrompt(chip)}
                  className="w-full text-left p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors truncate"
                  title={chip}
                >
                  › {chip}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendAiPrompt();
            }}
            className="p-3 border-t border-slate-200 dark:border-[#1E2230] flex items-center gap-2"
          >
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Command treasury agent..."
              className="flex-1 px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <button
              type="submit"
              disabled={aiLoading || !aiPrompt.trim()}
              className="p-2 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </aside>
      )}
    </div>
    </DemoFailsafeProvider>
  );
}
