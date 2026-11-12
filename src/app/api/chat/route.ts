import { cookies } from 'next/headers';
import { streamText, convertToModelMessages, createUIMessageStreamResponse } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { secureLogger } from '@/lib/secure-logger';
import { aiCircuitBreaker } from '@/lib/circuit-breaker';
import { LEDGERGUARD_SYSTEM_PROMPT } from '@/lib/agent/prompt';
import {
  getAgentTools,
  executeCreatePaypalEscrow,
  executePaypalCapture,
  executeFilterLedger,
  executeGenerateInvoice,
} from '@/lib/agent/tools';
import { agentEngine } from '@/lib/agent-engine';

export const maxDuration = 60;

// Cache LLM key verification result for 60 seconds
let cachedKeyStatus: { key: string; valid: boolean; checkedAt: number } | null = null;

async function isLiveLlmAvailable(apiKey?: string, baseURL?: string): Promise<boolean> {
  if (!apiKey || apiKey.length < 20 || apiKey.includes('***')) return false;

  const now = Date.now();
  if (cachedKeyStatus && cachedKeyStatus.key === apiKey && now - cachedKeyStatus.checkedAt < 60000) {
    return cachedKeyStatus.valid;
  }

  try {
    const url = baseURL ? `${baseURL}/models` : 'https://api.openai.com/v1/models';
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(3000),
    });

    const valid = res.status === 200;
    cachedKeyStatus = { key: apiKey, valid, checkedAt: now };
    if (!valid) {
      secureLogger.warn(`[LLM Preflight] API key returned HTTP ${res.status}. Switching to Deterministic Engine.`);
    }
    return valid;
  } catch {
    cachedKeyStatus = { key: apiKey, valid: false, checkedAt: now };
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // 1. Session & Multi-Tenant Organization Context
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('lg_session')?.value;
    let organizationId = 'demo-org-apex';

    if (sessionCookie) {
      const payload = await verifySessionToken(sessionCookie);
      if (payload?.organizationId) {
        organizationId = payload.organizationId;
      }
    } else {
      // Find default or first active organization
      const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
      if (firstOrg) {
        organizationId = firstOrg.id;
      }
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    let promptText = '';
    if (latestUserMessage) {
      if (typeof latestUserMessage.content === 'string') {
        promptText = latestUserMessage.content;
      } else if (Array.isArray(latestUserMessage.parts)) {
        promptText = latestUserMessage.parts
          .filter((p: { type: string; text?: string }) => p.type === 'text' && p.text)
          .map((p: { text: string }) => p.text)
          .join(' ');
      }
    }

    // 2. High-Availability LLM Provider Execution (Groq or OpenAI with Auto-Detection)
    const isGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 10);
    const baseURL = isGroq ? 'https://api.groq.com/openai/v1' : undefined;
    const apiKey = (isGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY)?.trim();
    const modelName = isGroq
      ? (process.env.GROQ_MODEL || 'openai/gpt-oss-20b')
      : (process.env.OPENAI_MODEL || 'gpt-4o-mini');

    const isCircuitOpen = aiCircuitBreaker.getState() === 'OPEN';
    const canUseLiveLlm = await isLiveLlmAvailable(apiKey, baseURL);

    if (canUseLiveLlm && !isCircuitOpen && apiKey) {
      try {
        const openai = createOpenAI({
          apiKey,
          baseURL,
        });
        const model = openai(modelName);
        const modelMessages = await convertToModelMessages(messages);

        const result = streamText({
          model,
          system: LEDGERGUARD_SYSTEM_PROMPT,
          messages: modelMessages,
          tools: getAgentTools(organizationId),
        });

        return result.toUIMessageStreamResponse();
      } catch (llmErr) {
        secureLogger.warn('LLM streamText threw an error, engaging deterministic fallback stream', {
          error: String(llmErr),
        });
      }
    }

    // 3. Deterministic Policy Engine Fallback Stream (Zero-Downtime Resilience)
    secureLogger.info('[Agentic Chat] Operating on Deterministic Policy Fallback Stream', {
      prompt: promptText,
      organizationId,
    });

    const parsedDirective = agentEngine.parseCommandCore(promptText, true);

    const stream = new ReadableStream({
      async start(controller) {
        const textMessageId = `msg-agent-${Date.now()}`;
        const toolCallId = `call-${Date.now().toString(36)}`;

        try {
          if (parsedDirective.intent === 'create_paypal_escrow_order' && parsedDirective.createdOrder) {
            const toolInput = {
              vendorName: parsedDirective.createdOrder.vendorName || 'Vertex Semiconductor',
              vendorEmail: parsedDirective.createdOrder.vendorEmail || 'shipments@vertex-semi.com',
              amount: parsedDirective.createdOrder.amount || 1450.0,
              currency: (parsedDirective.createdOrder.currency as 'USD' | 'EUR' | 'GBP') || 'USD',
              category: (parsedDirective.createdOrder.category as 'CONTRACTOR_ESCROW' | 'CLOUD_INFRA' | 'SAAS_LICENSE' | 'LOGISTICS') || 'LOGISTICS',
              deliverableSummary: parsedDirective.createdOrder.deliverableSummary || 'Consignment delivery and acceptance certificate',
              requireProofOfDelivery: true,
            };

            controller.enqueue({
              type: 'tool-input-available',
              toolCallId,
              toolName: 'create_paypal_escrow',
              input: toolInput,
            });

            const toolOutput = await executeCreatePaypalEscrow(toolInput, organizationId);

            controller.enqueue({
              type: 'tool-output-available',
              toolCallId,
              output: toolOutput,
            });

            controller.enqueue({ type: 'text-start', id: textMessageId });
            controller.enqueue({
              type: 'text-delta',
              id: textMessageId,
              delta: `Autonomous Escrow Authorization Executed: Placed $${toolInput.amount.toFixed(2)} USD into PayPal Orders v2 escrow hold for ${toolInput.vendorName}. PayPal Order ID: ${toolOutput.paypalOrderId}. Cryptographic audit record chained with SHA-256 integrity.`,
            });
            controller.enqueue({ type: 'text-end', id: textMessageId });
          } else if (parsedDirective.intent === 'audit_and_release_escrow') {
            // Find an active hold transaction to test release/capture
            const candidate = await prisma.ledgerTransaction.findFirst({
              where: { organizationId, status: 'AUTHORIZED_HOLD' },
              orderBy: { createdAt: 'desc' },
            });

            if (candidate) {
              const toolInput = {
                transactionId: candidate.id,
                amount: candidate.amount,
                riskScore: candidate.aiRiskScore || 15,
                confirmedByAdmin: candidate.aiRiskScore <= 40,
                reason: 'Deterministic autonomous audit pass and capture release',
              };

              controller.enqueue({
                type: 'tool-input-available',
                toolCallId,
                toolName: 'paypal_capture',
                input: toolInput,
              });

              const toolOutput = await executePaypalCapture(toolInput, organizationId);

              controller.enqueue({
                type: 'tool-output-available',
                toolCallId,
                output: toolOutput,
              });

              controller.enqueue({ type: 'text-start', id: textMessageId });
              controller.enqueue({
                type: 'text-delta',
                id: textMessageId,
                delta: toolOutput.success
                  ? `PayPal Capture Succeeded: Captured $${candidate.amount.toFixed(2)} USD disbursement for ${candidate.vendorName}. Capture ID: ${toolOutput.paypalCaptureId}.`
                  : `Capture Guardrail: ${toolOutput.message}`,
              });
              controller.enqueue({ type: 'text-end', id: textMessageId });
            } else {
              controller.enqueue({ type: 'text-start', id: textMessageId });
              controller.enqueue({
                type: 'text-delta',
                id: textMessageId,
                delta: 'Audit Scan Completed: No active AUTHORIZED_HOLD escrows currently pending settlement in the blotter.',
              });
              controller.enqueue({ type: 'text-end', id: textMessageId });
            }
          } else if (parsedDirective.intent === 'filter_ag_grid_ledger') {
            const filterInput = {
              column: (parsedDirective.filterColumn as 'status' | 'category' | 'minAmount' | 'maxAmount' | 'vendorName' | 'all') || 'status',
              value: parsedDirective.filterValue || parsedDirective.filterMinAmount || 'AUTHORIZED_HOLD',
              explanation: parsedDirective.summary,
            };

            controller.enqueue({
              type: 'tool-input-available',
              toolCallId,
              toolName: 'filter_ledger',
              input: filterInput,
            });

            const filterOutput = await executeFilterLedger(filterInput);

            controller.enqueue({
              type: 'tool-output-available',
              toolCallId,
              output: filterOutput,
            });

            controller.enqueue({ type: 'text-start', id: textMessageId });
            controller.enqueue({
              type: 'text-delta',
              id: textMessageId,
              delta: `AG Grid blotter view adjusted. Filtered on ${filterInput.column}: "${filterInput.value}".`,
            });
            controller.enqueue({ type: 'text-end', id: textMessageId });
          } else if (parsedDirective.intent === 'create_paypal_invoice') {
            const invoiceInput = {
              recipientEmail: 'ops@cloudscale.io',
              recipientName: 'CloudScale Infrastructure Inc',
              amount: 920.0,
              currency: 'USD' as const,
              description: 'Kubernetes security hardening and network audit',
            };

            controller.enqueue({
              type: 'tool-input-available',
              toolCallId,
              toolName: 'generate_invoice',
              input: invoiceInput,
            });

            const invoiceOutput = await executeGenerateInvoice(invoiceInput, organizationId);

            controller.enqueue({
              type: 'tool-output-available',
              toolCallId,
              output: invoiceOutput,
            });

            controller.enqueue({ type: 'text-start', id: textMessageId });
            controller.enqueue({
              type: 'text-delta',
              id: textMessageId,
              delta: `PayPal Invoicing v2 Draft Created: Invoice ID ${invoiceOutput.invoiceId} delivered to ${invoiceInput.recipientEmail} for $${invoiceInput.amount.toFixed(2)} USD.`,
            });
            controller.enqueue({ type: 'text-end', id: textMessageId });
          } else {
            // General query response
            controller.enqueue({ type: 'text-start', id: textMessageId });
            controller.enqueue({
              type: 'text-delta',
              id: textMessageId,
              delta: `${parsedDirective.summary}\n\nYou can issue commands such as:\n• "Authorize a $1,450.00 PayPal escrow hold for 'Vertex Semiconductor'"\n• "Audit all AUTHORIZED_HOLD escrows and execute PayPal Capture"\n• "Filter the blotter to show only FLAGGED_DISPUTE escrows"\n• "Generate a PayPal Sandbox invoice for 'ops@cloudscale.io' for $920.00"`,
            });
            controller.enqueue({ type: 'text-end', id: textMessageId });
          }
        } catch (execErr) {
          secureLogger.error('Deterministic tool stream failed', { error: String(execErr) });
          controller.enqueue({ type: 'text-start', id: textMessageId });
          controller.enqueue({
            type: 'text-delta',
            id: textMessageId,
            delta: `Treasury Agent Exception: ${String(execErr)}`,
          });
          controller.enqueue({ type: 'text-end', id: textMessageId });
        } finally {
          controller.close();
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    secureLogger.error('Unhandled exception in /api/chat route', { error: String(error) });
    return new Response(JSON.stringify({ error: 'Internal Server Error', message: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
