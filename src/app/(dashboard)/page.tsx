'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, SelectionChangedEvent } from 'ag-grid-community';
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
  Copy,
  Code2,
  Sparkles,
  Layers,
  Radio,
  Building,
  Scale,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { TreasuryInsights } from '@/components/TreasuryInsights';
import {
  FinancialBlotterRow,
  AgentActionDirective,
  UserSession,
  DisputeNegotiationResult,
  AgentDialogueMessage,
} from '@/types';

export default function TreasuryDashboardPage() {
  const [transactions, setTransactions] = useState<FinancialBlotterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<UserSession | null>(null);

  // Active filter state
  const [activeFilterLabel, setActiveFilterLabel] = useState<string | null>(null);

  // Selected rows for bulk operations
  const [selectedRows, setSelectedRows] = useState<FinancialBlotterRow[]>([]);
  const [bulkAuditing, setBulkAuditing] = useState(false);
  const [bulkAuditProgress, setBulkAuditProgress] = useState<string | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Step-Up MFA Modal State
  const [selectedTxForCapture, setSelectedTxForCapture] = useState<FinancialBlotterRow | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const [demoTotp, setDemoTotp] = useState<string>('');

  // Proof-of-Delivery Inspection Modal State
  const [inspectedTx, setInspectedTx] = useState<FinancialBlotterRow | null>(null);

  // Raw PayPal JSON Modal State
  const [rawJsonModal, setRawJsonModal] = useState<{ title: string; json: string } | null>(null);

  // Multi-Agent Dispute Resolution Modal State
  const [negotiatingTx, setNegotiatingTx] = useState<FinancialBlotterRow | null>(null);
  const [negotiationResult, setNegotiationResult] = useState<DisputeNegotiationResult | null>(null);
  const [negotiatingLoading, setNegotiatingLoading] = useState(false);

  // Inline action loading states
  const [auditLoadingId, setAuditLoadingId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  // Real-time SSE Stream Connection State
  const [sseConnected, setSseConnected] = useState(false);

  const gridRef = useRef<AgGridReact<FinancialBlotterRow>>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3600);
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data?.authenticated) {
        setSession(data.user);
        if (data.demoMfa?.code) setDemoTotp(data.demoMfa.code);
      }
    } catch {
      // ignore
    }
  }, []);

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

  // 1. Initial Load & Agent Directive Listener
  useEffect(() => {
    fetchSession();
    fetchTransactions();

    const handleAgentDirective = (e: Event) => {
      const customEvent = e as CustomEvent<AgentActionDirective>;
      const directive = customEvent.detail;

      if (!gridRef.current?.api) return;

      if (directive.intent === 'filter_ag_grid_ledger') {
        if (directive.filterColumn === 'ALL' || (!directive.filterColumn && !directive.filterMinAmount)) {
          gridRef.current.api.setFilterModel(null);
          setActiveFilterLabel(null);
          showToast('AG Grid Filter Reset: Showing all institutional records');
        } else if (directive.filterMinAmount) {
          gridRef.current.api.setFilterModel({
            amount: {
              filterType: 'number',
              type: 'greaterThan',
              filter: directive.filterMinAmount,
            },
          });
          setActiveFilterLabel(`Amount > $${directive.filterMinAmount.toLocaleString()}`);
          showToast(`AG Grid Filter Applied: Amount > $${directive.filterMinAmount.toLocaleString()}`);
        } else if (directive.filterColumn === 'status' && directive.filterValue) {
          gridRef.current.api.setFilterModel({
            status: {
              filterType: 'text',
              type: 'contains',
              filter: directive.filterValue,
            },
          });
          setActiveFilterLabel(`Status: ${directive.filterValue}`);
          showToast(`AG Grid Filter Applied: Status = ${directive.filterValue}`);
        }
      }
    };

    window.addEventListener('ledgerguard:agent-directive', handleAgentDirective);
    return () => window.removeEventListener('ledgerguard:agent-directive', handleAgentDirective);
  }, [fetchSession, fetchTransactions, showToast]);

  // 2. Real-Time Server-Sent Events (SSE) Live Reconciliation
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/ledger/stream');

      eventSource.addEventListener('connected', () => {
        setSseConnected(true);
      });

      eventSource.onopen = () => {
        setSseConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'TRANSACTION_UPDATED' || payload.type === 'DISPUTE_RESOLVED') {
            const updatedRecord: FinancialBlotterRow = payload.transaction;
            if (!updatedRecord) return;

            // 1. Update React state
            setTransactions((prev) =>
              prev.map((t) => (t.id === updatedRecord.id ? { ...t, ...updatedRecord } : t))
            );

            // 2. High-Performance AG Grid API update & Cell Flash
            if (gridRef.current?.api) {
              gridRef.current.api.applyTransaction({ update: [updatedRecord] });

              const targetNode = gridRef.current.api.getRowNode(updatedRecord.id);
              if (targetNode) {
                gridRef.current.api.flashCells({
                  rowNodes: [targetNode],
                  flashDuration: 2500,
                  fadeDuration: 1200,
                });
              }
            }

            showToast(
              `Real-Time SSE Webhook: ${updatedRecord.vendorName} updated to ${updatedRecord.status}`
            );
          }
        } catch (err) {
          console.error('SSE Message parsing error', err);
        }
      };

      eventSource.onerror = () => {
        setSseConnected(false);
      };
    } catch {
      // Fallback gracefully
    }

    return () => {
      eventSource?.close();
      setSseConnected(false);
    };
  }, [showToast]);

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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard: ${text}`);
  };

  // Row selection handler
  const onSelectionChanged = useCallback((event: SelectionChangedEvent<FinancialBlotterRow>) => {
    const selected = event.api.getSelectedRows();
    setSelectedRows(selected);
  }, []);

  // Multi-Agent Dispute Negotiation Trigger
  const handleOpenDisputeNegotiator = async (row: FinancialBlotterRow) => {
    setNegotiatingTx(row);
    setNegotiationResult(null);
    setNegotiatingLoading(true);

    try {
      const res = await fetch('/api/agent/negotiate-dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: row.id }),
      });

      const data = await res.json();
      if (res.ok && data.result) {
        setNegotiationResult(data.result);
        fetchTransactions();
        showToast(
          `Consensus Reached: ${row.vendorName} dispute resolved by Multi-Agent controller. Funds captured!`
        );
      } else {
        showToast(`Dispute negotiation failed: ${data.message || data.error}`);
      }
    } catch (err) {
      showToast(`Negotiation error: ${String(err)}`);
    } finally {
      setNegotiatingLoading(false);
    }
  };

  // Bulk AI Audit & Auto-Capture Selected Rows
  const handleBulkAuditSelected = async () => {
    const rowsToAudit = selectedRows.filter((r) => r.status === 'AUTHORIZED_HOLD' || r.status === 'AUDIT_PASSED');
    if (rowsToAudit.length === 0) {
      showToast('Select one or more AUTHORIZED_HOLD rows to run bulk audit.');
      return;
    }

    setBulkAuditing(true);
    let auditedCount = 0;

    for (let i = 0; i < rowsToAudit.length; i++) {
      const row = rowsToAudit[i];
      setBulkAuditProgress(`Auditing escrow ${i + 1} of ${rowsToAudit.length} (${row.vendorName})...`);

      try {
        const res = await fetch('/api/agent/audit-delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: row.id }),
        });
        if (res.ok) auditedCount++;
      } catch (err) {
        console.error('Audit failed for row', row.id, err);
      }
    }

    setBulkAuditing(false);
    setBulkAuditProgress(null);
    showToast(`Bulk AI Audit completed: ${auditedCount} of ${rowsToAudit.length} escrows verified.`);
    fetchTransactions();
  };

  // Clear AG Grid filters
  const handleClearFilters = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.setFilterModel(null);
      setActiveFilterLabel(null);
      showToast('AG Grid Filter Reset');
    }
  };

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

      showToast(`Settlement Executed: Order ${selectedTxForCapture.paypalOrderId} captured via PayPal v2.`);
      setSelectedTxForCapture(null);
      setMfaCode('');
      fetchTransactions();
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'Capture execution failed');
    } finally {
      setMfaSubmitting(false);
    }
  };

  // Run Autonomous Delivery Audit for single row
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
        showToast(`Audit Completed: Verdict ${data.auditResult?.verdict || 'VERIFIED'}, Risk Score: ${data.auditResult?.riskScore ?? 'LOW'}`);
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
        showToast('Sandbox Buyer Approval & Settlement verified. Funds captured.');
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
      if (res.ok) {
        showToast('Escrow hold voided and refunded via PayPal rail.');
        fetchTransactions();
      }
    } catch (err) {
      console.error('Refund failed', err);
    }
  };

  const handleExportCsv = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `ledgerguard_financial_blotter_${new Date().toISOString().split('T')[0]}.csv`,
      });
      showToast('Exported AG Grid financial blotter as CSV.');
    }
  };

  // AG Grid Column Definitions
  const columnDefs: ColDef<FinancialBlotterRow>[] = useMemo(
    () => [
      {
        headerName: '',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 48,
        pinned: 'left',
        lockPosition: 'left',
        suppressHeaderMenuButton: true,
        resizable: false,
        sortable: false,
        filter: false,
      },
      {
        headerName: 'PayPal Identifier',
        field: 'paypalOrderId',
        width: 195,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => {
          const id = params.value || 'N/A';
          const raw = params.data?.rawPaypalResponse;
          return (
            <div className="flex items-center gap-1.5 py-1">
              <span
                onClick={() => copyToClipboard(id, 'PayPal Order ID')}
                className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1"
                title="Click to copy Order ID"
              >
                <span>{id}</span>
                <Copy className="w-2.5 h-2.5 opacity-50" />
              </span>

              {raw && (
                <button
                  type="button"
                  onClick={() => setRawJsonModal({ title: `PayPal Orders v2 Payload (${id})`, json: raw })}
                  title="Inspect Raw PayPal JSON Payload"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Code2 className="w-3.5 h-3.5" />
                </button>
              )}

              {params.data?.approvalLink && (
                <a
                  href={params.data.approvalLink}
                  target="_blank"
                  rel="noreferrer"
                  title="Open Live Sandbox Checkout"
                  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
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
        minWidth: 180,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => (
          <div className="leading-tight py-1">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{params.value}</div>
            <div className="text-[11px] text-slate-400 font-mono truncate">{params.data?.vendorEmail}</div>
          </div>
        ),
      },
      {
        headerName: 'Category',
        field: 'category',
        width: 145,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {params.value}
          </span>
        ),
      },
      {
        headerName: 'Escrow Amount',
        field: 'amount',
        width: 150,
        filter: 'agNumberColumnFilter',
        floatingFilter: true,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => (
          <div className="font-mono tabular-nums font-semibold text-xs text-slate-900 dark:text-slate-100 py-1">
            ${Number(params.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {params.data?.currency}
          </div>
        ),
      },
      {
        headerName: 'Settlement Status',
        field: 'status',
        width: 185,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => {
          const s = params.value;
          if (s === 'CAPTURED') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                <CheckCircle2 className="w-3 h-3" /> Captured & Settled
              </span>
            );
          }
          if (s === 'AUDIT_PASSED') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3 h-3" /> Audit Passed
              </span>
            );
          }
          if (s === 'AUTHORIZED_HOLD') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                <Clock className="w-3 h-3" /> Authorized Hold
              </span>
            );
          }
          if (s === 'FLAGGED_DISPUTE') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] animate-pulse">
                <ShieldAlert className="w-3 h-3" /> Flagged Dispute
              </span>
            );
          }
          if (s === 'REFUNDED') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-300">
                Voided / Refunded
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Created
            </span>
          );
        },
      },
      {
        headerName: 'AI Risk Score',
        field: 'aiRiskScore',
        width: 140,
        filter: 'agNumberColumnFilter',
        floatingFilter: true,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => {
          const score = params.value ?? 15;
          const isHighRisk = score > 60;
          const isMedRisk = score >= 25 && score <= 60;
          return (
            <div className="w-full flex items-center gap-2 py-1">
              <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    isHighRisk ? 'bg-[#DC2626]' : isMedRisk ? 'bg-[#D97706]' : 'bg-[#059669]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                />
              </div>
              <span
                className={`font-mono tabular-nums text-xs font-semibold w-7 text-right ${
                  isHighRisk ? 'text-red-600' : isMedRisk ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {score}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Proof',
        field: 'proofFileHash',
        width: 75,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => (
          <button
            onClick={() => setInspectedTx(params.data || null)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            title="Inspect Proof-of-Delivery Attestation & Hash"
          >
            <Eye className="w-4 h-4" />
          </button>
        ),
      },
      {
        headerName: 'Execution Controls',
        field: 'id',
        width: 310,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<FinancialBlotterRow>) => {
          const row = params.data;
          if (!row) return null;

          const isAuditor = session?.role === 'AUDITOR';

          if (row.status === 'CAPTURED') {
            return (
              <div className="flex items-center gap-1 text-xs text-slate-400 font-mono py-1">
                <span>Settled:</span>
                <span
                  onClick={() => copyToClipboard(row.paypalCaptureId || 'CAP-SETTLED', 'Capture ID')}
                  className="font-semibold text-slate-600 dark:text-slate-300 cursor-pointer hover:underline"
                >
                  {row.paypalCaptureId || 'Capture Rail'}
                </span>
              </div>
            );
          }

          if (row.status === 'FLAGGED_DISPUTE') {
            return (
              <div className="flex items-center gap-1.5 py-1">
                <button
                  onClick={() => handleOpenDisputeNegotiator(row)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 transition-colors shadow-2xs"
                  title="Trigger Multi-Agent Negotiation (Treasury Agent <-> Vendor Agent)"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Negotiate Dispute</span>
                </button>
                <button
                  onClick={() => handleRunAudit(row.id)}
                  disabled={auditLoadingId === row.id}
                  className="px-2 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                >
                  {auditLoadingId === row.id ? '...' : 'Audit'}
                </button>
                <button
                  onClick={() => handleRefund(row.id)}
                  disabled={isAuditor}
                  className="px-2 py-1 text-[11px] font-medium rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40"
                >
                  Void
                </button>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1.5 py-1">
              <button
                onClick={() => setSelectedTxForCapture(row)}
                disabled={isAuditor}
                title={isAuditor ? 'Requires TREASURY_ADMIN role' : 'Execute PayPal Orders v2 Capture'}
                className="px-2 py-1 text-[11px] font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Capture
              </button>
              <button
                onClick={() => handleSimulateApprovalAndSettle(row.id)}
                disabled={simulatingId === row.id || isAuditor}
                title={isAuditor ? 'Requires TREASURY_ADMIN role' : '1-Click Simulate Sandbox Buyer Approval & Settle'}
                className="px-2 py-1 text-[11px] font-semibold rounded border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                disabled={isAuditor}
                title={isAuditor ? 'Requires TREASURY_ADMIN role' : 'Release Hold / Void'}
                className="px-2 py-1 text-[11px] font-medium rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Void
              </button>
            </div>
          );
        },
      },
    ],
    [session?.role, auditLoadingId, simulatingId]
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 rounded-lg shadow-xl text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 dark:text-blue-600 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Treasury Blotter & Escrow Blotter
            </h1>
            {/* Live SSE Indicator */}
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${
                sseConnected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title="Real-Time Server-Sent Events (SSE) Webhook Bridge"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{sseConnected ? 'SSE Live Stream' : 'SSE Connecting...'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            PayPal Orders v2 · Authorize-and-Hold Settlement Terminal · AG Grid Enterprise
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeFilterLabel && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 text-xs font-mono">
              <span>{activeFilterLabel}</span>
              <button onClick={handleClearFilters} className="hover:text-blue-900 font-bold ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {selectedRows.length > 0 && (
            <button
              onClick={handleBulkAuditSelected}
              disabled={bulkAuditing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>
                {bulkAuditing
                  ? bulkAuditProgress || 'Auditing...'
                  : `Bulk AI Audit (${selectedRows.length} selected)`}
              </span>
            </button>
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
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
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
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
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
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {metrics.disputeRate}%
          </div>
          <div className="mt-1 text-[11px] text-red-600 font-mono">
            {metrics.flaggedCount} flagged for milestone mismatch
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono mb-2">
            <span>MULTI-AGENT CONTROLLER</span>
            <Bot className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-semibold font-mono text-slate-900 dark:text-slate-100">
            Autonomous
          </div>
          <div className="mt-1 text-[11px] text-blue-600 font-mono">
            SSE Stream · AES-256-GCM ALE
          </div>
        </div>
      </div>

      {/* Visual Financial Analytics & Risk Telemetry */}
      <TreasuryInsights />

      {/* Main AG Grid Blotter */}
      <div className="bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-[#1E2230] flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Live Financial Blotter ({transactions.length} entries)
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>ag-grid-react 36.2</span>
            <span>·</span>
            <span>Multi-Row Selection</span>
            <span>·</span>
            <span>Floating Filters</span>
            <span>·</span>
            <span>SSE Real-Time Sync</span>
          </div>
        </div>

        <div className="h-[520px] w-full ag-theme-alpine">
          <AgGridReact<FinancialBlotterRow>
            ref={gridRef}
            rowData={transactions}
            columnDefs={columnDefs}
            loading={loading}
            getRowId={(params) => params.data.id}
            defaultColDef={{
              sortable: true,
              filter: true,
              resizable: true,
              floatingFilter: true,
            }}
            rowSelection="multiple"
            onSelectionChanged={onSelectionChanged}
            animateRows={true}
            pagination={true}
            paginationPageSize={10}
          />
        </div>
      </div>

      {/* Multi-Agent Dispute Resolution Modal */}
      {negotiatingTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#11131A] border border-slate-300 dark:border-[#1E2230] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Multi-Agent Dispute Resolution Dossier
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Autonomous 3-Round Negotiation: Treasury Auditor Agent ⇄ {negotiatingTx.vendorName} Agent
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setNegotiatingTx(null);
                  setNegotiationResult(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Loading State */}
            {negotiatingLoading && (
              <div className="p-8 text-center space-y-3 font-mono text-xs">
                <div className="w-8 h-8 rounded-full border-2 border-amber-600 border-t-transparent animate-spin mx-auto" />
                <div className="text-slate-800 dark:text-slate-200 font-semibold">
                  Executing autonomous multi-agent dialogue rounds...
                </div>
                <div className="text-[11px] text-slate-500">
                  Treasury Agent auditing contract specs · Vendor Agent synthesizing telemetry logs
                </div>
              </div>
            )}

            {/* Negotiation Result & Transcript */}
            {negotiationResult && (
              <div className="space-y-4 text-xs font-sans">
                {/* Consensus Banner */}
                <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-mono flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">
                        MULTI-AGENT CONSENSUS REACHED · SETTLEMENT AUTHORIZED
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                        Revised SHA-256 Digest Authenticated · PayPal Capture Executed ({negotiationResult.settlementTerms.paypalCaptureId})
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="line-through text-red-500 font-bold">
                      {negotiationResult.initialRiskScore}/100
                    </span>
                    <span className="text-emerald-700 font-bold text-sm">
                      ➔ {negotiationResult.finalRiskScore}/100
                    </span>
                  </div>
                </div>

                {/* 3-Round Dialogue Transcript */}
                <div className="space-y-3 font-mono">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Autonomous Dispute Resolution Dialogue
                  </div>

                  {negotiationResult.dialogue.map((msg, i) => {
                    const isTreasury = msg.sender === 'TREASURY_AUDITOR_AGENT';
                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border leading-relaxed ${
                          isTreasury
                            ? 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                            : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-200/50 dark:border-slate-700/50">
                          <div className="flex items-center gap-1.5 font-bold text-[11px]">
                            {isTreasury ? (
                              <Bot className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <Building className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            <span>{msg.senderTitle}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>

                        <p className="text-[11px] leading-normal">{msg.message}</p>

                        {msg.evidenceValue && (
                          <div className="mt-2 pt-1.5 border-t border-slate-200/40 dark:border-slate-700/40 text-[10px] flex items-center justify-between">
                            <span className="text-slate-500 uppercase font-semibold">
                              Attestation: {msg.evidenceType}
                            </span>
                            <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px] truncate max-w-xs">
                              {msg.evidenceValue}
                            </code>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => {
                      setNegotiatingTx(null);
                      setNegotiationResult(null);
                    }}
                    className="px-4 py-1.5 text-xs font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                  >
                    Close Dossier & View Reconciled Ledger
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw PayPal JSON Inspection Modal */}
      {rawJsonModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#11131A] border border-slate-300 dark:border-[#1E2230] rounded-lg max-w-2xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {rawJsonModal.title}
                </h3>
              </div>
              <button onClick={() => setRawJsonModal(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 rounded bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-96">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(rawJsonModal.json), null, 2);
                  } catch {
                    return rawJsonModal.json;
                  }
                })()}
              </pre>
              <button
                type="button"
                onClick={() => copyToClipboard(rawJsonModal.json, 'Raw PayPal JSON')}
                className="absolute top-2 right-2 px-2.5 py-1 text-[11px] font-mono rounded bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              >
                Copy JSON
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setRawJsonModal(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

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
                <strong className="text-slate-900 dark:text-slate-100 font-mono tabular-nums">
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
                  className="w-full text-center text-lg tracking-widest font-mono tabular-nums py-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
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
