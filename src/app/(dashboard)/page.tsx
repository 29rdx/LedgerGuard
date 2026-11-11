'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Download,
  Key,
  X,
  FileCheck2,
  RefreshCw,
  Coins,
  Bot,
  ExternalLink,
  Eye,
  Check,
} from 'lucide-react';
import { FinancialBlotterRow, AgentActionDirective } from '@/types';

export default function TreasuryDashboardPage() {
  const [transactions, setTransactions] = useState<FinancialBlotterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<{
    column?: string;
    value?: string;
    minAmount?: number;
  } | null>(null);

  // Step-Up MFA Modal State
  const [selectedTxForCapture, setSelectedTxForCapture] = useState<FinancialBlotterRow | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const [demoTotp, setDemoTotp] = useState<string>('');

  // Proof-of-Delivery Inspection Modal State
  const [inspectedTx, setInspectedTx] = useState<FinancialBlotterRow | null>(null);

  // Audit Loading State
  const [auditLoadingId, setAuditLoadingId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const gridRef = useRef<AgGridReact<FinancialBlotterRow>>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/paypal/orders');
      const data = await res.json();
      if (data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();

    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.demoMfa?.code) setDemoTotp(d.demoMfa.code);
      });

    const handleAgentDirective = (e: Event) => {
      const customEvent = e as CustomEvent<AgentActionDirective>;
      const directive = customEvent.detail;

      if (directive.intent === 'filter_ag_grid_ledger') {
        if (directive.filterColumn === 'ALL') {
          setActiveFilter(null);
        } else if (directive.filterMinAmount) {
          setActiveFilter({ minAmount: directive.filterMinAmount });
        } else if (directive.filterColumn && directive.filterValue) {
          setActiveFilter({ column: directive.filterColumn, value: directive.filterValue });
        }
      }
    };

    window.addEventListener('ledgerguard:agent-directive', handleAgentDirective);
    return () => window.removeEventListener('ledgerguard:agent-directive', handleAgentDirective);
  }, [fetchTransactions]);

  // 4-KPI Institutional Metrics
  const metrics = useMemo(() => {
    const totalHold = transactions
      .filter((t) => t.status === 'AUTHORIZED_HOLD' || t.status === 'AUDIT_PASSED')
      .reduce((sum, t) => sum + t.amount, 0);

    const activeHoldsCount = transactions.filter(
      (t) => t.status === 'AUTHORIZED_HOLD' || t.status === 'AUDIT_PASSED'
    ).length;

    const totalCaptured = transactions
      .filter((t) => t.status === 'CAPTURED')
      .reduce((sum, t) => sum + t.amount, 0);

    const flaggedCount = transactions.filter((t) => t.status === 'FLAGGED_DISPUTE').length;
    const disputeRate = transactions.length > 0 ? ((flaggedCount / transactions.length) * 100).toFixed(1) : '0';

    return { totalHold, activeHoldsCount, totalCaptured, flaggedCount, disputeRate };
  }, [transactions]);

  // Filtered rows for AG Grid
  const rowData = useMemo(() => {
    if (!activeFilter) return transactions;
    return transactions.filter((tx) => {
      if (activeFilter.minAmount != null) {
        return tx.amount >= activeFilter.minAmount;
      }
      if (activeFilter.column && activeFilter.value) {
        const val = (tx as unknown as Record<string, unknown>)[activeFilter.column];
        return String(val) === activeFilter.value;
      }
      return true;
    });
  }, [transactions, activeFilter]);

  // Execute Step-Up MFA Capture
  const handleExecuteCapture = async () => {
    if (!selectedTxForCapture) return;
    setMfaSubmitting(true);
    setMfaError(null);

    try {
      const res = await fetch(`/api/paypal/orders/${selectedTxForCapture.id}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken: mfaCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Capture failed');
      }

      setSelectedTxForCapture(null);
      setMfaCode('');
      fetchTransactions();
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'Capture execution failed');
    } finally {
      setMfaSubmitting(false);
    }
  };

  // Run Autonomous Delivery Audit
  const handleRunAudit = async (txId: string) => {
    setAuditLoadingId(txId);
    try {
      const res = await fetch('/api/agent/audit-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTransactions();
      }
    } catch (err) {
      console.error('Audit failed', err);
    } finally {
      setAuditLoadingId(null);
    }
  };

  // Simulate Sandbox Buyer Approval & Settle
  const handleSimulateApprovalAndSettle = async (txId: string) => {
    setSimulatingId(txId);
    try {
      const res = await fetch(`/api/paypal/orders/${txId}/simulate-approval`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulatingId(null);
    }
  };

  // Void / Refund
  const handleRefund = async (txId: string) => {
    if (!confirm('Execute PayPal Void / Refund for this escrow hold?')) return;
    try {
      const res = await fetch(`/api/paypal/orders/${txId}/refund`, {
        method: 'POST',
      });
      if (res.ok) fetchTransactions();
    } catch (err) {
      console.error('Refund failed', err);
    }
  };

  const handleExportCsv = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `ledgerguard_financial_blotter_${new Date().toISOString().split('T')[0]}.csv`,
      });
    }
  };

  // AG Grid Column Definitions
  const columnDefs: ColDef<FinancialBlotterRow>[] = useMemo(
    () => [
      {
        headerName: 'PayPal Identifier',
        field: 'paypalOrderId',
        width: 175,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => {
          const id = params.value || 'N/A';
          return (
            <div className="flex items-center gap-1 font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold">
              <span>{id}</span>
              {params.data?.approvalLink && (
                <a
                  href={params.data.approvalLink}
                  target="_blank"
                  rel="noreferrer"
                  title="Open Sandbox Checkout"
                  className="text-blue-600 hover:text-blue-800 ml-1"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'Vendor / Counterparty',
        field: 'vendorName',
        flex: 1.3,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => (
          <div className="leading-tight py-1">
            <div className="font-semibold text-slate-900 dark:text-slate-100">{params.value}</div>
            <div className="text-[11px] text-slate-400 font-mono truncate">{params.data?.vendorEmail}</div>
          </div>
        ),
      },
      {
        headerName: 'Category',
        field: 'category',
        width: 140,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {params.value}
          </span>
        ),
      },
      {
        headerName: 'Escrow Amount',
        field: 'amount',
        width: 145,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => (
          <div className="font-mono-numbers font-semibold text-slate-900 dark:text-slate-100">
            ${Number(params.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {params.data?.currency}
          </div>
        ),
      },
      {
        headerName: 'Settlement Status',
        field: 'status',
        width: 175,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => {
          const s = params.value;
          if (s === 'CAPTURED') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                <CheckCircle2 className="w-3 h-3" /> Captured & Settled
              </span>
            );
          }
          if (s === 'AUDIT_PASSED') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3 h-3" /> Audit Passed
              </span>
            );
          }
          if (s === 'AUTHORIZED_HOLD') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                <Clock className="w-3 h-3" /> Authorized Hold
              </span>
            );
          }
          if (s === 'FLAGGED_DISPUTE') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                <ShieldAlert className="w-3 h-3" /> Flagged Dispute
              </span>
            );
          }
          if (s === 'REFUNDED') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-300">
                Voided / Refunded
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Created
            </span>
          );
        },
      },
      {
        headerName: 'AI Risk Score',
        field: 'aiRiskScore',
        width: 140,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => {
          const score = params.value ?? 15;
          const isHighRisk = score > 50;
          const isMedRisk = score > 25 && score <= 50;
          return (
            <div className="w-full flex items-center gap-2">
              <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    isHighRisk ? 'bg-red-500' : isMedRisk ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="font-mono text-xs font-semibold w-8">{score}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Proof',
        field: 'proofFileHash',
        width: 80,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => (
          <button
            onClick={() => setInspectedTx(params.data || null)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            title="Inspect Proof-of-Delivery"
          >
            <Eye className="w-4 h-4" />
          </button>
        ),
      },
      {
        headerName: 'Execution Controls',
        field: 'id',
        width: 250,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => {
          const row = params.data;
          if (!row) return null;

          if (row.status === 'CAPTURED') {
            return (
              <span className="text-xs text-slate-400 font-mono">
                Settled via {row.paypalCaptureId || 'Capture Rail'}
              </span>
            );
          }

          return (
            <div className="flex items-center gap-1.5 py-1">
              <button
                onClick={() => setSelectedTxForCapture(row)}
                title="Execute PayPal Capture"
                className="px-2 py-1 text-[11px] font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition-colors"
              >
                Capture
              </button>
              <button
                onClick={() => handleSimulateApprovalAndSettle(row.id)}
                disabled={simulatingId === row.id}
                title="1-Click Simulate Sandbox Buyer Approval & Settle"
                className="px-2 py-1 text-[11px] font-semibold rounded border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                {simulatingId === row.id ? 'Settling...' : 'Simulate Settle'}
              </button>
              <button
                onClick={() => handleRunAudit(row.id)}
                disabled={auditLoadingId === row.id}
                title="Run Autonomous Delivery Audit"
                className="px-2 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
              >
                {auditLoadingId === row.id ? 'Auditing...' : 'Audit'}
              </button>
              <button
                onClick={() => handleRefund(row.id)}
                title="Release Hold / Void"
                className="px-2 py-1 text-[11px] font-medium rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                Void
              </button>
            </div>
          );
        },
      },
    ],
    [auditLoadingId, simulatingId]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Treasury Blotter & Escrow Blotter
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            PayPal Orders v2 · Authorize-and-Hold Settlement Terminal
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeFilter && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 text-xs font-mono">
              <span>Filter Active</span>
              <button onClick={() => setActiveFilter(null)} className="hover:text-blue-900">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={fetchTransactions}
            title="Refresh Blotter"
            className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4-KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono mb-2">
            <span>ESCROW UNDER HOLD</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-semibold font-mono-numbers text-slate-900 dark:text-slate-100">
            ${metrics.totalHold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            {metrics.activeHoldsCount} active authorizations awaiting proof
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono mb-2">
            <span>SETTLED DISBURSEMENTS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-semibold font-mono-numbers text-slate-900 dark:text-slate-100">
            ${metrics.totalCaptured.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-mono flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Captured via PayPal v2
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono mb-2">
            <span>DISPUTE RATE</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-semibold font-mono-numbers text-slate-900 dark:text-slate-100">
            {metrics.disputeRate}%
          </div>
          <div className="mt-1 text-[11px] text-red-600 font-mono">
            {metrics.flaggedCount} flagged for milestone mismatch
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono mb-2">
            <span>AUTONOMOUS AGENT</span>
            <Bot className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-semibold font-mono-numbers text-slate-900 dark:text-slate-100">
            Active
          </div>
          <div className="mt-1 text-[11px] text-blue-600 font-mono">
            SSRF-Guarded Delivery Probes
          </div>
        </div>
      </div>

      {/* Main AG Grid Blotter */}
      <div className="bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-[#1E2230] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Live Financial Blotter ({rowData.length} entries)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            ag-grid-react 36.2 · Monospace Tabular Numerals
          </span>
        </div>

        <div className="h-[480px] w-full ag-theme-alpine">
          <AgGridReact<FinancialBlotterRow>
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            loading={loading}
            defaultColDef={{
              sortable: true,
              filter: true,
              resizable: true,
            }}
            animateRows={true}
            pagination={true}
            paginationPageSize={10}
          />
        </div>
      </div>

      {/* Proof-of-Delivery Inspection Modal */}
      {inspectedTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#11131A] border border-slate-300 dark:border-[#1E2230] rounded-lg max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Proof-of-Delivery Attestation & Audit Dossier
                </h3>
              </div>
              <button onClick={() => setInspectedTx(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Vendor / Order</div>
                <div className="text-slate-900 dark:text-slate-100 font-semibold">{inspectedTx.vendorName} ({inspectedTx.paypalOrderId})</div>
              </div>

              <div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Deliverable Acceptance Summary</div>
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                  {inspectedTx.deliverableSummary || 'No summary'}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Cryptographic SHA-256 Digest</div>
                <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 break-all">
                  {inspectedTx.proofFileHash || 'Pending upload'}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">AI Auditor Verdict & Reasoning</div>
                <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-900">
                  <div className="font-bold">Verdict: {inspectedTx.aiAuditVerdict || 'PENDING'}</div>
                  <div className="text-[11px] mt-1">{inspectedTx.aiAuditReasoning}</div>
                </div>
              </div>

              {inspectedTx.deliverableProofUrl && (
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">SSRF-Guarded Artifact URL</div>
                  <a
                    href={inspectedTx.deliverableProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 mt-1 break-all"
                  >
                    <span>{inspectedTx.deliverableProofUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectedTx(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step-Up MFA Capture Modal */}
      {selectedTxForCapture && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#11131A] border border-slate-300 dark:border-[#1E2230] rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Step-Up MFA Treasury Authorization
                </h3>
              </div>
              <button onClick={() => setSelectedTxForCapture(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 mb-4">
              <p>
                You are executing an institutional release of{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-mono">
                  ${selectedTxForCapture.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {selectedTxForCapture.currency}
                </strong>{' '}
                to <strong className="text-slate-900 dark:text-slate-100">{selectedTxForCapture.vendorName}</strong>.
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900">
                Institutional Policy Rule: All disbursements exceeding policy threshold ($1,000) mandate RFC 6238 TOTP step-up confirmation.
              </p>
            </div>

            {mfaError && (
              <div className="mb-4 p-2.5 rounded bg-red-50 text-red-700 text-xs border border-red-200">
                {mfaError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    6-Digit Confirmation Code
                  </label>
                  {demoTotp && (
                    <button
                      type="button"
                      onClick={() => setMfaCode(demoTotp)}
                      className="text-[11px] font-mono text-blue-600 hover:underline"
                    >
                      Autofill Judge Code: {demoTotp}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="000000"
                  className="w-full text-center text-lg tracking-widest font-mono py-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTxForCapture(null)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={mfaSubmitting || mfaCode.length !== 6}
                  onClick={handleExecuteCapture}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-40"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  {mfaSubmitting ? 'Confirming...' : 'Authorize & Capture'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
