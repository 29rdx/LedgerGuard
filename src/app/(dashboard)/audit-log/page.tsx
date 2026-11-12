'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, CheckCircle2, Link2, Search, RefreshCw, Radio, Download } from 'lucide-react';
import { AuditLogRecord } from '@/types';

interface VerificationReport {
  isValid: boolean;
  totalLogsChecked: number;
  genesisHash: string;
  latestHash: string;
  brokenAtId?: string;
  details: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error('Failed to load audit logs', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/audit-logs?verify=true');
      const data = await res.json();
      if (data.report) {
        setVerificationResult(data.report);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateWebhook = async () => {
    setSimulatingWebhook(true);
    setWebhookMessage(null);

    try {
      // Find a target order ID from the latest transaction or use a high-fidelity sandbox ID
      const targetOrderId = logs.find((l) => l.targetId?.startsWith('ORD-') || (l.targetId && l.targetId.length > 10))?.targetId || '7NL839201928472';
      const transmissionId = `TX-${Date.now()}`;

      const res = await fetch('/api/paypal/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'paypal-transmission-id': transmissionId,
          'paypal-transmission-time': new Date().toISOString(),
          'paypal-transmission-sig': 'MOCK_CRYPTOGRAPHIC_TRANSMISSION_SIGNATURE',
          'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-17580.pem',
          'paypal-auth-algo': 'SHA256withRSA',
        },
        body: JSON.stringify({
          id: `WH-EVT-${Date.now()}`,
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          summary: 'Payment capture completed for authorized escrow hold',
          resource: {
            id: targetOrderId,
            status: 'COMPLETED',
            amount: { value: '42500.00', currency_code: 'USD' },
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setWebhookMessage(`Live Webhook Verified: Event PAYMENT.CAPTURE.COMPLETED authenticated for target ${targetOrderId}. New SHA-256 block committed.`);
        await fetchLogs();
      } else {
        setWebhookMessage(`Webhook error: ${data.error || 'Failed'}`);
      }
    } catch (err) {
      setWebhookMessage(`Simulation failed: ${String(err)}`);
    } finally {
      setSimulatingWebhook(false);
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.targetId && l.targetId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      l.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.redactedDetails.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Cryptographic Audit Trail Explorer
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            SHA-256 Tamper-Evident Hash Chain · Non-Repudiation Immutable Ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            title="Refresh Audit Trail"
            className="btn-ice p-2 text-slate-400 hover:text-sky-200 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleSimulateWebhook}
            disabled={simulatingWebhook}
            className="btn-ice text-xs font-semibold text-sky-700 dark:text-sky-200 border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 shadow-xs"
          >
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span>{simulatingWebhook ? 'Dispatching Webhook...' : 'Live PayPal Webhook Simulator'}</span>
          </button>

          <a
            href="/api/export/audit-report"
            download
            className="btn-ice text-xs font-semibold text-slate-700 dark:text-sky-200 hover:text-white shadow-xs"
            title="Download SOC2 Compliance Cryptographic Audit Report (CSV)"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Download SOC2 Compliance Report (CSV)</span>
          </a>

          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="btn-ice btn-ice-primary text-xs font-semibold shadow-md"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-200" />
            <span>{verifying ? 'Traversing Chain...' : 'Verify Cryptographic Integrity'}</span>
          </button>
        </div>
      </div>

      {/* Webhook Result Notification */}
      {webhookMessage && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 font-mono text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{webhookMessage}</span>
          </div>
          <button onClick={() => setWebhookMessage(null)} className="text-blue-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-lg font-mono text-xs space-y-1 ${
            verificationResult.isValid
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2
              className={`w-4 h-4 shrink-0 ${
                verificationResult.isValid ? 'text-emerald-600' : 'text-red-600'
              }`}
            />
            <span>
              {verificationResult.isValid
                ? 'CRYPTOGRAPHIC INTEGRITY ATTESTATION: UNBROKEN CHAIN (100% VALID)'
                : 'TAMPER DETECTED: CRYPTOGRAPHIC HASH MISMATCH'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
            {verificationResult.details}
          </p>
          <div className="text-[10px] text-emerald-600/80 pt-1">
            Genesis Hash: {verificationResult.genesisHash.slice(0, 24)}... | Latest Block: {verificationResult.latestHash.slice(0, 24)}... ({verificationResult.totalLogsChecked} blocks traversed)
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by action, actor (USER, AI_AGENT, PAYPAL_WEBHOOK, SECURITY_GUARD), or order ID..."
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl ice-input text-slate-900 dark:text-sky-50 shadow-inner"
        />
      </div>

      {/* Hash Chained Timeline */}
      <div className="space-y-3.5">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-sky-400/70 font-mono text-xs border border-dashed border-sky-400/25 rounded-2xl liquid-ice">
            No audit log records match the search query.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-5 rounded-2xl liquid-ice-card border border-sky-400/20 dark:border-sky-500/15 shadow-xl space-y-3 font-mono text-xs ice-specular-border backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                    {log.action}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                    Actor: {log.actor}
                  </span>
                  {log.paypalEndpoint && (
                    <span className="text-[10px] text-slate-400 truncate max-w-xs">
                      {log.paypalEndpoint} ({log.httpStatus})
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
              </div>

              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto">
                <code>{log.redactedDetails}</code>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="truncate flex items-center gap-1">
                  <Link2 className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-slate-400">Prev Hash:</span>
                  <span className="truncate">{log.previousHash}</span>
                </div>
                <div className="truncate flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="text-slate-400">Record Hash:</span>
                  <span className="truncate text-slate-700 dark:text-slate-300 font-semibold">{log.recordHash}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
