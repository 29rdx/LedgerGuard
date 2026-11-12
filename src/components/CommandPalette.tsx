'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bot,
  LayoutDashboard,
  Coins,
  FileSpreadsheet,
  History,
  Shield,
  Settings,
  Sparkles,
  ArrowRight,
  X,
  CornerDownLeft,
  Filter,
  Key,
} from 'lucide-react';
import { AgentActionDirective } from '@/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [executing, setExecuting] = useState(false);
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setAgentResponse(null);
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleExecuteAgentCommand = async (commandText: string) => {
    const text = commandText.trim();
    if (!text || executing) return;

    setExecuting(true);
    setAgentResponse(null);

    try {
      const res = await fetch('/api/agent/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      const data = await res.json();
      if (data.success && data.directive) {
        setAgentResponse(data.directive.summary);

        // Dispatch directive to AG Grid / Layout
        window.dispatchEvent(
          new CustomEvent('ledgerguard:agent-directive', {
            detail: data.directive,
          })
        );

        // If intent is navigation or filter, redirect to / if not already there
        if (data.directive.intent === 'filter_ag_grid_ledger') {
          router.push('/');
        } else if (data.directive.intent === 'run_security_posture_scan') {
          router.push('/security-audit');
        }

        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setAgentResponse(data.error || 'Agent failed to execute command');
      }
    } catch {
      setAgentResponse('Network communication error with Treasury Agent.');
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  const quickNav = [
    { label: 'Treasury Blotter', path: '/', icon: LayoutDashboard, key: '1' },
    { label: 'Escrow Studio', path: '/escrows', icon: Coins, key: '2' },
    { label: 'Invoicing v2', path: '/invoices', icon: FileSpreadsheet, key: '3' },
    { label: 'Audit Trail Explorer', path: '/audit-log', icon: History, key: '4' },
    { label: 'Security Posture Suite', path: '/security-audit', icon: Shield, key: '5' },
    { label: 'Sandbox & Settings', path: '/settings', icon: Settings, key: '6' },
  ];

  const suggestedCommands = [
    'Filter blotter to show only flagged or high-value escrows over $1,000',
    'Authorize a $1,450.00 PayPal escrow hold for Vertex Semiconductor',
    'Generate a PayPal Sandbox invoice for ops@cloudscale.io for $920.00',
    'Show all active AUTHORIZED_HOLD escrows',
    'Run 20-Point Security Posture diagnostic scan',
    'Clear all AG Grid blotter filters',
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 pt-20 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#11131A] border border-slate-300 dark:border-[#1E2230] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col font-sans text-xs">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                e.preventDefault();
                handleExecuteAgentCommand(query);
              }
            }}
            placeholder="Type a command or natural language treasury action (e.g. 'filter over $1,000')..."
            className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none text-xs font-mono"
          />
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
              ESC to exit
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Agent Execution Response Banner */}
        {agentResponse && (
          <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 font-mono text-[11px] flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{agentResponse}</span>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Quick Navigation Section */}
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400 px-2 mb-1.5 font-semibold">
              Terminal Navigation
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {quickNav.map((nav) => {
                const Icon = nav.icon;
                return (
                  <button
                    key={nav.path}
                    onClick={() => handleNavigate(nav.path)}
                    className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">{nav.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-slate-700 px-1 rounded">
                      {nav.key}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Treasury Actions */}
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400 px-2 mb-1.5 font-semibold flex items-center justify-between">
              <span>Autonomous Agent Directives</span>
              <span className="text-blue-600 dark:text-blue-400">1-Click Execution</span>
            </div>
            <div className="space-y-1">
              {suggestedCommands.map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExecuteAgentCommand(cmd)}
                  disabled={executing}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-left font-mono text-[11px] group transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{cmd}</span>
                  </div>
                  <CornerDownLeft className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>LedgerGuard Spotlight Terminal · Cmd+K Global Palette</span>
          <span>Press Enter to dispatch to AI Treasury Controller</span>
        </div>
      </div>
    </div>
  );
}
