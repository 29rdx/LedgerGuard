'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Bot,
  FileText,
  Shield,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { FinancialBlotterRow } from '@/types';

export default function EscrowsPage() {
  const [escrows, setEscrows] = useState<FinancialBlotterRow[]>([]);
  const [loading, setLoading] = useState(true);

  // New Escrow Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [counterpartyName, setCounterpartyName] = useState('');
  const [counterpartyEmail, setCounterpartyEmail] = useState('');
  const [amount, setAmount] = useState('50000');
  const [currency, setCurrency] = useState('USD');
  const [escrowConditions, setEscrowConditions] = useState('');
  const [deliverableProofUrl, setDeliverableProofUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // Upload Proof State
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Audit State
  const [auditingId, setAuditingId] = useState<string | null>(null);
  const [auditFeedback, setAuditFeedback] = useState<{ id: string; notes: string; score: number } | null>(null);

  const fetchEscrows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/paypal/orders');
      const data = await res.json();
      if (data.transactions) {
        setEscrows(data.transactions.filter((t: FinancialBlotterRow) => t.type === 'ESCROW_AUTHORIZE'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEscrows();
  }, [fetchEscrows]);

  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/paypal/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterpartyName,
          counterpartyEmail,
          amount: parseFloat(amount),
          currency,
          type: 'ESCROW_AUTHORIZE',
          escrowConditions,
          deliverableProofUrl: deliverableProofUrl || null,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setCounterpartyName('');
        setCounterpartyEmail('');
        setEscrowConditions('');
        setDeliverableProofUrl('');
        fetchEscrows();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleUploadProof = async (txId: string) => {
    if (!uploadFile) return;
    setUploadingId(txId);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('transactionId', txId);

    try {
      const res = await fetch('/api/escrows/upload-proof', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadMessage(`Upload Rejected: ${data.message || data.error}`);
      } else {
        setUploadMessage(`Magic-bytes verified (${data.detectedType}). SHA-256: ${data.sha256.slice(0, 16)}...`);
        setUploadFile(null);
        fetchEscrows();
      }
    } catch {
      setUploadMessage('Upload failed');
    } finally {
      setUploadingId(null);
    }
  };

  const handleAudit = async (txId: string) => {
    setAuditingId(txId);
    setAuditFeedback(null);
    try {
      const res = await fetch('/api/agent/audit-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId }),
      });
      const data = await res.json();
      if (data.success && data.auditResult) {
        setAuditFeedback({
          id: txId,
          score: data.auditResult.score,
          notes: data.auditResult.aiNotes,
        });
        fetchEscrows();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuditingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Escrow Studio & Proof-of-Delivery Auditor
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Conditional Authorize-and-Hold · Binary Magic-Byte Verification · SSRF-Guarded Probes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEscrows}
            title="Refresh"
            className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Place Escrow Hold (Orders v2)</span>
          </button>
        </div>
      </div>

      {uploadMessage && (
        <div className="p-3 rounded text-xs border border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 font-mono flex items-center gap-2">
          <Shield className="w-4 h-4 shrink-0 text-blue-600" />
          <span>{uploadMessage}</span>
        </div>
      )}

      {auditFeedback && (
        <div className="p-3 rounded text-xs border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 font-mono flex items-center gap-2">
          <Bot className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Score: {auditFeedback.score}/100 — {auditFeedback.notes}</span>
        </div>
      )}

      {/* Escrow Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {escrows.map((escrow) => (
          <div
            key={escrow.id}
            className="p-5 rounded-lg bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] shadow-xs space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {escrow.paypalOrderId || escrow.paypalAuthorizationId || 'AUTH-HOLD'}
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {escrow.counterpartyName}
                </h3>
                <div className="text-[11px] text-slate-400 font-mono">{escrow.counterpartyEmail}</div>
              </div>

              <div className="text-right">
                <div className="text-base font-semibold font-mono-numbers text-slate-900 dark:text-slate-100">
                  ${escrow.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {escrow.currency}
                </div>
                <div className="mt-1">
                  {escrow.status === 'CAPTURED' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      CAPTURED
                    </span>
                  ) : escrow.status === 'FLAGGED_DISCREPANCY' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                      FLAGGED MISMATCH
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      AUTHORIZED HOLD
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Escrow Terms */}
            <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                Acceptance Criteria
              </div>
              <p className="leading-relaxed">{escrow.escrowConditions || 'No conditions specified'}</p>
            </div>

            {/* Cryptographic SHA-256 Proof Badge */}
            <div className="text-xs space-y-1 font-mono">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                Cryptographic Attestation
              </div>
              {escrow.deliverableProofHash ? (
                <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate bg-slate-100 dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="truncate">SHA-256: {escrow.deliverableProofHash}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                </div>
              ) : (
                <div className="text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded border border-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Pending proof attestation upload</span>
                </div>
              )}
            </div>

            {/* Actions: Proof Upload & Autonomous Audit */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Select Proof</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setUploadFile(e.target.files[0]);
                    }}
                  />
                </label>

                {uploadFile && (
                  <button
                    onClick={() => handleUploadProof(escrow.id)}
                    disabled={uploadingId === escrow.id}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-900 text-white hover:bg-slate-800"
                  >
                    {uploadingId === escrow.id ? 'Validating...' : 'Upload & Verify'}
                  </button>
                )}
              </div>

              <button
                onClick={() => handleAudit(escrow.id)}
                disabled={auditingId === escrow.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{auditingId === escrow.id ? 'Auditing Probes...' : 'Run Agent Audit'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Place Escrow Hold Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#11131A] border border-slate-300 dark:border-[#1E2230] rounded-lg max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-slate-800 dark:text-slate-200" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Place Conditional Escrow Hold (PayPal Orders v2)
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEscrow} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Beneficiary / Counterparty Name
                </label>
                <input
                  type="text"
                  required
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  placeholder="e.g. Palantir Defense Systems Inc."
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Beneficiary Email
                </label>
                <input
                  type="email"
                  required
                  value={counterpartyEmail}
                  onChange={(e) => setCounterpartyEmail(e.target.value)}
                  placeholder="billing@beneficiary.com"
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                    Escrow Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Acceptance Criteria (Escrow Release Conditions)
                </label>
                <textarea
                  rows={3}
                  required
                  value={escrowConditions}
                  onChange={(e) => setEscrowConditions(e.target.value)}
                  placeholder="Specify milestone delivery criteria, SLA uptime thresholds, or cryptographic artifacts required before release."
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Remote Deliverable URL (SSRF Guarded)
                </label>
                <input
                  type="url"
                  value={deliverableProofUrl}
                  onChange={(e) => setDeliverableProofUrl(e.target.value)}
                  placeholder="https://raw.githubusercontent.com/.../release-artifact.json"
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2 border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold"
                >
                  {creating ? 'Placing Authorization...' : 'Place Authorize Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
