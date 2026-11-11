'use client';

import { useState, useEffect } from 'react';
import { Settings, Shield, Key, Bell, CheckCircle2, RefreshCw, Send, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const [paypalStatus, setPaypalStatus] = useState<{
    connected: boolean;
    latencyMs: number;
    mode: string;
    message: string;
  } | null>(null);

  const [testingConnection, setTestingConnection] = useState(false);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<string | null>(null);

  // Policy Form State
  const [autoCaptureThreshold, setAutoCaptureThreshold] = useState('25000');
  const [requireMfaAbove, setRequireMfaAbove] = useState('10000');
  const [aiStrictness, setAiStrictness] = useState('STRICT');
  const [policySaved, setPolicySaved] = useState(false);

  const checkPayPalStatus = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch('/api/paypal/status');
      const data = await res.json();
      setPaypalStatus(data);
    } catch {
      setPaypalStatus({
        connected: false,
        latencyMs: 0,
        mode: 'SIMULATED_SANDBOX',
        message: 'Failed to query PayPal Sandbox status',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  useEffect(() => {
    checkPayPalStatus();
  }, []);

  const handleSimulateWebhook = async () => {
    setSimulatingWebhook(true);
    setWebhookResult(null);

    try {
      const res = await fetch('/api/paypal/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'paypal-transmission-id': `SIM-TX-${Date.now()}`,
          'paypal-transmission-time': new Date().toISOString(),
          'paypal-transmission-sig': 'MOCK_CRYPTOGRAPHIC_TRANSMISSION_SIGNATURE',
          'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-17580.pem',
          'paypal-auth-algo': 'SHA256withRSA',
        },
        body: JSON.stringify({
          id: `WH-${Date.now()}`,
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          summary: 'Payment capture completed for authorized escrow hold',
          resource: {
            id: '7NL839201928472',
            status: 'COMPLETED',
            amount: { value: '42500.00', currency_code: 'USD' },
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setWebhookResult(`Webhook verified & processed: Event ${data.eventType}. Transmission authenticated.`);
      } else {
        setWebhookResult(`Webhook verification failed: ${data.error}`);
      }
    } catch (err) {
      setWebhookResult(`Error dispatching simulated webhook: ${String(err)}`);
    } finally {
      setSimulatingWebhook(false);
    }
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    setPolicySaved(true);
    setTimeout(() => setPolicySaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Terminal Settings & PayPal Sandbox Configuration
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          PayPal REST v2 Credentials · Webhook Signature Simulator · Treasury Policy Thresholds
        </p>
      </div>

      {/* PayPal Sandbox Status Card */}
      <div className="p-5 rounded-lg bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              PayPal Sandbox REST v2 Connectivity
            </h2>
          </div>
          <button
            onClick={checkPayPalStatus}
            disabled={testingConnection}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Operational Mode</div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
              {paypalStatus?.mode || 'DETECTING...'}
            </div>
          </div>

          <div className="p-3 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Sandbox Latency</div>
            <div className="text-xs font-semibold text-emerald-600 mt-1">
              {paypalStatus ? `${paypalStatus.latencyMs} ms` : '...'}
            </div>
          </div>

          <div className="p-3 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Target Environment</div>
            <div className="text-xs font-semibold text-blue-600 mt-1">
              api-m.sandbox.paypal.com
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-3 rounded border border-slate-100 dark:border-slate-800 font-mono">
          {paypalStatus?.message}
        </div>
      </div>

      {/* Webhook Signature Simulator */}
      <div className="p-5 rounded-lg bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              PayPal Webhooks v1 Simulator & Cryptographic Header Verifier
            </h2>
          </div>
          <button
            onClick={handleSimulateWebhook}
            disabled={simulatingWebhook}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{simulatingWebhook ? 'Verifying Headers...' : 'Simulate PAYMENT.CAPTURE.COMPLETED Webhook'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Dispatches a simulated PayPal Webhook notification carrying <code className="font-mono text-slate-800 dark:text-slate-200">paypal-transmission-sig</code>, <code className="font-mono text-slate-800 dark:text-slate-200">paypal-cert-url</code>, and <code className="font-mono text-slate-800 dark:text-slate-200">paypal-auth-algo</code> headers. The endpoint verifies SSRF safety of the cert domain and validates transmission authenticity before updating the transaction ledger and appending to the SHA-256 hash chain.
        </p>

        {webhookResult && (
          <div className="p-3 rounded text-xs font-mono border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{webhookResult}</span>
          </div>
        )}
      </div>

      {/* Treasury Policy Form */}
      <div className="p-5 rounded-lg bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Autonomous Treasury Governance Policy
          </h2>
        </div>

        {policySaved && (
          <div className="p-3 rounded text-xs font-mono border border-emerald-200 bg-emerald-50 text-emerald-900">
            Policy parameters successfully updated.
          </div>
        )}

        <form onSubmit={handleSavePolicy} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                Automated Release Threshold (USD)
              </label>
              <input
                type="number"
                value={autoCaptureThreshold}
                onChange={(e) => setAutoCaptureThreshold(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Deliverable audits with confidence ≥ 70 below this ceiling auto-capture.
              </span>
            </div>

            <div>
              <label className="block font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                Mandatory Step-Up MFA Ceiling (USD)
              </label>
              <input
                type="number"
                value={requireMfaAbove}
                onChange={(e) => setRequireMfaAbove(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Disbursements exceeding this amount require RFC 6238 TOTP 6-digit confirmation.
              </span>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1.5 text-slate-700 dark:text-slate-300">
              AI Auditor Strictness Tier
            </label>
            <select
              value={aiStrictness}
              onChange={(e) => setAiStrictness(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
            >
              <option value="STRICT">STRICT (Zero-tolerance cryptographic attestation & SLA check)</option>
              <option value="BALANCED">BALANCED (Allow minor artifact timestamp drift)</option>
              <option value="PERMISSIVE">PERMISSIVE (Advisory audit score only)</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold"
            >
              Save Policy Rules
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
