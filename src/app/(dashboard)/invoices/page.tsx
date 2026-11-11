'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet, Plus, CheckCircle, ShieldAlert, FileCheck, RefreshCw } from 'lucide-react';
import { FinancialBlotterRow } from '@/types';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<FinancialBlotterRow[]>([]);
  const [loading, setLoading] = useState(true);

  // New Invoice Modal
  const [showModal, setShowModal] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-1042');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [counterpartyEmail, setCounterpartyEmail] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('15000');
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/paypal/invoices');
      const data = await res.json();
      if (data.invoices) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/paypal/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber,
          counterpartyName,
          counterpartyEmail,
          items: [
            {
              name: itemName,
              quantity: parseInt(quantity, 10),
              unitPrice: parseFloat(unitPrice),
            },
          ],
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setInvoiceNumber(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
        setCounterpartyName('');
        setCounterpartyEmail('');
        setItemName('');
        fetchInvoices();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Accounts-Payable Invoicing v2 & Reconciler
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            PayPal Invoicing v2 REST Rail · AI Line-Item Discrepancy Scanner
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInvoices}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Invoicing v2 Draft</span>
          </button>
        </div>
      </div>

      {/* Invoice Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {invoices.map((inv) => (
          <div
            key={inv.id}
            className="p-5 rounded-lg bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] shadow-xs space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                  {inv.invoiceNumber || 'INV-DRAFT'}
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-2">
                  {inv.counterpartyName}
                </h3>
                <div className="text-[11px] text-slate-400 font-mono">{inv.counterpartyEmail}</div>
              </div>

              <div className="text-right">
                <div className="text-base font-semibold font-mono-numbers text-slate-900 dark:text-slate-100">
                  ${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {inv.currency}
                </div>
                <div className="mt-1">
                  {inv.status === 'CAPTURED' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      SETTLED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      AUTHORIZED
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                Reconciliation Notes
              </div>
              <p className="leading-relaxed">{inv.auditNotes || inv.escrowConditions}</p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Score: {inv.auditScore ?? 90}/100</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {new Date(inv.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#11131A] border border-slate-300 dark:border-[#1E2230] rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-slate-800 dark:text-slate-200" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Generate PayPal Invoicing v2 Draft
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Invoice Number
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Recipient Name
                </label>
                <input
                  type="text"
                  required
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  placeholder="e.g. Snowflake Enterprise"
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  value={counterpartyEmail}
                  onChange={(e) => setCounterpartyEmail(e.target.value)}
                  placeholder="ar@vendor.com"
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Line Item Description
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Enterprise GPU Reserved Capacity Q4"
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                    Unit Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2 border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold"
                >
                  {submitting ? 'Generating...' : 'Create & Sync'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
