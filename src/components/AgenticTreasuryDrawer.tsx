'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Coins,
  Copy,
  Check,
  FileText,
  Filter,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { JUDGE_PROMPT_CHIPS } from '@/lib/agent-engine';

interface AgenticTreasuryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isLlmDegraded?: boolean;
}

export function AgenticTreasuryDrawer({
  isOpen,
  onClose,
  isLlmDegraded = false,
}: AgenticTreasuryDrawerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inputPrompt, setInputPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    status,
    sendMessage,
    setMessages,
  } = useChat();

  const isGenerating = status === 'submitted' || status === 'streaming';

  // Seed default greeting if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-seed',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'Autonomous Treasury Agent online. Cryptographic SHA-256 chain verified. Ready to authorize PayPal Orders v2 escrows, audit proof-of-delivery documents, or filter the blotter.',
            },
          ],
        },
      ]);
    }
  }, [messages.length, setMessages]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  // Listen for filter_ledger tool output to dispatch event to AG Grid
  useEffect(() => {
    if (typeof window === 'undefined') return;

    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;
      for (const part of msg.parts || []) {
        const isFilterTool =
          part.type === 'tool-filter_ledger' ||
          (part.type === 'dynamic-tool' && (part as unknown as { toolName: string }).toolName === 'filter_ledger');

        if (isFilterTool && (part as { state?: string }).state === 'output-available') {
          const output = (part as { output?: { directive?: unknown } }).output;
          if (output?.directive) {
            window.dispatchEvent(
              new CustomEvent('ledgerguard:agent-directive', {
                detail: output.directive,
              })
            );
          }
        }
      }
    }
  }, [messages]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendPrompt = (promptText?: string) => {
    const text = (promptText || inputPrompt).trim();
    if (!text || isGenerating) return;

    sendMessage({ text });
    setInputPrompt('');
  };

  if (!isOpen) return null;

  return (
    <aside className="w-96 md:w-[420px] liquid-ice-elevated border-l border-sky-400/25 dark:border-sky-500/20 flex flex-col h-screen shrink-0 shadow-2xl z-30 animate-in slide-in-from-right duration-300 backdrop-blur-3xl specular-border">
      {/* 1. Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-sky-400/20 dark:border-sky-500/20 bg-white/20 dark:bg-sky-950/30">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="w-4 h-4 text-sky-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-sky-100 flex items-center gap-1.5">
              <span>Autonomous Treasury Agent</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                v2.4
              </span>
            </div>
            <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400/70 flex items-center gap-1">
              <span>Streaming UI</span>
              <span>•</span>
              <span>PayPal Orders v2</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-sky-500/20 text-slate-400 hover:text-slate-100 transition-colors"
          title="Close Agent Drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Degradation Warning Banner if Circuit Breaker tripped */}
      {isLlmDegraded && (
        <div className="px-3 py-1.5 bg-amber-500/15 border-b border-amber-400/30 flex items-center gap-2 text-[11px] text-amber-200 font-mono">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>LLM Degraded: Operating on Deterministic Ruleset</span>
        </div>
      )}

      {/* 2. Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 font-sans text-xs">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}
            >
              {/* Message Parts Rendering */}
              {msg.parts && msg.parts.length > 0 ? (
                msg.parts.map((part, partIdx) => {
                  // A. Text Parts
                  if (part.type === 'text') {
                    if (!part.text) return null;
                    return (
                      <div
                        key={partIdx}
                        className={`p-3 rounded-xl border leading-relaxed backdrop-blur-md transition-all max-w-[90%] whitespace-pre-wrap ${
                          isUser
                            ? 'bg-sky-600/90 text-white border-sky-400/40 shadow-sm ml-6'
                            : 'liquid-ice border-sky-400/20 dark:border-sky-500/20 text-slate-800 dark:text-sky-100 mr-4'
                        }`}
                      >
                        {part.text}
                      </div>
                    );
                  }

                  // B. Tool Call Parts (Streaming & Interactive)
                  const isTool =
                    part.type.startsWith('tool-') ||
                    part.type === 'dynamic-tool';

                  if (isTool) {
                    const toolName = part.type.startsWith('tool-')
                      ? part.type.replace(/^tool-/, '')
                      : (part as unknown as { toolName: string }).toolName;

                    const state = (part as { state?: string }).state;
                    const input = ((part as { input?: Record<string, unknown> }).input || {}) as Record<string, any>;
                    const output = ((part as { output?: Record<string, unknown> }).output || {}) as Record<string, any>;

                    // 1. Loading State: Pulsing Widget
                    if (state === 'input-streaming' || state === 'input-available') {
                      return (
                        <div
                          key={partIdx}
                          className="w-full max-w-[92%] p-3 rounded-xl liquid-ice-card border border-cyan-400/40 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.25)] flex items-center gap-3 animate-pulse"
                        >
                          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/50 shrink-0">
                            <Loader2 className="w-4 h-4 text-cyan-300 animate-spin" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-[11px] font-semibold text-cyan-200 flex items-center gap-1.5">
                              <span>Executing PayPal Sandbox Transaction...</span>
                            </div>
                            <div className="text-[10px] font-mono text-cyan-400/80 truncate">
                              Tool: {toolName} {input.amount ? `($${Number(input.amount).toFixed(2)})` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // 2. Output Available: Rich Success / Result Card
                    if (state === 'output-available' && output) {
                      // Check for High-Risk Policy Alert
                      if (output.requiresConfirmation) {
                        return (
                          <div
                            key={partIdx}
                            className="w-full max-w-[92%] p-3.5 rounded-xl border border-amber-400/40 bg-amber-950/30 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.2)] space-y-2.5"
                          >
                            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Institutional Risk Guardrail Triggered</span>
                            </div>
                            <div className="text-[11px] text-amber-200/90 leading-relaxed">
                              {String(output.message || 'Risk score exceeds autonomous threshold.')}
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-amber-400/20 text-[10px] font-mono">
                              <span>Risk Score: {String(output.riskScore)}/100</span>
                              <span className="text-amber-400 font-semibold">Ceiling: 40/100</span>
                            </div>
                            <button
                              onClick={() =>
                                handleSendPrompt(
                                  `Confirm authorized capture with confirmedByAdmin: true for transaction ${String(
                                    output.transactionId
                                  )}`
                                )
                              }
                              className="w-full mt-2 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                            >
                              <span>Approve Risk Override & Capture</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      // Escrow Creation Success Card
                      if (toolName === 'create_paypal_escrow' && output.success) {
                        return (
                          <div
                            key={partIdx}
                            className="w-full max-w-[92%] p-3.5 rounded-xl liquid-ice-card border border-emerald-400/40 bg-slate-900/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] space-y-2.5 specular-border"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>PayPal Orders v2 Escrow Authorized</span>
                              </div>
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                {String(output.status || 'AUTHORIZED_HOLD')}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                              <div>
                                <span className="text-slate-400 text-[10px] block">Vendor</span>
                                <span className="font-medium text-slate-100 truncate block">
                                  {String(output.vendorName || input.vendorName || 'Vendor')}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] block">Hold Amount</span>
                                <span className="font-mono font-bold text-emerald-300 block">
                                  ${Number(output.amount || input.amount || 0).toFixed(2)} USD
                                </span>
                              </div>
                            </div>

                            {/* PayPal Order ID with Copy */}
                            <div className="p-2 rounded-lg bg-slate-950/60 border border-sky-400/20 flex items-center justify-between">
                              <div className="overflow-hidden">
                                <span className="text-[9px] font-mono text-slate-400 block uppercase">
                                  PayPal Order ID
                                </span>
                                <span className="text-[11px] font-mono text-cyan-300 font-semibold truncate block">
                                  {String(output.paypalOrderId)}
                                </span>
                              </div>
                              <button
                                onClick={() => handleCopy(String(output.paypalOrderId))}
                                className="p-1 rounded hover:bg-sky-500/20 text-slate-300 transition-colors"
                                title="Copy PayPal Order ID"
                              >
                                {copiedId === String(output.paypalOrderId) ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            {/* Cryptographic SHA-256 Attestation */}
                            {Boolean(output.auditRecordHash) && (
                              <div className="flex items-center gap-1 text-[10px] font-mono text-sky-400/80 pt-1">
                                <ShieldCheck className="w-3 h-3 text-sky-400 shrink-0" />
                                <span className="truncate">
                                  SHA-256: {String(output.auditRecordHash).slice(0, 16)}...
                                </span>
                              </div>
                            )}

                            {/* PayPal Sandbox Approve Link */}
                            {Boolean(output.approvalLink) && (
                              <a
                                href={String(output.approvalLink)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-200 text-xs font-medium transition-all"
                              >
                                <span>Complete PayPal Sandbox Approval</span>
                                <ExternalLink className="w-3 h-3 text-sky-300" />
                              </a>
                            )}
                          </div>
                        );
                      }

                      // Capture Settlement Success Card
                      if (toolName === 'paypal_capture' && output.success) {
                        return (
                          <div
                            key={partIdx}
                            className="w-full max-w-[92%] p-3 rounded-xl liquid-ice-card border border-sky-400/40 bg-slate-900/60 shadow-[0_0_20px_rgba(56,189,248,0.15)] space-y-2 specular-border"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-sky-300 font-semibold text-xs">
                                <Coins className="w-4 h-4 text-sky-400" />
                                <span>PayPal Disbursement Captured</span>
                              </div>
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                                CAPTURED
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-200">
                              Captured ${Number(output.amount || 0).toFixed(2)} USD. Capture ID: {String(output.paypalCaptureId || 'CAP-SANDBOX')}
                            </div>
                          </div>
                        );
                      }

                      // Filter Ledger Success Card
                      if (toolName === 'filter_ledger') {
                        return (
                          <div
                            key={partIdx}
                            className="w-full max-w-[92%] p-2.5 rounded-xl liquid-ice border border-sky-400/30 text-[11px] flex items-center gap-2 text-sky-200"
                          >
                            <Filter className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span>Blotter Filter Applied: {String(output.message || 'View updated')}</span>
                          </div>
                        );
                      }

                      // Invoicing v2 Success Card
                      if (toolName === 'generate_invoice' && output.success) {
                        return (
                          <div
                            key={partIdx}
                            className="w-full max-w-[92%] p-3 rounded-xl liquid-ice-card border border-cyan-400/40 text-xs space-y-1.5"
                          >
                            <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                              <FileText className="w-4 h-4 text-cyan-400" />
                              <span>PayPal Invoicing v2 Draft Ready</span>
                            </div>
                            <div className="text-[11px] text-slate-300">
                              Invoice #{String(output.invoiceId)} generated for {String(output.recipientEmail)} (${Number(output.amount || 0).toFixed(2)} USD).
                            </div>
                          </div>
                        );
                      }
                    }
                  }

                  return null;
                })
              ) : (
                // Fallback for string-only messages
                <div
                  className={`p-3 rounded-xl border leading-relaxed backdrop-blur-md transition-all max-w-[90%] whitespace-pre-wrap ${
                    isUser
                      ? 'bg-sky-600/90 text-white border-sky-400/40 shadow-sm ml-6'
                      : 'liquid-ice border-sky-400/20 dark:border-sky-500/20 text-slate-800 dark:text-sky-100 mr-4'
                  }`}
                >
                  {typeof (msg as unknown as { content?: string }).content === 'string'
                    ? (msg as unknown as { content: string }).content
                    : ''}
                </div>
              )}
            </div>
          );
        })}

        {/* Global Loading Spinner when submitted */}
        {isGenerating && (
          <div className="p-3 rounded-xl liquid-ice border border-sky-400/30 text-sky-300 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span>Autonomous Treasury Agent reasoning...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. 1-Click Judge Test Prompts */}
      <div className="p-3 border-t border-sky-400/20 dark:border-sky-500/20 bg-white/10 dark:bg-sky-950/30">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-mono uppercase text-sky-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>1-Click Judge Test Prompts</span>
          </div>
          <span className="text-[9px] font-mono text-slate-400">Instant Execution</span>
        </div>
        <div className="space-y-1.5">
          {JUDGE_PROMPT_CHIPS.map((chip, i) => (
            <button
              key={i}
              onClick={() => handleSendPrompt(chip)}
              disabled={isGenerating}
              className="w-full text-left p-1.5 rounded-lg border border-sky-400/20 dark:border-sky-500/20 bg-white/30 dark:bg-sky-950/40 text-[11px] font-mono text-slate-700 dark:text-sky-200 hover:bg-sky-500/20 hover:border-sky-400/40 transition-all truncate disabled:opacity-50"
              title={chip}
            >
              › {chip}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Chat Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendPrompt();
        }}
        className="p-3 border-t border-sky-400/20 dark:border-sky-500/20 flex items-center gap-2 bg-white/10 dark:bg-sky-950/40"
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="Command treasury agent or authorize hold..."
          disabled={isGenerating}
          className="flex-1 px-3 py-2 text-xs rounded-xl ice-input text-slate-900 dark:text-sky-100 placeholder:text-sky-400/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isGenerating || !inputPrompt.trim()}
          className="btn-ice btn-ice-primary p-2 rounded-xl disabled:opacity-50"
          title="Send Command"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </aside>
  );
}
