'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DEMO_FAILSAFE_COOKIE,
  DEMO_FAILSAFE_HEADER,
  DEMO_FAILSAFE_STORAGE_KEY,
} from '@/lib/demo-failsafe';
import { Zap, ShieldCheck } from 'lucide-react';

interface DemoFailsafeContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  setDemoMode: (val: boolean) => void;
}

const DemoFailsafeContext = createContext<DemoFailsafeContextType>({
  isDemoMode: false,
  toggleDemoMode: () => {},
  setDemoMode: () => {},
});

export function DemoFailsafeProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Sync state to cookies and localStorage
  const applyState = useCallback((active: boolean) => {
    setIsDemoMode(active);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DEMO_FAILSAFE_STORAGE_KEY, active ? 'true' : 'false');
        document.cookie = `${DEMO_FAILSAFE_COOKIE}=${active ? '1' : '0'}; path=/; max-age=86400; SameSite=Lax`;

        window.dispatchEvent(
          new CustomEvent('ledgerguard:demo-failsafe-toggle', {
            detail: { active },
          })
        );

        if (active) {
          console.log(
            '%c[LedgerGuard] GOD MODE DEMO FAILSAFE ENGAGED (Ctrl+Shift+K)',
            'background: #d97706; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
          );
        } else {
          console.log(
            '%c[LedgerGuard] Demo Failsafe disengaged. Operating on standard network pipeline.',
            'background: #475569; color: #fff; padding: 4px 8px; border-radius: 4px;'
          );
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleDemoMode = useCallback(() => {
    applyState(!isDemoMode);
  }, [applyState, isDemoMode]);

  const setDemoMode = useCallback(
    (val: boolean) => {
      applyState(val);
    },
    [applyState]
  );

  // 1. Initial hydration from storage & cookie
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DEMO_FAILSAFE_STORAGE_KEY);
      if (stored === 'true') {
        applyState(true);
      } else if (document.cookie.includes(`${DEMO_FAILSAFE_COOKIE}=1`)) {
        applyState(true);
      }
    } catch {
      // ignore
    }
  }, [applyState]);

  // 2. Global Hidden Keybinding: Ctrl + Shift + K or Cmd + Shift + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        toggleDemoMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [toggleDemoMode]);

  // 3. Intercept window.fetch to automatically append header when failsafe is active
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      if (isDemoMode) {
        init = init || {};
        const headers = new Headers(init.headers || {});
        headers.set(DEMO_FAILSAFE_HEADER, 'true');
        init.headers = headers;
      }
      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [isDemoMode]);

  return (
    <DemoFailsafeContext.Provider value={{ isDemoMode, toggleDemoMode, setDemoMode }}>
      {children}
    </DemoFailsafeContext.Provider>
  );
}

export function useDemoFailsafe() {
  return useContext(DemoFailsafeContext);
}

/**
 * Discrete Footer/Header Status Pill for Demo Failsafe
 */
export function DemoFailsafeIndicator() {
  const { isDemoMode, toggleDemoMode } = useDemoFailsafe();

  return (
    <button
      onClick={toggleDemoMode}
      title={
        isDemoMode
          ? 'God Mode Active: Zero-latency PayPal & AI mock interceptor engaged. Click or press Ctrl+Shift+K to toggle.'
          : 'Normal Mode: Connected to live network rails. Press Ctrl+Shift+K to toggle God Mode.'
      }
      className={`group flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono transition-all select-none border ${
        isDemoMode
          ? 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shadow-2xs animate-pulse'
          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isDemoMode ? 'bg-amber-500 ring-2 ring-amber-400/50' : 'bg-slate-400 dark:bg-slate-500'
        }`}
      />
      <span>
        {isDemoMode ? (
          <span className="flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
            <span className="font-semibold">Demo Failsafe Active</span>
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5 text-slate-400" />
            <span>Failsafe: Nominal</span>
          </span>
        )}
      </span>
      <kbd className="hidden group-hover:inline-block ml-0.5 px-1 py-0.2 bg-slate-200 dark:bg-slate-700 rounded text-[9px] font-semibold text-slate-600 dark:text-slate-300">
        ^⇧K
      </kbd>
    </button>
  );
}
